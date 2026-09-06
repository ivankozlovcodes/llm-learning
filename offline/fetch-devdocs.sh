#!/usr/bin/env bash
# Download DevDocs docsets for fully offline use.
#
#   ./fetch-devdocs.sh                     # the default set
#   ./fetch-devdocs.sh typescript node     # specific slugs
#   ./fetch-devdocs.sh --list              # every available slug
#
# Produces offline/devdocs/<slug>/{index.js,db.js} plus manifest.js, which
# viewer.html reads. JSON is wrapped as JS so it loads over file:// with no
# server. Requires curl, tar and node.

set -euo pipefail
cd "$(dirname "$0")/devdocs"

DEFAULT_SLUGS="typescript node javascript dom git bash npm"
BASE="https://downloads.devdocs.io"

if [ "${1:-}" = "--list" ]; then
  curl -sL https://devdocs.io/docs.json |
    node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).forEach(d=>console.log(d.slug.padEnd(24),d.name,d.version||"")))'
  exit 0
fi

SLUGS="${*:-$DEFAULT_SLUGS}"
INSTALLED=""

for slug in $SLUGS; do
  printf '%-14s ' "$slug"
  tmp="$(mktemp -d)"
  if ! curl -fsSL --max-time 600 "$BASE/$slug.tar.gz" -o "$tmp/d.tar.gz" 2>/dev/null; then
    echo "FAILED to download — skipping"; rm -rf "$tmp"; continue
  fi
  tar xzf "$tmp/d.tar.gz" -C "$tmp" 2>/dev/null || { echo "FAILED to extract — skipping"; rm -rf "$tmp"; continue; }
  if [ ! -f "$tmp/index.json" ] || [ ! -f "$tmp/db.json" ]; then
    echo "FAILED — unexpected archive layout"; rm -rf "$tmp"; continue
  fi

  mkdir -p "$slug"
  SLUG="$slug" SRC="$tmp" OUT="$slug" node -e '
    const fs = require("fs"), p = require("path");
    const slug = process.env.SLUG, src = process.env.SRC, out = process.env.OUT;
    const read = f => JSON.parse(fs.readFileSync(p.join(src, f), "utf8"));
    const meta = fs.existsSync(p.join(src, "meta.json")) ? read("meta.json") : { name: slug, slug };
    fs.writeFileSync(p.join(out, "index.js"),
      "DEVDOCS.meta(" + JSON.stringify(slug) + "," + JSON.stringify(meta) + ");\n" +
      "DEVDOCS.index(" + JSON.stringify(slug) + "," + JSON.stringify(read("index.json")) + ");\n");
    fs.writeFileSync(p.join(out, "db.js"),
      "DEVDOCS.db(" + JSON.stringify(slug) + "," + JSON.stringify(read("db.json")) + ");\n");
  '
  rm -rf "$tmp"
  INSTALLED="$INSTALLED $slug"
  echo "ok  ($(du -sh "$slug" | cut -f1))"
done

node -e '
  const fs = require("fs");
  const list = process.argv[1].trim().split(/\s+/).filter(Boolean);
  fs.writeFileSync("manifest.js", "DEVDOCS.manifest(" + JSON.stringify(list) + ");\n");
  console.log("\nmanifest.js: " + list.length + " docsets -> " + list.join(", "));
' "$INSTALLED"

echo "Open: $(cd .. && pwd)/devdocs/viewer.html"
