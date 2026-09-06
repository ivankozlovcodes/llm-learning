# Hardware decision closed; travel machine is an 8 GB M1

Ivan purchased a MacBook Pro with 64 GB and declared hardware buying **out of scope**. He also
disclosed a second constraint that had not been visible before: when travelling he uses an **8 GB
M1 MacBook Pro**, where the practical model budget is roughly 4 GB.

He arrived with two candidate models for that machine — `ornith-ai/Ornith-1.5-9B-GGUF` and
`unsloth/Qwen3.8-27B-GGUF` — believing both fit in 8 GB, and asked what 1-bit quantization is.
Measured file sizes show Ornith-9B Q4_K_M at 5.78 GB and Qwen3.8-27B UD-IQ1_S at 6.19 GB: neither
fits with headroom. The "1-bit" quant is **1.81 effective bpw** (6.19 GB for 27.3B params).

**Implications:** The lessons so far implicitly assumed one large machine. Small-model selection and
aggressive quantization are now live, practical concerns rather than theory — Lesson 5 covers the
8 GB budget and Lesson 6 covers quantization broadly (Ivan asked for the general treatment, not just
the 1-bit question). It also confirms Ivan will act on model recommendations directly, so verify
every file size and repo name against the Hugging Face API before naming one. Supersedes the
purchasing framing in [[0002-mission-established]] and [[0003-mission-shift-agent-harness]].
