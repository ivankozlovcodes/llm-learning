/* ============================================================
   Token meter. Shared component.

   Drop <div class="calc" data-tokenmeter></div> into a lesson,
   link ../assets/calc.css, and load this file.

   Prices a token count three ways: as input (prefill), as output
   (decode), and as KV cache held for the rest of the session.

   It does not guess token counts. The samples carry counts
   measured with Qwen3's actual tokenizer, and "my own content"
   asks you to classify the text yourself and applies the
   measured chars-per-token ratio for that class. Classifying
   your own output is the skill; a heuristic that does it badly
   would only hide the lesson.
   ============================================================ */

(function () {
  'use strict';

  /* All figures measured with Qwen/Qwen3-1.7B tokenizer.json via
     the `tokenizers` library. chars / tokens = ratio. */
  var CLASSES = [
    { id: 'prose',  name: 'English prose',                   ratio: 4.95 },
    { id: 'json',   name: 'JSON — schemas, structured output', ratio: 4.62 },
    { id: 'code',   name: 'Source code',                     ratio: 4.09 },
    { id: 'md',     name: 'Markdown / HTML documents',       ratio: 3.43 },
    { id: 'diff',   name: 'Unified diff',                    ratio: 3.62 },
    { id: 'i18n',   name: 'Non-English prose (Cyrillic)',    ratio: 3.38 },
    { id: 'listing',name: 'Aligned columns — ls, tables, logs', ratio: 1.84 },
    { id: 'hash',   name: 'Hashes, UUIDs, hex',              ratio: 1.07 },
    { id: 'num',    name: 'Bare numbers',                    ratio: 1.00 }
  ];

  /* Token counts here are exact: each string below was run
     through the tokenizer, not estimated. */
  var SAMPLES = [
    { id: 'schema', name: 'A JSON tool schema', chars: 412, tokens: 84 },
    { id: 'call',   name: 'One assistant tool call', chars: 96, tokens: 31 },
    { id: 'prose',  name: 'A paragraph of prose', chars: 272, tokens: 53 },
    { id: 'diff',   name: 'A small unified diff', chars: 348, tokens: 96 },
    { id: 'ls',     name: 'Six lines of `ls -la`', chars: 417, tokens: 235 },
    { id: 'file',   name: 'A 491-line file read in whole', chars: 29084, tokens: 8572 },
    { id: 'prefix', name: 'A 7-tool static prefix', chars: 7129, tokens: 1706 }
  ];

  var MACHINES = [
    { id: 'm1',    name: 'M1 8 GB — 118 prefill / 14 decode', pp: 117.96, tg: 14.15, kv: 144 },
    { id: 'm1max', name: 'M1 Max — 530 prefill / 61 decode',  pp: 530.06, tg: 61.19, kv: 144 },
    { id: 'm4pro', name: 'M4 Pro 48 GB — 273 GB/s (estimated)', pp: 620,  tg: 76,    kv: 144 },
    { id: 'm4max', name: 'M4 Max 48 GB — 546 GB/s (estimated)', pp: 1240, tg: 153,   kv: 144 },
    { id: 'm64',   name: '64 GB, Ornith-35B-A3B (estimated)', pp: 900,    tg: 100,   kv: 80 }
  ];

  function fmt(n, dp) {
    return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }

  function secs(s) {
    if (s < 1) return fmt(s * 1000, 0) + ' ms';
    if (s < 90) return fmt(s, 1) + ' s';
    return fmt(s / 60, 1) + ' min';
  }

  function bytes(b) {
    if (b < 1e6) return fmt(b / 1e3, 0) + ' KB';
    if (b < 1e9) return fmt(b / 1e6, 1) + ' MB';
    return fmt(b / 1e9, 2) + ' GB';
  }

  function opts(list, sel) {
    return list.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + x.name + '</option>';
    }).join('');
  }

  document.querySelectorAll('[data-tokenmeter]').forEach(function (root) {
    root.className = 'calc';
    root.innerHTML =
      '<header>' +
        '<span class="tag">Token meter</span>' +
        '<p class="sub">One token count, priced in three currencies. Switch machines and watch the gap.</p>' +
      '</header>' +
      '<div class="controls">' +
        '<div class="field wide"><label>What are you pricing?</label><select data-f="mode">' +
          '<option value="sample" selected>A measured sample</option>' +
          '<option value="own">My own content</option>' +
        '</select></div>' +
        '<div class="field wide only-sample"><label>Sample</label><select data-f="sample">' +
          opts(SAMPLES, 'schema') + '</select></div>' +
        '<div class="field only-own"><label>Characters</label>' +
          '<input type="number" data-f="chars" min="0" step="100" value="4000"></div>' +
        '<div class="field only-own"><label>Content type</label><select data-f="cls">' +
          opts(CLASSES, 'prose') + '</select></div>' +
        '<div class="field wide"><label>Machine</label><select data-f="machine">' +
          opts(MACHINES, 'm1') + '</select></div>' +
      '</div>' +
      '<div class="readout">' +
        '<div class="chain">' +
          'characters<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="chars"></span>' +
            '<span class="op"> &nbsp; <span data-o="ratio"></span></span><br>' +
          'as <strong>input</strong> &mdash; prefill, uncached<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="pp"></span><br>' +
          'as <strong>output</strong> &mdash; decode<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="tg"></span><br>' +
          'KV cache, held to end of session<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="kv"></span><br>' +
          'over 20 more turns, uncached<span class="op"> &nbsp;·&nbsp; </span><span class="v" data-o="forever"></span>' +
        '</div>' +
        '<div class="headline"><span class="big" data-o="tokens"></span><span class="unit">tokens</span></div>' +
        '<div class="fit" data-o="verdict"></div>' +
      '</div>' +
      '<footer>Sample token counts are exact, measured with <code>Qwen/Qwen3-1.7B</code>&rsquo;s tokenizer. ' +
      'Chars-per-token ratios for &ldquo;my own content&rdquo; come from the same measurements: prose 4.95, ' +
      'JSON 4.62, code 4.09, markdown 3.43, diff 3.62, aligned columns 1.84, hashes 1.07, bare numbers 1.00. ' +
      'M1 and M1 Max rates are <code>llama-bench</code> figures for llama 7B Q4_0 (pp512 / tg128); the 64 GB ' +
      'row is predicted, not measured.</footer>';

    var el = {}, out = {};
    root.querySelectorAll('[data-f]').forEach(function (n) { el[n.dataset.f] = n; });
    root.querySelectorAll('[data-o]').forEach(function (n) { out[n.dataset.o] = n; });

    function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }

    function compute() {
      var own = el.mode.value === 'own';
      root.querySelectorAll('.only-own').forEach(function (n) { n.hidden = !own; });
      root.querySelectorAll('.only-sample').forEach(function (n) { n.hidden = own; });

      var tokens, chars, ratio, exact;
      if (own) {
        chars = Math.max(0, +el.chars.value || 0);
        ratio = byId(CLASSES, el.cls.value).ratio;
        tokens = Math.round(chars / ratio);
        exact = false;
      } else {
        var s = byId(SAMPLES, el.sample.value);
        chars = s.chars; tokens = s.tokens; ratio = s.chars / s.tokens; exact = true;
      }

      var m = byId(MACHINES, el.machine.value);
      out.chars.textContent = fmt(chars, 0);
      out.ratio.textContent = '(' + fmt(ratio, 2) + ' chars/token' + (exact ? ', measured' : '') + ')';
      out.tokens.textContent = fmt(tokens, 0);
      out.pp.textContent = secs(tokens / m.pp);
      out.tg.textContent = secs(tokens / m.tg);
      out.kv.textContent = bytes(tokens * m.kv * 1e3);
      out.forever.textContent = secs(20 * tokens / m.pp);

      var asym = m.pp / m.tg;
      var v = out.verdict;
      if (!tokens) {
        v.className = 'fit tight';
        v.innerHTML = 'Enter a character count.';
      } else {
        v.className = 'fit ok';
        v.innerHTML = '<strong>Producing these tokens costs ' + fmt(asym, 1) +
          '× what reading them costs</strong> on this machine &mdash; ' + fmt(m.pp, 0) + ' tokens/s in against ' +
          fmt(m.tg, 0) + ' out. But you read them once and then re-read them every turn, so a prefix cache hit ' +
          'is worth more than the asymmetry suggests: it turns ' + secs(20 * tokens / m.pp) +
          ' of repeated prefill into nothing.';
      }
    }

    root.addEventListener('input', compute);
    root.addEventListener('change', compute);
    compute();
  });
})();
