# Local LLM Glossary

Canonical language for this workspace. Every lesson uses these terms and no synonyms.
Terms are promoted here once they have been taught and used correctly; entries marked
_(provisional)_ are taught but not yet demonstrated.

## Performance

**Decode**:
The phase where the model generates output, one token at a time. Memory-bandwidth bound.
_Avoid_: generation phase, inference (too broad), sampling

**Prefill**:
The phase where the model reads the input prompt, processing all its tokens in parallel. Compute bound.
_Avoid_: prompt processing, ingestion, encoding

**Memory bandwidth**:
The rate at which a machine can move bytes between memory and the compute units, in GB/s. The
governing specification for decode speed.
_Avoid_: memory speed, RAM speed, throughput

**Memory-bandwidth bound**:
The condition where a workload's speed is limited by how fast bytes arrive, not by how fast the
chip computes. Decode is always in this condition at batch size one.
_Avoid_: memory bound, I/O bound, bottlenecked by RAM

**Time to first token (TTFT)**:
The delay between submitting a prompt and the first output token appearing. Equal to prefill time.
The metric that decides whether an agent harness feels usable.
_Avoid_: latency (too broad), lag, response time

**Compute-bound**:
The condition where a workload's speed is limited by how fast the chip can do arithmetic, not by
how fast bytes arrive. Prefill is in this condition; decode is not.
_Avoid_: CPU-bound, GPU-bound, FLOP-limited

**Arithmetic intensity**:
FLOPs performed per byte read from memory. Low intensity means memory-bandwidth bound, high
intensity means compute bound. Decode is ~2 per weight; prefill is ~2 × prompt length per weight.
_Avoid_: operational intensity (same thing, roofline terminology), compute density, ops per byte

**Roofline**:
The bound `min(peak compute, bandwidth × arithmetic intensity)`. Plotted on log axes it looks like
a sloped line meeting a flat ceiling, which is where the name comes from.
_Avoid_: performance envelope, compute ceiling

**Ridge point**:
The arithmetic intensity at which a machine stops being bandwidth-limited and starts being
compute-limited, equal to peak compute ÷ bandwidth. A low ridge means a balanced machine.
_Avoid_: crossover, knee, inflection

**TOPS**:
Trillions of integer operations per second, the headline figure on edge AI accelerators. Rates peak
compute only, so it predicts prefill capability and says nothing about decode speed.
_Avoid_: AI performance, AI TOPS, inference performance

**Efficiency factor** _(provisional)_:
The fraction of a machine's theoretical peak memory bandwidth that a real runtime achieves.
Typically 0.58–0.82 for llama.cpp; assume 0.7 when guessing.
_Avoid_: overhead, real-world multiplier

**Ceiling** _(provisional)_:
The maximum possible tokens/sec for a model on a machine, equal to memory bandwidth divided by
bytes read per token. No implementation exceeds it.
_Avoid_: theoretical max, best case, upper bound

## Models

**Parameter**:
One learned weight in the model. Counted in billions; "70B" means 70 billion parameters.
_Avoid_: weight (use for the stored value), neuron

**Total parameters**:
Every parameter the model contains. Sets the **memory footprint** — whether the model loads at all.
_Avoid_: model size (ambiguous between params and gigabytes), parameter count

**Active parameters**:
The parameters actually read to generate one token. Sets **decode speed**. Equal to total
parameters for a dense model; much smaller for a Mixture-of-Experts model.
_Avoid_: used parameters, live weights

**Dense model**:
A model where every parameter is read for every token, so active equals total.
_Avoid_: standard model, regular model, non-MoE

**Mixture-of-Experts (MoE)**:
A model architecture that routes each token through a small subset of its parameters, so active
parameters are far fewer than total. Written as `gpt-oss-120b` or `Qwen3-235B-A22B`, where the
`A22B` names the active count.
_Avoid_: sparse model, expert model, routed model

## Formats

**Quantization**:
Storing weights at reduced numeric precision to shrink the model. Reduces both memory footprint
and bytes read per token, so it is a speed change as much as a size change.
_Avoid_: compression, shrinking, pruning (a different technique entirely)

**Bits per weight (bpw)**:
The average number of bits used to store each parameter, including the scaling metadata that
block-based schemes store alongside the weights. Non-integer for k-quants — Q4_K_M is ~4.9, not 4.
_Avoid_: precision, bit depth, quantization level

