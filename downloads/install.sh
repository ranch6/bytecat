#!/bin/sh
# BYTECAT installer for macOS.
#
# Builds BYTECAT.app in ~/Applications and launches it. Because the app
# bundle is assembled locally by your own shell (not downloaded by a
# browser), it never receives the com.apple.quarantine flag — so Gatekeeper
# shows no security warnings. Same technique Homebrew uses.
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
echo "· installing to $APP (python: $PY)"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

curl -fsSL "$BASE/bytecat.py" -o "$APP/Contents/Resources/bytecat.py"
curl -fsSL "$BASE/bytecat.icns" -o "$APP/Contents/Resources/bytecat.icns" 2>/dev/null || true

cat > "$APP/Contents/MacOS/bytecat" <<LAUNCHER
#!/bin/sh
exec "$PY" "\$(cd "\$(dirname "\$0")/../Resources" && pwd)/bytecat.py"
LAUNCHER
chmod +x "$APP/Contents/MacOS/bytecat"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>BYTECAT</string>
  <key>CFBundleDisplayName</key><string>BYTECAT</string>
  <key>CFBundleIdentifier</key><string>io.github.ranch6.bytecat</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>bytecat</string>
  <key>CFBundleIconFile</key><string>bytecat</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
PLIST

# refresh LaunchServices/Spotlight registration
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP" >/dev/null 2>&1 || true

echo "· installed."
if [ -z "$BYTECAT_NO_LAUNCH" ]; then
  open "$APP"
  echo "· BYTECAT is on your desktop. right-click the cat for settings. =^.^="
else
  echo "· launch skipped (BYTECAT_NO_LAUNCH set)."
fi
