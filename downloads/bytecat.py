#!/usr/bin/env python3
"""
BYTECAT — a pixel cat that lives on your desktop.

One file. Only Python's built-in tkinter is required.
If `pynput` is installed (optional: pip install pynput), Bytecat also reacts
to typing anywhere on your system: keyboard kneading and overheat mode.
PRIVACY: it only counts keystrokes to animate paws — it never records WHICH
keys you press, stores nothing, and sends nothing.

Run:            python3 bytecat.py      (or install via the macOS one-liner)
Move it:        drag the cat anywhere
Pet it:         glide the mouse slowly over its head
Meow:           double-click it
Everything else: right-click it — coat (12 to choose from, incl. tabby,
                 chonk, cloud, munchkin, lucky), your name, pomodoro,
                 reminders, pinned note, stretch breaks, peek mode, quit.

Leave it alone and a little fish comes out to play — the cat stands up on
its hind legs and bats it around. Sometimes the fish just drops by on its
own. Settings are saved to ~/.bytecat.json so your cat remembers you.
"""

import json
import math
import random
import sys
import time
import tkinter as tk
from pathlib import Path
from tkinter import simpledialog

# ---------------------------------------------------------------- sprites ---
# legend: . none | # outline | B base | G patch | S spot | P inner ear | R blush
SPRITES = {
    "sit_std": [
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
    ],
    "sit_fat": [
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
        "............#GGBBBBBBB#...........",
        "...........#GGGBBBBBBBB#..........",
        "..........#GGGGGBBBBBBBB#.........",
        "..........#GGGGBBBBBBBBB#.........",
        "..........#GGGGBBBBBBBBB#.........",
        ".........#BB#BBB#BBB#BBBB#........",
        ".........#BB#BBB#BBB#BBBB#........",
        "........#BBB#BBB#BBB#BBBBB#.......",
        "........#BBB#BBB#BBB#BBSSS#.......",
        "........#BBB#BBB#BBB#BSSSS#.......",
        ".......#BBBB#BBB#BBB#BSSSSS#......",
        ".......#BBBB#BBB#BBB#BBSSSB#......",
        "........#BBB#BBB#BBB#BBBBB#.......",
        ".........###BBBB#BBBBBB###........",
        "............###########...........",
    ],
    "sit_short": [
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
        "............#GGGBBBBBB#...........",
        "............#GGGBBBBBB#...........",
        "............#GGGGBBBBB#...........",
        "...........#GGGGBBBBBBB#..........",
        "...........##GGG#BBB#BB#..........",
        "..........#B#BBB#BBB#BSS#.........",
        "..........#B#BBB#BBB#SSS#.........",
        ".........#BB#BBB#BBB#SSSS#........",
        ".........#BB#BBB#BBB#SSSS#........",
        ".........#BB#BBB#BBB#BSSB#........",
        "..........###BBB#BBB#BB##.........",
        "............##BB#BBBB##...........",
        "..............#######.............",
    ],
    "stand": [
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
        "............##BBBBBBB##...........",
        "..............#BBBBB#.............",
        ".............#BBBBBBB#............",
        ".............#BBBBBBB#............",
        ".............#BBBBBBG#............",
        ".............#BBBBBGG#............",
        ".............#BBBBGGG#............",
        "............#BBBBBBGGG#...........",
        "............#BBBBBBBGG#...........",
        "...........#BBBBBBBBBBB#..........",
        "...........#SSSSBBBBBBB#..........",
        "...........#SSSSBBBBBBB#..........",
        "............#SSSBBBBBB#...........",
        ".............#BBB#BBB#............",
        "............#BBBB#BBBB#...........",
        "............###########...........",
    ],
}
COLS, MAX_ROWS = 34, 30
PX = 6
OFF_X = 46
TOP_PAD = 56
W = 300
H = TOP_PAD + MAX_ROWS * PX + 8

EYE_L, EYE_R = (12.9, 7.8), (19.9, 7.8)      # (col, row)
NOSE = (16.4, 11.0)
HEAD = {"c0": 8, "c1": 26, "r0": 0, "r1": 14}
ARM_L, ARM_R = (13.6, 16.6), (20.4, 16.6)    # standing shoulders (col, row)
FISH_PLAY_ROW = 17.0
CONFIG = Path.home() / ".bytecat.json"

