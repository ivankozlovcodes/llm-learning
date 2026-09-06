# Working Notes

## About Ivan
- Came to this from a concrete purchase decision: MacBook M1 Max 64 GB @ $1,000 vs DGX Spark @ $4,499–4,699.
- Responds well to arithmetic and tables. The opening conversation was settled by numbers, not adjectives.
- Has used Ollama / LM Studio. Has not touched quant flags, context settings, or benchmarking tools.
- Answered the workload question with explicit likelihoods rather than picking one — thinks in probabilities. Lessons can use ranges and estimates without over-simplifying.

## Teaching preferences
- (none stated yet — update as they emerge)

## Open threads
- Mission mentions the buy decision as an output. Once prefill / KV-cache reuse / batching are in place, run a dedicated "make the call" session that produces a written rationale.
- Fine-tuning is **in scope** as of 2026-09-05 — Ivan asked for it directly. Narrowed to behaviour (tool selection, stop conditions), not knowledge. See learning record 0007.
- **Resolved 2026-09-05:** a **48 GB M4** (corporate) travels with him too. Three machines now. Size hands-on work against 4.2 GB (M1) *and* ~36 GB (M4) — see `reference/three-machines.html` and learning record 0010.
- **Unconfirmed and worth 2×:** M4 Pro (273 GB/s) vs M4 Max (546 GB/s). Both ship with 48 GB. Ask, or have him run `sysctl -n machdep.cpu.brand_string` and check GPU core count (16/20 = Pro, 40 = Max).
- **He asked for addenda, not rewrites.** Past lessons stay as written; new facts append as dated `.addendum` blocks with the arithmetic in a shared reference doc. Follow this pattern for future hardware changes.
- Ivan reasons in likelihoods and corrects framings when they're wrong — take his scope corrections at face value and rewrite rather than patching around them.
- Resolved: it is both, with **pi plugin development first**. Ground examples in pi's extension API wherever possible.
- Lesson order Ivan chose: KV cache memory → hands-on benchmarking → tool calling / structured output. Buy decision after those.
- Ivan inserted a micro-PC lesson (Jetson / Pi AI HAT) after Lesson 3, so benchmarking is now Lesson 5. He asks for topics by rough gesture ("nvidia jensen nano") — confirm the referent, then go deep.
- New hardware candidate surfaced in Lesson 4 and not yet priced properly: **Mac mini M4 Pro**, 273 GB/s (same as Spark and Thor), 64 GB configurable, from $1,599. Price the 64 GB config before the buy-decision session.
- Ivan uses terse shorthand ("pi", "1 then 2 then 3"). Confirm referents rather than assuming, but don't over-ask — he answers precisely when asked precisely.

## Workspace state (all 19 lessons drafted)
- Parts: 1 physics (1-4), 2 model layer (5-8), 3 harness (9-13 + 17-19), 4 staying current (14-15), 5 changing the model (16). `index.html` is the offline entry point with localStorage progress ticks.
- **Index groups by topic, not by number.** 17 and 18 sit inside Part Three after Lesson 9. Lessons are appended and cross-linked, never renumbered — renumbering would break every link in 18 files.
- Twelve reusable components in `assets/`: quiz+reveal, napkin calculator, KV calculator, agent-loop simulator, roofline chart, quantization explorer, sampler explorer, compaction simulator, training budget calculator, token meter, context budget, vector store.
- Two reference docs: `napkin-math.html` (inference) and `finetuning-and-merging.html` (training).
- Everything renders offline — no CDN, system fonts, local assets only. External links are citations.
- Verified-from-source facts (HF API / config.json) are safe to reuse. Lesson 15's *benchmark* claims are aggregator-sourced and flagged as such in-page.
- Deliberately not built: hands-on `llama-bench` lesson (Ivan declined the download pack) and the buy-decision capstone (hardware decision closed).

## Offline setup
- `OFFLINE-SETUP.md` is agent-executable instructions to run **on the 8 GB M1 MacBook**, which already has a llama.cpp clone. `offline/sources.txt` holds the fourteen cited URLs.
- pi's docs live in the repo: `packages/coding-agent/docs/` (30 `.md` files) contains all 23 pi.dev TOC pages plus 7 the site nav hides, including `llama-cpp.md`. Verified by matching sampled repo phrases against the rendered page, not by filename alone.
- pi.dev *is* crawlable — each page embeds its full content — but a `.md` suffix returns rendered HTML, not markdown (`/extensions` and `/extensions.md` are the same 482 KB). Only the 404 pages return a bare 23 KB shell; I over-generalised from those twice. Clone the repo instead.
- **Offline reference docs and pi docs are separate problems.** Keep them apart; conflating them produced a worse answer.
- Reference docs are a solved problem: **Dash** ($29.99, macOS-native, the right tool if Ivan will pay), **dasht** (`brew install dasht`, free, same Kapeli docsets, CLI). Zeal is Linux/Windows only. I built `offline/devdocs/viewer.html` + `fetch-devdocs.sh` before searching — it works and needs no install, but dasht is the existing solution and should be offered first.
- DevDocs tarballs are directly fetchable at `https://downloads.devdocs.io/<slug>.tar.gz` (832 slugs), which is what the bundled viewer uses.
- The JSON is wrapped as JS (`DEVDOCS.index(...)`) specifically so `viewer.html` works by double-clicking; `fetch()` on `file://` is blocked in Chrome and Safari.

