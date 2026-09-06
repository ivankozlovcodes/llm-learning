# Local LLM Hardware & Models — Resources

Curated, high-trust sources. Knowledge in lessons is drawn from here, not from parametric guesses.

## Knowledge

### Performance first principles
- [LLM inference speed of light — Arseny Kapoulkine (zeux.io, 2024)](https://zeux.io/2024/03/15/llm-inference-sol/)
  The single best short article on why decode is memory-bandwidth bound. Derives the tokens/sec
  ceiling from bandwidth ÷ model bytes, then measures real implementations against it (calm hits
  ~90% of theory on a 4090; llama.cpp 58–82%; Apple M2 CPU ~65%).
  **Use for:** the core mental model, and for realistic efficiency factors.

- [Transformer Inference Arithmetic — kipply (2022)](https://kipp.ly/transformer-inference-arithmetic/)
  First-principles derivation of inference cost: KV cache size, memory vs FLOP boundedness,
  where batching flips the regime. Denser than zeux, no experiments required.
  **Use for:** KV cache capacity maths, why batch size changes everything for pipeline jobs.

- [All About Transformer Inference — JAX scaling book (Google DeepMind)](https://jax-ml.github.io/scaling-book/inference/)
  Rigorous treatment of prefill vs decode, arithmetic intensity, and the roofline model.
  **Use for:** the prefill/decode split, and long-context cost scaling.

- [A guide to LLM inference and performance — Baseten](https://www.baseten.co/blog/llm-transformer-inference-guide/)
  Practitioner-level summary of arithmetic intensity and when each regime binds. Good bridge
  between zeux (intuition) and the scaling book (rigour).
  **Use for:** vocabulary — TTFT, ITL, throughput vs latency.

### Quantization & formats
- [llama.cpp `quantize` README — ggml-org (official)](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)
  The authoritative list of GGUF quant types and their real file sizes / perplexity deltas.
  **Use for:** what Q4_K_M et al. actually mean, and picking one.

- [Which Quantization Should I Use? A Unified Evaluation of llama.cpp Quantization on Llama-3.1-8B (arXiv 2601.14277)](https://arxiv.org/html/2601.14277v1)
  Controlled comparison across the whole GGUF quant ladder on one model. Establishes that
  K-quants have non-integer effective bits-per-weight (Q4_K_M ≈ 4.5 bpw).
  **Use for:** evidence, not folklore, on the quality cost of quantization.

- [Unsloth Dynamic GGUFs — documentation](https://unsloth.ai/docs/basics/unsloth-dynamic-2.0-ggufs)
  How the `UD-` recipes work: per-layer type selection driven by an importance matrix calibrated for
  agentic coding, chat and multilingual use.
  **Use for:** understanding why `UD-IQ1_S` is 1.81 bpw and which layers survive.

### Measured hardware numbers
- [Performance of llama.cpp on Apple Silicon M-series — llama.cpp Discussion #4167](https://github.com/ggml-org/llama.cpp/discussions/4167)
  Community-maintained table of `llama-bench` results across every Apple chip. The reference
  dataset for Mac buying decisions.
  **Use for:** validating predictions against real M1/M2/M3/M4 measurements.

- [Performance of llama.cpp on NVIDIA DGX Spark — llama.cpp Discussion #16578](https://github.com/ggml-org/llama.cpp/discussions/16578)
  Same, for the Spark. Contains the prefill/decode splits that reveal its character.
  **Use for:** the Spark side of the buy decision.

- [NVIDIA DGX Spark In-Depth Review — LMSYS Org (2025)](https://www.lmsys.org/blog/2025-10-13-nvidia-dgx-spark/)
  Independent review from the SGLang/Chatbot-Arena team. Source of the Llama-70B FP8
  803 tok/s prefill / 2.7 tok/s decode figure.
  **Use for:** a trustworthy worked example of prefill≫decode asymmetry.

### The harness under development
- [pi — earendil-works/pi](https://github.com/earendil-works/pi)
  The agent harness Ivan is building plugins for. Monorepo: `pi-coding-agent` (the CLI),
  `pi-agent-core` (agent runtime, tool calling, state), `pi-ai` (unified multi-provider LLM API).
  **Use for:** the ground truth on what a harness actually has to do.

- [pi coding-agent README — extensions, skills, compaction, providers](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md)
  The extension API surface: `registerTool`, `registerCommand`, `on("tool_call")`, custom
  compaction, sub-agents. Also documents `/login llama.cpp`, `/llama`, and adding
  OpenAI-compatible providers via `~/.pi/agent/models.json`.
  **Use for:** every "how would I actually implement this in pi" question.

- [pi-local — plugin for local inference backends](https://github.com/monroewilliams/pi-local)
  Third-party pi plugin bridging to LM Studio, oMLX, llama.cpp and llama-swap, with auto-detection
  of context window, model size, and load state.
  **Use for:** a worked example of a pi plugin doing exactly the kind of local-model wiring Ivan wants.

### Edge and micro-PC hardware
- [Why Your Jetson Orin Nano's 40 TOPS Goes Unused — Eric X. Liu](https://ericxliu.me/posts/benchmarking-llms-on-jetson-orin-nano/)
  Measured Ollama and vLLM benchmarks on an Orin Nano, plus a clean roofline derivation reaching a
  588 FLOPs/byte ridge point. The best single explanation of why edge AI marketing misleads.
  **Use for:** the roofline argument, and realistic small-device token rates.

- [Raspberry Pi AI HAT+ documentation (official)](https://www.raspberrypi.com/documentation/accessories/ai-hat-plus.html)
  Authoritative spec table for all three HATs. States plainly that the 13 and 26 TOPS variants do
  not support LLMs and that the AI HAT+ 2 does, because of its 8 GB of onboard memory.
  **Use for:** the cleanest evidence that memory, not TOPS, sets the capability boundary.

- [NVIDIA Jetson Orin Nano Super announcement — NVIDIA Technical Blog](https://developer.nvidia.com/blog/nvidia-jetson-orin-nano-developer-kit-gets-a-super-boost/)
  Vendor source for the Super update: 67 sparse TOPS, 102 GB/s, $249.
  **Use for:** verified Jetson specs. Read the claims through the roofline, not at face value.

### Fine-tuning and model merging
- [mlx-lm — Fine-Tuning with LoRA or QLoRA (LORA.md)](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md)
  The official documentation for the tool. Defines the four dataset shapes (`chat`, `tools`,
  `completions`, `text`) and gives the canonical ordering of the memory levers in § Memory Issues.
  **Use for:** every practical question about training on Apple Silicon. The authority over anything inferred.

- [LoRA: Low-Rank Adaptation of Large Language Models — Hu et al. (arXiv 2106.09685)](https://arxiv.org/abs/2106.09685)
  The original method. Source of the `rank × (fan_in + fan_out)` parameter count.
  **Use for:** the arithmetic underlying every trainable-parameter estimate.

- [QLoRA — Dettmers et al. (arXiv 2305.14314)](https://arxiv.org/abs/2305.14314)
  NF4, double quantization, paged optimizers; "finetune a 65B parameter model on a single 48GB GPU
  while preserving full 16-bit finetuning task performance."
  **Use for:** why quantizing the frozen base is the largest single lever on a small machine.

- [LoRA Learns Less and Forgets Less — Biderman et al. (arXiv 2405.09673)](https://arxiv.org/abs/2405.09673)
  Controlled comparison against full fine-tuning on code and maths. LoRA underperforms on new
  domains but preserves out-of-domain ability better, and full FT learns perturbations of
  10–100× higher rank.
  **Use for:** the honest case for and against LoRA, and for choosing a rank.

- [Model soups — Wortsman et al. (arXiv 2203.05482)](https://arxiv.org/abs/2203.05482)
  Weight averaging across a hyperparameter sweep. Source of the greedy-soup recipe, the
  "single low error basin" claim, and the zero-inference-cost argument.
  **Use for:** the whole soup half of Lesson 16. Read § Method for Recipe 1.

- [mergekit — arcee-ai](https://github.com/arcee-ai/mergekit)
  The tool. Names and one-line descriptions for every merge method, and an out-of-core
  implementation that runs on CPU or "as little as 8 GB of VRAM".
  **Use for:** actually performing a merge, and for decoding method names in model cards.

- [PEFT — model merging guide](https://huggingface.co/docs/peft/en/developer_guides/model_merging)
  and the [`add_weighted_adapter` reference](https://huggingface.co/docs/peft/en/package_reference/lora).
  Documents every `combination_type`, including that `cat` produces an adapter whose rank is the sum
  of the inputs' ranks.
  **Use for:** merging LoRA adapters correctly rather than averaging their factors.

- Underlying merge papers: [task arithmetic (2212.04089)](https://arxiv.org/abs/2212.04089),
  [TIES (2306.01708)](https://arxiv.org/abs/2306.01708), [DARE (2311.03099)](https://arxiv.org/abs/2311.03099),
  and [ZeRO (1910.02054)](https://arxiv.org/abs/1910.02054) for the 16-bytes-per-parameter
  mixed-precision Adam accounting.

### Tokens, context length and context engineering
- [RULER: What's the Real Context Size of Your Long-Context Language Models? (arXiv 2404.06654)](https://arxiv.org/abs/2404.06654)
  17 models, 13 tasks. "almost all models exhibit large performance drops as the context length
  increases"; of those claiming 32K+, "only half of them can maintain satisfactory performance at
  the length of 32K."
  **Use for:** the effective-vs-advertised context gap, from a controlled benchmark.

- [NoLiMa: Long-Context Evaluation Beyond Literal Matching (arXiv 2502.05167)](https://arxiv.org/abs/2502.05167)
  Retrieval where question and answer share no vocabulary. "At 32K, for instance, 11 models drop
  below 50% of their strong short-length baselines"; GPT-4o 99.3% → 69.7%.
  **Use for:** the sharpest single number on long-context degradation, and the attention-mechanism
  explanation for it.

- [Lost in the Middle: How Language Models Use Long Contexts (arXiv 2307.03172)](https://arxiv.org/abs/2307.03172)
  The U-shaped position curve — best at the start and end, worst in the middle, "even for explicitly
  long-context models."
  **Use for:** where to put the thing you actually need the model to see.

- [Context Rot: How Increasing Input Tokens Impacts LLM Performance — Chroma (2025)](https://www.trychroma.com/research/context-rot)
  18 models. Distractors compound; coherent haystacks score *worse* than shuffled ones. Source of the
  term.
  **Use for:** why an agent transcript is close to the worst-case context shape.

- [Effective context engineering for AI agents — Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
  The practitioner counterpart: the "attention budget" framing, n² pairwise relationships, system
  prompt altitude, bloated tool sets, and the three long-horizon tactics (compaction, structured
  note-taking, sub-agents).
  **Use for:** turning the benchmark findings into harness design decisions.

- [Hugging Face Tokenizers](https://github.com/huggingface/tokenizers) and the
  [BPE chapter of the NLP course](https://huggingface.co/learn/nlp-course/chapter6/5)
  The library used for every token measurement in Lessons 17 and 18, and the clearest explanation of
  byte-pair encoding.
  **Use for:** measuring your own tool output instead of guessing at it.

- [Claude pricing](https://claude.com/pricing)
  Independent confirmation of the input/output asymmetry: output is 5× input across every model, and
  a cache read is 10% of input — so a cached input token is 50× cheaper than an output token.
  **Use for:** a sanity check that the local physics matches how the market prices it.

### Embeddings and retrieval
- [tencent/WeMM-Embedding-2B](https://huggingface.co/tencent/WeMM-Embedding-2B) · [4B](https://huggingface.co/tencent/WeMM-Embedding-4B) · [9B](https://huggingface.co/tencent/WeMM-Embedding-9B)
  The upstream cards. Universal multimodal embedding models built on Qwen3.5 — text, image, video and
  visual documents into one space; audio explicitly unsupported. Source of the Matryoshka rungs, the
  embedding dimensions, and the MMEB tables.
  **Use for:** the authority over any community GGUF repo's claims about them.

- [WeMM-Embedding technical report (arXiv 2608.24053)](https://arxiv.org/abs/2608.24053)
  The primary source behind the MMEB-v2 and v3 scores.
  **Use for:** checking what the benchmarks measure before trusting a leaderboard row.

- GGUF conversions: [DreamBlooms/WeMM-Embedding-2B-GGUF](https://huggingface.co/DreamBlooms/WeMM-Embedding-2B-GGUF)
  (documents the `qwen35.pooling_type=3` metadata injection and the separate vision tower) ·
  [TuTuCSF/WeMM-Embedding-4B-GGUF](https://huggingface.co/TuTuCSF/WeMM-Embedding-4B-GGUF) ·
  [TuTuCSF/WeMM-Embedding-9B-GGUF](https://huggingface.co/TuTuCSF/WeMM-Embedding-9B-GGUF)
  (README is licence frontmatter and nothing else).
  **Use for:** the files themselves. Treat their prose as unverified — the 2B repo's Python examples
  load the original weights, not the GGUF.

- [llama.cpp server README — embeddings and `multimodal_data`](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)
  Documents the `{ "prompt_string": ..., "multimodal_data": [...] }` prompt form, the
  `<__media__>` marker rule, and the advice to check `/models` for the `multimodal` capability.
  **Use for:** the only supported path to multimodal embeddings in llama.cpp. `llama-embedding`
  (the CLI) has no multimodal support at all — verified by reading it.

### Serving mechanics
- [llama.cpp — chat templates and message parsing (DeepWiki)](https://deepwiki.com/ggml-org/llama.cpp/3.9-chat-templates-and-message-parsing)
  How the built-in dispatcher and the full Jinja engine differ, and what `--jinja` changes.
  **Use for:** diagnosing silent template failures.

- [llama.cpp — grammar and structured output (DeepWiki)](https://deepwiki.com/ggml-org/llama.cpp/8.1-grammar-and-structured-output)
  GBNF, `json_schema_to_grammar`, lazy grammars, and the streaming tool-call autoparser.
  **Use for:** making malformed tool calls impossible rather than unlikely.

- [pi agent runtime README](https://github.com/earendil-works/pi/blob/main/packages/agent/README.md)
  `agentLoop()`, `AgentMessage`, `AgentContext`, `AgentTool`, the four hooks
  (`transformContext`, `beforeToolCall`, `afterToolCall`, `shouldStopAfterTurn`) and the event
  stream. States the convention that tools should **throw** on failure rather than return errors as content.
  **Use for:** every pi implementation question. The authority over anything inferred.

## Wisdom (Communities)

- [r/LocalLLaMA](https://reddit.com/r/LocalLLaMA)
  The centre of gravity for home LLM hosting. People post real `llama-bench` numbers on real
  hardware within days of a release. Treat model-quality claims as anecdote, hardware numbers
  as data.
  **Use for:** sanity-checking a purchase before making it; finding whether anyone has run
  your exact model on your exact box.

- [llama.cpp GitHub Discussions](https://github.com/ggml-org/llama.cpp/discussions)
  Where the maintainers and the benchmark tables live. Higher signal, lower volume than Reddit.
  **Use for:** authoritative answers on flags, formats, and regressions.

## Gaps
- No strong source yet on **agent-oriented serving mechanics**: how to actually enable and verify prefix-cache reuse in llama.cpp's server, and what invalidates it. Highest-priority gap — it is the lever Lesson 2 identified and Ivan can act on it in pi.
- No strong source yet on **tool-calling reliability across local models** — which open models emit well-formed calls under pressure. Lesson 8 covers the mechanism; the per-model empirical comparison is missing and probably has to be built from Ivan's own transcripts.
- **Benchmark claims in Lesson 15 rest on secondary aggregators**, not primary measurement. Architecture facts there are verified from `config.json`; the scores are not. Replace with primary sources or own evaluation when it matters.
- ~~Fine-tuning on consumer hardware~~ — **closed** by Lesson 16. Primary sources are mlx-lm's LORA.md plus the LoRA/QLoRA papers; the memory constants are verified against measured `mlx-community` file sizes. Remaining gap: no measured `tokens/sec` or peak-memory numbers for training on an 8 GB M1 — that has to come from Ivan's own run.
- No strong source yet on **evaluating model quality locally** (building a personal eval set rather than trusting MMLU). Needed for the "which model" half of the mission.
- Community preference not yet stated — Ivan has not said whether he wants to participate in forums or only read them.