PINK, BLUSH = "#e9a0ab", "#f2b8bc"
FISH_BLUE, FISH_DARK, DROP_BLUE = "#7d9fc7", "#4a6b96", "#a8c4e0"

SKINS = {
    "ink":      {"B": "#fdfcf8", "G": "#dcd8cc", "S": "#fdfcf8", "#": "#141312"},
    "patch":    {"B": "#f6f1e5", "G": "#8d8a86", "S": "#f6f1e5", "#": "#4a4440"},
    "tabby":    {"B": "#f4efe2", "G": "#a89f92", "S": "#a89f92", "#": "#4a4440", "stripes": "#6e6558"},
    "orange":   {"B": "#f6ead2", "G": "#e0a45c", "S": "#e0a45c", "#": "#4a4034"},
    "chonk":    {"B": "#f6e7cd", "G": "#e0a45c", "S": "#e0a45c", "#": "#4a4034", "stripes": "#c47f3a", "body": "sit_fat"},
    "calico":   {"B": "#f7f2e8", "G": "#e0a45c", "S": "#57504e", "#": "#4a4440"},
    "siamese":  {"B": "#efe4cd", "G": "#6b5646", "S": "#efe4cd", "#": "#453a30"},
    "cloud":    {"B": "#fbfaf5", "G": "#f1eee6", "S": "#fbfaf5", "#": "#4a4440", "fluffy": True},
    "void":     {"B": "#3b3740", "G": "#322e38", "S": "#322e38", "#": "#221f28"},
    "white":    {"B": "#f9f6ee", "G": "#efe9db", "S": "#f9f6ee", "#": "#4a4440"},
    "munchkin": {"B": "#f6e9d0", "G": "#e8a95e", "S": "#e8a95e", "#": "#4a4034", "stripes": "#c8823c", "body": "sit_short"},
    "lucky":    {"B": "#f9f6ee", "G": "#e0a45c", "S": "#57504e", "#": "#4a4440", "collar": True},
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
        self.stretch_every = cfg.get("stretch_every", 45)
        self.peek = cfg.get("peek", False)
        self.pinned = cfg.get("pinned", "")

        self.state = "idle"
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
        self.tail_up = 0.0

        # fish toy + standing play pose
        self.fish = None
        self.fish_cooldown_until = 0.0
        self.pose = 0.0                    # 0 sitting … 1 standing
        self.bat_cooldown_until = 0.0
        self.paws = {"L": [0.0, 0.0], "R": [0.0, 0.0]}   # px coords

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
        root.config(bg="#f2efe8")
        return "#f2efe8"

    # --------------------------------------------------- global listeners --
    def _start_global_listeners(self):
        """Optional pynput hook. We only COUNT keystrokes — never their content."""
        self.has_pynput = False
        try:
            from pynput import keyboard
        except ImportError:
            return
        try:
            def on_press(_key):
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
        p = {"kind": kind, "x": x, "y": y, "life": 1.0, "vx": 0.0}
        if kind == "drop":
            p["vy"] = 2.5 + random.random() * 2
            p["vx"] = (random.random() - 0.5) * 6
        else:
            p["vy"] = -0.9
        self.particles.append(p)

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

        # bored -> long fish session; sometimes the fish just drops by
        idle_for = now - self.last_pointer_move
        if self.fish is None and self.state == "idle" and now > self.fish_cooldown_until:
            if 25 < idle_for < 150:
                self._spawn_fish(now, 18)
            elif idle_for > 6 and random.random() < 0.0011:   # ~ every few minutes
                self._spawn_fish(now, 9)
        if (self.fish is not None and now - self.fish["born"] > self.fish["visit_s"] and
                self.fish["phase"] == "swim"):
            self.fish = None
            self.fish_cooldown_until = now + 40
        if self.fish is not None:
            self._fish_tick(now)

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

        # gaze: fish beats pointer
        if self.fish is not None:
            self._gaze_at_local(OFF_X + self.fish["x"] * PX, TOP_PAD + self.fish["y"] * PX)
        else:
            cx = wx + OFF_X + 17 * PX
            cy = wy + TOP_PAD + 9 * PX
            self.gaze_target = [max(-1.0, min(1.0, (px_ - cx) / 260)),
                                max(-0.8, min(1.0, (py_ - cy) / 220))]
        self.gaze[0] += (self.gaze_target[0] - self.gaze[0]) * 0.35
        self.gaze[1] += (self.gaze_target[1] - self.gaze[1]) * 0.35
        engaged = self.fish is not None or self.state in ("alert", "overheat", "stretch")
        self.tail_up += ((1.0 if engaged else 0.0) - self.tail_up) * 0.25
        self.pose += ((1.0 if self.fish is not None else 0.0) - self.pose) * 0.3

        self._apply_peek(now)
        self._draw(now)
        self.root.after(80, self._tick)

    def _gaze_at_local(self, x, y):
        cx, cy = OFF_X + 17 * PX, TOP_PAD + 9 * PX
        self.gaze_target = [max(-1.0, min(1.0, (x - cx) / 110)),
                            max(-0.8, min(1.0, (y - cy) / 95))]

    # ------------------------------------------------------------- fish ----
    def _spawn_fish(self, now, visit_s):
        self.fish = {"x": -3.0, "y": FISH_PLAY_ROW, "vx": 0.0, "vy": 0.0,
                     "dir": 1, "phase": "swim", "spin": 0, "born": now,
                     "visit_s": visit_s}
        self.paws["L"] = [OFF_X + ARM_L[0] * PX, TOP_PAD + ARM_L[1] * PX]
        self.paws["R"] = [OFF_X + ARM_R[0] * PX, TOP_PAD + ARM_R[1] * PX]

    def _fish_tick(self, now):
        f = self.fish
        if f["phase"] == "swim":
            f["x"] += f["dir"] * 0.35
            f["y"] = FISH_PLAY_ROW + math.sin(now * 2.4) * 1.2
            if f["x"] > 31:
                f["dir"] = -1
            if f["x"] < 2 and f["dir"] == -1:
                f["dir"] = 1
        else:
            f["vy"] += 0.85
            f["x"] += f["vx"]
            f["y"] += f["vy"]
            f["spin"] += 1
            if f["y"] >= FISH_PLAY_ROW and f["vy"] > 0:
                f["phase"] = "swim"
                f["y"] = FISH_PLAY_ROW
                f["spin"] = 0
                f["dir"] = -1 if f["x"] > 17 else 1
            if f["x"] < -4:
                f.update(x=-3.0, phase="swim", spin=0, dir=1)
            if f["x"] > 37:
                f.update(x=36.0, phase="swim", spin=0, dir=-1)

        # arms chase the fish: near arm reaches, far arm supports below
        fpx, fpy = OFF_X + f["x"] * PX, TOP_PAD + f["y"] * PX
        left_near = f["x"] < 17
        near, far = ("L", "R") if left_near else ("R", "L")
        near_sh = ARM_L if left_near else ARM_R
        far_sh = ARM_R if left_near else ARM_L
        if f["phase"] == "toss" or f["y"] < 11:
            near_t = (fpx, fpy + PX)
            far_t = (OFF_X + (far_sh[0] + (-0.6 if left_near else 0.6)) * PX,
                     TOP_PAD + (far_sh[1] + 3) * PX)
        else:
            near_t = (fpx + (1.6 if left_near else -1.6) * PX, fpy + 0.4 * PX)
            far_t = (fpx + (3.6 if left_near else -3.6) * PX, fpy + 2.4 * PX)

        def clamp_reach(sh, t):
            sx, sy = OFF_X + sh[0] * PX, TOP_PAD + sh[1] * PX
            mx = 9.5 * PX
            d = math.hypot(t[0] - sx, t[1] - sy)
            if d <= mx:
                return t
            return (sx + (t[0] - sx) / d * mx, sy + (t[1] - sy) / d * mx)

        near_t = clamp_reach(near_sh, near_t)
        far_t = clamp_reach(far_sh, far_t)
        self.paws[near][0] += (near_t[0] - self.paws[near][0]) * 0.6
        self.paws[near][1] += (near_t[1] - self.paws[near][1]) * 0.6
        self.paws[far][0] += (far_t[0] - self.paws[far][0]) * 0.45
        self.paws[far][1] += (far_t[1] - self.paws[far][1]) * 0.45

        pn = self.paws[near]
        if (f["phase"] == "swim" and now > self.bat_cooldown_until and
                math.hypot(pn[0] - fpx, pn[1] - fpy) < 1.6 * PX):
            f["phase"] = "toss"
            f["vx"] = (1 if f["x"] > 17 else -1) * (0.6 + random.random() * 0.5)
            f["vy"] = -(2.4 + random.random() * 0.8)
            f["spin"] = 0
            self.bat_cooldown_until = now + 1.4
            for _ in range(3):
                self._spawn("drop", fpx, fpy)

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
    def _grid(self):
        if self.pose >= 0.5:
            return SPRITES["stand"]
        return SPRITES[SKINS[self.skin].get("body", "sit_std")]

    def _draw(self, now):
        cv = self.canvas
        cv.delete("all")
        pal = SKINS[self.skin]
        grid = self._grid()
        rows = len(grid)
        standing = self.pose >= 0.5

        breathe = 1 + math.sin(now * 0.9) * 0.011
        shiver = (1 if int(now * 16) % 2 else -1) if self.state == "overheat" else 0
        hop = math.sin(min(1.0, abs(self.pose - 0.5) * 2) * math.pi) * -3
        sy = breathe
        if self.dragging:
            sy += 0.24
        elif self.state == "stretch":
            sy += 0.33 * (0.5 + 0.5 * abs(math.sin(now * 2)))

        bottom = TOP_PAD + MAX_ROWS * PX + hop
        yof = lambda r: bottom - (rows - r) * PX * sy
        xof = lambda c: OFF_X + c * PX + shiver
        ph = PX * sy + 0.6

        if standing or self.tail_up >= 0.5:
            self._draw_tail(now, pal, xof, yof, rows, standing)

        knead = None
        if self.state == "knead" and not standing:
            knead = (13, 15) if int(now * 6) % 2 == 0 else (17, 19)

        for r, row in enumerate(grid):
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

        # tabby stripes: forehead + flanks
        if pal.get("stripes"):
            st = pal["stripes"]
            for c in (15, 17, 19):
                for r in (3, 4):
                    if grid[r][c] in "BG":
                        cv.create_rectangle(xof(c), yof(r), xof(c) + PX, yof(r) + ph,
                                            fill=st, width=0)
            for r in (21, 23, 25):
                if r >= rows:
                    continue
                for c in range(COLS):
                    if grid[r][c] in "BGS" and (c <= 12 or c >= 21):
                        cv.create_rectangle(xof(c), yof(r), xof(c) + PX, yof(r) + ph,
                                            fill=st, width=0)

        if pal.get("collar") and not standing:
            cv.create_rectangle(xof(12.6), yof(14.8), xof(12.6) + PX * 9.0,
                                yof(14.8) + PX * 1.1, fill="#c8433e", width=0)
            cv.create_rectangle(xof(16.3), yof(15.7), xof(16.3) + PX * 1.6,
                                yof(15.7) + PX * 1.6, fill="#e8b93c", width=0)
            cv.create_rectangle(xof(16.8), yof(16.3), xof(16.8) + PX * 0.6,
                                yof(16.3) + PX * 0.6, fill=pal["#"], width=0)

        self._draw_face(now, pal, xof, yof, standing)
        if not standing and self.tail_up < 0.5:
            self._draw_tail(now, pal, xof, yof, rows, False)
        if standing and self.fish is not None:
            self._draw_arms(pal)
        if self.fish is not None:
            self._draw_fish(now)
        self._draw_particles()
        self._draw_texts(now)

    def _draw_tail(self, now, pal, xof, yof, rows, standing):
        cv = self.canvas
        m = 1.0 if standing else self.tail_up
        asleep = self.state == "sleep"
        excited = self.fish is not None
        speed = 2.6 if asleep else 0.26 if excited else 0.9
        amp = 0.05 if asleep else 0.16 if excited else 0.08

        root_c = 21.5 if standing else 25.4 - m * 1.6
        root_r = rows - (4.5 if standing else 2.1 + m * 3.6)
        ang = 0.55 if standing else (-3.05) * (1 - m) + 0.5 * m
        d_ang = 0.15 if standing else (-0.04) * (1 - m) + 0.15 * m

        x, y = xof(root_c), yof(root_r)
        w = PX * (2.2 if pal.get("fluffy") else 1.6)
        segs = 10
        for i in range(segs):
            wave = math.sin(now / speed - i * 0.55) * amp * (i / segs + 0.3)
            ang += d_ang + wave
            x += math.cos(ang) * PX * 1.05
            y -= math.sin(ang) * PX * 1.05
            col = pal["stripes"] if (pal.get("stripes") and i % 3 == 2) else pal["G"]
            cv.create_rectangle(x - w / 2 - 1, y - w / 2 - 1, x + w / 2 + 1, y + w / 2 + 1,
                                fill=pal["#"], width=0)
            cv.create_rectangle(x - w / 2, y - w / 2, x + w / 2, y + w / 2,
                                fill=col, width=0)

    def _draw_face(self, now, pal, xof, yof, standing):
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

        cv.create_rectangle(xof(NOSE[0]), yof(NOSE[1]), xof(NOSE[0]) + PX * 1.2,
                            yof(NOSE[1]) + PX * 0.8, fill="#c98a80", width=0)
        happy_open = standing and int(now / 2.6) % 3 == 0
        if self.state in ("meow", "overheat") or happy_open:
            cv.create_rectangle(xof(16.2), yof(12.2), xof(16.2) + PX * 1.6,
                                yof(12.2) + PX * 1.2, fill=dark, width=0)
        else:
            cv.create_rectangle(xof(16.0), yof(12.4), xof(16.0) + PX * 2.2,
                                yof(12.4) + PX * 0.4, fill=dark, width=0)
        for wx_, wy_ in ((25.4, 9.8), (25.1, 11.6), (6.0, 9.8), (6.3, 11.6)):
            cv.create_rectangle(xof(wx_), yof(wy_), xof(wx_) + PX * 2.6,
                                yof(wy_) + PX * 0.35, fill=dark, width=0)
        if self.state == "meow":
            cv.create_text(xof(27), yof(3), text="meow!", anchor="w",
                           font=("Courier", 13, "bold"), fill="#c8433e")

    def _draw_arms(self, pal):
        cv = self.canvas
        for side, sh in (("L", ARM_L), ("R", ARM_R)):
            sxp, syp = OFF_X + sh[0] * PX, TOP_PAD + sh[1] * PX
            p = self.paws[side]
            ang = math.atan2(p[1] - syp, p[0] - sxp)
            d = math.hypot(p[0] - sxp, p[1] - syp)
            bend = max(0.0, 1 - d / (9.5 * PX)) * 1.5 * PX * (1 if side == "L" else -1)
            mx = (sxp + p[0]) / 2 - math.sin(ang) * bend
            my = (syp + p[1]) / 2 + math.cos(ang) * bend
            for x1, y1, x2, y2, wo, wi in ((sxp, syp, mx, my, PX * 2.2, PX * 1.55),
                                           (mx, my, p[0], p[1], PX * 2.0, PX * 1.35)):
                cv.create_line(x1, y1, x2, y2, width=wo, fill=pal["#"], capstyle=tk.ROUND)
                cv.create_line(x1, y1, x2, y2, width=wi, fill=pal["B"], capstyle=tk.ROUND)
            cv.create_rectangle(p[0] - PX * 0.9, p[1] - PX * 0.9, p[0] + PX * 0.9, p[1] + PX * 0.9,
                                fill=pal["B"], outline=pal["#"])

    def _draw_fish(self, now):
        cv = self.canvas
        f = self.fish
        fx, fy = OFF_X + f["x"] * PX, TOP_PAD + f["y"] * PX
        if f["phase"] == "swim":
            flip = f["dir"]
        else:
            flip = -1 if f["vx"] < 0 else 1
            if f["spin"] % 2:
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

    def _draw_particles(self):
        cv = self.canvas
        alive = []
        for p in self.particles:
            if p["kind"] == "drop":
                p["vy"] += 0.5
                p["x"] += p["vx"]
                p["life"] -= 0.09
            else:
                p["life"] -= 0.03
            p["y"] += p["vy"]
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
            elif p["kind"] == "drop":
                cv.create_rectangle(p["x"], p["y"], p["x"] + PX * 0.6, p["y"] + PX * 0.8,
                                    fill=DROP_BLUE, width=0)
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
            color = "#c8433e" if label == "FOCUS" else "#4a7c4e"
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
