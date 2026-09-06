# Baseline: Ollama user, no exposure to quantization, context settings, or benchmarking

Ivan has run local models through Ollama / LM Studio but has never touched quantization flags,
context size settings, or any benchmarking tool. He has strong general technical fluency and
responds to arithmetic — the opening hardware comparison was settled numerically and he engaged
with it directly.

**Implications:** Do not teach "what is a local model" or installation. Do teach the vocabulary
layer (GGUF, quant names, MoE) explicitly, since he has been consuming these tools without the
terms attached. Start from performance first principles rather than tooling, because the mission's
live question is a purchase decision. Benchmarking tooling (`llama-bench`) is unexplored ground and
is a natural hands-on lesson once the mental model exists.
