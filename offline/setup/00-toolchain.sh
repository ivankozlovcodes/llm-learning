#!/usr/bin/env bash
# Step 0+1: identify the machine, get a toolchain without depending on Homebrew.
# Idempotent. Everything local goes under offline/toolchain, on PATH via offline/setup/env.sh
set -euo pipefail
cd "$(dirname "$0")/../.."          # workspace root
ROOT="$PWD"; TC="$ROOT/offline/toolchain"; mkdir -p "$TC/bin"

# --- machine profile -------------------------------------------------------
CHIP=$(sysctl -n machdep.cpu.brand_string)
MEM=$(( $(sysctl -n hw.memsize) / 1073741824 ))
GPU=$(system_profiler SPDisplaysDataType | awk -F': ' '/Total Number of Cores/{print $2; exit}')
if [ "$MEM" -ge 32 ]; then PROFILE=LARGE; BUDGET=36; else PROFILE=SMALL; BUDGET=4.2; fi

cat > offline/MACHINE.md <<EOF
# Machine

- Chip: $CHIP
- Memory: ${MEM} GiB
- GPU cores: ${GPU:-unknown}
- Profile: $PROFILE  (practical model budget ~${BUDGET} GB)
- Recorded: $(date -u +%F)

<!-- 16/20 GPU cores = M4 Pro 273 GB/s; 40 = M4 Max 546 GB/s. 2x decode difference. -->

## Baseline (filled in by 03-models.sh)
pp512:
tg128:
EOF
echo "PROFILE=$PROFILE" > "$TC/profile.env"
echo "profile: $PROFILE  ($CHIP, ${MEM} GiB, ${GPU:-?} GPU cores)"

# --- compiler --------------------------------------------------------------
xcode-select -p >/dev/null 2>&1 || { echo "Run: xcode-select --install  (then re-run this)"; exit 1; }

# --- cmake (llama.cpp needs it; no Makefile build any more) -----------------
if ! command -v cmake >/dev/null && [ ! -x "$TC/bin/cmake" ]; then
  echo "==> cmake (official Kitware universal binary, no Homebrew)"
  V=3.31.6
  curl -fL --retry 3 "https://github.com/Kitware/CMake/releases/download/v$V/cmake-$V-macos-universal.tar.gz" \
    -o "$TC/cmake.tgz"
  tar xzf "$TC/cmake.tgz" -C "$TC" && rm "$TC/cmake.tgz"
  ln -sf "$TC/cmake-$V-macos-universal/CMake.app/Contents/bin/cmake" "$TC/bin/cmake"
fi

# --- node (pi + fetch-devdocs.sh need it) ----------------------------------
if ! command -v node >/dev/null && [ ! -x "$TC/bin/node" ]; then
  echo "==> node (official prebuilt tarball)"
  V=v22.14.0
  curl -fL --retry 3 "https://nodejs.org/dist/$V/node-$V-darwin-arm64.tar.gz" -o "$TC/node.tgz"
  tar xzf "$TC/node.tgz" -C "$TC" && rm "$TC/node.tgz"
  ln -sf "$TC/node-$V-darwin-arm64/bin/node" "$TC/bin/node"
  ln -sf "$TC/node-$V-darwin-arm64/bin/npm"  "$TC/bin/npm"
fi

cat > offline/setup/env.sh <<EOF
export PATH="$TC/bin:$ROOT/offline/repos/llama.cpp/build/bin:\$PATH"
EOF

# shellcheck disable=SC1091
. offline/setup/env.sh
echo "--- check ---"
cmake --version | head -1; node --version; npm --version; git --version
echo "wrote offline/MACHINE.md and offline/setup/env.sh"
