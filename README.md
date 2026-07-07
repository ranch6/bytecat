# BYTECAT

A remake of [comnyang.com/en](https://comnyang.com/en) — a landing page for a pixel cat
that lives in your computer — plus an actual downloadable desktop cat.

## The website

Static site, no build step, no backend:

```
index.html   # landing page (hero, 17-feature showcase, download section)
style.css    # dark pixel-terminal theme (VT323 / DotGothic16 / JetBrains Mono)
cat.js       # in-browser pixel cat engine (canvas)
app.js       # page glue
```

Serve locally: `python3 -m http.server 4173` → http://localhost:4173

Deployed via GitHub Pages: pushing to `main` runs
`.github/workflows/pages.yml`, which publishes the repo as-is.

**Security:** there is no server code, no database, no forms, and no
user-generated content — nothing for a visitor to inject code into. A strict
Content-Security-Policy meta tag locks scripts and styles to this origin
(plus Google Fonts), blocks framing, forms, and plugins, and the page sends
no referrer. Only people with push access to the repo can change what's served.

## The desktop cat (take it anywhere)

The site's download button serves `downloads/bytecat.zip`:

```
bytecat.py        # the whole cat — one file, stdlib only (tkinter)
BYTECAT.command   # macOS double-click launcher
BYTECAT.bat       # Windows double-click launcher
README.txt        # instructions
```

Copy the zip to any computer with Python 3 + Tk and double-click the launcher
(macOS first launch: right-click → Open). Missing Tk? macOS:
`brew install python-tk` · Linux: `sudo apt install python3-tk`.

Features: fur patterns (orange/gray/black/white/calico), eye-follow anywhere
on screen, cursor hunt, mochi drag, head pets with hearts, keyboard kneading,
**overheat mode** (red + steam when you type in a frenzy), stretch-break
reminders, paper unroll on scroll, a 25/5 pomodoro with floating pixel timer,
timed message reminders, a pinned note, it calls you by name, peek mode
(tucks against the screen edge), nap mode, and meow on demand (double-click).
Right-click the cat for all settings; they persist in `~/.bytecat.json`.

Keyboard/scroll reactions work globally only if the optional `pynput` package
is installed (`python3 -m pip install pynput`; macOS asks for Input Monitoring
permission). Privacy: it only *counts* keystrokes to animate the paws — it
never records which keys are pressed, stores nothing, sends nothing. Without
pynput, those reactions work when the cat window itself has focus.
