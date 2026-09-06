# Mission shift: the workload is CLI agent harness development, and Ivan is the sole user

Ivan corrected the workload framing established in [[0002-mission-established]]. "Batch / pipeline"
was a misread of the option — there is no multi-tenant or bulk-processing workload. He is the only
user. Concurrency arises solely from his own parallel agent sessions and he explicitly calls it a
negotiable trade-off. His current primary interest is **developing harnesses for CLI LLM agents**.

He also inferred, correctly and unprompted, that running multiple sessions is what produces
batching. That is the right mental link.

**Implications:** This promotes prefill, time-to-first-token, and KV-cache reuse from "later
lesson" to the centre of the curriculum — an agent loop is many short turns over a long, growing
prefix, which is the opposite of the single long generation Lesson 1 modelled. Batching drops from
a headline lesson to a supporting note (still worth teaching, because on a bandwidth-bound machine
parallel subagents are nearly free — but as an opportunity, not a requirement). It also raises a
whole model-capability axis the workspace has not touched: tool-calling reliability, structured
output, and what an inference server must expose for a harness to drive it. Supersedes the workload
ordering in 0002; the mission file has been rewritten.
