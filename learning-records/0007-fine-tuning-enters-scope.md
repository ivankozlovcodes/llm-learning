# Fine-tuning enters scope, sized against 8 GB rather than 64

Fine-tuning had been listed under **Out of scope** in `MISSION.md` since the workspace began, marked
"still only a maybe; revisit if Ivan raises its likelihood." On 2026-09-05 Ivan asked for a
fine-tuning lesson explicitly, and asked that any hands-on work be sized against **8 GB**, not the
64 GB machine the mission's Status section calls primary.

**What changed in the mission:** fine-tuning moved from Out of scope into Success-looks-like, but
narrowed on the way. The success criterion is *fine-tuning a small model for one narrow harness job
— tool selection, stop conditions — and knowing when not to*. Fine-tuning as a route to **knowledge**
went into Out of scope in its place, along with multi-GPU and cloud training. The workspace is now
five parts; Part Five is "Changing the model."

**Why the narrowing matters pedagogically:** the strongest content in Lesson 16 is the negative
case. Four of the six things people reach for fine-tuning to fix are better solved by a grammar, a
system prompt, or retrieval — all of which Lessons 7, 8 and 10 already taught. Teaching fine-tuning
without that table would have undone earlier lessons rather than building on them.

**The teaching hook that made it fit the zone of proximal development:** training memory is the same
budget arithmetic Ivan already does for inference, with two extra terms. Base weights + gradients +
optimizer state + activations, against the 4.2 GB figure Lesson 5 established. LoRA deletes two
terms, quantization shrinks a third, checkpointing attacks the fourth. Nothing new had to be
introduced except the terms themselves.

**Verified constants worth reusing:** bytes/parameter for MLX safetensors — bf16 2.000, 8-bit
1.0625, 4-bit 0.5626 — derived from measured `mlx-community/Qwen3-1.7B-{bf16,8bit,4bit}` sizes and
confirmed exactly against Qwen3-0.6B (0.335 GB) and Qwen3-4B (2.263 GB). These are the same
effective bits-per-weight as GGUF F16 / Q8_0 / Q4_K_M, which ties the MLX and llama.cpp sides of the
workspace together. Also verified from source: MLX optimizer state is created with
`mx.zeros_like(parameter)`, so it inherits the parameter dtype — 8 bytes per trainable parameter for
the whole training state, against PyTorch mixed precision's 16.

**Open question deliberately not resolved:** Ivan wrote "the memory limitation that I currently
have," which may mean the 64 GB machine is not yet in hand, or simply that he is travelling. The
mission still records 64 GB as primary. Ask before rewriting the Status section — the last mission
correction ([0003](0003-mission-shift-agent-harness.md)) went better when the framing was rewritten
on his statement rather than patched around a guess.