**K-quant**:
The `Q*_K` family: weights quantized in super-blocks of 256 with hierarchical per-block scales.
Better quality than the legacy `Q4_0`/`Q4_1` schemes at the same nominal width. `S`/`M`/`L` control
how many tensors get extra bits.
_Avoid_: standard quant, normal quantization

**I-quant**:
The `IQ*` family: codebook-based quantization built with an importance matrix. Better quality per
bit than a K-quant, especially below 4 bits, but slower to decode because of the lookups.
_Avoid_: integer quant, IQ format

**Importance matrix (imatrix)**:
A record of which weights most influence outputs, built by running calibration text through the
model. Lets a quantizer spend bits where they matter.
_Avoid_: calibration data, activation statistics

**Unsloth Dynamic (UD-)**:
A quantization *recipe*, not a format: each layer is assigned whichever type minimises loss for
that specific model. Explains why `UD-IQ1_S` averages 1.81 bpw rather than 1.
_Avoid_: dynamic quantization (ambiguous — also names a runtime technique)

**GGUF**:
The file format llama.cpp and its downstream tools (Ollama, LM Studio) use to store quantized
models. A single file containing weights, metadata, and tokenizer.
_Avoid_: GGML (the superseded predecessor format), llama.cpp format

**Q4_K_M**:
The default quantization: 4-bit, k-quant block scheme, medium variant. Roughly 4.9 effective bpw
and ~0.6 GB per billion parameters. The community's quality/size sweet spot.
_Avoid_: 4-bit (imprecise — several 4-bit schemes exist), q4

## Agent harnesses

**KV cache**:
The stored key and value vectors for every token already processed, kept so that earlier tokens do
not have to be recomputed on each new token. Lives in memory and grows with context length.
_Avoid_: attention cache, context cache, state

**Grouped-query attention (GQA)**:
An attention design where several query heads share one set of key and value heads. Since only
key/value heads appear in the KV cache formula, it shrinks the cache by the sharing ratio — 8× on
Llama 3.3 70B.
_Avoid_: multi-query attention (a different, more extreme variant), shared attention

**KV cache quantization**:
Storing the KV cache at reduced precision, set in llama.cpp with `--cache-type-k` and
`--cache-type-v`. Q8_0 halves the cache at negligible quality cost; Q4_0 quarters it at a real one.
_Avoid_: cache compression, KV compression

**Compaction**:
Summarising older conversation messages to reclaim context, as pi does automatically or via
`/compact`. Frees KV cache memory but rewrites the prefix, so it is a cache invalidation with a
one-turn cost.
_Avoid_: summarization, context trimming, pruning

**Prefix cache reuse**:
Keeping the KV cache for an unchanged conversation prefix between turns, so only newly appended
tokens are prefilled. Turns a quadratic session cost into a linear one.
_Avoid_: prompt caching (used by hosted APIs for a related but billing-oriented feature), context caching

**Cache invalidation** _(provisional)_:
Any change to the conversation prefix that makes the stored KV cache unusable from that point
forward — trimming history, editing the system prompt, reordering tool definitions.
_Avoid_: cache miss, cache break

**Turn**:
One cycle of an agent loop: prefill the newly appended prompt, decode a reply. The unit in which
agent harness performance should be measured.
_Avoid_: request, round, iteration

**Batching** _(provisional)_:
Processing several sequences in one forward pass, so the weights are read once for all of them.
Raises decode throughput sharply on a bandwidth-bound machine while leaving prefill roughly flat.
_Avoid_: parallelism, concurrency (that is the cause; batching is the mechanism)

## Serving and harness mechanics

**Chat template**:
A Jinja program stored in a model's GGUF metadata that converts `{role, content}` messages into the
exact token sequence the model was fine-tuned on. Model-specific and not interchangeable.
_Avoid_: prompt format, prompt template

**Constrained decoding**:
Filtering the token distribution at every step so only tokens keeping the output grammatically valid
can be sampled. Makes malformed output unrepresentable rather than merely unlikely.
_Avoid_: forced JSON, structured generation, guided decoding

**GBNF**:
llama.cpp's BNF-style grammar notation used for constrained decoding. JSON Schema is converted to it
automatically.
_Avoid_: grammar file, BNF

