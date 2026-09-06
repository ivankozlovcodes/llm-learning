/* ============================================================
   Agent-turn simulator.

   An agent turn costs:   prefill(new prompt tokens) + decode(output tokens)
   Context grows every turn. Without prefix-cache reuse the whole context is
   re-prefilled each turn, so session cost grows quadratically. With reuse only
   the newly appended tokens are prefilled, and it grows linearly.

   Drop <div class="agentsim" data-agentsim></div> into a lesson.

   Rates below are measured where marked, scaled where marked (est). Scaling
   assumption: both prefill and decode rates move roughly inversely with active
   parameter count on the same machine.
   ============================================================ */

(function () {
  'use strict';

  var SETUPS = [
    { id: 'm1max-7b',   name: 'M1 Max · Llama 7B Q4_0',        pp: 530,  tg: 61.2, src: 'measured' },
    { id: 'm1max-32b',  name: 'M1 Max · Qwen3 32B Q4 (est)',   pp: 116,  tg: 13.4, src: 'estimated' },
    { id: 'm1max-70b',  name: 'M1 Max · Llama 70B Q4 (est)',   pp: 53,   tg: 7.4,  src: 'estimated' },
    { id: 'spark-8b',   name: 'DGX Spark · Llama 8B FP8',      pp: 7991, tg: 20.5, src: 'measured' },
    { id: 'spark-oss20',name: 'DGX Spark · gpt-oss-20b MXFP4', pp: 2053, tg: 49.7, src: 'measured' },
    { id: 'spark-70b',  name: 'DGX Spark · Llama 70B FP8',     pp: 803,  tg: 2.7,  src: 'measured' },
    { id: 'custom',     name: 'Custom…',                       pp: 500,  tg: 20,   src: 'custom' }
  ];

  function fmtTime(s) {
    if (s < 1)    return s.toFixed(2) + ' s';
    if (s < 60)   return s.toFixed(1) + ' s';
    if (s < 3600) return Math.floor(s / 60) + ' m ' + Math.round(s % 60) + ' s';
    return (s / 3600).toFixed(1) + ' h';
  }

  document.querySelectorAll('[data-agentsim]').forEach(function (root) {
    root.classList.add('agentsim');
    root.innerHTML =
      '<header><span class="tag">Agent loop simulator</span>' +
      '<p class="sub">One CLI agent session. Toggle the cache and watch the shape of the problem change.</p></header>' +
      '<div class="controls">' +
        '<div class="field wide"><label>Setup</label><select data-f="setup">' +
          SETUPS.map(function (s) { return '<option value="' + s.id + '">' + s.name + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field custom-rate" hidden><label>Prefill tok/s</label><input type="number" data-f="pp" value="500" min="1"></div>' +
        '<div class="field custom-rate" hidden><label>Decode tok/s</label><input type="number" data-f="tg" value="20" min="0.1" step="0.1"></div>' +
        '<div class="field"><label>System + repo context</label><input type="number" data-f="start" value="12000" min="0" step="500"></div>' +
        '<div class="field"><label>Added per turn</label><input type="number" data-f="added" value="900" min="0" step="50"></div>' +
        '<div class="field"><label>Output per turn</label><input type="number" data-f="out" value="350" min="1" step="25"></div>' +
        '<div class="field"><label>Turns in session</label><input type="number" data-f="turns" value="25" min="1" max="200"></div>' +
        '<div class="field"><label>&nbsp;</label><label class="toggle"><input type="checkbox" data-f="cache" checked> Prefix cache reuse</label></div>' +
      '</div>' +
      '<div class="readout">' +
        '<div class="stats">' +
          '<div class="stat"><span class="k">First turn, time to first token</span><span class="v" data-o="ttft1"></span></div>' +
          '<div class="stat"><span class="k">Last turn, time to first token</span><span class="v" data-o="ttftN"></span></div>' +
          '<div class="stat"><span class="k">Whole session, wall clock</span><span class="v" data-o="total"></span></div>' +
        '</div>' +
        '<div class="legend"><span class="pf"><i></i>prefill</span><span class="dc"><i></i>decode</span></div>' +
        '<div class="turns" data-o="bars"></div>' +
        '<div class="axis"><span>turn 1</span><span data-o="lastlabel"></span></div>' +
        '<div class="verdict" data-o="verdict"></div>' +
      '</div>' +
      '<footer>Assumes the appended tokens land at the end of the context, so the cached prefix stays valid. Editing anything earlier in the conversation — trimming history, rewriting a system prompt — invalidates the cache from that point on and the turn costs what the uncached column says.</footer>';

    var el = {}; root.querySelectorAll('[data-f]').forEach(function (n) { el[n.dataset.f] = n; });
    var out = {}; root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });

    function compute() {
      var setup = SETUPS.filter(function (s) { return s.id === el.setup.value; })[0];
      var isCustom = setup.id === 'custom';
      root.querySelectorAll('.custom-rate').forEach(function (n) { n.hidden = !isCustom; });

      var pp = isCustom ? parseFloat(el.pp.value) : setup.pp;
      var tg = isCustom ? parseFloat(el.tg.value) : setup.tg;
      var start = parseFloat(el.start.value) || 0;
      var added = parseFloat(el.added.value) || 0;
      var outTok = parseFloat(el.out.value) || 1;
      var turns = Math.max(1, Math.min(200, parseInt(el.turns.value, 10) || 1));
      var cache = el.cache.checked;

      var rows = [], total = 0, ctx = start;
      for (var i = 0; i < turns; i++) {
        var toPrefill;
        if (cache) {
          toPrefill = (i === 0) ? start : added;
        } else {
          toPrefill = ctx;
        }
        var pf = toPrefill / pp;
        var dc = outTok / tg;
        rows.push({ pf: pf, dc: dc, t: pf + dc });
        total += pf + dc;
        ctx += added + outTok;
      }

      out.ttft1.textContent = fmtTime(rows[0].pf);
      out.ttftN.textContent = fmtTime(rows[rows.length - 1].pf);
      out.total.textContent = fmtTime(total);
      out.ttftN.className = 'v' + (rows[rows.length - 1].pf > 20 ? ' hot' : rows[rows.length - 1].pf < 5 ? ' good' : '');
      out.lastlabel.textContent = 'turn ' + turns + ' · ' + Math.round(ctx / 1000) + 'k context';

      var max = Math.max.apply(null, rows.map(function (r) { return r.t; })) || 1;
      out.bars.innerHTML = rows.map(function (r) {
        var h = Math.max(2, (r.t / max) * 88);
        var pfh = (r.pf / r.t) * 100;
        return '<div class="bar" style="height:' + h.toFixed(1) + 'px" title="turn: ' + fmtTime(r.t) + '">' +
               '<span class="pf" style="height:' + pfh.toFixed(1) + '%"></span></div>';
      }).join('');

      var lastTtft = rows[rows.length - 1].pf;
      var v = out.verdict;
      v.className = 'verdict';
      if (!cache) {
        v.classList.add('bad');
        v.textContent = 'Uncached: every turn re-reads the entire conversation, so cost grows with the square of the session length. ' +
          'By turn ' + turns + ' you wait ' + fmtTime(lastTtft) + ' before the first token appears. Tick the cache box.';
      } else if (lastTtft > 20) {
        v.classList.add('bad');
        v.textContent = 'Cached, and still ' + fmtTime(lastTtft) + ' to first token by the last turn. The cache is not the problem here — ' +
          'the prefill rate is. This setup cannot carry an agent loop at this context size.';
      } else if (lastTtft > 5) {
        v.classList.add('warn');
        v.textContent = 'Workable but noticeable: ' + fmtTime(lastTtft) + ' of dead air before each late-session turn starts. ' +
          'Trimming what you append per turn buys back more than any quantization change would.';
      } else {
        v.classList.add('ok');
        v.textContent = 'Responsive. Prefill has stopped being the bottleneck — from here the felt speed is decode, ' +
          'which is the bandwidth-bound number from Lesson 1.';
      }
    }

    root.addEventListener('input', compute);
    root.addEventListener('change', compute);
    compute();
  });
})();
