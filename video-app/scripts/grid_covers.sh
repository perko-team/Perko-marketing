#!/usr/bin/env bash
# Render the profile-grid covers (lime + ink) for every daily reel, or only the ids given:
#   scripts/grid_covers.sh            ->  out/daily/<id>-cover-lime.jpg, <id>-cover-ink.jpg
#   scripts/grid_covers.sh day03-a
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/daily
ids=("$@"); [ ${#ids[@]} -gt 0 ] || ids=($(ls content/daily/day*.json | xargs -n1 basename | sed 's/.json$//'))
for id in "${ids[@]}"; do
  npx remotion still GridCoverLime "out/daily/$id-cover-lime.jpg" --props="content/daily/$id.json" --image-format jpeg --log error
  npx remotion still GridCoverInk "out/daily/$id-cover-ink.jpg" --props="content/daily/$id.json" --image-format jpeg --log error
  echo "$id"
done
