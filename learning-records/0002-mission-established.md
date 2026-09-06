# Mission established: hardware purchase decision, with operating skill and field fluency

Ivan's stated goals are, in order of emphasis: run local models well, follow the field fluently,
and buy the right hardware. Workload priorities were given as likelihoods rather than a single
choice: chat+privacy and batch/pipeline are "very likely", coding-agent/long-context is "likely",
fine-tuning is "maybe".

**Implications:** Batching deserves an early lesson — it is the regime that governs the
batch/pipeline workload and it inverts the single-stream conclusions from Lesson 1, including the
DGX Spark verdict. Prefill/decode matters for the coding-agent workload. Fine-tuning (and therefore
the CUDA-lock-in argument) stays parked until Ivan raises its likelihood. The purchase decision
should be revisited explicitly once batching and prefill are understood, since both could change
the answer.
