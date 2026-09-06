# Mission: Local LLM Fluency for Agent Harness Development

## Why
Ivan builds harnesses for CLI LLM agents — specifically [pi](https://github.com/earendil-works/pi),
an extensible terminal coding agent, starting with **plugin development**. He wants to run models
locally, well, and to design harness behaviour with an accurate model of what inference actually
costs, rather than guessing. Secondarily: to read model releases and the wider local-LLM field
without the jargon being a wall.

## Status: hardware decision closed
Ivan has **purchased a MacBook Pro with 64 GB**. Hardware buying is now **out of scope** — the
comparison work that started this workspace (M1 Max vs DGX Spark vs GPU rig) is finished and its
lessons stand as the physical model underlying everything else, not as shopping advice.

## Success looks like
- Predicting tokens/sec and memory footprint for a given model on a given machine, from published
  specs alone, to within ~25%.
- Reading a model release or r/LocalLLaMA thread with no jargon left unparsed (MoE, GGUF, Q4_K_M,
  IQ1_S, KV cache, prefill/decode, MMLU).
- Choosing quantization and context settings deliberately, and recognising a misconfigured setup
  versus a genuinely underpowered one.
- Knowing what an agent harness demands of an inference server — context reuse, tool calling,
  structured output — and which local setups can supply it.
- Writing pi plugins whose design is informed by real inference costs: compaction policies, tool
  schemas, model routing.
- Fine-tuning a small model for one narrow harness job — tool selection, stop conditions — sized
  correctly against the machine in front of you, and knowing when *not* to.

## Constraints
- Started from Ollama / LM Studio use, with no exposure to quant flags, context settings, or benchmarks.
- **Three machines**, as of 2026-09-05:
  - a **64 GB MacBook Pro** (M1 Max, 400 GB/s) at home — 48 GB practical budget;
  - a **48 GB MacBook Pro M4** taken on the trip — ~36 GB practical budget, and a *corporate*
    machine, so model downloads and tooling are subject to someone else's policy. Whether it is an
    M4 Pro (273 GB/s) or M4 Max (546 GB/s) is unconfirmed and worth 2× in decode speed;
  - an **8 GB M1 MacBook Pro**, also on the trip — ~4.2 GB of practical model budget.
  The 8 GB machine remains a real constraint and keeps small-model selection and aggressive
  quantization live concerns. The M4 makes 35B-class MoE models available away from home, which
  changes which *ceiling* binds rather than removing the discipline. See
  `reference/three-machines.html`.
- **Sole user.** No multi-tenant serving. Concurrency only ever arises from Ivan's own parallel
  agent sessions, and is a negotiable trade-off rather than a requirement.
- Prefers concrete arithmetic over hand-waving.

## The workload: CLI agent harnesses
1. **Long and growing context.** Each turn re-sends a conversation prefix plus tool output. Prefill
   cost, and how much of it cache reuse avoids, dominates perceived speed.
2. **Time to first token.** An agent loop is many short turns. Per-turn latency decides usability.
3. **Tool calling and structured output.** The model must reliably emit well-formed calls. A
   model-capability question, not a bandwidth one.
4. **Optional concurrency.** Parallel subagents create a batch — near-free on a bandwidth-bound
   machine, but a nice-to-have.

### Why pi specifically sharpens this
pi's extension API (`registerTool`, `registerCommand`, `on("tool_call")`) lets a plugin replace
built-in tools, add sub-agents, and implement **custom compaction and summarization**. Compaction
rewrites the conversation prefix, which is precisely what destroys KV cache reuse. The performance
material here is therefore a set of design constraints on plugins Ivan can actually write. pi speaks
to local inference natively (`/login llama.cpp`, `/llama`, or any OpenAI-compatible endpoint via
`~/.pi/agent/models.json`).

## Out of scope
- **Hardware purchasing** — decided and closed.
- Multi-tenant / production serving economics.
- Training from scratch, distributed training, multi-GPU or cloud training runs.
- Fine-tuning as a source of *knowledge* (RAG and retrieval do that job better).
- Transformer internals beyond what is needed to explain performance.
