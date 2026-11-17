#!/usr/bin/env bash
# Sound pass for a daily reel with the sound-effects skill (npx skills add Barty-Bart/motion-graphics):
# renders the reel silent, builds the cue list from the reel's own timeline, then the skill places one CC0 sound per cue,
# mixes our original loop under it to -16 LUFS / true peak below -4 dBFS and writes a report.
#   scripts/sound_pass.sh day08-a   ->  out/daily/day08-a.mp4 (the mixed reel; the Remotion mix is kept as day08-a-remotion.mp4)
#                                       out/sound/day08-a/  (report.html, SOUND.md, CREDITS.txt, beatgrid.png, checks/)
# Needs: ffmpeg, and a venv with librosa soundfile numpy scipy matplotlib at $SOUND_VENV (default .sound-effects).
set -euo pipefail
cd "$(dirname "$0")/.."
id=$1
SKILL=${SOUND_SKILL:-$HOME/.claude/skills/sound-effects}
PY=${SOUND_VENV:-.sound-effects}/bin/python
spec=content/daily/$id.json
work=out/sound/$id; mkdir -p "$work"

npx remotion render DailyReel "$work/silent.mp4" --props="$spec" --codec h264 --crf 20 --muted --log error
python3 scripts/reel_cues.py "$spec" > "$work/cues.json"
music=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['music'])" "$spec")
# the reel plays its loop from bar two (Remotion trimBefore=BAR), so the skill gets the same audio from there
ffmpeg -v error -y -ss 2 -i "public/daily/music-$music.wav" "$work/music.wav"
"$PY" "$SKILL/scripts/sound_pass.py" --video "$work/silent.mp4" --cues "$work/cues.json" --music "$work/music.wav" \
  --manifest "$SKILL/sfx/manifest.json" --out "$work" --use-case "Instagram Reels" \
  --music-source "Perko original loop $music (music/daily.py, made in-house)" --music-license "Owned by Perko"
[ -f "out/daily/$id-remotion.mp4" ] || cp "out/daily/$id.mp4" "out/daily/$id-remotion.mp4"
cp "$work/after.mp4" "out/daily/$id.mp4"
echo "out/daily/$id.mp4  (report: $work/report.html)"
