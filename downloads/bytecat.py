#!/usr/bin/env python3
"""
BYTECAT — a pixel cat that lives on your desktop.

One file. Only Python's built-in tkinter is required.
If `pynput` is installed (optional: pip install pynput), Bytecat also reacts
to typing and scrolling anywhere on your system: keyboard kneading, overheat
mode, and paper unroll. PRIVACY: it only counts keystrokes to animate paws —
it never records WHICH keys you press, stores nothing, and sends nothing.

Run:            python3 bytecat.py      (or double-click the launcher)
Move it:        drag the cat anywhere
Pet it:         glide the mouse slowly over its head
Meow:           double-click it
Everything else: right-click it — fur pattern, your name, pomodoro,
                 reminders, pinned note, stretch breaks, peek mode, quit.

Settings are saved to ~/.bytecat.json so your cat remembers you.
Works on macOS, Windows, and Linux (transparency is best on macOS/Windows).
"""

import json
import math
import random
import sys
import time
import tkinter as tk
from pathlib import Path
from tkinter import simpledialog

# ---------------------------------------------------------------- sprite ----
# legend: . transparent | # outline | B body | W chest | P pink | S stripe
SPRITE = [
    "..#..........#......",
    ".#B#........#B#.....",
    ".#PB#......#BP#.....",
    ".#BBB######BBB#.....",
    "#BBSBBBBBBBBSBB#....",
    "#BBBBBBBBBBBBBB#....",
    "#BBBBBBBBBBBBBB#....",
    "#BBBBBWWWWBBBBB#....",
    ".#BBBBWWWWBBBB#.....",
    "..#BBBBBBBBBB#......",
    ".#BBBBBBBBBBBB#.....",
    "#BBSBBBBBBBBSBB#....",
    "#BBBBBBBBBBBBBB#..#.",
    "#BBSBBBBBBBBSBB#.#B#",
    "#BBBBBBBBBBBBBB##B#.",
    "#BBBBBBBBBBBBBBB#B#.",
    ".##B##B####B##B##...",
]
COLS, ROWS = 20, 17
PX = 8
OFF_X = 60                    # cat's left edge inside the window
TOP_PAD = 64                  # headroom for bubbles / timers / steam
W = 280
H = TOP_PAD + ROWS * PX + 10

EYES = [(5, 3), (5, 11)]      # top-left cell of each 2x2 eye
NOSE = (7, 7.5)
CONFIG = Path.home() / ".bytecat.json"

PALETTES = {
    "orange": {"B": "#e8963c", "S": "#b4641e", "W": "#f7e3c3", "#": "#1c1210", "P": "#e87c9a", "eye": "#7ec24a"},
    "gray":   {"B": "#8b8f98", "S": "#5b5f68", "W": "#e8e8ea", "#": "#17181c", "P": "#e87c9a", "eye": "#e8b93c"},
    "black":  {"B": "#2e2b33", "S": "#211f26", "W": "#c9c4bd", "#": "#0c0b0e", "P": "#e87c9a", "eye": "#e8b93c"},
    "white":  {"B": "#f2ede2", "S": "#d8d0be", "W": "#ffffff", "#": "#2a2620", "P": "#e87c9a", "eye": "#4a9ec2"},
    "calico": {"B": "#f2ede2", "S": "#e8963c", "W": "#ffffff", "#": "#2a2620", "P": "#e87c9a", "eye": "#7ec24a",
               "extra": "#4a4149"},
}


def blend(a, b, t):
    """Mix two #rrggbb colors."""
    pa, pb = int(a[1:], 16), int(b[1:], 16)
    ch = lambda sa, sb: round(sa + (sb - sa) * t)
    r = ch(pa >> 16, pb >> 16)
    g = ch((pa >> 8) & 255, (pb >> 8) & 255)
    bl = ch(pa & 255, pb & 255)
    return f"#{r:02x}{g:02x}{bl:02x}"


