# Offline Setup

Instructions for an agent. **Run once on each machine going on the trip.**

**Done means:** with Wi-Fi off, a human can open `index.html`, follow any lesson's "read this
next" link, read pi's documentation, search TypeScript and Node reference docs, and run `pi`
against a local model that answers.

Verify that end state yourself in Step 7. Steps 0–6 are how you get there.

## Two machines, one procedure

| | **8 GB M1** | **48 GB M4** |
|---|---|---|
| Practical model budget | 4.2 GB | ~36 GB |
| Memory bandwidth | 68.25 GB/s | 273 GB/s (Pro) or 546 GB/s (Max) |
| llama.cpp | already cloned | must be installed |
| Ownership | personal | **corporate — see Step 0** |

Every step below is identical on both machines **except Step 4 (model weights)**, which branches
on the profile you record in Step 0. Do not skip Step 0; later steps read what it writes.

See [reference/three-machines.html](reference/three-machines.html) for the arithmetic behind the
budgets.

## Environment facts

- macOS on Apple Silicon. Disk is plentiful; on the 8 GB machine RAM is not.
- Everything you create goes under `offline/` in this workspace, except global installs.
- Work through the steps in order. Each ends on a check; run the check before moving on.
- **`offline/` is portable except for `offline/models/`.** Sources, docs, repos and DevDocs are
  identical on both machines — copy the directory across rather than re-downloading it. Only the
  weights differ.

---

## Step 0 · Identify the machine

```bash
sysctl -n machdep.cpu.brand_string          # Apple M1 / M4 Pro / M4 Max
sysctl -n hw.memsize | awk '{print $1/1073741824 " GiB"}'
system_profiler SPDisplaysDataType | grep -i "total number of cores"
```

Write to `offline/MACHINE.md`: the chip, the installed memory, the GPU core count, and the
resulting profile — `SMALL` for the 8 GB M1, `LARGE` for the 48 GB M4.

For the M4, the GPU core count settles a real question: **16 or 20 cores means M4 Pro at
273 GB/s; 40 cores means M4 Max at 546 GB/s.** That is a 2× difference in decode speed and it
changes what to expect from every model. Record which one.

### If this is the corporate machine

Check these before downloading tens of gigabytes onto hardware you do not own:

- **Disk quota and encryption.** `df -h ~`. Expect FileVault; expect the first read of a 22 GB
  file after a reboot to be slow.
- **Endpoint tooling.** MDM inventory and DLP agents may scan every large file read. If model
  loads are pathologically slow, that is usually why, not the model.
- **Network policy.** A proxy or TLS-inspecting middlebox will break `git clone` and Homebrew.
  If `brew` fails oddly, test with `curl -sI https://github.com` before debugging anything else.
- **Policy.** Confirm with the human that downloading multi-gigabyte model weights onto this
  machine is acceptable. Nothing in this workspace requires putting confidential material into a
  model, but the weights themselves are the question here.

**Check:** `offline/MACHINE.md` states the chip, memory, GPU core count, profile (`SMALL` or
`LARGE`), and — on the corporate machine — the four answers above.

---

## Step 1 · Preflight

Record what exists. Write findings to `offline/REPORT.md` as you go — it is the artefact a
human reads afterwards.

```bash
sw_vers; uname -m; df -h ~ | tail -1
for c in git curl node npm bun brew ollama llama-cli llama-server llama-bench; do
  printf '%-12s ' "$c"; command -v $c || echo -
done
find ~ -maxdepth 4 -type d -name llama.cpp 2>/dev/null | head
ls -d /Applications/LM\ Studio.app 2>/dev/null
```

Install Homebrew if absent — several later steps depend on it.

**`SMALL` (8 GB M1):** llama.cpp is already cloned here. Find it, record the path, leave it alone.

**`LARGE` (48 GB M4):** llama.cpp is not installed. `brew install llama.cpp` gives you
`llama-cli`, `llama-server` and `llama-bench` with Metal enabled, and is the right choice unless
the human wants to build from source. If Homebrew is blocked by corporate networking, clone and
build instead:

```bash
git clone --depth 1 https://github.com/ggml-org/llama.cpp offline/repos/llama.cpp
cmake -B build -S offline/repos/llama.cpp -DGGML_METAL=ON && cmake --build build -j
```

Either way, record in `offline/REPORT.md` how llama.cpp got here and where its binaries are —
Step 5 needs its documentation paths and Step 7 needs the binaries.

**Check:** `offline/REPORT.md` names the llama.cpp path, the model runtimes present
(Ollama, LM Studio, llama.cpp binaries, or none), and free disk space.

---

## Step 2 · pi source and documentation

