# Grounding: pi plugin development is the concrete build target

Ivan clarified that "harness development" is both building his own and studying existing harnesses,
with **pi** (earendil-works/pi) plugin development first. pi exposes an `ExtensionAPI`
(`registerTool`, `registerCommand`, `on("tool_call")`) and explicitly supports custom tools,
sub-agents, and **custom compaction and summarization**. It connects to local inference natively via
`/login llama.cpp` and `/llama`, or any OpenAI-compatible endpoint through `~/.pi/agent/models.json`.

**Implications:** Every performance lesson now has a concrete implementation surface. Compaction is
the sharpest example — it rewrites the conversation prefix, which is exactly the cache-invalidation
failure mode from [[0003-mission-shift-agent-harness]] and Lesson 2. A plugin that compacts naively
will destroy prefix-cache reuse and make a local model feel unusable; a plugin that compacts with
the cache in mind is a real, buildable artefact. Future lessons should cite pi's API by name rather
than speaking about harnesses in the abstract, and the tool-calling lesson should be framed around
what `registerTool` demands of a model.
