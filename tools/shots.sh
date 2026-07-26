#!/usr/bin/env bash
# Готовит снимки экранов к публикации.
#
#   tools/shots.sh          — обработать все PNG в assets/shots/
#   tools/shots.sh clean    — то же и удалить исходные PNG
#
# Кадры снимаются headless Chrome в 2×, поэтому весят мегабайтами. Здесь из
# каждого получается два JPEG: миниатюра для витрины и полный кадр, который
# подгружается только когда его открыли на весь экран.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHOTS="$DIR/assets/shots"
FULL_W=1500; FULL_Q=68     # полный кадр — для просмотра во весь экран
THUMB_W=620; THUMB_Q=62    # миниатюра — плитка витрины

[ -d "$SHOTS" ] || { echo "нет папки $SHOTS"; exit 1; }
cd "$SHOTS"

shopt -s nullglob
total=0
for src in *.png; do
  base="${src%.png}"

  cp "$src" "_w.png"
  sips --resampleWidth $FULL_W "_w.png" >/dev/null
  sips -s format jpeg -s formatOptions $FULL_Q "_w.png" --out "$base.jpg" >/dev/null

  cp "$src" "_t.png"
  sips --resampleWidth $THUMB_W "_t.png" >/dev/null
  sips -s format jpeg -s formatOptions $THUMB_Q "_t.png" --out "$base-t.jpg" >/dev/null
  rm -f _w.png _t.png

  read -r w h < <(sips -g pixelWidth -g pixelHeight "$base.jpg" | awk '/pixel/{printf "%s ", $2} END{print ""}')
  kb=$(( ($(stat -f%z "$base.jpg") + $(stat -f%z "$base-t.jpg")) / 1024 ))
  total=$((total + kb))
  printf '%-28s %5s×%-5s %5s КБ\n' "$base" "$w" "$h" "$kb"
done

echo "── итого: $total КБ"

if [ "${1:-}" = "clean" ]; then
  rm -f ./*.png
  echo "исходные PNG удалены"
fi
