#!/usr/bin/env bash
# Render one day's two reels: scripts/daily.sh 01  ->  out/daily/day01-a.mp4, day01-b.mp4 (+ a cover still each)
set -euo pipefail
cd "$(dirname "$0")/.."
day=$(printf '%02d' "$((10#$1))")
mkdir -p out/daily
for slot in a b; do
  spec="content/daily/day${day}-${slot}.json"
  [ -f "$spec" ] || { echo "missing $spec" >&2; exit 1; }
  npx remotion render DailyReel "out/daily/day${day}-${slot}.mp4" --props="$spec" --codec h264 --crf 20 --log error
  npx remotion still DailyReel "out/daily/day${day}-${slot}-cover.jpg" --props="$spec" --frame 40 --image-format jpeg --log error
  echo "out/daily/day${day}-${slot}.mp4"
done