class ByteCat:
    def __init__(self, root):
        self.root = root
        cfg = self._load_config()
        self.pattern = cfg.get("pattern", "orange")
        self.name = cfg.get("name", "")
        self.stretch_every = cfg.get("stretch_every", 45)   # minutes; 0 = off
        self.peek = cfg.get("peek", False)
        self.pinned = cfg.get("pinned", "")

        self.state = "idle"      # idle|pet|sleep|meow|alert|knead|overheat|stretch|unroll
        self.state_until = 0.0
        self.blink_until = 0.0
        self.next_blink = time.time() + random.uniform(2, 5)
        self.last_pointer = (0, 0)
        self.last_pointer_move = time.time()
        self.pointer_speed = 0.0
        self.pet_heat = 0.0
        self.particles = []
        self.dragging = False
        self.bubble = None                     # {"text","until"}
        self.reminders = []                    # [(fire_ts, msg)]
        self.pomo = None                       # {"phase","until"}
        self.next_stretch = self._schedule_stretch()
        self.key_count = 0                     # bumped by listeners; count only
        self._keys_seen = 0
        self.key_times = []
        self.scroll_heat = 0.0
        self.unroll_len = 0.0

        root.overrideredirect(True)
        try:
            root.wm_attributes("-topmost", True)
        except tk.TclError:
            pass
        self.trans = self._setup_transparency()
        self.canvas = tk.Canvas(root, width=W, height=H, highlightthickness=0,
                                bg=self.trans, bd=0)
        self.canvas.pack()

        sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
        self.screen = (sw, sh)
        root.geometry(f"{W}x{H}+{sw - W - 40}+{sh - H - 90}")

        self.canvas.bind("<ButtonPress-1>", self._drag_start)
        self.canvas.bind("<B1-Motion>", self._drag_move)
        self.canvas.bind("<ButtonRelease-1>", self._drag_end)
        self.canvas.bind("<Double-Button-1>", lambda e: self._meow())
        self.canvas.bind("<Button-2>", self._menu)
        self.canvas.bind("<Button-3>", self._menu)
        self.canvas.bind("<Motion>", self._petting)
        # kneading also works without pynput whenever the cat window has focus
        root.bind("<Key>", lambda e: self._on_keystroke())

        self._start_global_listeners()
        if self.name:
            self._say(f"hi {self.name}!", 3)
        self._tick()

    # ------------------------------------------------------------ config ---
    def _load_config(self):
        try:
            return json.loads(CONFIG.read_text())
        except (OSError, ValueError):
            return {}

    def _save_config(self):
        data = {"pattern": self.pattern, "name": self.name, "pinned": self.pinned,
                "stretch_every": self.stretch_every, "peek": self.peek}
        try:
            CONFIG.write_text(json.dumps(data))
        except OSError:
            pass

    # ------------------------------------------------------------ window ---
    def _setup_transparency(self):
        root = self.root
        if sys.platform == "darwin":
            try:
                root.wm_attributes("-transparent", True)
                root.config(bg="systemTransparent")
                return "systemTransparent"
            except tk.TclError:
                pass
        elif sys.platform.startswith("win"):
            key = "#fe00fe"
            try:
                root.config(bg=key)
                root.wm_attributes("-transparentcolor", key)
                return key
            except tk.TclError:
                pass
        root.config(bg="#0a0a0a")
        return "#0a0a0a"

    # --------------------------------------------------- global listeners --
    def _start_global_listeners(self):
        """Optional pynput hooks. We only COUNT events — never their content."""
        self.has_pynput = False
        try:
            from pynput import keyboard, mouse
        except ImportError:
            return
        try:
            def on_press(_key):          # _key is deliberately ignored
                self.key_count += 1

            def on_scroll(_x, _y, _dx, dy):
                self.scroll_heat = min(self.scroll_heat + abs(dy) * 2 + 1, 30)

            keyboard.Listener(on_press=on_press, daemon=True).start()
            mouse.Listener(on_scroll=on_scroll, daemon=True).start()
            self.has_pynput = True
        except Exception:
            pass                         # e.g. missing input-monitoring permission

    # ------------------------------------------------------- interactions --
    def _drag_start(self, e):
        self.dragging = True
        self._grab = (e.x_root - self.root.winfo_x(), e.y_root - self.root.winfo_y())

    def _drag_move(self, e):
        gx, gy = self._grab
        self.root.geometry(f"+{e.x_root - gx}+{e.y_root - gy}")

    def _drag_end(self, _e):
        self.dragging = False

    def _meow(self):
        self.state, self.state_until = "meow", time.time() + 1.4
        try:
            self.root.bell()
        except tk.TclError:
            pass

    def _petting(self, e):
        if e.y - TOP_PAD < 10 * PX and not self.dragging:
            self.pet_heat = min(self.pet_heat + 1.2, 30)
            if self.pet_heat > 6:
                if self.state not in ("overheat", "stretch"):
                    self.state, self.state_until = "pet", time.time() + 0.8
                if random.random() < 0.12:
                    self._spawn("heart", e.x, e.y - 10)

    def _on_keystroke(self):
        self.key_count += 1

    def _say(self, text, secs=6):
        self.bubble = {"text": text, "until": time.time() + secs}

    def _spawn(self, kind, x, y):
        self.particles.append({"kind": kind, "x": x, "y": y, "life": 1.0})

    def _schedule_stretch(self):
        if self.stretch_every:
            return time.time() + self.stretch_every * 60
        return None

    # -------------------------------------------------------------- menu ---
    def _menu(self, e):
        m = tk.Menu(self.root, tearoff=0)
        fur = tk.Menu(m, tearoff=0)
        for n in PALETTES:
            fur.add_command(label=("● " if n == self.pattern else "  ") + n,
                            command=lambda n=n: self._set("pattern", n))
        m.add_cascade(label="fur pattern", menu=fur)
        m.add_command(label="tell your name…", command=self._ask_name)
        m.add_separator()
        if self.pomo:
            m.add_command(label="stop pomodoro", command=self._pomo_stop)
        else:
            m.add_command(label="start pomodoro (25/5)", command=self._pomo_start)
        m.add_command(label="remind me…", command=self._ask_reminder)
        if self.pinned:
            m.add_command(label="unpin note", command=lambda: self._set("pinned", ""))
        else:
            m.add_command(label="pin a note…", command=self._ask_pin)
        stretch = tk.Menu(m, tearoff=0)
        for label, mins in (("off", 0), ("every 30 min", 30), ("every 45 min", 45), ("every 60 min", 60)):
            stretch.add_command(label=("● " if self.stretch_every == mins else "  ") + label,
                                command=lambda v=mins: self._set_stretch(v))
        m.add_cascade(label="stretch breaks", menu=stretch)
        m.add_command(label=("✓ " if self.peek else "  ") + "peek mode",
                      command=lambda: self._set("peek", not self.peek))
        m.add_separator()
        m.add_command(label="meow", command=self._meow)
        m.add_command(label="quit bytecat", command=self._quit)
        m.tk_popup(e.x_root, e.y_root)

    def _set(self, attr, value):
        setattr(self, attr, value)
        self._save_config()

    def _set_stretch(self, mins):
        self.stretch_every = mins
        self.next_stretch = self._schedule_stretch()
        self._save_config()

    def _ask_name(self):
        name = simpledialog.askstring("bytecat", "What should the cat call you?", parent=self.root)
        if name is not None:
            self.name = name.strip()[:24]
            self._save_config()
            if self.name:
                self._say(f"nice to meet you, {self.name}!", 4)

    def _ask_reminder(self):
        mins = simpledialog.askinteger("bytecat", "Remind you in how many minutes?",
                                       parent=self.root, minvalue=1, maxvalue=24 * 60)
        if not mins:
            return
        msg = simpledialog.askstring("bytecat", "What should the cat say?", parent=self.root)
        if msg is None:
            return
        self.reminders.append((time.time() + mins * 60, msg.strip()[:80] or "meow! time's up"))
        self._say(f"okay! see you in {mins} min", 3)

    def _ask_pin(self):
        msg = simpledialog.askstring("bytecat", "Note to pin above the cat:", parent=self.root)
        if msg:
            self.pinned = msg.strip()[:60]
            self._save_config()

    def _pomo_start(self):
        self.pomo = {"phase": "focus", "until": time.time() + 25 * 60}
        self._say("pomodoro on. focus!", 3)

    def _pomo_stop(self):
        self.pomo = None
        self._say("pomodoro off", 2)

    def _quit(self):
        self._save_config()
        self.root.destroy()

    # -------------------------------------------------------------- loop ---
    def _tick(self):
        now = time.time()
        hey = f", {self.name}" if self.name else ""

        # pointer watching (global) + mouse-hunt speed
        px, py = self.root.winfo_pointerxy()
        dist = math.hypot(px - self.last_pointer[0], py - self.last_pointer[1])
        self.pointer_speed = self.pointer_speed * 0.5 + dist * 0.5
        if (px, py) != self.last_pointer:
            self.last_pointer = (px, py)
            self.last_pointer_move = now
            if self.state == "sleep":
                self.state = "idle"
        wx, wy = self.root.winfo_x(), self.root.winfo_y()
        near = math.hypot(px - (wx + W / 2), py - (wy + H / 2)) < 320
        if near and self.pointer_speed > 90 and self.state in ("idle", "knead"):
            self.state, self.state_until = "alert", now + 0.9

        # keyboard kneading + overheat (from focused-window keys or pynput)
        new_keys = self.key_count - self._keys_seen
        self._keys_seen = self.key_count
        if new_keys:
            self.key_times += [now] * min(new_keys, 6)
            self.key_times = [t for t in self.key_times if now - t < 2.0]
            self.last_pointer_move = now       # typing counts as activity
            if len(self.key_times) > 14:
                if self.state != "overheat":
                    self._say("too fast!!", 2)
                self.state, self.state_until = "overheat", now + 1.8
            elif self.state in ("idle", "sleep", "knead"):
                self.state, self.state_until = "knead", now + 0.7
        if self.state == "overheat" and random.random() < 0.5:
            self._spawn("steam", OFF_X + random.randint(4, 12) * PX, TOP_PAD - 6)

        # paper unroll on scroll
        self.scroll_heat = max(0.0, self.scroll_heat - 0.8)
        if self.scroll_heat > 2 and self.state in ("idle", "knead", "alert"):
            self.state, self.state_until = "unroll", now + 1.0
        target_len = min(self.scroll_heat * 6, 70) if self.state == "unroll" else 0
        self.unroll_len += (target_len - self.unroll_len) * 0.3

        # timers: pomodoro / reminders / stretch breaks
        if self.pomo and now > self.pomo["until"]:
            if self.pomo["phase"] == "focus":
                self.pomo = {"phase": "break", "until": now + 5 * 60}
                self._say(f"break time{hey}!", 8)
            else:
                self.pomo = {"phase": "focus", "until": now + 25 * 60}
                self._say(f"back to focus{hey}!", 8)
            self._meow()
        fired = [r for r in self.reminders if now >= r[0]]
        if fired:
            self.reminders = [r for r in self.reminders if now < r[0]]
            self._say(f"{fired[0][1]}{hey}!", 12)
            self._meow()
        if self.next_stretch and now > self.next_stretch:
            self.next_stretch = self._schedule_stretch()
            self.state, self.state_until = "stretch", now + 8
            self._say(f"stretch with me{hey}!", 8)
            self._meow()

        # state expiry, napping, blinking, petting decay
        self.pet_heat = max(0.0, self.pet_heat - 0.4)
        if self.state not in ("idle", "sleep") and now > self.state_until:
            self.state = "idle"
        if self.state == "idle" and now - self.last_pointer_move > 45:
            self.state = "sleep"
        if self.state == "sleep" and random.random() < 0.03:
            self._spawn("zzz", OFF_X + 14 * PX, TOP_PAD - 4)
        if now > self.next_blink:
            self.blink_until = now + 0.14
            self.next_blink = now + random.uniform(2.5, 6)
        if self.bubble and now > self.bubble["until"]:
            self.bubble = None

        self._apply_peek(now)
        self._draw(now)
        self.root.after(80, self._tick)

    def _apply_peek(self, _now):
        """Peek mode: tuck against the right screen edge; slide out to talk."""
        if not self.peek or self.dragging:
            return
        sw = self.screen[0]
        talking = self.bubble or self.state in ("meow", "stretch", "overheat")
        want_x = sw - W if talking else sw - (OFF_X + int(COLS * PX * 0.45))
        x = self.root.winfo_x()
        if abs(x - want_x) > 4:
            self.root.geometry(f"+{x + (want_x - x) // 3}+{self.root.winfo_y()}")

    # -------------------------------------------------------------- draw ---
    def _draw(self, now):
        cv = self.canvas
        cv.delete("all")
        pal = PALETTES[self.pattern]

        bob = 1 if math.sin(now * 1.8) > 0.7 else 0
        if self.state == "overheat":
            bob = int(now * 16) % 2
        shiver = (1 if int(now * 16) % 2 else -1) if self.state == "overheat" else 0
        sy = 1.0                                    # vertical scale
        if self.dragging:
            sy = 1.25                               # mochi
        elif self.state == "stretch":
            sy = 1.0 + 0.4 * min(1, (self.state_until - now) if self.state_until - now < 1 else 1) \
                 * (0.5 + 0.5 * abs(math.sin(now * 2)))

        bottom = TOP_PAD + ROWS * PX + bob
        yof = lambda r: bottom - (ROWS - r) * PX * sy
        xof = lambda c: OFF_X + c * PX + shiver
        ph = PX * sy + 0.6                          # cell height (+overlap)

        knead_lift = None
        if self.state == "knead":
            knead_lift = [2, 6] if int(now * 6) % 2 == 0 else [10, 13]

        for r, row in enumerate(SPRITE):
            for c, ch in enumerate(row):
                if ch == ".":
                    continue
                color = pal.get(ch, pal["B"])
                if ch == "S" and self.pattern == "calico" and r > 9:
                    color = pal["extra"]
                if ch in "BSW" and self.state == "overheat":
                    color = blend(color, "#d83a3f", 0.45)
                y = yof(r)
                if r == ROWS - 1 and knead_lift and any(abs(c - k) <= 1 for k in knead_lift):
                    y -= PX * 0.6
                cv.create_rectangle(xof(c), y, xof(c) + PX, y + ph, fill=color, width=0)

        self._draw_face(now, pal, xof, yof)
        self._draw_paper(pal)
        self._draw_particles()
        self._draw_texts(now)

    def _draw_face(self, now, pal, xof, yof):
        cv = self.canvas
        closed = now < self.blink_until or self.state in ("sleep", "pet")
        wide = self.state in ("alert", "overheat")

        mx, my = self.last_pointer
        cx = self.root.winfo_x() + OFF_X + 8 * PX
        cy = self.root.winfo_y() + TOP_PAD + 6 * PX
        gx = max(-1.0, min(1.0, (mx - cx) / 300))
        gy = max(-0.5, min(1.0, (my - cy) / 300))

        for er, ec in EYES:
            x, y = xof(ec), yof(er)
            if closed:
                if self.state == "pet":  # happy ^ ^
                    cv.create_rectangle(x, y + PX * .6, x + PX * .7, y + PX * 1.1, fill=pal["#"], width=0)
                    cv.create_rectangle(x + PX * 1.3, y + PX * .6, x + PX * 2, y + PX * 1.1, fill=pal["#"], width=0)
                    cv.create_rectangle(x + PX * .6, y + PX * .1, x + PX * 1.4, y + PX * .6, fill=pal["#"], width=0)
                else:
                    cv.create_rectangle(x, y + PX * .7, x + PX * 2, y + PX * 1.2, fill=pal["#"], width=0)
                continue
            cv.create_rectangle(x, y, x + PX * 2, y + PX * 2,
                                fill="#ffffff" if wide else pal["eye"], width=0)
            pw = PX * 1.3 if wide else PX
            pxx = x + PX * .5 + gx * PX * .5 - (PX * .15 if wide else 0)
            pyy = y + PX * .5 + gy * PX * .4 - (PX * .15 if wide else 0)
            cv.create_rectangle(pxx, pyy, pxx + pw, pyy + pw, fill=pal["#"], width=0)

        nx, ny = xof(NOSE[1]), yof(NOSE[0])
        cv.create_rectangle(nx, ny, nx + PX, ny + PX * .7, fill=pal["P"], width=0)
        if self.state in ("meow", "overheat", "alert"):
            cv.create_rectangle(nx - PX * .2, ny + PX * .9, nx + PX * 1.2, ny + PX * 1.8, fill=pal["#"], width=0)
        else:
            cv.create_rectangle(nx - PX * .6, ny + PX * .9, nx, ny + PX * 1.3, fill=pal["#"], width=0)
            cv.create_rectangle(nx + PX, ny + PX * .9, nx + PX * 1.6, ny + PX * 1.3, fill=pal["#"], width=0)
        if self.state == "meow":
            cv.create_text(xof(17), yof(2), text="meow!", anchor="w",
                           font=("Courier", 13, "bold"), fill="#e5484d")

    def _draw_paper(self, pal):
        """Paper unroll: a little strip spools out beside the front paws."""
        if self.unroll_len < 3:
            return
        cv = self.canvas
        x0 = OFF_X + 17 * PX
        y0 = TOP_PAD + ROWS * PX - PX * 1.6
        ln = self.unroll_len
        cv.create_rectangle(x0, y0, x0 + ln, y0 + PX * 1.4, fill="#f5f5f5", outline=pal["#"])
        for i in range(int(ln // 10)):
            lx = x0 + 6 + i * 10
            cv.create_line(lx, y0 + 3, lx + 5, y0 + 3, fill="#9a9a9a")
            cv.create_line(lx, y0 + 7, lx + 5, y0 + 7, fill="#9a9a9a")

    def _draw_particles(self):
        cv = self.canvas
        alive = []
        for p in self.particles:
            p["y"] -= 0.9
            p["life"] -= 0.03
            if p["life"] <= 0:
                continue
            alive.append(p)
            if p["kind"] == "heart":
                s = PX * 0.5
                x, y = p["x"], p["y"]
                for dx, dy, w, h in ((-s, -s, s, s), (s * .2, -s, s, s),
                                     (-s, -s * .4, s * 2.2, s), (-s * .4, s * .6, s, s * .8)):
                    cv.create_rectangle(x + dx, y + dy, x + dx + w, y + dy + h,
                                        fill="#e8546a", width=0)
            elif p["kind"] == "steam":
                x = p["x"] + math.sin(p["life"] * 12) * 3
                cv.create_rectangle(x, p["y"], x + PX * .8, p["y"] + PX * .8,
                                    fill="#c9c9c9", width=0)
            elif p["kind"] == "zzz":
                cv.create_text(p["x"] + (1 - p["life"]) * 10, p["y"], text="z",
                               font=("Courier", 12, "bold"), fill="#9a9a9a")
        self.particles = alive

    def _draw_texts(self, now):
        cv = self.canvas
        y = 12
        if self.pinned:
            cv.create_rectangle(4, y - 9, W - 4, y + 9, fill="#161616", outline="#ffd23f")
            cv.create_text(W / 2, y, text="📌 " + self.pinned,
                           font=("Courier", 11, "bold"), fill="#ffd23f")
            y += 22
        if self.pomo:
            left = max(0, int(self.pomo["until"] - now))
            label = "FOCUS" if self.pomo["phase"] == "focus" else "BREAK"
            color = "#e5484d" if label == "FOCUS" else "#4ac26b"
            cv.create_text(W / 2, y, text=f"{label} {left // 60:02d}:{left % 60:02d}",
                           font=("Courier", 13, "bold"), fill=color)
            y += 20
        if self.bubble:
            cv.create_rectangle(4, y - 9, W - 4, y + 11, fill="#161616", outline="#f5f5f5")
            cv.create_text(W / 2, y + 1, text=self.bubble["text"], width=W - 16,
                           font=("Courier", 12, "bold"), fill="#f5f5f5")


def main():
    root = tk.Tk()
    root.title("bytecat")
    ByteCat(root)
    if "--smoke" in sys.argv:
        root.after(1500, root.destroy)
    root.mainloop()


if __name__ == "__main__":
    main()
