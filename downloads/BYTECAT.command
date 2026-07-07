#!/bin/sh
# BYTECAT launcher for macOS — double-click me.
# (If macOS blocks it the first time: right-click -> Open -> Open.)
cd "$(dirname "$0")"

for PY in /usr/bin/python3 python3 python; do
  if command -v "$PY" >/dev/null 2>&1 && "$PY" -c 'import tkinter' >/dev/null 2>&1; then
    exec "$PY" bytecat.py
  fi
done

osascript -e 'display alert "BYTECAT needs Python with Tk" message "No Python with tkinter was found. Install it with:\n\nbrew install python-tk\n\nthen double-click this launcher again."' 2>/dev/null \
  || echo "BYTECAT needs Python 3 with tkinter. Try: brew install python-tk"
exit 1
