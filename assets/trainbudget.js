/* ============================================================
   Training budget calculator. Shared component.

   Drop <div class="calc" data-trainbudget></div> into a lesson,
   link ../assets/calc.css, and load this file.

   Prices the four terms of a fine-tuning run against a memory
   budget:

     base weights  +  trainable state  +  activations  +  runtime

   Model geometry read from each model's config.json on Hugging
   Face; bytes-per-parameter constants derived from the measured
   file sizes of the mlx-community repos (see FOOTNOTES below).
   ============================================================ */

(function () {
  'use strict';

  /* Bytes per parameter, derived from measured mlx-community
     safetensors sizes and the parameter counts below:
       Qwen3-1.7B  bf16 3.441 GB / 1.7206B = 2.000
       Qwen3-1.7B  8bit 1.828 GB / 1.7206B = 1.0625  (8.5 bpw)
       Qwen3-1.7B  4bit 0.968 GB / 1.7206B = 0.5626  (4.50 bpw)
     The 4-bit constant reproduces Qwen3-0.6B (0.335 GB) and
     Qwen3-4B (2.263 GB) exactly. */
  var BPP = { bf16: 2.0, q8: 1.0625, q4: 0.5626 };

  var MODELS = [
    { id: 'q06',  name: 'Qwen3-0.6B',            params: 0.5960e9, layers: 28, h: 1024, qOut: 2048, kvOut: 1024, inter: 3072 },
    { id: 'q17',  name: 'Qwen3-1.7B',            params: 1.7206e9, layers: 28, h: 2048, qOut: 2048, kvOut: 1024, inter: 6144 },
    { id: 'q4b',  name: 'Qwen3-4B-Instruct-2507',params: 4.0225e9, layers: 36, h: 2560, qOut: 4096, kvOut: 1024, inter: 9728 }
  ];

  var PRECISIONS = [
    { id: 'q4',   name: '4-bit (QLoRA base)' },
    { id: 'q8',   name: '8-bit' },
    { id: 'bf16', name: 'bf16 (unquantized)' }
  ];

  var METHODS = [
    { id: 'lora', name: 'LoRA / QLoRA' },
    { id: 'full', name: 'Full fine-tune' }
  ];

  var KEYSETS = [
    { id: 'qv',   name: 'q_proj, v_proj (mlx-lm default)' },
    { id: 'attn', name: 'all attention (q, k, v, o)' },
    { id: 'all',  name: 'all linear (attention + MLP)' }
  ];

  var BUDGETS = [
    { id: 'm8',   name: '8 GB Mac — 4.2 GB usable',   gb: 4.2 },
    { id: 'm16',  name: '16 GB Mac — 11 GB usable',   gb: 11 },
    { id: 'm48',  name: '48 GB M4 — 36 GB usable',    gb: 36 },
    { id: 'm64',  name: '64 GB Mac — 48 GB usable',   gb: 48 }
  ];

  /* Fixed runtime overhead: framework, tokenizer, dataset buffers. */
  var RUNTIME_GB = 0.4;

  function opts(list, sel) {
    return list.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + x.name + '</option>';
    }).join('');
  }

  function fmt(n, dp) {
    return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }

  function gb(bytes) {
    if (bytes < 1e6) return fmt(bytes / 1e3, 0) + ' KB';
    if (bytes < 1e9) return fmt(bytes / 1e6, 0) + ' MB';
    return fmt(bytes / 1e9, 2) + ' GB';
  }

  /* LoRA parameter count: rank x (fan_in + fan_out) per targeted
     matrix, summed over the tuned layers. */
  function loraParams(m, keyset, rank, layers) {
    var per = 0;
    per += rank * (m.h + m.qOut);            // q_proj
    per += rank * (m.h + m.kvOut);           // v_proj
    if (keyset === 'attn' || keyset === 'all') {
      per += rank * (m.h + m.kvOut);         // k_proj
      per += rank * (m.qOut + m.h);          // o_proj
    }
    if (keyset === 'all') {
      per += rank * (m.h + m.inter);         // gate_proj
      per += rank * (m.h + m.inter);         // up_proj
      per += rank * (m.inter + m.h);         // down_proj
    }
    return per * layers;
  }

  document.querySelectorAll('[data-trainbudget]').forEach(function (root) {
    root.className = 'calc';
    root.innerHTML =
      '<header>' +
        '<span class="tag">Training budget</span>' +
        '<p class="sub">Four terms, one budget. Change a control and watch which term moves.</p>' +
      '</header>' +
      '<div class="controls">' +
        '<div class="field"><label>Model</label><select data-f="model">' + opts(MODELS, 'q17') + '</select></div>' +
        '<div class="field"><label>Base precision</label><select data-f="prec">' + opts(PRECISIONS, 'q4') + '</select></div>' +
        '<div class="field"><label>Method</label><select data-f="method">' + opts(METHODS, 'lora') + '</select></div>' +
        '<div class="field"><label>Adapted matrices</label><select data-f="keyset">' + opts(KEYSETS, 'qv') + '</select></div>' +
        '<div class="field lora-only"><label>LoRA rank</label><div class="range-row">' +
          '<input type="range" data-f="rank" min="1" max="64" step="1" value="8">' +
          '<span class="range-val" data-o="rankv">8</span></div></div>' +
        '<div class="field lora-only"><label>Layers tuned</label><div class="range-row">' +
          '<input type="range" data-f="layers" min="1" max="36" step="1" value="16">' +
          '<span class="range-val" data-o="layersv">16</span></div></div>' +
        '<div class="field"><label>Batch size</label><div class="range-row">' +
          '<input type="range" data-f="batch" min="1" max="8" step="1" value="1">' +
          '<span class="range-val" data-o="batchv">1</span></div></div>' +
        '<div class="field"><label>Max sequence length</label><select data-f="seq">' +
          '<option value="512">512</option><option value="1024" selected>1024</option>' +
          '<option value="2048">2048</option><option value="4096">4096</option>' +
        '</select></div>' +
        '<div class="field"><label>Gradient checkpointing</label><select data-f="ckpt">' +
          '<option value="0" selected>off</option><option value="1">on (--grad-checkpoint)</option>' +
        '</select></div>' +
        '<div class="field"><label>Machine budget</label><select data-f="budget">' + opts(BUDGETS, 'm8') + '</select></div>' +
      '</div>' +
      '<div class="readout">' +
        '<div class="chain">' +
          'base weights (frozen)<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="base"></span><br>' +
          'trainable state<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="state"></span>' +
            '<span class="op"> &nbsp; <span data-o="trainpct"></span></span><br>' +
          'activations (est.)<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="acts"></span><br>' +
          'runtime overhead<span class="op"> &nbsp;·&nbsp; </span><span class="v">0.40 GB</span>' +
        '</div>' +
        '<div class="headline"><span class="big" data-o="total"></span><span class="unit">GB peak, against <span data-o="budgetv"></span> GB usable</span></div>' +
        '<div class="fit" data-o="fit"></div>' +
      '</div>' +
      '<footer>Bytes/parameter constants derived from measured <code>mlx-community</code> file sizes; ' +
      'geometry from each model&rsquo;s <code>config.json</code>. Trainable state is 8 bytes per trainable ' +
      'parameter (weight + gradient + two AdamW moments, all in the parameter dtype &mdash; MLX initialises ' +
      'optimizer state with <code>mx.zeros_like</code>). The activation term is an order-of-magnitude ' +
      'estimate, good to about &plusmn;2&times;; trust the measured peak over this number.</footer>';

    var el = {}, out = {};
    root.querySelectorAll('[data-f]').forEach(function (n) { el[n.dataset.f] = n; });
    root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });

    function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }

    function compute() {
      var m = byId(MODELS, el.model.value);
      var prec = el.prec.value;
      var method = el.method.value;
      var rank = +el.rank.value;
      var batch = +el.batch.value;
      var seq = +el.seq.value;
      var ckpt = el.ckpt.value === '1';
      var budget = byId(BUDGETS, el.budget.value).gb;

      var isLora = method === 'lora';
      el.layers.max = m.layers;
      var layers = Math.min(+el.layers.value, m.layers);
      el.layers.value = layers;

      root.querySelectorAll('.lora-only').forEach(function (n) { n.hidden = !isLora; });
      out.rankv.textContent = rank;
      out.layersv.textContent = layers;
      out.batchv.textContent = batch;

      /* 1. Base weights. A full fine-tune cannot start from a
         quantized base, so it is always bf16. */
      var basePrec = isLora ? prec : 'bf16';
      var baseBytes = m.params * BPP[basePrec];

      /* 2. Trainable state: 8 bytes per trainable parameter. */
      var trainable = isLora ? loraParams(m, el.keyset.value, rank, layers) : m.params;
      var stateBytes = trainable * 8;

      /* 3. Activations. Per trained layer, per sample:
         seq x hidden x 34 bytes (Korthikanti et al. 2205.05198,
         minus the attention-matrix term, which fused attention
         removes). Checkpointing stores boundaries only and
         recomputes one layer at a time. */
      var actLayers = isLora ? layers : m.layers;
      var perLayer = seq * m.h * 34 * batch;
      var actBytes = ckpt
        ? (seq * m.h * 2 * batch * actLayers) + perLayer
        : perLayer * actLayers;

      var totalBytes = baseBytes + stateBytes + actBytes + RUNTIME_GB * 1e9;
      var totalGB = totalBytes / 1e9;

      out.base.textContent = gb(baseBytes) + (isLora ? '' : ' (bf16 — full FT cannot use a quantized base)');
      out.state.textContent = gb(stateBytes);
      out.trainpct.textContent = '(' + fmt(trainable / 1e6, 3) + 'M trainable, ' +
        fmt(trainable * 100 / m.params, 3) + '% of ' + fmt(m.params / 1e9, 2) + 'B)';
      out.acts.textContent = gb(actBytes) + (ckpt ? ' — checkpointed' : '');
      out.total.textContent = fmt(totalGB, 2);
      out.budgetv.textContent = fmt(budget, 1);

      var ratio = totalGB / budget;
      var fit = out.fit;
      if (ratio <= 0.75) {
        fit.className = 'fit ok';
        fit.innerHTML = '<strong>Fits with headroom.</strong> ' + fmt(budget - totalGB, 2) +
          ' GB spare. You can afford a longer sequence, a larger batch, or more layers.';
      } else if (ratio <= 1.0) {
        fit.className = 'fit tight';
        fit.innerHTML = '<strong>Fits, but tight.</strong> Only ' + fmt(budget - totalGB, 2) +
          ' GB spare, and the activation term is a &plusmn;2&times; estimate. Close every other app and watch memory pressure.';
      } else {
        fit.className = 'fit no';
        fit.innerHTML = '<strong>Over budget by ' + fmt(totalGB - budget, 2) + ' GB.</strong> ' +
          'macOS will compress and then swap; training does not crash, it goes quiet. ' +
          'Quantize the base, cut layers, shorten sequences, or turn on checkpointing &mdash; in that order.';
      }
    }

    root.addEventListener('input', compute);
    root.addEventListener('change', compute);
    compute();
  });
})();
