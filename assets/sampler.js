/* ============================================================
   Sampler explorer.

   Filter order follows llama.cpp's default sampler chain:
       top_k  ->  top_p  ->  min_p  ->  temperature  ->  sample
   Temperature is applied to the survivors, which is why raising it
   cannot resurrect a token that top_p already discarded.

   Drop <div class="samp" data-sampler></div> into a lesson.
   ============================================================ */
(function () {
  'use strict';

  // A plausible next-token distribution at a tool-call decision point.
  var BASE = [
    { t: '{"name"',   p: 0.52 },
    { t: 'I',         p: 0.14 },
    { t: 'Let',       p: 0.09 },
    { t: '```json',   p: 0.07 },
    { t: 'Sure',      p: 0.05 },
    { t: '{',         p: 0.04 },
    { t: 'To',        p: 0.03 },
    { t: 'The',       p: 0.02 },
    { t: 'Based',     p: 0.015 },
    { t: 'Here',      p: 0.01 },
    { t: 'First',     p: 0.008 },
    { t: '\\n',       p: 0.007 }
  ];

  var PRESETS = {
    'Qwen3 default': { temp: 0.7, k: 20, p: 0.80, mp: 0.00 },
    'Coding':        { temp: 0.6, k: 20, p: 0.95, mp: 0.00 },
    'Tool calling':  { temp: 0.0, k: 0,  p: 1.00, mp: 0.00 },
    'Creative':      { temp: 1.2, k: 0,  p: 0.95, mp: 0.05 }
  };

  document.querySelectorAll('[data-sampler]').forEach(function (root) {
    root.classList.add('samp');
    root.innerHTML =
      '<header><span class="tag">Sampler explorer</span>' +
      '<p class="sub">A next-token distribution at a tool-call decision point. Strike-through means discarded.</p></header>' +
      '<div class="controls">' +
        '<div class="field"><label>Temperature <span class="v" data-o="vtemp"></span></label><input type="range" data-f="temp" min="0" max="20" step="1" value="7"></div>' +
        '<div class="field"><label>top-k <span class="v" data-o="vk"></span></label><input type="range" data-f="k" min="0" max="12" step="1" value="0"></div>' +
        '<div class="field"><label>top-p <span class="v" data-o="vp"></span></label><input type="range" data-f="p" min="10" max="100" step="1" value="100"></div>' +
        '<div class="field"><label>min-p <span class="v" data-o="vmp"></span></label><input type="range" data-f="mp" min="0" max="30" step="1" value="0"></div>' +
      '</div>' +
      '<div class="presets">' + Object.keys(PRESETS).map(function (n) {
        return '<button data-preset="' + n + '">' + n + '</button>'; }).join('') + '</div>' +
      '<div class="bars" data-o="bars"></div>' +
      '<div class="verdict" data-o="verdict"></div>' +
      '<footer>Filters apply in llama.cpp\'s default order: top-k, then top-p, then min-p, then temperature. Because temperature comes last it reshapes only what survived — raising it cannot bring back a token top-p already cut. Temperature 0 means greedy: always the highest-probability token, no sampling at all.</footer>';

    var el = {}; root.querySelectorAll('[data-f]').forEach(function (n) { el[n.dataset.f] = n; });
    var out = {}; root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });

    function render() {
      var temp = +el.temp.value / 10, k = +el.k.value, p = +el.p.value / 100, mp = +el.mp.value / 100;
      out.vtemp.textContent = temp.toFixed(1);
      out.vk.textContent = k === 0 ? 'off' : k;
      out.vp.textContent = p.toFixed(2);
      out.vmp.textContent = mp === 0 ? 'off' : mp.toFixed(2);

      var rows = BASE.map(function (r, i) { return { t: r.t, p: r.p, i: i, cut: false, why: '' }; });

      if (k > 0) rows.forEach(function (r, i) { if (i >= k) { r.cut = true; r.why = 'top-k'; } });

      var cum = 0;
      rows.forEach(function (r) {
        if (r.cut) return;
        if (cum >= p) { r.cut = true; r.why = 'top-p'; return; }
        cum += r.p;
      });

      var pmax = Math.max.apply(null, rows.filter(function (r) { return !r.cut; }).map(function (r) { return r.p; }).concat([0]));
      if (mp > 0) rows.forEach(function (r) { if (!r.cut && r.p < mp * pmax) { r.cut = true; r.why = 'min-p'; } });

      var live = rows.filter(function (r) { return !r.cut; });
      var shaped;
      if (temp === 0) {
        shaped = live.map(function (r, i) { return i === 0 ? 1 : 0; });
      } else {
        var raw = live.map(function (r) { return Math.pow(r.p, 1 / temp); });
        var sum = raw.reduce(function (a, b) { return a + b; }, 0);
        shaped = raw.map(function (v) { return v / sum; });
      }
      var j = 0;
      rows.forEach(function (r) { r.out = r.cut ? 0 : shaped[j++]; });

      out.bars.innerHTML = rows.map(function (r) {
        return '<div class="row' + (r.cut ? ' cut' : '') + '">' +
          '<span class="tok">' + r.t.replace(/</g, '&lt;') + '</span>' +
          '<span class="track"><span class="fill" style="width:' + (r.out * 100).toFixed(1) + '%"></span></span>' +
          '<span class="pct">' + (r.cut ? (r.why || 'cut') : (r.out * 100).toFixed(1) + '%') + '</span></div>';
      }).join('');

      var v = out.verdict;
      var topIsJson = !rows[0].cut && rows[0].out > 0.9;
      v.className = 'verdict';
      if (temp === 0) {
        v.classList.add('ok');
        v.textContent = 'Greedy. The tool call wins every time, deterministically — the same input always produces the same output. This is what you want for tool calling and structured output.';
      } else if (topIsJson) {
        v.classList.add('ok');
        v.textContent = 'The tool call takes ' + (rows[0].out * 100).toFixed(0) + '% of the mass. Reliable in practice, but not guaranteed — roughly ' + ((1 - rows[0].out) * 100).toFixed(0) + ' turns in 100 still start with prose.';
      } else {
        v.classList.add('warn');
        v.textContent = 'The tool call holds only ' + (rows[0].out * 100).toFixed(0) + '% of the mass, so about ' +
          ((1 - rows[0].out) * 100).toFixed(0) + ' turns in 100 open with prose instead — "Sure, I\'ll look that up" — and your parser gets a string where it expected JSON.';
      }
    }

    root.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = PRESETS[b.dataset.preset];
        el.temp.value = Math.round(s.temp * 10); el.k.value = s.k;
        el.p.value = Math.round(s.p * 100); el.mp.value = Math.round(s.mp * 100);
        render();
      });
    });
    root.addEventListener('input', render);
    render();
  });
})();