## Follow-ups opened by Lesson 16
- The hands-on has never been run. No measured tokens/sec or peak memory for QLoRA on an 8 GB M1 exists anywhere in the workspace — the activation term in `trainbudget.js` is a ±2× estimate. First real run should be turned into a calibration note and the estimate tightened.
- Building a dataset from Ivan's own pi transcripts is the obvious next hands-on session, and it needs the held-out eval set first. That eval set is also the open gap RESOURCES.md lists under "evaluating model quality locally" — one piece of work closes both.
- `mlx_lm.fuse --export-gguf` is limited to Mistral/Mixtral/Llama-style models in fp16, so a fine-tuned Qwen3 cannot round-trip to llama.cpp that way. Matters if Ivan wants the result served through pi's `/llama` path rather than MLX. Unresolved.

## Tokenizer measurement rig
- `tokenizers` in a scratch venv + `Qwen/Qwen3-1.7B`'s `tokenizer.json` (11 MB, fetched from HF) is enough to measure anything. No `transformers` needed. This is how every token figure in Lessons 17-18 was produced — reuse it rather than estimating.
- Qwen3 tokenizes **every digit separately**. Hashes 1.07 chars/token, bare numbers 1.00, prose 4.95. The four-chars rule is only right for prose.
- Measured static prefix for a realistic 7-tool harness: 1,706 tokens (system 128, env 64, tool schemas 651, project instructions 863). Tool schemas average 92 tokens each. Markdown is ~228 tokens/KB.
- **I shipped a heuristic token estimator, validated it at 47% error, and threw it away.** Don't rebuild it. If a widget needs token counts, measure them offline and ship the numbers, or make the user classify their own content.

## Follow-ups opened by Lessons 17-18
- **Lesson 11's compaction policy has a real defect**, found by writing 18: it triggers on memory only, so it never fires on the 64 GB machine, where attention binds ~10× sooner. A quality trigger needs designing and 11 needs a forward note. Highest-value next session.
- "Structured note-taking" (persist state outside the window) is the one Anthropic tactic with nothing built for it — a pi tool that writes findings to a file and reads them back. Natural plugin project.
- The attention-ceiling figures (16k for a 4B, 32k for a 35B) are judgement calls informed by RULER/NoLiMa, not measurements. If Ivan wants them tightened, that is a personal-eval-set job — same piece of work as the fine-tuning eval set.

## Follow-ups opened by Lesson 19
- **Ivan brought his own model candidates for the first time** (two WeMM GGUF repos, by exact name). He had picked the 2B and 9B; the 9B does not fit 4.2 GB and the 4B he had not seen is the interesting one. Confirm-the-referent-then-verify-from-source paid off — check HF API before assuming a named repo is real *or* fake.
- Nothing has been measured on real hardware: prefill rates in `vecstore.js` are scaled predictions (±2×). One `llama-bench` run on the 2B would calibrate the whole component.
- The retrieval pi plugin (`search_code`) is now the obvious build: it closes Lesson 18's structured-note-taking gap and Lesson 16's "use retrieval instead" in one piece of work.
- Not yet taught: chunking strategy, hybrid keyword+vector search, and reranking (`LLAMA_POOLING_TYPE_RANK` exists). Glossary carries "reranking" as provisional.
- Unverified: whether Ollama's embedding endpoint exposes the multimodal path. The 2B repo's note implies Ollama sees it as an embedding model, but says nothing about images.

## Follow-ups opened by the 48 GB M4
- **Nothing in this workspace is measured on real hardware.** Offline setup Step 4 now asks for `llama-bench` pp512/tg128 per machine into `offline/MACHINE.md`. Two numbers per machine would replace every "estimated" row in Lessons 17, 19 and `three-machines.html`.
- The Lesson 11 compaction defect is now wrong on 2 of 3 machines. Designing the quality trigger is overdue.
- Untested: the M4-serves-M1 routing pattern (llama-server on M4, pi on M1 via `~/.pi/agent/models.json`). Written up in Lesson 12's addendum but never run.
- `NVIM.md` written from his real config; he does the M4 setup tomorrow. If anything in it is wrong, that is the feedback to capture.
