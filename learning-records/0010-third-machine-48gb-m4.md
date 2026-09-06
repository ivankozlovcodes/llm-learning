# A 48 GB M4 joins the trip, and the binding constraint flips on the road

On 2026-09-05 Ivan said a **48 GB MacBook Pro M4** — a corporate machine he can install llama.cpp
on — travels with him alongside the 8 GB M1. The workspace had been built around two machines and a
hard 4.2 GB travel budget.

**The instruction was explicit and shaped the whole delivery:** *don't overwrite the existing
lessons — append addenda where 48 GB allows something of value that 8 GB wouldn't.* So nothing was
rewritten. Six lessons (5, 12, 16, 17, 18, 19) gained a dated `.addendum` block after the quiz, and
a new `reference/three-machines.html` holds the arithmetic once so the addenda can stay short.

**The unresolved fork worth carrying forward.** Apple sells 48 GB on **two different chips**: M4 Pro
at **273 GB/s** and M4 Max (16-core CPU / 40-core GPU) at **546 GB/s**. That is 2× in the one
specification that governs decode speed, and it is not guessable — verified against Apple's own tech
specs. If it is the Max, **it is the fastest machine Ivan owns**, ahead of the 64 GB M1 Max's
400 GB/s. Step 0 of the offline setup now records the GPU core count to settle it.

**The finding that matters most.** With ~36 GB usable (75% of installed, the workspace's convention)
and Ornith-1.5-35B-A3B at 21.71 GB, the memory ceiling on the M4 is **178,625 tokens** against an
attention ceiling near 32,000 — so **attention binds, by 5.6×**, exactly as on the home machine. The
travel machine changes sides. Consequence: the Lesson 11 compaction defect recorded in
[0008](0008-two-ceilings-memory-and-attention.md) is now wrong on **two of three machines**, and on
the one Ivan will actually work on during the trip.

**The subtler point, stated in Lesson 18's addendum:** the 8 GB machine *forced* good hygiene. Short
tool results, few files in context, aggressive compaction — survival, not discipline. On 36 GB
nothing stops you reading forty files in and nothing tells you that you have. More memory converts a
loud failure into a silent one.

**Other unlocks, all computed from existing workspace numbers:** a 35B MoE model in the bag at an
estimated 103–205 tok/s; generation model *and* 9B embedder resident simultaneously (27.96 GB,
leaving ~100,000 tokens of KV); a *full* fine-tune of Qwen3-1.7B (19.60 GB) with no LoRA; QLoRA at
batch 4 rather than batch 1; and a routing pattern the workspace could not offer before — the M4
running `llama-server` for pi on the M1 over local Wi-Fi.

**What deliberately did not change.** Tokenization ratios, the stable→volatile ordering rule, the
byte-identical prefix rule, and attention degradation are all machine-independent. Lesson 19's
"build the index at home and carry it" survives too: 4–8× faster indexing turns 20 hours into 3–5,
which is better and still not a thing to start on a plane.

**Offline setup is now two-machine.** A new Step 0 writes `offline/MACHINE.md` with chip, memory,
GPU cores and a `SMALL`/`LARGE` profile that Step 4 branches on; Step 1 gained the llama.cpp install
path for the M4 (it is only pre-cloned on the M1); `offline/sources.txt` grew from 14 to 39 URLs to
cover Lessons 16–19. Step 4 now also asks for a `llama-bench` baseline — **every hardware prediction
in this workspace is still unmeasured**, and two numbers per machine would replace them all.

**Corporate-machine caveats are recorded rather than assumed:** disk quota, MDM/DLP scanning of
large files, TLS-inspecting proxies breaking git and Homebrew, and — a question for Ivan, not for
me — whether policy permits multi-gigabyte model weights on hardware he does not own.

**Bonus deliverable:** `NVIM.md`, written from Ivan's actual config on this machine
(`lazy-workspaces.nvim` bootstrapping `nvim.conf.d`, 42 pinned plugins) rather than generic advice.
Notable details it captures: the HTTPS clone path needs no personal SSH key on a corp machine; the
`myconfig/goog` module must stay `false` unless this is that network; and `<C-,>` for Claude Code
cannot reach Neovim from Terminal.app.
