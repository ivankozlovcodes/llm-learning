# Embeddings enter the workspace, and Ivan brings his own candidates for the first time

On 2026-09-05 Ivan asked for an embeddings lesson and, for the first time in this workspace, named
**specific model repos he had found himself**: `TuTuCSF/WeMM-Embedding-9B-GGUF` and
`DreamBlooms/WeMM-Embedding-2B-GGUF`. That is a shift — previous requests were topics ("nvidia jensen
nano", "finetuning"), and this one came with candidates already shortlisted.

**Both repos are real** — community GGUF quantizations of `tencent/WeMM-Embedding-{2B,9B}`, universal
multimodal embedding models built on Qwen3.5. Verifying rather than assuming mattered in both
directions: I could neither dismiss unfamiliar names (cutoff is May 2026) nor take them at face value.

**The finding that changed the answer:** there is a **4B** Ivan had not seen, and the shortlist he
brought was wrong at both ends.

| | 2B | 4B | 9B |
|---|---|---|---|
| Q4_K_M + mmproj | 2.231 GB | 3.433 GB | **6.252 GB** |
| Fits 4.2 GB? | yes, 1.97 spare | yes, 0.77 spare | **no, over by 2.05** |
| MMEB-v3 (190 tasks) | 56.0 | 58.2 | 59.5 |

The 9B cannot run on the travel machine at all, and its 3.5-point MMEB-v3 gain costs 3.6× the
weights. The 4B captures 63% of that gain for 2× the size and fits. Recommendation: start on the 2B,
move to the 4B only if retrieval quality actually disappoints.

**The verified-from-source finding no card states.** These are community conversions of a model whose
own documentation shows vLLM and SGLang and never mentions llama.cpp. Three questions, answered by
reading llama.cpp:
- `LLM_ARCH_QWEN35` → `"qwen35"` exists, so the injected `qwen35.pooling_type` key is targeting a real arch.
- `LLAMA_POOLING_TYPE_LAST = 3`, so the 2B repo's `pooling_type=3` is genuinely last-token pooling.
- **`llama-embedding` (the CLI) contains no `mmproj`/`mtmd` reference at all.** It will silently
  return text embeddings from a multimodal model. Image embedding requires `llama-server --mmproj`
  plus the non-OAI `{"prompt_string": "<__media__>", "multimodal_data": ["<base64>"]}` form, which
  `tokenize_input_subprompt()` handles and the `/embeddings` route reaches.

That silent-degradation path is the most valuable thing in the lesson and is invisible from every
README involved.

**Teaching hook.** Embedding is **pure prefill — no decode, no session KV cache**. It therefore sits
on the 118 tok/s side of Lesson 17's asymmetry rather than the 14 tok/s side, and is the only local
workload unambiguously on the cheap side. It is also a *second resident model*, which is a shape the
workspace had not covered.

**The conclusion that uses both machines.** Indexing 100 MB takes ~20 hours on the M1, which sounds
fatal until you notice **the index is portable and the model is not**: 57,445 chunks at 256-dim int8
is a 15 MB file. Build on the 64 GB machine, carry the file, embed only queries on the laptop.
Expensive once, cheap forever — which is exactly why retrieval works on hardware that could never
fine-tune anything.

**Error caught before shipping:** I wrote that a 100 MB corpus indexes to "~150 MB". It is 15 MB. The
lesson's own arithmetic caught it — count × bytes, the same napkin math the workspace runs everywhere.
Ties to record [0008](0008-two-ceilings-memory-and-attention.md): compute the example, do not estimate it.
