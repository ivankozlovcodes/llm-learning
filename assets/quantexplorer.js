/* ============================================================
   Quantization explorer.

   Every number marked "measured" comes from the controlled evaluation of
   llama.cpp quantization on Llama-3.1-8B-Instruct (arXiv 2601.14277):
   perplexity on WikiText-2, an aggregate over GSM8K / HellaSwag / IFEval /
   MMLU / TruthfulQA, and tg128 throughput on that paper's hardware.

   Rows without measured benchmark data are marked estimated and are NOT
   plotted — the chart draws only verified points.

   Drop <div class="qexp" data-quantexplorer></div> into a lesson.
   ============================================================ */

(function () {
  'use strict';

  // gsm8k / avg: null where the study did not report a value.
  var RUNGS = [
    { id: 'iq1',  name: 'IQ1_S',  bpw: 1.8,  size: 89, ppl: null, avg: null, gsm: null, tg: null, family: 'i-quant' },
    { id: 'q2k',  name: 'Q2_K',   bpw: 2.9,  size: 82, ppl: null, avg: null, gsm: null, tg: null, family: 'k-quant' },
    { id: 'q3ks', name: 'Q3_K_S', bpw: 3.5,  size: 77, ppl: 8.96, avg: 65.49, gsm: 68.31, tg: 9.91, family: 'k-quant' },
    { id: 'q4ks', name: 'Q4_K_S', bpw: 4.5,  size: 71, ppl: null, avg: 69.15, gsm: 77.33, tg: 4.65, family: 'k-quant' },
    { id: 'q5_0', name: 'Q5_0',   bpw: 5.5,  size: 65, ppl: 7.43, avg: 69.92, gsm: null, tg: 6.66, family: 'legacy' },
    { id: 'q8_0', name: 'Q8_0',   bpw: 8.5,  size: 47, ppl: null, avg: null, gsm: null, tg: null, family: 'k-quant' },
    { id: 'f16',  name: 'FP16',   bpw: 16,   size: 0,  ppl: 7.32, avg: 69.47, gsm: 77.63, tg: 2.83, family: 'baseline' }
  ];

  var W = 560, H = 200, PAD = { l: 44, r: 14, t: 14, b: 34 };
  var X0 = 3, X1 = 16, Y0 = 62, Y1 = 80;
  function px(v) { return PAD.l + (v - X0) / (X1 - X0) * (W - PAD.l - PAD.r); }
  function py(v) { return H - PAD.b - (v - Y0) / (Y1 - Y0) * (H - PAD.t - PAD.b); }

  document.querySelectorAll('[data-quantexplorer]').forEach(function (root) {
    root.classList.add('qexp');
    root.innerHTML =
      '<header><span class="tag">The quality curve</span>' +
      '<p class="sub">Pick a rung. Watch reasoning fall away while the aggregate score barely moves.</p></header>' +
      '<div class="ladder">' + RUNGS.map(function (r) {
        return '<div class="rung' + (r.id === 'q4ks' ? ' on' : '') + '" data-id="' + r.id + '">' +
               '<span class="nm">' + r.name + '</span><span class="bw">' + r.bpw + ' bpw</span></div>';
      }).join('') + '</div>' +
      '<div class="plot" data-o="plot"></div>' +
      '<div class="legend"><span class="r"><i></i>GSM8K — multi-step reasoning</span>' +
      '<span class="a"><i></i>aggregate of five benchmarks</span></div>' +
      '<div class="readout">' +
        '<div class="stats">' +
          '<div class="stat"><span class="k">Bits per weight</span><span class="v" data-o="bpw"></span></div>' +
          '<div class="stat"><span class="k">Size reduction</span><span class="v" data-o="size"></span></div>' +
          '<div class="stat"><span class="k">GSM8K</span><span class="v" data-o="gsm"></span></div>' +
          '<div class="stat"><span class="k">Decode speed</span><span class="v" data-o="tg"></span></div>' +
        '</div>' +
        '<div class="verdict" data-o="verdict"></div>' +
      '</div>' +
      '<footer>Measured on Llama-3.1-8B-Instruct (arXiv 2601.14277). Dashes mark values the study did not report — IQ1_S, Q2_K and Q8_0 were outside its scope, so their rows show size only and are not plotted. Absolute numbers are model-specific; the <em>shape</em> generalises.</footer>';

    var out = {}; root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });
    var sel = 'q4ks';

    function drawPlot() {
      var s = [];
      for (var g = 65; g <= 80; g += 5) {
        s.push('<line class="gl" x1="' + PAD.l + '" y1="' + py(g).toFixed(1) + '" x2="' + (W - PAD.r) + '" y2="' + py(g).toFixed(1) + '"/>');
        s.push('<text class="tk" x="' + (PAD.l - 6) + '" y="' + (py(g) + 3).toFixed(1) + '" text-anchor="end">' + g + '%</text>');
      }
      [4, 6, 8, 10, 12, 14, 16].forEach(function (b) {
        s.push('<text class="tk" x="' + px(b).toFixed(1) + '" y="' + (H - PAD.b + 13) + '" text-anchor="middle">' + b + '</text>');
      });
      s.push('<line class="ax" x1="' + PAD.l + '" y1="' + (H - PAD.b) + '" x2="' + (W - PAD.r) + '" y2="' + (H - PAD.b) + '"/>');
      s.push('<line class="ax" x1="' + PAD.l + '" y1="' + PAD.t + '" x2="' + PAD.l + '" y2="' + (H - PAD.b) + '"/>');

      ['gsm', 'avg'].forEach(function (key) {
        var pts = RUNGS.filter(function (r) { return r[key] !== null; })
                       .sort(function (a, b) { return a.bpw - b.bpw; });
        if (pts.length < 2) return;
        var cls = key === 'gsm' ? 'ser-reason' : 'ser-avg';
        s.push('<polyline class="' + cls + '" points="' + pts.map(function (r) {
          return px(r.bpw).toFixed(1) + ',' + py(r[key]).toFixed(1); }).join(' ') + '"/>');
        pts.forEach(function (r) {
          s.push('<circle class="dot-' + (key === 'gsm' ? 'reason' : 'avg') + '" cx="' + px(r.bpw).toFixed(1) +
                 '" cy="' + py(r[key]).toFixed(1) + '" r="3.5"/>');
        });
      });

      var cur = RUNGS.filter(function (r) { return r.id === sel; })[0];
      if (cur.bpw >= X0 && cur.bpw <= X1) {
        s.push('<line class="marker" x1="' + px(cur.bpw).toFixed(1) + '" y1="' + PAD.t + '" x2="' + px(cur.bpw).toFixed(1) + '" y2="' + (H - PAD.b) + '"/>');
      }
      s.push('<text class="lbl" x="' + ((W + PAD.l) / 2) + '" y="' + (H - 4) + '" text-anchor="middle" fill="var(--ink-soft)">bits per weight</text>');
      out.plot.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Benchmark score against bits per weight">' + s.join('') + '</svg>';
    }

    function render() {
      var r = RUNGS.filter(function (x) { return x.id === sel; })[0];
      root.querySelectorAll('.rung').forEach(function (n) { n.classList.toggle('on', n.dataset.id === sel); });
      out.bpw.textContent = r.bpw;
      out.size.textContent = r.size ? '−' + r.size + '%' : '—';
      out.gsm.textContent = r.gsm !== null ? r.gsm.toFixed(1) + '%' : '—';
      out.tg.textContent = r.tg !== null ? r.tg.toFixed(1) + ' t/s' : '—';

      var v = out.verdict; v.className = 'verdict';
      if (r.id === 'f16') { v.classList.add('ok');
        v.textContent = 'The baseline. Twice the bytes of Q8_0 for no measurable quality gain, and less than half the decode speed. Almost nobody should run this locally.'; }
      else if (r.bpw >= 4.5) { v.classList.add('ok');
        v.textContent = 'The safe zone. GSM8K 77.33% against the FP16 baseline of 77.63% — a 0.3-point loss for a 71% size reduction. This is why 4-bit K-quants are the default.'; }
      else if (r.bpw >= 3.4) { v.classList.add('warn');
        v.textContent = 'The bend. Aggregate score falls only 4 points, but GSM8K drops 9.32 — from 77.63% to 68.31%. Multi-step reasoning is where the damage concentrates, and the average hides it.'; }
      else { v.classList.add('bad');
        v.textContent = 'Below the study\'s range. Extreme quantization is legitimate mainly for very large models, where redundancy absorbs the damage. On a small dense model it removes capability you cannot get back.'; }
      drawPlot();
    }

    root.querySelectorAll('.rung').forEach(function (n) {
      n.addEventListener('click', function () { sel = n.dataset.id; render(); });
    });
    render();
  });
})();
