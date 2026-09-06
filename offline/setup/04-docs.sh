#!/usr/bin/env bash
# Step 4: reference docs. TypeBox source, DevDocs corpus, archived lesson sources.
set -euo pipefail
cd "$(dirname "$0")/../.."
. offline/setup/env.sh
mkdir -p offline/repos offline/sources

echo "### TypeBox (pi's tool schemas — no docset covers it)"
[ -d offline/repos/typebox/.git ] || git clone --depth 1 https://github.com/sinclairzx81/typebox offline/repos/typebox

echo "### DevDocs (no install; opens over file://)"
./offline/fetch-devdocs.sh typescript node javascript dom git bash npm

echo "### cited sources"
# monolith inlines images/CSS into one file; build it from source if cargo is here.
if ! command -v monolith >/dev/null && command -v cargo >/dev/null; then
  cargo install --git https://github.com/Y2Z/monolith --locked || true
fi
grep -vE '^\s*(#|$)' offline/sources.txt | while read -r url; do
  name=$(echo "$url" | sed -E 's#https?://##; s#/+$##; s#[/?&=]#-#g; s#^www\.##' | cut -c1-90)
  out="offline/sources/$name.html"
  [ -s "$out" ] && continue
  if command -v monolith >/dev/null; then monolith -s "$url" -o "$out" 2>/dev/null || curl -sL "$url" -o "$out"
  else curl -sL --retry 2 "$url" -o "$out"; fi
  printf '%-90s %s\n' "$name" "$(du -h "$out" 2>/dev/null | cut -f1)"
done
curl -sL https://arxiv.org/pdf/2601.14277 -o offline/sources/arxiv-2601.14277-quantization.pdf

echo "--- check ---"
echo "under 10 KB (likely error pages — re-fetch by hand):"
find offline/sources -size -10k -type f
