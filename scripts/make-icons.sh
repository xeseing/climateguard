#!/bin/bash
# Generate ClimateGuard PWA icons (sun + cloud on midnight) with ImageMagick.
set -e
cd "$(dirname "$0")/.."
BG='#0a0a12'; TEAL='#2bd4a7'; CLOUD='#e8f6f1'
convert -size 512x512 "xc:$BG" \
  -stroke "$TEAL" -strokewidth 18 -fill none -define draw:linecap=round \
  -draw "line 351,220 381,220 line 323,287 344,308 line 256,315 256,345 line 189,287 168,308" \
  -draw "line 161,220 131,220 line 189,153 168,132 line 256,125 256,95 line 323,153 344,132" \
  -stroke none -fill "$TEAL" -draw "circle 256,220 256,150" \
  -fill "$CLOUD" \
  -draw "circle 190,290 190,245" -draw "circle 265,262 265,202" -draw "circle 340,290 340,245" \
  -draw "roundrectangle 130,285 390,365 30,30" \
  icons/icon-512.png
convert icons/icon-512.png -resize 192x192 icons/icon-192.png
convert icons/icon-512.png -resize 180x180 icons/apple-touch-icon.png
convert icons/icon-512.png -resize 72% -background "$BG" -gravity center -extent 512x512 icons/maskable-512.png
identify icons/*.png
