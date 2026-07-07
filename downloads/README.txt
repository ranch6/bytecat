BYTECAT — a pixel cat for your desktop
======================================

Start it
--------
  macOS:    double-click BYTECAT.command
            (first time: right-click -> Open -> Open, because it came
             from the internet)
  Windows:  double-click BYTECAT.bat
  anywhere: python3 bytecat.py

Needs Python 3 with Tk. Windows python.org installs have it already.
macOS: brew install python-tk if it's missing. Linux: sudo apt install python3-tk

Use it
------
  drag           move the cat
  slow hover     pet its head (hearts!)
  double-click   meow
  right-click    fur pattern, your name, pomodoro, reminders,
                 pinned note, stretch breaks, peek mode, quit

Optional: keyboard & scroll reactions
-------------------------------------
Kneading, overheat mode, and paper unroll react to typing/scrolling in
OTHER apps only if you install pynput:

  python3 -m pip install pynput

(macOS will ask for Input Monitoring permission.) Privacy: bytecat only
counts keystrokes to animate paws — it never records which keys you press,
stores nothing, and sends nothing. Without pynput those features still work
whenever the cat window itself has focus.

Your settings (name, fur, etc.) are saved in ~/.bytecat.json
