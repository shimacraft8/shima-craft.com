#!/usr/bin/env bash
# Captures current production state of shima-craft.com for before/after migration comparison.
# Usage: ./capture-state.sh <output-dir>
set -uo pipefail

OUT="${1:?output dir required}"
mkdir -p "$OUT"

PAGES=(
  "/"
  "/blog"
  "/amami-tide"
  "/privacy"
)
FILES=(
  "/ads.txt"
  "/robots.txt"
  "/sitemap.xml"
)

BASE="https://shima-craft.com"

echo "=== Capturing production state to $OUT ===" | tee "$OUT/_summary.txt"
date | tee -a "$OUT/_summary.txt"

# www / non-www / http behavior
{
  echo "--- www redirect behavior ---"
  echo "[https://www.shima-craft.com]"
  curl -sI -o /dev/null -w "status=%{http_code} redirect_url=%{redirect_url}\n" "https://www.shima-craft.com"
  echo "[http://shima-craft.com]"
  curl -sI -o /dev/null -w "status=%{http_code} redirect_url=%{redirect_url}\n" "http://shima-craft.com"
  echo "[http://www.shima-craft.com]"
  curl -sI -o /dev/null -w "status=%{http_code} redirect_url=%{redirect_url}\n" "http://www.shima-craft.com"
} | tee -a "$OUT/_summary.txt"

for p in "${PAGES[@]}"; do
  slug=$(echo "$p" | sed 's#/#_#g')
  [ -z "$slug" ] && slug="_root"
  url="$BASE$p"
  echo "--- $url ---" | tee -a "$OUT/_summary.txt"

  curl -sD "$OUT/headers${slug}.txt" -o "$OUT/body${slug}.html" -w "status=%{http_code} time=%{time_total}s\n" "$url" | tee -a "$OUT/_summary.txt"

  title=$(grep -oE '<title>[^<]*</title>' "$OUT/body${slug}.html" | head -1)
  canonical=$(grep -oE '<link[^>]*rel="canonical"[^>]*>' "$OUT/body${slug}.html" | head -1)
  desc=$(grep -oE '<meta[^>]*name="description"[^>]*>' "$OUT/body${slug}.html" | head -1)
  ga=$(grep -oE 'G-[A-Z0-9]{6,12}' "$OUT/body${slug}.html" | sort -u | head -1)
  adsense=$(grep -oE 'ca-pub-[0-9]+' "$OUT/body${slug}.html" | sort -u | head -1)
  jsonld_count=$(grep -oE 'application/ld\+json' "$OUT/body${slug}.html" | wc -l | tr -d ' ')

  {
    echo "title: $title"
    echo "canonical: $canonical"
    echo "description: $desc"
    echo "ga4_id: $ga"
    echo "adsense_pub_id: $adsense"
    echo "jsonld_blocks: $jsonld_count"
  } | tee -a "$OUT/_summary.txt"
  echo "" | tee -a "$OUT/_summary.txt"
done

for f in "${FILES[@]}"; do
  slug=$(echo "$f" | sed 's#/#_#g')
  url="$BASE$f"
  echo "--- $url ---" | tee -a "$OUT/_summary.txt"
  curl -sD "$OUT/headers${slug}.txt" -o "$OUT${slug}" -w "status=%{http_code}\n" "$url" | tee -a "$OUT/_summary.txt"
  echo "" | tee -a "$OUT/_summary.txt"
done

echo "=== Done ===" | tee -a "$OUT/_summary.txt"
