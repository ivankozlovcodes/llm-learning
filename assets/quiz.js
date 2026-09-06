/* ============================================================
   Retrieval-practice widgets. Shared across all lessons.

   Quiz markup:
     <div class="quiz">
       <span class="qnum">Question 1</span>
       <p class="q">…</p>
       <div class="options">
         <button class="opt" data-correct>…</button>
         <button class="opt">…</button>
       </div>
       <div class="explain">…</div>
     </div>

   Reveal markup:
     <div class="reveal">
       <span class="tag">Predict first</span>
       <p class="prompt">…</p>
       <button class="show-answer">Reveal</button>
       <div class="answer">…</div>
     </div>

   Add <div class="scoreboard" data-scoreboard></div> anywhere to
   get a running tally of first-attempt correctness.
   ============================================================ */

(function () {
  'use strict';

  var total = 0, correct = 0;

  function paintScoreboard() {
    document.querySelectorAll('[data-scoreboard]').forEach(function (board) {
      var all = document.querySelectorAll('.quiz').length;
      if (total === 0) {
        board.innerHTML = '<span class="verdict">Answer the questions above and your score appears here.</span>';
        return;
      }
      var verdict;
      if (total < all) {
        verdict = 'Keep going — ' + (all - total) + ' left.';
      } else if (correct === all) {
        verdict = 'Clean sweep. The model is in place — go and use it on a real spec sheet.';
      } else if (correct >= all - 1) {
        verdict = 'Solid. Re-read the explanation on the one you missed.';
      } else {
        verdict = 'Worth another pass over the worked example before moving on.';
      }
      board.innerHTML = '<span class="tally">' + correct + ' / ' + all + '</span>' +
                        '<span class="verdict">' + verdict + '</span>';
    });
  }

  document.querySelectorAll('.quiz').forEach(function (quiz) {
    var opts = quiz.querySelectorAll('button.opt');
    var explain = quiz.querySelector('.explain');
    var answered = false;

    opts.forEach(function (btn) {
      if (btn.hasAttribute('data-correct')) btn.classList.add('answer-key');

      btn.addEventListener('click', function () {
        if (answered) return;
        answered = true;
        total += 1;

        var isRight = btn.hasAttribute('data-correct');
        if (isRight) correct += 1;

        opts.forEach(function (o) {
          o.disabled = true;
          if (o.hasAttribute('data-correct')) o.classList.add('correct');
          else if (o === btn) o.classList.add('wrong');
          else o.classList.add('dim');
        });

        if (explain) explain.classList.add('show');
        paintScoreboard();
      });
    });
  });

  document.querySelectorAll('.reveal').forEach(function (block) {
    var btn = block.querySelector('button.show-answer');
    var ans = block.querySelector('.answer');
    if (!btn || !ans) return;
    btn.addEventListener('click', function () {
      ans.classList.add('show');
      btn.style.display = 'none';
    });
  });

  paintScoreboard();
})();
