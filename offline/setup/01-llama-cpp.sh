#!/usr/bin/env bash
# Step 1: llama.cpp from source, Metal enabled. Gives llama-cli, llama-server, llama-bench.
set -euo pipefail
cd "$(dirname "$0")/../.."
. offline/setup/env.sh
mkdir -p offline/repos
SRC=offline/repos/llama.cpp

if [ -d "$SRC/.git" ]; then git -C "$SRC" pull --ff-only || true
else git clone https://github.com/ggml-org/llama.cpp "$SRC"; fi

cmake -S "$SRC" -B "$SRC/build" -DCMAKE_BUILD_TYPE=Release -DGGML_METAL=ON \
  || cmake -S "$SRC" -B "$SRC/build" -DCMAKE_BUILD_TYPE=Release -DGGML_METAL=ON -DLLAMA_CURL=OFF
cmake --build "$SRC/build" --config Release -j"$(sysctl -n hw.ncpu)"

echo "--- check ---"
"$SRC/build/bin/llama-cli"   --version
"$SRC/build/bin/llama-bench" --help >/dev/null && echo "llama-bench ok"
ls "$SRC/build/bin" | tr '\n' ' '; echo
echo "docs: $SRC/grammars/README.md  $SRC/tools/server/README.md  $SRC/tools/quantize/README.md"
