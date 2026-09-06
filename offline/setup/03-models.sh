#!/usr/bin/env bash
# Step 3: config.json files to read, GGUF weights to run, and a measured baseline.
# Usage: ./03-models.sh            # ladder + (LARGE) embedder; asks before the 21.7 GB model
#        BIG=1 ./03-models.sh      # take the 21.7 GB Ornith without asking
#        BIG=fallback ./03-models.sh   # 16 GB Qwen3.8-27B instead
set -euo pipefail
cd "$(dirname "$0")/../.."
. offline/setup/env.sh
. offline/toolchain/profile.env      # PROFILE=SMALL|LARGE
mkdir -p offline/configs offline/models

get() { # get <repo> <path-in-repo> <dest>
  [ -s "$3" ] && { echo "have $(basename "$3")"; return; }
  echo "==> $3"
  curl -fL --retry 3 -C - "https://huggingface.co/$1/resolve/main/$2" -o "$3"
}

echo "### configs (Lesson 14)"
for r in Qwen/Qwen3-4B-Instruct-2507 Qwen/Qwen3-8B Qwen/Qwen3.8-27B \
         unsloth/Llama-3.3-70B-Instruct ornith-ai/Ornith-1.5-35B-A3B ornith-ai/Ornith-1.5-9B \
         Qwen/Qwen3-30B-A3B openai/gpt-oss-120b; do
  get "$r" config.json "offline/configs/$(basename "$r").json" || echo "  SKIPPED $r"
done

echo "### quantization ladder (both machines, 9.5 GB)"
L=unsloth/Qwen3-4B-Instruct-2507-GGUF
for q in Q4_K_M Q8_0 Q2_K UD-IQ1_S; do
  get "$L" "Qwen3-4B-Instruct-2507-$q.gguf" "offline/models/Qwen3-4B-Instruct-2507-$q.gguf"
done

if [ "$PROFILE" = LARGE ]; then
  echo "### embedder (Lesson 19)"
  get DreamBlooms/WeMM-Embedding-2B-GGUF WeMM-Embedding-2B-Q4_K_M.gguf       offline/models/WeMM-Embedding-2B-Q4_K_M.gguf
  get DreamBlooms/WeMM-Embedding-2B-GGUF mmproj-WeMM-Embedding-2B-BF16.gguf  offline/models/mmproj-WeMM-Embedding-2B-BF16.gguf

  ans="${BIG:-}"
  if [ -z "$ans" ]; then
    read -r -p "Pull Ornith-1.5-35B Q4_K_M (21.7 GB) onto this machine? [y/N/f=27B fallback] " ans
  fi
  case "$ans" in
    1|y|Y) get ornith-ai/Ornith-1.5-35B-A3B-GGUF Ornith-1.5-35B-Q4_K_M.gguf offline/models/Ornith-1.5-35B-Q4_K_M.gguf ;;
    f|fallback) get unsloth/Qwen3.8-27B-GGUF Qwen3.8-27B-UD-Q4_K_M.gguf offline/models/Qwen3.8-27B-UD-Q4_K_M.gguf ;;
    *) echo "skipped the working model — lessons still run on the 4B" ;;
  esac
fi

echo "### baseline (replaces every 'estimated' row in Lessons 17/19)"
B=offline/repos/llama.cpp/build/bin/llama-bench
for m in offline/models/Qwen3-4B-Instruct-2507-Q4_K_M.gguf \
         offline/models/Ornith-1.5-35B-Q4_K_M.gguf \
         offline/models/Qwen3.8-27B-UD-Q4_K_M.gguf; do
  [ -s "$m" ] || continue
  echo "-- $(basename "$m")"; "$B" -m "$m" -p 512 -n 128 | tee -a offline/MACHINE.md
done

echo "--- check ---"; ls -lh offline/models
echo "paste the pp512/tg128 numbers into the Baseline section of offline/MACHINE.md"