**Lazy grammar**:
A grammar that activates only once a trigger token appears, leaving earlier output unconstrained.
What allows a reasoning model to think in prose before emitting a constrained tool call.
_Avoid_: deferred grammar, conditional grammar

**Speculative decoding**:
A small draft model proposes several tokens which the large model verifies in one forward pass.
Output is identical to unassisted decoding; only speed changes.
_Avoid_: draft decoding, assisted generation

**Multi-token prediction (MTP)**:
Draft heads trained alongside a model to predict several tokens ahead, shipped in the release for
speculative decoding. Appears as an `MTP/` directory in a repo.
_Avoid_: lookahead heads, parallel decoding

**Sub-agent**:
A tool that is itself an agent, with its own model and its own context. Its working history stays
out of the parent's context; only the result returns.
_Avoid_: child agent, delegate, worker

**Routing**:
Selecting which model handles a given call. Optimises for keeping expensive work off the main
context, not for making individual turns cheaper.
_Avoid_: model switching, load balancing

## Fine-tuning and merging

**Fine-tuning**:
Continuing to train a pretrained model on your own data, changing the weights. The last resort after
prompting, grammar and retrieval, not the first move.
_Avoid_: training (too broad), retraining, tuning

**LoRA**:
Training a low-rank correction — two skinny matrices whose product is added to a frozen weight —
instead of the weight itself. Cuts trainable parameters by roughly three orders of magnitude.
_Avoid_: adapter training (an adapter is the artifact, LoRA is the method), PEFT (the library)

**QLoRA**:
LoRA over a base whose weights are stored quantized and dequantized on the fly. Lowers the base
weights term, which LoRA alone leaves untouched.
_Avoid_: quantized fine-tuning, 4-bit LoRA

**Adapter**:
The trained LoRA weights as a file, kept separate from the base model and applied at load time.
_Avoid_: LoRA (the method), delta, patch

**Fusing**:
Folding an adapter's correction into the base weights to produce one standalone model.
`mlx_lm.fuse`. Necessary before merging adapters correctly.
_Avoid_: merging (that is combining several models), baking, applying

**Trainable parameters**:
The parameters an optimizer updates. Gradients and optimizer state scale with this number, not with
total parameters — the distinction LoRA exists to exploit.
_Avoid_: active parameters (that is an MoE term about speed), tuned weights

**Optimizer state**:
The per-parameter values an optimizer carries between steps — for AdamW, a running mean and
variance. Two extra copies of every trainable parameter.
_Avoid_: momentum, Adam buffers

**Activations**:
Intermediate forward-pass values the backward pass needs. The only training memory term that scales
with batch size and sequence length rather than parameter count.
_Avoid_: intermediate tensors, feature maps

**Gradient checkpointing**:
Storing only layer boundaries and recomputing the rest during the backward pass. Trades compute for
a large reduction in the activations term.
_Avoid_: activation checkpointing, recomputation

**Model soup**:
Averaging the weights of several models fine-tuned from the same base checkpoint. Costs nothing at
inference, unlike an ensemble.
_Avoid_: model merging (the general family), weight ensembling, averaging

**Greedy soup**:
The soup recipe that sorts runs by held-out score and adds each only if the soup does not get worse.
Cannot be worse than the best single run.
_Avoid_: best-of soup, selective averaging

**Loss basin**:
The region of weight space a set of fine-tunes from one checkpoint occupies, inside which the
straight line between two solutions stays low-loss. The precondition for souping.
_Avoid_: minimum, valley, local optimum

**Task vector**:
The difference between a fine-tuned model's weights and its base's. A direction that can be scaled,
added or subtracted.
_Avoid_: delta weights, diff, update vector

**Model merging**:
Combining several models into one by arithmetic on their weights. Souping is the simplest member;
TIES and DARE add interference handling.
_Avoid_: ensembling (that keeps the models separate and costs inference), blending

## Tokens and context

**Token**:
An entry in the model's fixed vocabulary, produced by byte-pair encoding. Qwen3's vocabulary holds
151,669. Not a word and not a character — the unit every cost in this workspace is quoted in.
_Avoid_: word, chunk, piece

**Input token**:
A token in the prompt, processed during prefill. Costs a fraction of a weight pass, because prefill
amortises one weight read across the whole prompt.
_Avoid_: prompt token, context token

