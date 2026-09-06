#!/usr/bin/env bash
# Step 5: run this with Wi-Fi OFF.
set -uo pipefail
cd "$(dirname "$0")/../.."
. offline/setup/env.sh
export PATH="$HOME/.local/bin:$PATH"
ok(){ printf '  %-52s %s\n' "$1" "$2"; }
R=offline/repos

ok "index.html"            "$([ -s index.html ] && echo yes || echo MISSING)"
ok "pi --version"          "$(pi --version 2>&1 | head -1)"
ok "pi docs (want 30)"     "$(ls $R/pi/packages/coding-agent/docs/*.md 2>/dev/null | wc -l | tr -d ' ')"
ok "llama-cli"             "$($R/llama.cpp/build/bin/llama-cli --version 2>&1 | head -1)"
ok "models"                "$(ls offline/models/*.gguf 2>/dev/null | wc -l | tr -d ' ') gguf"
ok "sources archived"      "$(ls offline/sources/* 2>/dev/null | wc -l | tr -d ' ')"
ok "devdocs viewer"        "$([ -s offline/devdocs/viewer.html ] && echo yes || echo MISSING)"
ok "MACHINE.md baseline"   "$(grep -c 'pp512' offline/MACHINE.md 2>/dev/null)"

M=$(ls offline/models/Ornith-*.gguf offline/models/Qwen3.8-*.gguf offline/models/Qwen3-4B-Instruct-2507-Q4_K_M.gguf 2>/dev/null | head -1)
echo; echo "answering from $(basename "${M:-none}"):"
[ -n "$M" ] && $R/llama.cpp/build/bin/llama-cli -m "$M" -no-cnv -n 40 -p "In one sentence, what is a KV cache?"

echo; echo "still by hand, with Wi-Fi off:"
echo "  open index.html               - quizzes/calculators respond, machine rows list this machine"
echo "  open offline/devdocs/viewer.html - search Array.prototype.reduce"
echo "  open one file in offline/sources/ - renders as the article, images included"
