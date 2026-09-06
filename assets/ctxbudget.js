/* ============================================================
   Context budget breakdown. Shared component.

   Drop <div class="calc" data-ctxbudget></div> into a lesson,
   link ../assets/calc.css and ../assets/ctxbudget.css, then load
   this file.

   Shows what fills the context window before the user speaks,
   as a stacked bar, against the two ceilings that actually bind:

     memory ceiling    = (budget - weights) / KV bytes per token
     attention ceiling = where the model stops being reliable

   Component token counts were measured with Qwen3's tokenizer
   against a realistic seven-tool harness prefix.
   ============================================================ */

(function () {
  'use strict';

  /* Measured with Qwen/Qwen3-1.7B tokenizer.json. */
  var TOOL_TOKENS = 92;        /* mean of 7 real schemas: 111,90,104,104,98,69,69 */
  var SYSTEM_TOKENS = 128;     /* a 645-char system prompt */
  var ENV_TOKENS = 64;         /* a 168-char environment block */
  var AGENTS_PER_KB = 228;     /* MISSION.md: 3786 chars -> 863 tokens */

  var SETUPS = [
    { id: 'm8',  name: '8 GB Mac · Qwen3-4B Q4_K_M',
      budgetGB: 4.2, weightsGB: 2.50, kvKB: 144, attention: 16000,
      note: 'Lesson 5&rsquo;s budget, Lesson 3&rsquo;s KV geometry.' },
    { id: 'm48', name: '48 GB M4 · Ornith-1.5-35B-A3B Q4_K_M',
      budgetGB: 36, weightsGB: 21.71, kvKB: 80, attention: 32000,
      note: 'The trip machine, once it is the M4 rather than the M1.' },
    { id: 'm64', name: '64 GB Mac · Ornith-1.5-35B-A3B Q4_K_M',
      budgetGB: 48, weightsGB: 21.71, kvKB: 80, attention: 32000,
      note: 'Lesson 15&rsquo;s recommendation, at Lesson 3&rsquo;s 48 GB usable.' }
  ];

  function fmt(n, dp) {
    return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }

  document.querySelectorAll('[data-ctxbudget]').forEach(function (root) {
    root.className = 'calc';
    root.innerHTML =
      '<header>' +
        '<span class="tag">Context budget</span>' +
        '<p class="sub">What is spoken for before you type, and which ceiling you hit first.</p>' +
      '</header>' +
      '<div class="controls">' +
        '<div class="field wide"><label>Machine and model</label><select data-f="setup">' +
          SETUPS.map(function (s) { return '<option value="' + s.id + '">' + s.name + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>Tools registered</label><div class="range-row">' +
          '<input type="range" data-f="tools" min="0" max="40" step="1" value="7">' +
          '<span class="range-val" data-o="toolsv">7</span></div></div>' +
        '<div class="field"><label>Project instructions (KB)</label><div class="range-row">' +
          '<input type="range" data-f="agents" min="0" max="40" step="1" value="4">' +
          '<span class="range-val" data-o="agentsv">4</span></div></div>' +
        '<div class="field"><label>Files read into context (KB)</label><div class="range-row">' +
          '<input type="range" data-f="files" min="0" max="200" step="2" value="0">' +
          '<span class="range-val" data-o="filesv">0</span></div></div>' +
        '<div class="field"><label>Conversation so far (turns)</label><div class="range-row">' +
          '<input type="range" data-f="turns" min="0" max="60" step="1" value="0">' +
          '<span class="range-val" data-o="turnsv">0</span></div></div>' +
      '</div>' +
      '<div class="readout">' +
        '<div class="ctx-bar" data-o="bar"></div>' +
        '<div class="ctx-key" data-o="key"></div>' +
        '<div class="chain">' +
          'memory ceiling<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="memc"></span>' +
            '<span class="op"> &nbsp; <span data-o="memf"></span></span><br>' +
          'attention ceiling<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="attc"></span>' +
            '<span class="op"> &nbsp; where the model stops being reliable</span>' +
        '</div>' +
        '<div class="headline"><span class="big" data-o="used"></span><span class="unit">tokens used, of <span data-o="binding"></span> usable</span></div>' +
        '<div class="fit" data-o="verdict"></div>' +
      '</div>' +
      '<footer>Token counts measured with <code>Qwen/Qwen3-1.7B</code>&rsquo;s tokenizer: a system prompt of 128, ' +
      'an environment block of 64, tool schemas averaging 92 each, and markdown at 228 tokens/KB. A turn is ' +
      'modelled as one 30-token call plus a 400-token tool result. The attention ceiling is a judgement call, ' +
      'not a measurement &mdash; it is where published long-context evaluations show reliability falling away.</footer>';

    var el = {}, out = {};
    root.querySelectorAll('[data-f]').forEach(function (n) { el[n.dataset.f] = n; });
    root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });

    function compute() {
      var s = SETUPS.filter(function (x) { return x.id === el.setup.value; })[0];
      var nTools = +el.tools.value, agentsKB = +el.agents.value;
      var filesKB = +el.files.value, turns = +el.turns.value;

      out.toolsv.textContent = nTools;
      out.agentsv.textContent = agentsKB;
      out.filesv.textContent = filesKB;
      out.turnsv.textContent = turns;

      var parts = [
        { k: 'system',  label: 'system prompt',       n: SYSTEM_TOKENS },
        { k: 'env',     label: 'environment block',   n: ENV_TOKENS },
        { k: 'tools',   label: 'tool schemas',        n: nTools * TOOL_TOKENS },
        { k: 'agents',  label: 'project instructions', n: Math.round(agentsKB * AGENTS_PER_KB) },
        { k: 'files',   label: 'files read in',       n: Math.round(filesKB * AGENTS_PER_KB) },
        { k: 'hist',    label: 'conversation',        n: turns * 430 }
      ];
      var used = parts.reduce(function (a, p) { return a + p.n; }, 0);
      var staticPrefix = parts[0].n + parts[1].n + parts[2].n + parts[3].n;

      var memC = Math.floor((s.budgetGB - s.weightsGB) * 1e9 / (s.kvKB * 1e3));
      var attC = s.attention;
      var binding = Math.min(memC, attC);
      var bindingName = memC < attC ? 'memory' : 'attention';

      out.memc.textContent = fmt(memC, 0) + ' tokens';
      out.memf.textContent = '(' + fmt(s.budgetGB - s.weightsGB, 2) + ' GB free ÷ ' + s.kvKB + ' KB/token)';
      out.attc.textContent = '~' + fmt(attC, 0) + ' tokens';
      out.used.textContent = fmt(used, 0);
      out.binding.textContent = fmt(binding, 0);

      /* stacked bar, scaled to the binding ceiling */
      var scale = Math.max(binding, used);
      out.bar.innerHTML = parts.filter(function (p) { return p.n > 0; }).map(function (p) {
        return '<span class="seg seg-' + p.k + '" style="width:' + (100 * p.n / scale).toFixed(2) + '%" ' +
               'title="' + p.label + ': ' + fmt(p.n, 0) + '"></span>';
      }).join('') +
      (used < scale ? '<span class="seg seg-free" style="width:' + (100 * (scale - used) / scale).toFixed(2) + '%"></span>' : '') +
      '<span class="ceil" style="left:' + (100 * binding / scale).toFixed(2) + '%"></span>';

      out.key.innerHTML = parts.filter(function (p) { return p.n > 0; }).map(function (p) {
        return '<span class="k"><i class="seg-' + p.k + '"></i>' + p.label + ' <b>' + fmt(p.n, 0) + '</b></span>';
      }).join('');

      var v = out.verdict;
      var pct = 100 * staticPrefix / binding;
      if (used > binding) {
        v.className = 'fit no';
        v.innerHTML = '<strong>Over the ' + bindingName + ' ceiling by ' + fmt(used - binding, 0) + ' tokens.</strong> ' +
          (bindingName === 'memory'
            ? 'The machine starts swapping and the session slows to a crawl. Compact, or read less in.'
            : 'It still runs, and it still answers &mdash; it is just quietly less reliable. This failure is invisible.');
      } else if (used > binding * 0.8) {
        v.className = 'fit tight';
        v.innerHTML = '<strong>' + fmt(100 * used / binding, 0) + '% of the ' + bindingName +
          ' ceiling.</strong> Compaction territory. ' + fmt(pct, 0) +
          '% of the budget went on the static prefix before a word was typed.';
      } else {
        v.className = 'fit ok';
        v.innerHTML = '<strong>' + bindingName.charAt(0).toUpperCase() + bindingName.slice(1) +
          ' binds first here, at ' + fmt(binding, 0) + ' tokens.</strong> The static prefix alone is ' +
          fmt(staticPrefix, 0) + ' tokens &mdash; ' + fmt(pct, 0) + '% of what you have, spent before the user speaks.';
      }
    }

    root.addEventListener('input', compute);
    root.addEventListener('change', compute);
    compute();
  });
})();
