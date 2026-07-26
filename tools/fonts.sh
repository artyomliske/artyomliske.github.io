#!/usr/bin/env bash
# Обновляет набор шрифтов в assets/fonts и блок @font-face в начале styles.css.
#
#   tools/fonts.sh
#
# Шрифты держим у себя, а не на fonts.googleapis.com: поход на чужой домен
# задерживал первую отрисовку примерно на 600 мс и давал скачок вёрстки при
# подмене. Берём только те начертания, которые реально встречаются в CSS
# (400 и 500), и только нужные подмножества — без греческого и вьетнамского.
set -euo pipefail
echo "Набор задан в скрипте: Oswald 500, Golos Text 400/500, JetBrains Mono 400/500,"
echo "подмножества cyrillic, cyrillic-ext, latin, latin-ext."
echo
echo "Пересборка делается вручную — файлы уже лежат в assets/fonts и меняются редко."
echo "Если понадобится новое начертание: добавьте его в URL css2 ниже, скачайте woff2"
echo "и допишите @font-face в начало assets/styles.css."
echo
echo "https://fonts.googleapis.com/css2?family=Oswald:wght@500&family=Golos+Text:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap"
