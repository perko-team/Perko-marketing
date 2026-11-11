#!/usr/bin/env bash
# One narrated reel end to end: scripts/narrated.sh day01-b <take.mp3 url or path>
# downloads the ElevenLabs take, splits it into scene clips, renders the reel and its cover, uploads it to the Studio.
set -euo pipefail
cd "$(dirname "$0")/.."
sid=$1; src=$2
mkdir -p out/takes out/daily
if [[ $src == http* ]]; then curl -sS -o "out/takes/$sid.mp3" "$src"; else cp "$src" "out/takes/$sid.mp3"; fi
python3 content/vo_split.py "$sid" "out/takes/$sid.mp3"
npx remotion render DailyReel "out/daily/$sid.mp4" --props="content/daily/$sid.json" --codec h264 --crf 20 --log error
npx remotion still DailyReel "out/daily/$sid-cover.jpg" --props="content/daily/$sid.json" --frame 12 --image-format jpeg --log error
echo "rendered $(ffprobe -v error -show_entries format=duration -of csv=p=0 out/daily/$sid.mp4)s"
python3 scripts/sync.py --only "$sid" | grep "^$sid"