Independent of Step 6 — these are two unrelated problems and either can be done first.

**The repository holds the site's content.** Verified by comparison, not assumption: sampled
phrases from `packages/coding-agent/docs/extensions.md` appear verbatim in the page pi.dev renders
at `/docs/latest/extensions`. The repo is also a superset — all 23 pages in the site's table of
contents exist there, plus 7 the navigation does not surface, including `llama-cpp.md`, which
covers exactly the local-inference setup this workspace is about.

So clone the repo rather than crawling the site. Two details if you are tempted anyway: pi.dev
*is* crawlable (each page embeds its full content, so `wget` would work), but a `.md` suffix
returns the rendered HTML rather than markdown — `/extensions` and `/extensions.md` are the same
482 KB response. The repo gives you clean markdown, the extra pages, the source and the example
extensions in one operation.

```bash
mkdir -p offline/repos && cd offline/repos
git clone --depth 1 https://github.com/earendil-works/pi
cd pi && npm install
```

Then install pi so a human can run it: follow the install instructions in the freshly cloned
`README.md` rather than guessing a package name.

| Path | Contents |
|---|---|
| `packages/coding-agent/docs/` | 30 markdown files — the website's content plus extras |
| `packages/agent/docs/` | Runtime internals: `harness.md`, `plugins.md`, `rpc.md` |
| `examples/extensions/` | Working extensions, including `subagent/` |

**Check:** `pi --version` prints a version, `packages/coding-agent/docs/` contains 30 `.md` files
including `llama-cpp.md`, and `examples/extensions/` is non-empty.

## Step 3 · Archive the cited sources

Every lesson ends with a link that is useless offline. `offline/sources.txt` lists them all — 39 URLs as of 2026-09-05, including everything cited by Lessons 16–19.

```bash
brew install monolith
mkdir -p offline/sources
```

For each URL in `offline/sources.txt`, write a self-contained HTML file into `offline/sources/`,
named after the URL's distinctive part (`zeux-llm-inference-sol.html`, not `index.html`).
`monolith` inlines images and CSS, so each file opens with the network off.

Two URLs need care:

- **arXiv** — also fetch the PDF from `https://arxiv.org/pdf/2601.14277` as
  `offline/sources/arxiv-2601.14277-quantization.pdf`. It is the evidence behind Lesson 6.
- **GitHub discussions** — long threads may render partially. Accept whatever monolith produces
  and note it in the report.

When a URL resists monolith, fall back to `curl -sL <url> -o <file>` and record it as degraded.

**Check:** every URL in `sources.txt` has a file in `offline/sources/` over 10 KB whose contents
are the article rather than an error page. List any degraded fetches in `offline/REPORT.md`.

---

## Step 4 · Model files

Two kinds: configs for reading, weights for running.

**Configs** — Lesson 14 teaches a six-step pass over `config.json`, which needs examples to
practise on. Fetch `https://huggingface.co/<repo>/raw/main/config.json` into
`offline/configs/<name>.json` for:

```
Qwen/Qwen3-4B-Instruct-2507      ornith-ai/Ornith-1.5-35B-A3B
Qwen/Qwen3-8B                    ornith-ai/Ornith-1.5-9B
Qwen/Qwen3.8-27B                 Qwen/Qwen3-30B-A3B
unsloth/Llama-3.3-70B-Instruct   openai/gpt-oss-120b
```

**Weights** — this is the one step that branches on the profile from Step 0.

### Both machines — the quantization ladder

Lesson 6's experiment needs the same four files everywhere, including one that deliberately does
not fit on the small machine. All from `unsloth/Qwen3-4B-Instruct-2507-GGUF`:

| File | Size | Purpose |
|---|---|---|
| `Qwen3-4B-Instruct-2507-Q4_K_M.gguf` | 2.50 GB | The working model on `SMALL` |
| `Qwen3-4B-Instruct-2507-Q8_0.gguf` | 4.28 GB | Near-lossless reference |
| `Qwen3-4B-Instruct-2507-Q2_K.gguf` | 1.67 GB | Degradation is visible here |
| `Qwen3-4B-Instruct-2507-UD-IQ1_S.gguf` | 1.08 GB | The far end of the ladder |

9.5 GB in total. On `SMALL` the Q8_0 will not run alongside anything — that is the point of
having it.

### `LARGE` only — the models 36 GB actually buys

Skip this entire section on the 8 GB machine; none of it fits.

| File | Size | Purpose |
|---|---|---|
| `Ornith-1.5-35B-A3B` Q4_K_M | 21.71 GB | The working model on `LARGE`. MoE, ~3B active, 80 KB/token of KV |
| `WeMM-Embedding-2B-Q4_K_M.gguf` | 1.56 GB | Retrieval, Lesson 19 |
| `mmproj-WeMM-Embedding-2B-BF16.gguf` | 0.67 GB | Its vision tower — skip if text-only |

