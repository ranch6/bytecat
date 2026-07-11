BYTECAT — a pixel cat for your desktop
======================================

Easiest install (macOS, no security warnings)
---------------------------------------------
Paste this in Terminal:

  curl -fsSL https://ranch6.github.io/bytecat/downloads/install.sh | sh

It builds BYTECAT.app in ~/Applications and launches it. No Gatekeeper
popups: the app is assembled locally by your own shell, so it never
carries the browser's quarantine flag.

This zip (Windows / Linux / manual)
-----------------------------------
  Windows:  double-click BYTECAT.bat
  macOS:    double-click BYTECAT.command
            (downloaded files are quarantined, so the FIRST time macOS
             will warn you: right-click -> Open -> Open. Or use the
             Terminal one-liner above for zero warnings.)
  anywhere: python3 bytecat.py

Needs Python 3 with Tk. Windows python.org installs have it already.
macOS: brew install python-tk if it's missing. Linux: sudo apt install python3-tk

Use it
------
  drag           move the cat
  slow hover     pet its head (hearts!)
  double-click   meow
  right-click    coat (ink / patch / lucky cat / ...), your name, pomodoro,
                 reminders, pinned note, stretch breaks, peek mode, quit

Leave it alone for a bit and a little fish comes out to play.
Ignore it even longer and it falls asleep.

Optional: global keyboard reactions
-----------------------------------
Kneading and overheat mode react to typing in OTHER apps only if you
install pynput:

  python3 -m pip install pynput

(macOS will ask for Input Monitoring permission.) Privacy: bytecat only
counts keystrokes to animate paws — it never records which keys you press,
stores nothing, and sends nothing. Without pynput those features still work
whenever the cat window itself has focus.

Your settings (name, coat, etc.) are saved in ~/.bytecat.json
