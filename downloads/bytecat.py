#!/usr/bin/env python3
"""
BYTECAT — a pixel cat that lives on your desktop.

One file. Only Python's built-in tkinter is required.
If `pynput` is installed (optional: pip install pynput), Bytecat also reacts
to typing anywhere on your system: keyboard kneading and overheat mode.
PRIVACY: it only counts keystrokes to animate paws — it never records WHICH
keys you press, stores nothing, and sends nothing.

Run:            python3 bytecat.py      (or double-click the launcher)
Move it:        drag the cat anywhere
Pet it:         glide the mouse slowly over its head
Meow:           double-click it
Everything else: right-click it — coat (incl. lucky cat), your name,
                 pomodoro, reminders, pinned note, stretch breaks, peek, quit.

Leave it alone for a bit and a little fish comes out to play.
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
# legend: . none | # outline | B base | G patch | S spot | P inner ear | R blush
SPRITE = [
    "..........##...........##.........",
    "..........##...........##.........",
    ".........#P#...........#P#........",
    ".........#PP#.#######.#PP#........",
    ".........#PPB#BBBBGGG#GPP#........",
    "........#BBBBBBBBBGGGGGGGG#.......",
    "........#BBBBBBBBGGGGGGGGG#.......",
    ".......###BBBBBBBBGGGGGGG###......",
    "..........#BBBBBBBGGGGGG#.........",
    "..........#BBBBBBBBGGGGG#.........",
    "..........#BBBBBBBBBGGGG#.........",
    "..........#BBBBBBBBBBBBB#.........",
    "...........#RBBBBBBBBBR#..........",
    "...........#BBBBBBBBBBB#..........",
    "............#BBBBBBBBB#...........",
    ".............#GGBBBBB#............",
    "............#GGGBBBBBB#...........",
    "............#GGGGBBBBB#...........",
    "............#GGGBBBBBB#...........",
    "............#GGGBBBBBB#...........",
    "...........##BBB#BBB#BB#..........",
    "...........##BBB#BBB#BB#..........",
    "..........#B#BBB#BBB#BBB#.........",
    "..........#B#BBB#BBB#SSS#.........",
    "..........#B#BBB#BBB#SSS#.........",
    ".........#BB#BBB#BBB#SSSS#........",
    ".........#BB#BBB#BBB#SSSS#........",
    "..........#B#BBB#BBB#BBB#.........",
    "...........##BBB#BBBBB##..........",
    ".............#########............",
]
COLS, ROWS = 34, 30
PX = 6
OFF_X = 46
TOP_PAD = 56
W = 300
H = TOP_PAD + ROWS * PX + 8

EYE_L, EYE_R = (12.9, 7.8), (19.9, 7.8)      # (col, row)
NOSE = (16.4, 11.0)
HEAD = {"c0": 8, "c1": 26, "r0": 0, "r1": 14}
SHOULDER = (12.4, 20.0)
FISH_BASE_ROW = 21.0
SWIPE_S = 0.62               # full swipe: windup, strike, retract (seconds)
CONFIG = Path.home() / ".bytecat.json"

PINK, BLUSH = "#e9a0ab", "#f2b8bc"
FISH_BLUE, FISH_DARK = "#7d9fc7", "#4a6b96"

SKINS = {
    "ink":     {"B": "#fdfcf8", "G": "#dcd8cc", "S": "#fdfcf8", "#": "#141312"},
    "patch":   {"B": "#f6f1e5", "G": "#8d8a86", "S": "#f6f1e5", "#": "#4a4440"},
    "orange":  {"B": "#f6ead2", "G": "#e0a45c", "S": "#e0a45c", "#": "#4a4034"},
    "calico":  {"B": "#f7f2e8", "G": "#e0a45c", "S": "#57504e", "#": "#4a4440"},
    "siamese": {"B": "#efe4cd", "G": "#6b5646", "S": "#efe4cd", "#": "#453a30"},
    "void":    {"B": "#3b3740", "G": "#322e38", "S": "#322e38", "#": "#221f28"},
    "white":   {"B": "#f9f6ee", "G": "#efe9db", "S": "#f9f6ee", "#": "#4a4440"},
    "lucky":   {"B": "#f9f6ee", "G": "#e0a45c", "S": "#57504e", "#": "#4a4440", "collar": True},
}


def blend(a, b, t):
    pa, pb = int(a[1:], 16), int(b[1:], 16)
    ch = lambda sa, sb: round(sa + (sb - sa) * t)
    return "#{:02x}{:02x}{:02x}".format(
        ch(pa >> 16, pb >> 16), ch((pa >> 8) & 255, (pb >> 8) & 255), ch(pa & 255, pb & 255))


class ByteCat:
    def __init__(self, root):
        self.root = root
        cfg = self._load_config()
        self.skin = cfg.get("skin", "patch")
        if self.skin not in SKINS:
            self.skin = "patch"
        self.name = cfg.get("name", "")
        self.stretch_every = cfg.get("stretch_every", 45)   # minutes; 0 = off
        self.peek = cfg.get("peek", False)
        self.pinned = cfg.get("pinned", "")

        self.state = "idle"      # idle|pet|sleep|meow|alert|knead|overheat|stretch
        self.state_until = 0.0
        self.blink_until = 0.0
        self.next_blink = time.time() + random.uniform(2, 5)
        self.last_pointer = (0, 0)
        self.last_pointer_move = time.time()
        self.pointer_speed = 0.0
        self.pet_heat = 0.0
        self.particles = []
        self.dragging = False
        self.bubble = None
        self.reminders = []
        self.pomo = None
        self.next_stretch = self._schedule_stretch()
        self.key_count = 0
        self._keys_seen = 0
        self.key_times = []
        self.gaze = [0.0, 0.0]
        self.gaze_target = [0.0, 0.0]
        self.tail_up = 0.0           # 0 = wrapped on the ground, 1 = raised

        # fish toy: dict(x, y in cells, vx, vy, dir, phase, spin, born) or None
        self.fish = None
        self.fish_cooldown_until = 0.0
        self.swipe_start = 0.0
        self.swipe_hit = False

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
        data = {"skin": self.skin, "name": self.name, "pinned": self.pinned,
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
        root.config(bg="#0c0b0a")
        return "#0c0b0a"

    # --------------------------------------------------- global listeners --
    def _start_global_listeners(self):
        """Optional pynput hook. We only COUNT keystrokes — never their content."""
        self.has_pynput = False
        try:
            from pynput import keyboard
        except ImportError:
            return
        try:
            def on_press(_key):          # _key is deliberately ignored
                self.key_count += 1

            keyboard.Listener(on_press=on_press, daemon=True).start()
            self.has_pynput = True
        except Exception:
            pass

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
        cx, cy = e.x - OFF_X, e.y - TOP_PAD
        over_head = (HEAD["c0"] * PX < cx < HEAD["c1"] * PX and
                     HEAD["r0"] * PX < cy < HEAD["r1"] * PX)
        if over_head and not self.dragging:
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

    def _wake(self, now):
        self.last_pointer_move = now
        if self.fish is not None:
            self.fish = None
            self.fish_cooldown_until = now + 30
        if self.state == "sleep":
            self.state = "idle"

    # -------------------------------------------------------------- menu ---
    def _menu(self, e):
        m = tk.Menu(self.root, tearoff=0)
        fur = tk.Menu(m, tearoff=0)
        for n in SKINS:
            fur.add_command(label=("● " if n == self.skin else "  ") + n,
                            command=lambda n=n: self._set("skin", n))
        m.add_cascade(label="coat", menu=fur)
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

        # pointer watching (global) + cursor-hunt speed
        px_, py_ = self.root.winfo_pointerxy()
        dist = math.hypot(px_ - self.last_pointer[0], py_ - self.last_pointer[1])
        self.pointer_speed = self.pointer_speed * 0.5 + dist * 0.5
        if (px_, py_) != self.last_pointer:
            self.last_pointer = (px_, py_)
            self._wake(now)
        wx, wy = self.root.winfo_x(), self.root.winfo_y()
        near = math.hypot(px_ - (wx + W / 2), py_ - (wy + H / 2)) < 340
        if near and self.pointer_speed > 90 and self.state in ("idle", "knead"):
            self.state, self.state_until = "alert", now + 0.9

        # keyboard kneading + overheat
        new_keys = self.key_count - self._keys_seen
        self._keys_seen = self.key_count
        if new_keys:
            self.key_times += [now] * min(new_keys, 6)
            self.key_times = [t for t in self.key_times if now - t < 2.0]
            self.last_pointer_move = now
            if len(self.key_times) > 14:
                if self.state != "overheat":
                    self._say("too fast!!", 2)
                self.state, self.state_until = "overheat", now + 1.8
            elif self.state in ("idle", "sleep", "knead"):
                self.state, self.state_until = "knead", now + 0.7
        if self.state == "overheat" and random.random() < 0.5:
            self._spawn("steam", OFF_X + random.randint(12, 22) * PX, TOP_PAD - 6)

        # bored -> fish time; very bored -> sleep
        idle_for = now - self.last_pointer_move
        if (self.fish is None and self.state == "idle" and
                25 < idle_for < 150 and now > self.fish_cooldown_until):
            self._spawn_fish(now)
        if (self.fish is not None and now - self.fish["born"] > 16 and
                self.fish["phase"] == "swim"):
            self.fish = None
            self.fish_cooldown_until = now + 40
        if self.fish is not None:
            self._fish_tick(now)

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

        # state expiry, napping, blinking
        self.pet_heat = max(0.0, self.pet_heat - 0.4)
        if self.state not in ("idle", "sleep") and now > self.state_until:
            self.state = "idle"
        if self.state == "idle" and self.fish is None and idle_for > 180:
            self.state = "sleep"
        if self.state == "sleep" and random.random() < 0.03:
            self._spawn("zzz", OFF_X + 26 * PX, TOP_PAD - 6)
        if now > self.next_blink:
            self.blink_until = now + 0.14
            self.next_blink = now + random.uniform(2.5, 6)
        if self.bubble and now > self.bubble["until"]:
            self.bubble = None

        # gaze: fish beats pointer; eased so the eyes feel alive
        if self.fish is not None:
            self._gaze_at_local(OFF_X + self.fish["x"] * PX, TOP_PAD + self.fish["y"] * PX)
        else:
            cx = wx + OFF_X + 17 * PX
            cy = wy + TOP_PAD + 9 * PX
            self.gaze_target = [max(-1.0, min(1.0, (px_ - cx) / 260)),
                                max(-0.8, min(1.0, (py_ - cy) / 220))]
        self.gaze[0] += (self.gaze_target[0] - self.gaze[0]) * 0.35
        self.gaze[1] += (self.gaze_target[1] - self.gaze[1]) * 0.35
        # tail rises when engaged, settles when calm
        engaged = self.fish is not None or self.state in ("alert", "overheat", "stretch")
        self.tail_up += ((1.0 if engaged else 0.0) - self.tail_up) * 0.25

        self._apply_peek(now)
        self._draw(now)
        self.root.after(80, self._tick)

    def _gaze_at_local(self, x, y):
        cx, cy = OFF_X + 17 * PX, TOP_PAD + 9 * PX
        self.gaze_target = [max(-1.0, min(1.0, (x - cx) / 110)),
                            max(-0.8, min(1.0, (y - cy) / 95))]

    # ------------------------------------------------------------- fish ----
    def _spawn_fish(self, now):
        self.fish = {"x": -3.0, "y": FISH_BASE_ROW, "vx": 0.0, "vy": 0.0,
                     "dir": 1, "phase": "swim", "spin": 0, "born": now}

    def _fish_tick(self, now):
        f = self.fish
        if f["phase"] == "swim":
            f["x"] += f["dir"] * 0.3             # cells per 80ms tick
            f["y"] = FISH_BASE_ROW + math.sin(now * 2.4) * 1.0
            if f["x"] > 9.8:
                f["dir"] = -1
            if f["x"] < 0.6 and f["dir"] == -1:
                f["dir"] = 1
            if f["x"] > 7.4 and f["dir"] == 1 and now - self.swipe_start > 2.6:
                self.swipe_start = now
                self.swipe_hit = False
            st = now - self.swipe_start
            if not self.swipe_hit and SWIPE_S * 0.42 < st < SWIPE_S * 0.56 and f["x"] > 5.8:
                self.swipe_hit = True
                f["phase"] = "toss"
                f["vx"] = -(1.1 + random.random() * 0.6)
                f["vy"] = -(2.4 + random.random() * 0.9)
                f["spin"] = 0
        else:                                     # toss: gravity + tumble
            f["vy"] += 0.85
            f["x"] += f["vx"]
            f["y"] += f["vy"]
            f["spin"] += 1
            if f["y"] >= FISH_BASE_ROW and f["vy"] > 0:
                f["phase"] = "swim"
                f["y"] = FISH_BASE_ROW
                f["spin"] = 0
                f["dir"] = 1 if f["x"] < 1.5 else -1
            if f["x"] < -4:
                f.update(x=-3.0, phase="swim", spin=0, dir=1)

    def _apply_peek(self, _now):
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
        pal = SKINS[self.skin]

        breathe = 1 + math.sin(now * 0.9) * 0.011
        shiver = (1 if int(now * 16) % 2 else -1) if self.state == "overheat" else 0
        sy = breathe
        if self.dragging:
            sy += 0.24
        elif self.state == "stretch":
            sy += 0.33 * (0.5 + 0.5 * abs(math.sin(now * 2)))

        bottom = TOP_PAD + ROWS * PX
        yof = lambda r: bottom - (ROWS - r) * PX * sy
        xof = lambda c: OFF_X + c * PX + shiver
        ph = PX * sy + 0.6

        if self.tail_up >= 0.5:
            self._draw_tail(now, pal, xof, yof)      # raised: behind the body

        knead = None
        if self.state == "knead":
            knead = (13, 15) if int(now * 6) % 2 == 0 else (17, 19)

        for r, row in enumerate(SPRITE):
            for c, ch in enumerate(row):
                if ch == ".":
                    continue
                if ch == "P":
                    color = PINK
                elif ch == "R":
                    color = BLUSH
                else:
                    color = pal.get(ch, pal["B"])
                if ch in "BGS" and self.state == "overheat":
                    color = blend(color, "#d86a5a", 0.4)
                y = yof(r)
                if r >= 20 and knead and knead[0] <= c <= knead[1]:
                    y -= PX * 0.8
                cv.create_rectangle(xof(c), y, xof(c) + PX, y + ph, fill=color, width=0)

        if pal.get("collar"):
            cv.create_rectangle(xof(12.6), yof(14.8), xof(12.6) + PX * 9.0,
                                yof(14.8) + PX * 1.1, fill="#c8433e", width=0)
            cv.create_rectangle(xof(16.3), yof(15.7), xof(16.3) + PX * 1.6,
                                yof(15.7) + PX * 1.6, fill="#e8b93c", width=0)
            cv.create_rectangle(xof(16.8), yof(16.3), xof(16.8) + PX * 0.6,
                                yof(16.3) + PX * 0.6, fill=pal["#"], width=0)

        self._draw_face(now, pal, xof, yof)
        if self.tail_up < 0.5:
            self._draw_tail(now, pal, xof, yof)      # wrapped: in front, on the ground
        if self.fish is not None:
            self._draw_fish(now)
            self._draw_swipe(now, pal, xof, yof)
        self._draw_particles()
        self._draw_texts(now)

    def _draw_tail(self, now, pal, xof, yof):
        """Two natural poses, blended: wrapped along the ground when calm,
        raised and flicking when engaged. The wave travels toward the tip."""
        cv = self.canvas
        m = self.tail_up
        asleep = self.state == "sleep"
        excited = self.fish is not None
        speed = 2.6 if asleep else 0.26 if excited else 0.9
        amp = 0.05 if asleep else 0.16 if excited else 0.08

        root_c, root_r = 25.4 - m * 1.6, 27.9 - m * 3.6
        ang = (-3.05) * (1 - m) + 0.5 * m
        d_ang = (-0.04) * (1 - m) + 0.15 * m

        x, y = xof(root_c), yof(root_r)
        w, segs = PX * 1.6, 10
        for i in range(segs):
            wave = math.sin(now / speed - i * 0.55) * amp * (i / segs + 0.3)
            ang += d_ang + wave
            x += math.cos(ang) * PX * 1.05
            y -= math.sin(ang) * PX * 1.05
            cv.create_rectangle(x - w / 2 - 1, y - w / 2 - 1, x + w / 2 + 1, y + w / 2 + 1,
                                fill=pal["#"], width=0)
            cv.create_rectangle(x - w / 2, y - w / 2, x + w / 2, y + w / 2,
                                fill=pal["G"], width=0)

    def _draw_face(self, now, pal, xof, yof):
        cv = self.canvas
        closed = now < self.blink_until or self.state in ("sleep", "pet")
        dark = "#e8e4da" if self.skin == "void" else pal["#"]
        gx, gy = self.gaze[0] * PX * 1.3, self.gaze[1] * PX * 1.0

        for ec, er in (EYE_L, EYE_R):
            x, y = xof(ec), yof(er)
            if closed:
                if self.state == "pet":
                    cv.create_rectangle(x, y + PX * 1.4, x + PX * 0.6, y + PX * 2.0, fill=dark, width=0)
                    cv.create_rectangle(x + PX * 0.5, y + PX * 0.9, x + PX * 1.4, y + PX * 1.5, fill=dark, width=0)
                    cv.create_rectangle(x + PX * 1.3, y + PX * 1.4, x + PX * 1.9, y + PX * 2.0, fill=dark, width=0)
                else:
                    cv.create_rectangle(x, y + PX * 1.3, x + PX * 1.9, y + PX * 1.85, fill=dark, width=0)
                continue
            wide = self.state == "alert"
            w = PX * (2.1 if wide else 1.7)
            h = PX * (3.0 if wide else 2.5)
            cv.create_rectangle(x + gx, y + gy + PX * 0.3, x + gx + w, y + gy + h - PX * 0.3,
                                fill=dark, width=0)
            cv.create_rectangle(x + gx + PX * 0.25, y + gy, x + gx + w - PX * 0.25, y + gy + h,
                                fill=dark, width=0)

        # nose + flat blank mouth
        cv.create_rectangle(xof(NOSE[0]), yof(NOSE[1]), xof(NOSE[0]) + PX * 1.2,
                            yof(NOSE[1]) + PX * 0.8, fill="#c98a80", width=0)
        if self.state in ("meow", "overheat"):
            cv.create_rectangle(xof(16.2), yof(12.2), xof(16.2) + PX * 1.6,
                                yof(12.2) + PX * 1.2, fill=dark, width=0)
        else:
            cv.create_rectangle(xof(16.0), yof(12.4), xof(16.0) + PX * 2.2,
                                yof(12.4) + PX * 0.4, fill=dark, width=0)
        # whiskers
        for wx_, wy_ in ((25.4, 9.8), (25.1, 11.6), (6.0, 9.8), (6.3, 11.6)):
            cv.create_rectangle(xof(wx_), yof(wy_), xof(wx_) + PX * 2.6,
                                yof(wy_) + PX * 0.35, fill=dark, width=0)
        if self.state == "meow":
            cv.create_text(xof(27), yof(3), text="meow!", anchor="w",
                           font=("Courier", 13, "bold"), fill="#e5484d")

    def _draw_fish(self, now):
        cv = self.canvas
        f = self.fish
        fx, fy = OFF_X + f["x"] * PX, TOP_PAD + f["y"] * PX
        if f["phase"] == "swim":
            flip = f["dir"]
        else:
            flip = -1 if f["vx"] < 0 else 1
            if f["spin"] % 2:                     # crude tumble: flip while tossed
                flip = -flip
        p = PX

        def rect(x0, y0, w, h, color):
            if flip == -1:
                x0 = -x0 - w
            cv.create_rectangle(fx + x0, fy + y0, fx + x0 + w, fy + y0 + h,
                                fill=color, width=0)

        rect(-2.0 * p, -1.3 * p, 3.4 * p, 2.6 * p, FISH_BLUE)
        rect(-2.6 * p, -0.7 * p, 4.6 * p, 1.4 * p, FISH_BLUE)
        rect(1.6 * p, -1.6 * p, 1.3 * p, 1.2 * p, FISH_BLUE)
        rect(1.6 * p, 0.4 * p, 1.3 * p, 1.2 * p, FISH_BLUE)
        rect(-1.5 * p, -0.6 * p, 0.7 * p, 0.7 * p, FISH_DARK)
        rect(-0.2 * p, -1.0 * p, 0.5 * p, 2.0 * p, FISH_DARK)

    def _draw_swipe(self, now, pal, xof, yof):
        """Three-phase paw swipe: wind up, strike fast, retract slow.
        The leg bends at an elbow that straightens as the paw extends."""
        st = now - self.swipe_start
        if st < 0 or st > SWIPE_S:
            return
        cv = self.canvas
        t = st / SWIPE_S
        if t < 0.22:
            reach = -1.1 * (t / 0.22)                              # wind up
        elif t < 0.5:
            k = (t - 0.22) / 0.28
            reach = -1.1 + (7.2 + 1.1) * (1 - (1 - k) ** 2)        # strike, ease-out
        else:
            k = (t - 0.5) / 0.5
            reach = 7.2 * (1 - k * k * (3 - 2 * k))                # retract, smooth
        sxp, syp = xof(SHOULDER[0]), yof(SHOULDER[1])
        fx, fy = OFF_X + self.fish["x"] * PX, TOP_PAD + self.fish["y"] * PX
        ang = math.atan2(fy - syp, fx - sxp)
        ex = sxp + math.cos(ang) * reach * PX
        ey = syp + math.sin(ang) * reach * PX
        # elbow bows outward when bent, straightens at full reach
        bend = max(0.0, 1 - abs(reach) / 7.2) * 1.6 * PX
        mx = (sxp + ex) / 2 - math.sin(ang) * bend
        my = (syp + ey) / 2 + math.cos(ang) * bend
        for x1, y1, x2, y2, wo, wi in ((sxp, syp, mx, my, PX * 2.2, PX * 1.6),
                                       (mx, my, ex, ey, PX * 2.0, PX * 1.4)):
            cv.create_line(x1, y1, x2, y2, width=wo, fill=pal["#"])
            cv.create_line(x1, y1, x2, y2, width=wi, fill=pal["B"])
        cv.create_rectangle(ex - PX, ey - PX, ex + PX, ey + PX,
                            fill=pal["B"], outline=pal["#"])

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
                s = PX * 0.55
                x, y = p["x"], p["y"]
                for dx, dy_, w, h in ((-s, -s, s, s), (s * .2, -s, s, s),
                                      (-s, -s * .4, s * 2.2, s), (-s * .4, s * .6, s, s * .8)):
                    cv.create_rectangle(x + dx, y + dy_, x + dx + w, y + dy_ + h,
                                        fill="#e8546a", width=0)
            elif p["kind"] == "steam":
                x = p["x"] + math.sin(p["life"] * 12) * 3
                cv.create_rectangle(x, p["y"], x + PX * .9, p["y"] + PX * .9,
                                    fill="#b9b4ac", width=0)
            elif p["kind"] == "zzz":
                cv.create_text(p["x"] + (1 - p["life"]) * 10, p["y"], text="z",
                               font=("Courier", 12, "bold"), fill="#8d8a86")
        self.particles = alive

    def _draw_texts(self, now):
        cv = self.canvas
        y = 12
        if self.pinned:
            cv.create_rectangle(4, y - 9, W - 4, y + 9, fill="#fffdf6", outline="#e8b93c")
            cv.create_text(W / 2, y, text="📌 " + self.pinned,
                           font=("Courier", 11, "bold"), fill="#5a544e")
            y += 22
        if self.pomo:
            left = max(0, int(self.pomo["until"] - now))
            label = "FOCUS" if self.pomo["phase"] == "focus" else "BREAK"
            color = "#e5484d" if label == "FOCUS" else "#4ac26b"
            cv.create_text(W / 2, y, text=f"{label} {left // 60:02d}:{left % 60:02d}",
                           font=("Courier", 13, "bold"), fill=color)
            y += 20
        if self.bubble:
            cv.create_rectangle(4, y - 9, W - 4, y + 11, fill="#fffdf6", outline="#5a544e")
            cv.create_text(W / 2, y + 1, text=self.bubble["text"], width=W - 16,
                           font=("Courier", 12, "bold"), fill="#5a544e")


def main():
    root = tk.Tk()
    root.title("bytecat")
    ByteCat(root)
    if "--smoke" in sys.argv:
        root.after(1500, root.destroy)
    root.mainloop()


if __name__ == "__main__":
    main()
