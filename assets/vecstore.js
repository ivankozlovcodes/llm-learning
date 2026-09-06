/* ============================================================
   Vector store calculator. Shared component.

   Drop <div class="calc" data-vecstore></div> into a lesson,
   link ../assets/calc.css, and load this file.

   Prices a retrieval index three ways: the memory the embedding
   model occupies, the time to build the index, and the size of
   the index itself.

   Model geometry and file sizes read from Hugging Face; the
   Matryoshka rungs come from each model's config.json.
   ============================================================ */

(function () {
  'use strict';

  /* Sizes are measured GGUF file sizes. Prefill rates on the M1
     are PREDICTED from the 7B measurement (117.96 tok/s) scaled
     by active parameter count — prefill is compute-bound, so it
     scales roughly with parameters. Not measurements. */
  var MODELS = [
    { id: '2b', name: 'WeMM-Embedding-2B',
      q4: 1.560, mmproj: 0.671, dims: [64, 128, 256, 512, 1024, 2048], full: 2048,
      kvKB: 48, pp: 400, mmeb2: 77.9, mmeb3: 56.0 },
    { id: '4b', name: 'WeMM-Embedding-4B',
      q4: 3.066, mmproj: 0.367, dims: [64, 128, 256, 512, 1024, 2560], full: 2560,
      kvKB: 128, pp: 200, mmeb2: 79.2, mmeb3: 58.2 },
    { id: '9b', name: 'WeMM-Embedding-9B',
      q4: 5.628, mmproj: 0.624, dims: [64, 128, 256, 512, 1024, 2048, 4096], full: 4096,
      kvKB: 128, pp: 90, mmeb2: 80.6, mmeb3: 59.5 }
  ];

  var PRECISIONS = [
    { id: 'f32', name: 'float32 — 4 bytes', bytes: 4 },
    { id: 'f16', name: 'float16 — 2 bytes', bytes: 2 },
    { id: 'i8',  name: 'int8 — 1 byte',     bytes: 1 },
    { id: 'bin', name: 'binary — 1 bit',    bytes: 0.125 }
  ];

  var BUDGETS = [
    { id: 'm8',  name: '8 GB Mac — 4.2 GB usable', gb: 4.2 },
    { id: 'm48', name: '48 GB M4 — 36 GB usable',  gb: 36 },
    { id: 'm64', name: '64 GB Mac — 48 GB usable', gb: 48 }
  ];

  function fmt(n, dp) {
    return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function bytes(b) {
    if (b < 1e6) return fmt(b / 1e3, 0) + ' KB';
    if (b < 1e9) return fmt(b / 1e6, 1) + ' MB';
    return fmt(b / 1e9, 2) + ' GB';
  }
  function dur(s) {
    if (s < 90) return fmt(s, 0) + ' s';
    if (s < 5400) return fmt(s / 60, 1) + ' min';
    return fmt(s / 3600, 1) + ' hours';
  }
  function opts(list, sel) {
    return list.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + x.name + '</option>';
    }).join('');
  }

  document.querySelectorAll('[data-vecstore]').forEach(function (root) {
    root.className = 'calc';
    root.innerHTML =
      '<header>' +
        '<span class="tag">Vector store</span>' +
        '<p class="sub">Three costs: the model resident, the index built, the index stored.</p>' +
      '</header>' +
      '<div class="controls">' +
        '<div class="field"><label>Embedding model</label><select data-f="model">' + opts(MODELS, '2b') + '</select></div>' +
        '<div class="field"><label>Load vision tower (mmproj)</label><select data-f="mm">' +
          '<option value="0" selected>no — text only</option><option value="1">yes — images and video</option>' +
        '</select></div>' +
        '<div class="field"><label>Corpus size (MB of text)</label><div class="range-row">' +
          '<input type="range" data-f="corpus" min="1" max="500" step="1" value="5">' +
          '<span class="range-val" data-o="corpusv">5</span></div></div>' +
        '<div class="field"><label>Chunk size (tokens)</label><select data-f="chunk">' +
          '<option value="128">128</option><option value="256">256</option>' +
          '<option value="512" selected>512</option><option value="1024">1024</option>' +
        '</select></div>' +
        '<div class="field"><label>Embedding dimensions</label><select data-f="dims"></select></div>' +
        '<div class="field"><label>Stored precision</label><select data-f="prec">' + opts(PRECISIONS, 'f32') + '</select></div>' +
        '<div class="field wide"><label>Machine budget</label><select data-f="budget">' + opts(BUDGETS, 'm8') + '</select></div>' +
      '</div>' +
      '<div class="readout">' +
        '<div class="chain">' +
          'model resident<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="resident"></span>' +
            '<span class="op"> &nbsp; <span data-o="residentf"></span></span><br>' +
          'chunks to encode<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="chunks"></span>' +
            '<span class="op"> &nbsp; <span data-o="toks"></span></span><br>' +
          'time to build the index<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="build"></span><br>' +
          'index on disk<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="index"></span>' +
            '<span class="op"> &nbsp; <span data-o="vs2048"></span></span>' +
        '</div>' +
        '<div class="headline"><span class="big" data-o="total"></span><span class="unit">GB resident while indexing, of <span data-o="budgetv"></span> GB</span></div>' +
        '<div class="fit" data-o="verdict"></div>' +
      '</div>' +
      '<footer>GGUF file sizes measured from the Hugging Face file API. Matryoshka rungs from each ' +
      'model&rsquo;s <code>config.json</code>. Text is converted at 3.4 chars/token (source-code and ' +
      'markdown rate from Lesson 17). Prefill rates are <strong>predicted</strong> by scaling the M1&rsquo;s ' +
      'measured 118 tok/s on a 7B by active parameter count &mdash; treat them as &plusmn;2&times; and measure ' +
      'your own. Embedding is pure prefill: there is no decode, and no session KV cache to hold.</footer>';

    var el = {}, out = {};
    root.querySelectorAll('[data-f]').forEach(function (n) { el[n.dataset.f] = n; });
    root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });

    function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }

    function syncDims() {
      var m = byId(MODELS, el.model.value);
      var want = +el.dims.value || 256;
      if (m.dims.indexOf(want) === -1) want = 256;
      el.dims.innerHTML = m.dims.map(function (d) {
        return '<option value="' + d + '"' + (d === want ? ' selected' : '') + '>' + d +
               (d === m.full ? ' (full)' : '') + '</option>';
      }).join('');
    }

    function compute() {
      var m = byId(MODELS, el.model.value);
      var mm = el.mm.value === '1';
      var corpusMB = +el.corpus.value;
      var chunkTok = +el.chunk.value;
      var dims = +el.dims.value;
      var prec = byId(PRECISIONS, el.prec.value);
      var budget = byId(BUDGETS, el.budget.value).gb;

      out.corpusv.textContent = corpusMB;

      var residentGB = m.q4 + (mm ? m.mmproj : 0);
      var totalTokens = Math.round(corpusMB * 1e6 / 3.4);
      var chunks = Math.ceil(totalTokens / chunkTok);
      var buildSecs = totalTokens / m.pp;
      var indexBytes = chunks * dims * prec.bytes;
      var fullBytes = chunks * m.full * 4;

      out.resident.textContent = fmt(residentGB, 3) + ' GB';
      out.residentf.textContent = '(' + fmt(m.q4, 3) + ' Q4_K_M' + (mm ? ' + ' + fmt(m.mmproj, 3) + ' mmproj' : ', mmproj not loaded') + ')';
      out.chunks.textContent = fmt(chunks, 0);
      out.toks.textContent = '(' + fmt(totalTokens / 1e6, 2) + 'M tokens at ' + chunkTok + '/chunk)';
      out.build.textContent = dur(buildSecs) + ' at ~' + m.pp + ' tok/s prefill';
      out.index.textContent = bytes(indexBytes);
      out.vs2048.textContent = dims === m.full && prec.bytes === 4
        ? '(full precision, full dimensions)'
        : '(' + fmt(fullBytes / indexBytes, 1) + '× smaller than ' + m.full + '-dim float32)';
      out.total.textContent = fmt(residentGB, 2);
      out.budgetv.textContent = fmt(budget, 1);

      var v = out.verdict;
      if (residentGB > budget) {
        v.className = 'fit no';
        v.innerHTML = '<strong>' + m.name + ' does not fit &mdash; over by ' +
          fmt(residentGB - budget, 2) + ' GB.</strong> And this is the embedder alone, with no generation ' +
          'model loaded beside it. Drop to a smaller size, or run the index on the other machine and copy it over.';
      } else if (residentGB > budget * 0.7) {
        v.className = 'fit tight';
        v.innerHTML = '<strong>Fits, with ' + fmt(budget - residentGB, 2) + ' GB spare.</strong> ' +
          'Enough to index with, but not enough to keep a generation model resident at the same time. ' +
          'Index first, unload, then work.';
      } else {
        v.className = 'fit ok';
        v.innerHTML = '<strong>Fits with ' + fmt(budget - residentGB, 2) + ' GB spare</strong> &mdash; ' +
          'room for a generation model alongside it. Scores ' + fmt(m.mmeb2, 1) + ' on MMEB-v2 and ' +
          fmt(m.mmeb3, 1) + ' on MMEB-v3.';
      }
    }

    el.model.addEventListener('change', function () { syncDims(); compute(); });
    root.addEventListener('input', compute);
    root.addEventListener('change', compute);
    syncDims();
    el.dims.value = '256';
    compute();
  });
})();
