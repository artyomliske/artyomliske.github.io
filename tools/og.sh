#!/usr/bin/env bash
# Собирает assets/og.jpg — картинку, которую показывают Telegram, WhatsApp
# и соцсети в развороте ссылки. Источник — tools/og.html.
#
#   tools/og.sh
#
# Нужен локальный сервер: шрифты и картинки по file:// подтягиваются криво.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=8791

[ -x "$CHROME" ] || { echo "не нашёл Google Chrome"; exit 1; }

python3 -m http.server $PORT --directory "$DIR" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 1

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=1200,630 \
  --virtual-time-budget=8000 \
  --screenshot="$DIR/assets/_og.png" \
  "http://localhost:$PORT/tools/og.html" 2>/dev/null

sips --resampleWidth 1200 "$DIR/assets/_og.png" >/dev/null
sips -s format jpeg -s formatOptions 82 "$DIR/assets/_og.png" --out "$DIR/assets/og.jpg" >/dev/null
rm -f "$DIR/assets/_og.png"

read -r w h < <(sips -g pixelWidth -g pixelHeight "$DIR/assets/og.jpg" | awk '/pixel/{printf "%s ", $2} END{print ""}')
echo "assets/og.jpg — ${w}×${h}, $(( $(stat -f%z "$DIR/assets/og.jpg") / 1024 )) КБ"
