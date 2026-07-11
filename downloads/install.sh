#!/bin/sh
# BYTECAT installer for macOS.
#
# Builds BYTECAT.app in ~/Applications and launches it. Because the app
# bundle is assembled locally by your own shell (not downloaded by a
# browser), it never receives the com.apple.quarantine flag — so Gatekeeper
# shows no security warnings. The launcher is compiled with osacompile into
# a native binary for your Mac's own architecture, so there is no Rosetta
# prompt on Apple Silicon either.
#
# Usage:  curl -fsSL https://ranch6.github.io/bytecat/downloads/install.sh | sh
# Uninstall: delete ~/Applications/BYTECAT.app (settings live in ~/.bytecat.json)

set -e

BASE="${BYTECAT_BASE:-https://ranch6.github.io/bytecat/downloads}"

if [ "$(uname)" != "Darwin" ]; then
  echo "This installer is for macOS. On Windows/Linux, grab bytecat.zip instead:"
  echo "  $BASE/bytecat.zip"
  exit 1
fi

# find a Python 3 that has tkinter
PY=""
for c in /usr/bin/python3 python3 python; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import tkinter' >/dev/null 2>&1; then
    PY="$(command -v "$c")"
    break
  fi
done
if [ -z "$PY" ]; then
  echo "BYTECAT needs Python 3 with Tk, which wasn't found."
  echo "Install it with:"
  echo ""
  echo "  brew install python-tk"
  echo ""
  echo "then run this installer again."
  exit 1
fi

APP="$HOME/Applications/BYTECAT.app"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "· building native launcher (python: $PY)"
cat > "$TMP/bytecat.applescript" <<APPLESCRIPT
on run
	set resPath to POSIX path of (path to me) & "Contents/Resources/"
	do shell script quoted form of "$PY" & " " & quoted form of (resPath & "bytecat.py") & " > /dev/null 2>&1 &"
end run
APPLESCRIPT

mkdir -p "$HOME/Applications"
rm -rf "$APP"
osacompile -o "$APP" "$TMP/bytecat.applescript"

echo "· installing to $APP"
curl -fsSL "$BASE/bytecat.py" -o "$APP/Contents/Resources/bytecat.py"
# our icon replaces the generic applet icon (name must stay applet.icns)
curl -fsSL "$BASE/bytecat.icns" -o "$APP/Contents/Resources/applet.icns" 2>/dev/null || true

PB=/usr/libexec/PlistBuddy
PLIST="$APP/Contents/Info.plist"
$PB -c 'Set :CFBundleName BYTECAT' "$PLIST" 2>/dev/null || $PB -c 'Add :CFBundleName string BYTECAT' "$PLIST"
$PB -c 'Add :CFBundleDisplayName string BYTECAT' "$PLIST" 2>/dev/null || $PB -c 'Set :CFBundleDisplayName BYTECAT' "$PLIST"
$PB -c 'Add :CFBundleIdentifier string io.github.ranch6.bytecat' "$PLIST" 2>/dev/null || $PB -c 'Set :CFBundleIdentifier io.github.ranch6.bytecat' "$PLIST"
$PB -c 'Add :LSUIElement bool true' "$PLIST" 2>/dev/null || true

# refresh LaunchServices/Spotlight registration
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP" >/dev/null 2>&1 || true

echo "· installed."
if [ -z "$BYTECAT_NO_LAUNCH" ]; then
  open "$APP"
  echo "· BYTECAT is on your desktop. right-click the cat for settings. =^.^="
else
  echo "· launch skipped (BYTECAT_NO_LAUNCH set)."
fi
