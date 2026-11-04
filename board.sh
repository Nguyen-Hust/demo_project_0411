#!/usr/bin/env sh
DIR="$(cd "$(dirname "$0")" && pwd)"
if command -v node >/dev/null 2>&1; then
  node "$DIR/board/board.mjs" --ui
else
  open "$DIR/board/BOARD.html" 2>/dev/null || xdg-open "$DIR/board/BOARD.html" 2>/dev/null
fi
