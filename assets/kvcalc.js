/* ============================================================
   KV cache budget calculator.

   bytes per token = 2 (K and V) x layers x kv_heads x head_dim x bytes_per_element
   total footprint = weights + KV cache, checked against usable memory.

   Drop <div class="calc" data-kvcalc></div> into a lesson. Reuses calc.css.

   Model geometry below is taken from each model's published config.json on
   Hugging Face — verified, not estimated.
   ============================================================ */

(function () {
  'use strict';

  var MODELS = [
    { id: 'q4b',    name: 'Qwen3-4B-Instruct · Q4_K_M (2.50 GB)', params: 4.02, layers: 36, kv: 8, hd: 128, bpw: 4.98 },
    { id: 'q4b8',   name: 'Qwen3-4B-Instruct · Q8_0 (4.28 GB)',   params: 4.02, layers: 36, kv: 8, hd: 128, bpw: 8.52 },
    { id: 'q8b3',   name: 'Qwen3-8B · UD-Q3_K_XL (4.31 GB)',      params: 8.19, layers: 36, kv: 8, hd: 128, bpw: 4.21 },
    { id: 'ornith9',name: 'Ornith-1.5-9B · Q4_K_M (5.78 GB)',     params: 9.20, layers: 32, kv: 4, hd: 256, bpw: 5.03 },
    { id: 'q38_27', name: 'Qwen3.8-27B · UD-IQ1_S (6.19 GB)',     params: 27.3, layers: 64, kv: 4, hd: 256, bpw: 1.81 },
    { id: 'l8b',    name: 'Llama 3.1 8B',        params: 8.0,   layers: 32, kv: 8, hd: 128, bpw: 4.9  },
    { id: 'mistral',name: 'Mistral Small 24B',   params: 23.6,  layers: 40, kv: 8, hd: 128, bpw: 4.9  },
    { id: 'q30a3',  name: 'Qwen3-30B-A3B (MoE)', params: 30.5,  layers: 48, kv: 4, hd: 128, bpw: 4.9  },
    { id: 'q32',    name: 'Qwen3 32B',           params: 32.8,  layers: 64, kv: 8, hd: 128, bpw: 4.9  },
    { id: 'l70b',   name: 'Llama 3.3 70B',       params: 70.6,  layers: 80, kv: 8, hd: 128, bpw: 4.9  },
    { id: 'oss120', name: 'gpt-oss-120b (MoE)',  params: 116.8, layers: 36, kv: 8, hd: 64,  bpw: 4.25, swa: true }
  ];

  var MACHINES = [
    { id: 'm1_8gb',   name: 'M1 MacBook Pro 8 GB (~4.2 GB usable)', mem: 4.2 },
    { id: 'm1max48',  name: 'M1 Max 64 GB (default ~48 GB)', mem: 48  },
    { id: 'm1max56',  name: 'M1 Max 64 GB (wired limit raised, ~56 GB)', mem: 56 },
    { id: 'spark',    name: 'DGX Spark (~110 GB)',           mem: 110 },
    { id: 'm4max',    name: 'Mac Studio M4 Max 128 GB (~96 GB)', mem: 96 },
    { id: 'rtx3090',  name: 'RTX 3090 (23 GB)',              mem: 23  },
    { id: 'rtx3090x2',name: '2x RTX 3090 (46 GB)',           mem: 46  },
    { id: 'orinnano', name: 'Jetson Orin Nano Super 8 GB (~6.5 GB)', mem: 6.5 },
    { id: 'orinnx',   name: 'Jetson Orin NX 16 GB (~14 GB)',  mem: 14  },
    { id: 'agxorin',  name: 'Jetson AGX Orin 64 GB (~56 GB)', mem: 56  },
    { id: 'thor',     name: 'Jetson AGX Thor 128 GB (~115 GB)', mem: 115 },
    { id: 'hailo10h', name: 'Pi AI HAT+ 2 (Hailo-10H) 8 GB',  mem: 7   },
    { id: 'macmini4p',name: 'Mac mini M4 Pro 64 GB (~48 GB)', mem: 48  }
  ];

  var KVTYPES = [
    { id: 'f16', name: 'F16 — default', bytes: 2 },
    { id: 'q8',  name: 'Q8_0 — halved', bytes: 1 },
    { id: 'q4',  name: 'Q4_0 — quartered', bytes: 0.5 }
  ];

  function fmt(n, dp) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function opts(list, sel) {
    return list.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + x.name + '</option>';
    }).join('');
  }

  document.querySelectorAll('[data-kvcalc]').forEach(function (root) {
    root.classList.add('calc');
    root.innerHTML =
      '<header><span class="tag">KV cache budget</span>' +
      '<p class="sub">Weights plus cache, against real memory. Find where each model runs out of context.</p></header>' +
      '<div class="controls">' +
        '<div class="field"><label>Model</label><select data-f="model">' + opts(MODELS, root.dataset.model || 'l70b') + '</select></div>' +
        '<div class="field"><label>Machine</label><select data-f="machine">' + opts(MACHINES, root.dataset.machine || 'm1max48') + '</select></div>' +
        '<div class="field"><label>KV cache precision</label><select data-f="kvtype">' + opts(KVTYPES, 'f16') + '</select></div>' +
        '<div class="field"><label>Context (tokens)</label><div class="range-row">' +
          '<input type="range" data-f="ctx" min="2000" max="131072" step="2000" value="42000">' +
          '<span class="range-val" data-o="ctxv"></span></div></div>' +
      '</div>' +
      '<div class="readout">' +
        '<div class="chain">' +
          '<div><span class="op">KV per token =</span> 2 <span class="op">x</span> <span class="v" data-o="L"></span> layers <span class="op">x</span> <span class="v" data-o="KV"></span> kv-heads <span class="op">x</span> <span class="v" data-o="HD"></span> head-dim <span class="op">x</span> <span class="v" data-o="B"></span> bytes <span class="op">=</span> <span class="v" data-o="perTok"></span> KB</div>' +
          '<div><span class="op">KV cache =</span> <span class="v" data-o="perTok2"></span> KB <span class="op">x</span> <span class="v" data-o="ctx2"></span> tokens <span class="op">=</span> <span class="v" data-o="kvGB"></span> GB</div>' +
          '<div><span class="op">weights =</span> <span class="v" data-o="wGB"></span> GB <span class="op">·  total =</span></div>' +
        '</div>' +
        '<div class="headline"><span class="big" data-o="total"></span><span class="unit">GB needed, of <span data-o="mem"></span> GB available</span></div>' +
        '<div class="fit" data-o="fit"></div>' +
      '</div>' +
      '<footer data-o="foot"></footer>';

    var el = {}; root.querySelectorAll('[data-f]').forEach(function (n) { el[n.dataset.f] = n; });
    var out = {}; root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });
    function byId(l, id) { return l.filter(function (x) { return x.id === id; })[0]; }

    function compute() {
      var m = byId(MODELS, el.model.value);
      var mach = byId(MACHINES, el.machine.value);
      var kvt = byId(KVTYPES, el.kvtype.value);
      var ctx = parseInt(el.ctx.value, 10);

      var perTokBytes = 2 * m.layers * m.kv * m.hd * kvt.bytes;
      var kvGB = perTokBytes * ctx / 1e9;
      var wGB = m.params * m.bpw / 8;
      var total = kvGB + wGB;

      out.L.textContent = m.layers;
      out.KV.textContent = m.kv;
      out.HD.textContent = m.hd;
      out.B.textContent = kvt.bytes;
      out.perTok.textContent = fmt(perTokBytes / 1024, 1);
      out.perTok2.textContent = fmt(perTokBytes / 1024, 1);
      out.ctx2.textContent = ctx.toLocaleString('en-US');
      out.ctxv.textContent = (ctx / 1000).toFixed(0) + 'k';
      out.kvGB.textContent = fmt(kvGB, 2);
      out.wGB.textContent = fmt(wGB, 1);
      out.total.textContent = fmt(total, 1);
      out.mem.textContent = mach.mem;

      var f = out.fit;
      f.className = 'fit';
      var share = kvGB / total * 100;
      if (total > mach.mem) {
        f.classList.add('no');
        f.textContent = 'Over budget by ' + fmt(total - mach.mem, 1) + ' GB. Either drop the context, ' +
          'quantize the KV cache, or pick a smaller model — the cache is ' + fmt(share, 0) + '% of what you are asking for.';
      } else if (mach.mem - total < mach.mem * 0.1) {
        f.classList.add('tight');
        f.textContent = 'Fits with ' + fmt(mach.mem - total, 1) + ' GB to spare — too little to be comfortable. ' +
          'The cache is ' + fmt(share, 0) + '% of the footprint and grows every turn.';
      } else {
        f.classList.add('ok');
        f.textContent = 'Fits, ' + fmt(mach.mem - total, 1) + ' GB spare. The cache is ' + fmt(share, 0) +
          '% of the footprint at this context length.';
      }

      out.foot.textContent = m.swa
        ? 'gpt-oss alternates sliding-window attention (window 128) with full attention, so in practice roughly half the layers never grow past a fixed cache size. The figure above is the conservative full-attention estimate — real usage is lower.'
        : 'Grouped-query attention is doing the heavy lifting: this model has ' + m.kv + ' key/value heads. Without GQA it would need one per attention head, and the cache would be several times larger.';
    }

    root.addEventListener('input', compute);
    root.addEventListener('change', compute);
    compute();
  });
})();
