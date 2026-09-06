# The context window has two ceilings, and which one binds flips between Ivan's machines

Ivan asked for a lesson on "general harness usage — how is prompt being processed, how is context
managed", and asked me to check whether one already existed. It largely did: **Lesson 9** covers pi's
pipeline (`AgentMessage[] → transformContext() → convertToLlm() → Message[] → LLM`, the four hooks,
the event timeline) and **Lesson 11** covers compaction. Lessons 2, 3, 7 and 10 cover the costs
around them. Rebuilding any of that would have been duplication.

**The real gap was on the input side.** Everything in 9 and 11 concerns what happens to the context
*once it exists*, or how to cut it down. Nothing covered what fills it before turn one, in what
order, or at what cost. Grep confirmed it: "context engineering", "token budget" and "environment"
appeared nowhere across fifteen lessons. The stable-head ordering idea appeared twice, both times as
a passing caveat rather than a subject.

**The synthesis that made the lesson worth writing** is a conclusion neither source material states
directly, and it falls out of numbers already in the workspace:

| Machine | Memory ceiling | Attention ceiling | Binds |
|---|---|---|---|
| 8 GB M1, Qwen3-4B, 144 KB/token | (4.2 − 2.50) GB ÷ 144 KB ≈ 11,800 | ~16,000 | **Memory** |
| 64 GB, Ornith-35B-A3B, 80 KB/token | (48 − 21.71) GB ÷ 80 KB ≈ 328,000 | ~32,000 | **Attention**, by 10× |

Same harness, opposite failure mode. On the 8 GB machine the limit is physical and the failure is
loud (swapping). On the 64 GB machine memory permits ten times more context than the model handles
well, so a memory-triggered compaction policy never fires and quality degrades with no signal at all.
**A compaction plugin that only watches memory is correct on exactly one of Ivan's two machines** —
which is a concrete design defect in the Lesson 11 policy, found by writing Lesson 18.

**Measured rather than recalled.** I installed `tokenizers` in a scratch venv and ran real text
through `Qwen/Qwen3-1.7B`'s tokenizer rather than repeating the four-chars-per-token folklore.
Findings worth keeping: Qwen3 tokenizes **every digit separately**, so hashes run 1.07 chars/token
and bare numbers 1.00 against prose's 4.95 — 3–5× worse for exactly the output agent tools tend to
produce. A realistic seven-tool static prefix is **1,706 tokens**, of which the project instructions
file (863) is larger than all seven tool schemas combined (651).

**A process note.** I first built the token-meter widget around a heuristic that classified pasted
text and estimated its token count. Validated against the real tokenizer it was 47% mean error, and
a constrained refit was worse (20%, with degenerate zero weights). Rather than ship a plausible-
looking estimator, I rebuilt the widget to price *measured* counts and to ask the user to classify
their own content. The lesson's reveal question had the same problem: I asserted a `git log` sample
would be ~1,180 tokens, measured it at 678, and rewrote it — the measurement turned out to carry a
better insight anyway (22% of the characters produce 59% of the tokens). **Measure before asserting,
even when the assertion is only a teaching example.**

**Placement decision.** Lessons are appended by creation order and cross-linked rather than
renumbered — renumbering would break every link in fifteen files and the learning records. But the
index groups by *topic*, so 17 and 18 sit inside Part Three after Lesson 9, out of numeric order, and
the Part Three heading now says so.