**Output token**:
A token the model generates, during decode. Costs one full pass over the active weights. Becomes an
input token on every subsequent turn.
_Avoid_: completion token, generated token, response token

**Chars per token**:
The measured ratio for a given kind of text. Prose 4.95, JSON 4.62, code 4.09, aligned columns 1.84,
hashes 1.07, bare numbers 1.00 — measured against Qwen3's tokenizer.
_Avoid_: compression ratio, token density

**Static prefix**:
Everything in the context before the first user message — system prompt, environment block, tool
schemas, project instructions. Measured at 1,706 tokens for a seven-tool harness.
_Avoid_: preamble, header, boilerplate

**Volatility ordering**:
Arranging context from most stable to most volatile, so the prefix cache breaks as late as possible.
The single largest lever on cache reuse.
_Avoid_: prompt ordering, layout, prefix design

**Memory ceiling**:
How many tokens fit — `(budget − weights) ÷ KV bytes per token`. A hard limit with a loud failure:
swapping.
_Avoid_: context limit, max context

**Attention ceiling**:
How many tokens still work — the point past which measured reliability falls away. Not on any spec
sheet, and its failure is silent.
_Avoid_: effective context (close, but that term is RULER's and means something narrower)

**Attention budget**:
The framing that every token in the window competes for a finite share of the model's attention,
because n tokens create n² pairwise relationships.
_Avoid_: focus, capacity

**Context rot**:
Measured degradation of model reliability as input length grows, independent of whether the window
overflows. Occurs well below the advertised limit.
_Avoid_: context overflow (a different thing), drift, forgetting

**Context engineering**:
Curating what goes into the window, as distinct from writing a good prompt. The discipline the
memory and attention ceilings both point at.
_Avoid_: prompt engineering (single-turn), context management

## Embeddings and retrieval

**Embedding**:
A fixed-length vector representing an input's meaning, produced by pooling a forward pass. Prefill
with no decode.
_Avoid_: vector (too broad), encoding, representation

**Pooling**:
Collapsing a sequence of per-token hidden states into one vector. `last` takes the final token;
`mean` averages; `cls` takes the first. Set by `--pooling`, and must match what the model was
trained for.
_Avoid_: aggregation, reduction, summarization

**L2 normalization**:
Scaling a vector to unit length, so a dot product equals cosine similarity. `--embd-normalize 2` in
llama.cpp. Breaks under truncation unless reapplied.
_Avoid_: normalisation (too broad), unit scaling

**Matryoshka (MRL)**:
Training such that the first N components of an embedding are themselves a valid embedding. Lets you
truncate to a listed rung and renormalize. 256 of WeMM's 2,048 dims retain 98.7% of performance.
_Avoid_: nested embeddings, truncation (that is the operation, not the property)

**mmproj**:
The vision tower, shipped as a separate GGUF. Roughly size-independent (~0.6–0.9 GB), so it costs a
small model proportionally far more. Not loaded unless you pass `--mmproj`.
_Avoid_: projector, vision encoder, adapter

**Chunk**:
A unit of corpus text embedded as one vector. Chunk size sets the index's row count but not its
build time, which depends on total tokens.
_Avoid_: passage, document, segment

**Vector store / index**:
The stored embeddings plus their source references. Sized as chunks × dimensions × bytes per
component. Portable between machines; the model that built it is not.
_Avoid_: vector database (a product category), embedding store

**Reranking**:
A second pass that scores retrieved candidates more precisely than vector similarity.
`LLAMA_POOLING_TYPE_RANK` exists for it. _(provisional — not yet taught)_
_Avoid_: re-scoring, second-stage retrieval

## Ambiguities resolved here

- **"Memory"** always means the memory the model runs from — VRAM on a discrete GPU, unified memory
  on Apple Silicon or the Spark. Never disk.
- **"Tokens/sec"** always means single-stream decode unless the text says otherwise. Batched
  throughput and prefill rates are different numbers and will always be named explicitly.
- **"Prefill" and "decode"** are the only names used for the two phases. Benchmark tools call them
  `pp` and `tg` (prompt processing / text generation); those are the same two things.
- **GB** means decimal gigabytes (10⁹ bytes), matching how vendors quote memory bandwidth. Hugging
  Face file sizes are usually quoted the same way; be careful with tools that report GiB.
