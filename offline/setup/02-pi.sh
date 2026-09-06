#!/usr/bin/env bash
# Step 2: pi from source + its 30 markdown docs. Puts `pi` in ~/.local/bin.
set -euo pipefail
cd "$(dirname "$0")/../.."
. offline/setup/env.sh
mkdir -p offline/repos
SRC="$PWD/offline/repos/pi"

if [ -d "$SRC/.git" ]; then git -C "$SRC" pull --ff-only || true
else git clone https://github.com/earendil-works/pi "$SRC"; fi

( cd "$SRC" && npm install --ignore-scripts && npm run build )

mkdir -p ~/.local/bin
BUNDLE="$SRC/packages/coding-agent/dist/bundle/cli.js"
if [ -f "$BUNDLE" ]; then
  printf '#!/usr/bin/env bash\nexec "%s" "%s" "$@"\n' "$(command -v node)" "$BUNDLE" > ~/.local/bin/pi
else
  printf '#!/usr/bin/env bash\nexec "%s/pi-test.sh" "$@"\n' "$SRC" > ~/.local/bin/pi   # runs from sources
fi
chmod +x ~/.local/bin/pi
grep -q '.local/bin' ~/.zshrc 2>/dev/null || echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
export PATH="$HOME/.local/bin:$PATH"

echo "--- check ---"
pi --version
echo "docs: $(ls "$SRC/packages/coding-agent/docs"/*.md | wc -l | tr -d ' ') md files (want 30), llama-cpp.md: $([ -f "$SRC/packages/coding-agent/docs/llama-cpp.md" ] && echo yes || echo MISSING)"
ls "$SRC/examples/extensions" | tr '\n' ' '; echo
