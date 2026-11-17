#!/usr/bin/env bash
# Download the reels' music into public/music/ (git-ignored: Mixkit forbids redistributing the files).
# Licence: Mixkit Stock Music Free License, https://mixkit.co/license/#musicFree (checked 17 Nov 2026):
# commercial and non-commercial use on web and social media, including ads; no credit needed.
# Not allowed: CDs/DVDs, TV/radio, video games, remixing into a music-only track, Content ID registration.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/music
for id in 1168 130 702 834 732 171; do
  [ -f "public/music/mixkit-$id.mp3" ] || curl -sSf -o "public/music/mixkit-$id.mp3" "https://assets.mixkit.co/music/$id/$id.mp3"
done
ls public/music
