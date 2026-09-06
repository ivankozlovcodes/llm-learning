# Ornith-1.5-35B-A3B supersedes Qwen3-30B-A3B as the 64 GB recommendation

Lesson 3 named Qwen3-30B-A3B the best fit for the 64 GB machine on three criteria: small active
parameter count, few KV heads, fits with headroom. Research for Lesson 15 surfaced
**Ornith-1.5-35B-A3B** (released 2026-08-19, MIT), which beats it on every one: ~3B active,
**2 KV heads** and head-dim 256 giving 80 KB/token against Qwen3-30B-A3B's 96 KB, 21.71 GB at
Q4_K_M, 262k native context — the full window fits in ~48 GB. Verified from `config.json` and the
HF file API, not from the model card.

**Implications:** The criteria held; only the winner changed. Lesson 3 now carries a forward note to
Lesson 15 rather than being rewritten, which preserves the reasoning while correcting the
recommendation. This is the pattern to repeat when models move: check whether the criteria were
wrong or merely out-competed. Also confirms the wider architectural shift recorded in Lesson 15 —
KV heads collapsing from 8 to 2 in the current generation, which is invisible on spec sheets and
matters more than most benchmark gaps.