Ask the human before pulling the 21.71 GB file on a corporate machine. If they decline, or the
network makes it impractical, `Qwen3.8-27B` at Q4_K_M (16.46 GB) is the fallback and the lessons
still work.

**Do not download the 9B embedder for the trip.** It fits on `LARGE`, but Lesson 19's conclusion
stands: build the index at home and carry it. Indexing is prefill-bound and slow everywhere.

Put weights where the runtime found in Step 1 expects them. If that runtime is Ollama or LM Studio,
import them so they appear in its model list; if it is bare llama.cpp, `offline/models/` is fine.
Note that `offline/models/` is the one directory you should **not** copy between machines.

### Record a baseline

While the weights are fresh and the network is still up, measure the machine — every prediction in
the workspace is currently unverified on this hardware:

```bash
llama-bench -m offline/models/Qwen3-4B-Instruct-2507-Q4_K_M.gguf -p 512 -n 128
```

Write the `pp512` and `tg128` figures into `offline/MACHINE.md`. On `LARGE`, run it against the
35B as well. These two numbers replace every "estimated" row in Lessons 17 and 19 and in
`reference/three-machines.html`.

**Check:** the four ladder files present at the sizes above; on `LARGE`, the working model too.
One of them loads and answers a prompt, and `offline/MACHINE.md` carries measured `pp512` and
`tg128`.

---

## Step 5 · Reference repos

pi's tool schemas use TypeBox, which no general documentation set covers.

```bash
cd offline/repos && git clone --depth 1 https://github.com/sinclairzx81/typebox
```

Locate the llama.cpp clone from Step 1 and record in `offline/REPORT.md` the paths to its
`grammars/README.md`, `tools/server/README.md`, and `tools/quantize/README.md` — Lessons 6 to 8
send readers to all three.

**Check:** the report names three existing llama.cpp doc paths and the TypeBox clone.

---

## Step 6 · Language and API reference

Independent of Step 2. Pick one of three; all three work offline on macOS.

| Option | Cost | Install | Corpus | Search |
|---|---|---|---|---|
| **Dash** | $29.99 | App Store / kapeli.com | 200+ docsets, auto-updated | Native, best in class |
| **dasht** | free | `brew install dasht` | Same Kapeli docsets | Terminal, opens results in browser |
| **Bundled viewer** | free | none | 832 DevDocs slugs | In-page, keyboard-driven |

**Zeal is not an option** — it ships for Linux and Windows only, despite being the usual
recommendation for a free Dash alternative.

Ask the human which they want before downloading anything. If they have no preference, use
**dasht**: it is the mature tool, it costs nothing, and one `brew install` covers it.

```bash
brew install dasht
dasht-docsets-install TypeScript Node.js JavaScript Bash Git
```

The bundled viewer is the no-install path, and is already written and tested:

```bash
./offline/fetch-devdocs.sh        # --list shows all 832 slugs
```

It pulls DevDocs tarballs, converts the JSON to JS so `offline/devdocs/viewer.html` loads over
`file://` without a server, and writes a manifest. Choose it when Homebrew is unavailable or the
human wants the larger DevDocs corpus.

**Check:** whichever was chosen, a search for `Array.prototype.reduce` returns a readable page
with the network off.

## Step 7 · Verify offline

The real test. Ask the human to disable Wi-Fi, then confirm every line:

- `index.html` opens and its interactive widgets respond — the quiz in Lesson 1, the calculator
  in Lesson 3, the sampler in Lesson 7.
- The machine-dependent widgets offer this machine: Lesson 17's token meter lists the M4 rows,
  Lesson 18's context budget offers the 48 GB setup, Lessons 16 and 19 offer the 36 GB budget.
- A link from `offline/sources/` opens and renders as the article, images included.
- `packages/coding-agent/docs/extensions.md` is readable.
- `pi --version` succeeds.
- A model loads and answers a prompt — on `LARGE`, the 35B, not just the 4B.
- `offline/devdocs/viewer.html` searches and opens pages.
- `offline/MACHINE.md` exists and carries measured `pp512` / `tg128`.

Record the result of each in `offline/REPORT.md`. Where something fails, say what failed and what
a human would do about it rather than repairing it silently — they need to know what is missing
before they are in the air.

**Check:** all eight lines verified with Wi-Fi off, each with a recorded result. Both machines
have their own `offline/REPORT.md` and `offline/MACHINE.md`; neither is finished until its own
copy passes.
