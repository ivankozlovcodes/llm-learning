/* ============================================================
   Compaction policy simulator.

   Models a pi session under a compaction policy and reports whether it
   survives, what it costs, and where the time goes.

   Per turn:   prefill(new tokens) / pp  +  output / tg
   Context grows by (added + output) each turn.
   When  weights + context x kvPerToken  exceeds  threshold x budget,
   transformContext() compacts: older messages are replaced by a summary,
   which rewrites the prefix and forces one full uncached prefill.

   Reuses .agentsim styling. Drop <div data-compaction></div> into a lesson.
   ============================================================ */
(function () {
  'use strict';

  var SETUPS = [
    { id: 'm1_8_q4b',  name: 'M1 8 GB · Qwen3-4B Q4_K_M',   pp: 40,  tg: 18,  weights: 2.50, kv: 144, budget: 4.2  },
    { id: 'm1max_q32', name: 'M1 Max 64 GB · Qwen3 32B Q4',  pp: 116, tg: 13.4, weights: 20.1, kv: 256, budget: 48 },
    { id: 'm1max_moe', name: 'M1 Max 64 GB · Qwen3-30B-A3B', pp: 150, tg: 90,  weights: 18.7, kv: 96,  budget: 48 }
  ];

  var POLICIES = [
    { id: 'none',   name: 'Never compact',            thr: 1.01, keep: 0 },
    { id: 'lazy',   name: 'Rare and deep (90%, keep 3)',   thr: 0.90, keep: 3 },
    { id: 'bal',    name: 'Balanced (75%, keep 6)',        thr: 0.75, keep: 6 },
    { id: 'eager',  name: 'Frequent and shallow (50%, keep 10)', thr: 0.50, keep: 10 },
    { id: 'custom', name: 'Custom…',                   thr: 0.80, keep: 5 }
  ];

  function fmtTime(s) {
    if (s < 60) return s.toFixed(0) + ' s';
    if (s < 3600) return Math.floor(s / 60) + ' m ' + Math.round(s % 60) + ' s';
    return (s / 3600).toFixed(1) + ' h';
  }

  document.querySelectorAll('[data-compaction]').forEach(function (root) {
    root.classList.add('agentsim');
    root.innerHTML =
      '<header><span class="tag">Compaction policy simulator</span>' +
      '<p class="sub">Same session, different policies. Watch which one survives and what it costs.</p></header>' +
      '<div class="controls">' +
        '<div class="field"><label>Setup</label><select data-f="setup">' +
          SETUPS.map(function (s) { return '<option value="' + s.id + '">' + s.name + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Policy</label><select data-f="policy">' +
          POLICIES.map(function (p) { return '<option value="' + p.id + '"' + (p.id === 'bal' ? ' selected' : '') + '>' + p.name + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Turns</label><input type="number" data-f="turns" value="60" min="5" max="300"></div>' +
        '<div class="field custom-p" hidden><label>Trigger at % of budget</label><input type="number" data-f="thr" value="80" min="20" max="99"></div>' +
        '<div class="field custom-p" hidden><label>Keep recent turns</label><input type="number" data-f="keep" value="5" min="1" max="30"></div>' +
        '<div class="field"><label>Tokens added / turn</label><input type="number" data-f="added" value="900" min="50" step="50"></div>' +
        '<div class="field"><label>Output / turn</label><input type="number" data-f="out" value="350" min="25" step="25"></div>' +
        '<div class="field"><label>Summary size</label><input type="number" data-f="sum" value="800" min="100" step="100"></div>' +
      '</div>' +
      '<div class="readout">' +
        '<div class="stats">' +
          '<div class="stat"><span class="k">Session wall clock</span><span class="v" data-o="total"></span></div>' +
          '<div class="stat"><span class="k">Compactions</span><span class="v" data-o="ncomp"></span></div>' +
          '<div class="stat"><span class="k">Lost to re-prefill</span><span class="v" data-o="lost"></span></div>' +
        '</div>' +
        '<div class="legend"><span class="pf"><i></i>prefill</span><span class="dc"><i></i>decode</span></div>' +
        '<div class="turns" data-o="bars"></div>' +
        '<div class="axis"><span>turn 1</span><span data-o="last"></span></div>' +
        '<div class="verdict" data-o="verdict"></div>' +
      '</div>' +
      '<footer>Spikes are compaction turns: the prefix was rewritten, so the whole shortened context is prefilled uncached. A policy that never spikes is either never compacting — and will hit the memory wall — or compacting so often that every turn is a spike.</footer>';

    var el = {}; root.querySelectorAll('[data-f]').forEach(function (n) { el[n.dataset.f] = n; });
    var out = {}; root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });

    function compute() {
      var s = SETUPS.filter(function (x) { return x.id === el.setup.value; })[0];
      var pol = POLICIES.filter(function (x) { return x.id === el.policy.value; })[0];
      var isCustom = pol.id === 'custom';
      root.querySelectorAll('.custom-p').forEach(function (n) { n.hidden = !isCustom; });

      var thr = isCustom ? (+el.thr.value / 100) : pol.thr;
      var keep = isCustom ? +el.keep.value : pol.keep;
      var turns = Math.max(5, Math.min(300, +el.turns.value || 60));
      var added = +el.added.value || 0, outTok = +el.out.value || 1, summary = +el.sum.value || 0;

      var perTurnTokens = added + outTok;
      var kvGBperToken = s.kv * 1024 / 1e9;
      var ctxBudgetTokens = Math.max(0, (s.budget * thr - s.weights)) / kvGBperToken;

      var ctx = 1200;            // system prompt + tool definitions
      var rows = [], total = 0, ncomp = 0, lost = 0, died = 0;

      for (var i = 0; i < turns; i++) {
        var compacted = false;
        if (ctx + perTurnTokens > ctxBudgetTokens) {
          if (ctxBudgetTokens < summary + keep * perTurnTokens + 1200) { died = i + 1; break; }
          ctx = 1200 + summary + keep * perTurnTokens;
          ncomp++; compacted = true;
        }
        var toPrefill = compacted ? ctx : (i === 0 ? ctx : added);
        var pf = toPrefill / s.pp, dc = outTok / s.tg;
        if (compacted) lost += (ctx - added) / s.pp;
        rows.push({ pf: pf, dc: dc, t: pf + dc, c: compacted });
        total += pf + dc;
        ctx += perTurnTokens;
      }

      out.total.textContent = fmtTime(total);
      out.ncomp.textContent = ncomp;
      out.lost.textContent = fmtTime(lost);
      out.last.textContent = died ? 'died at turn ' + died : 'turn ' + rows.length;

      var max = Math.max.apply(null, rows.map(function (r) { return r.t; })) || 1;
      out.bars.innerHTML = rows.map(function (r) {
        var h = Math.max(2, (r.t / max) * 88);
        return '<div class="bar" style="height:' + h.toFixed(1) + 'px' + (r.c ? ';opacity:1' : '') +
          '" title="' + fmtTime(r.t) + (r.c ? ' (compaction)' : '') + '">' +
          '<span class="pf" style="height:' + ((r.pf / r.t) * 100).toFixed(1) + '%"></span></div>';
      }).join('');

      var v = out.verdict; v.className = 'verdict';
      if (died) {
        v.classList.add('bad');
        v.textContent = 'Session died at turn ' + died + '. ' + (pol.id === 'none'
          ? 'With no compaction the context grows until it exceeds memory. On a small machine this arrives fast.'
          : 'The budget cannot even hold a summary plus ' + keep + ' recent turns. Keep fewer turns, shorten the summary, or use a model with a smaller cache.');
      } else if (ncomp === 0) {
        v.classList.add('ok');
        v.textContent = 'Never needed to compact — the whole session fits. Compaction policy is irrelevant at this session length on this hardware.';
      } else {
        var pct = (lost / total * 100);
        v.classList.add(pct > 25 ? 'warn' : 'ok');
        v.textContent = ncomp + ' compactions cost ' + fmtTime(lost) + ' of re-prefill, ' + pct.toFixed(0) +
          '% of the session. ' + (pct > 25
            ? 'That is a lot of dead time — raise the trigger threshold so compaction happens later and less often.'
            : 'Acceptable overhead. Raising the threshold further trades safety margin for a little more speed.');
      }
    }
    root.addEventListener('input', compute);
    root.addEventListener('change', compute);
    compute();
  });
})();
