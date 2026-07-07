/* BYTECAT — pixel cat engine (browser)
   One class drives both the interactive hero cat and the looping
   feature demos (pass { demo: "knead" } etc. to script it). */

// legend: . none | # outline | B base | G patch | S spot | P inner ear | R blush
const SPRITE = [
  "..................................",
  "................#..........#......",
  "................##.........##.....",
  "...............#G#........#B#.....",
  "...............#PG########BPB#....",
  "..............#PPPGBBBBBBBPPP#....",
  ".............##GGGGGBBBBBBBBBB#...",
  "...............#GGGGBBBBBBBBB#....",
  "..............#GGGGGBBBBBBBBBB#...",
  "..............#GGGGGBBBBBBBBBB#...",
  "..........####GGGGGGBBBBBBBBBBB#..",
  "......####GGGGGGGGGGBBBBBBBBBBB#..",
  ".....#BBBBBGGGGGGGGBBBBBBBBBBBB#..",
  "...##BBSSBBBBGGGGBBBBBBBBBBBBBB#..",
  "...#BBSSSSBBBBBBBBBBBBBBBBBBBBB#..",
  "..#BGGSSSSBBBBBBRRRBBBBBBBRRRB#...",
  "..#GGGGGSBBBBBBBBBBBBBBBBBBBBB#...",
  "..#GGGGGGBBBBBBBBBBBBBBBBBBBB#....",
  "..#GGGGGGBBBBBBBBBBBBBBBBBBB#.....",
  "..#GGGGGGBBBBBBBBBBBBBBBBB##......",
  "..#GGGGGGBBBBBBBB#BBB#####........",
  "...#####BBBBBBBBB#B##.............",
  "........###########...............",
  "..................................",
];
const COLS = 34, ROWS = 24;
const PAD = 9;                       // rows of headroom above the cat

// face anchors, in cell units
const EYE_L = [18.2, 11.0], EYE_R = [25.2, 11.0];
const NOSE = [22.0, 13.4];
const HEAD = { c0: 14, c1: 31, r0: 1, r1: 16 };

// skins: base coat, patch, spot, outline; lucky gets a collar + bell
const SKINS = {
  patch:   { B: "#f6f1e5", G: "#8d8a86", S: "#f6f1e5", "#": "#4a4440", label: "patch" },
  orange:  { B: "#f6ead2", G: "#e0a45c", S: "#e0a45c", "#": "#4a4034", label: "orange" },
  calico:  { B: "#f7f2e8", G: "#e0a45c", S: "#57504e", "#": "#4a4440", label: "calico" },
  siamese: { B: "#efe4cd", G: "#6b5646", S: "#efe4cd", "#": "#453a30", label: "siamese" },
  void:    { B: "#3b3740", G: "#322e38", S: "#322e38", "#": "#221f28", label: "void" },
  white:   { B: "#f9f6ee", G: "#efe9db", S: "#f9f6ee", "#": "#4a4440", label: "white" },
  lucky:   { B: "#f9f6ee", G: "#e0a45c", S: "#57504e", "#": "#4a4440", label: "lucky", collar: true },
};
const PINK = "#e9a0ab", BLUSH = "#f2b8bc";
const FISH_BLUE = "#7d9fc7", FISH_DARK = "#4a6b96";

class PixelCat {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.cx = canvas.getContext("2d");
    this.px = opts.px || 6;
    canvas.width = COLS * this.px;
    canvas.height = (ROWS + PAD) * this.px;
    this.skin = opts.skin || "patch";
    this.demo = opts.demo || null;

    this.state = "idle";   // idle|pet|knead|alert|drag|sleep|overheat|unroll|stretch|meow
    this.stateUntil = 0;
    this.blinkUntil = 0;
    this.nextBlink = performance.now() + 2500;
    this.lastActive = performance.now();
    this.mouse = { x: -999, y: -999, speed: 0 };
    this.gaze = { x: 0, y: 0 };          // -1..1
    this.stretch = 0;                     // mochi (drag)
    this.tall = 0;                        // stretch-break growth
    this.dragging = false;
    this.petHeat = 0;
    this.keyTimes = [];
    this.scrollHeat = 0;
    this.unrollLen = 0;
    this.particles = [];
    this.bubble = null;                   // {text, until}
    this.pinned = null;
    this.timerText = null;                // {label, color}
    this.slideX = 0;                      // peek-mode offset

    // fish (boredom toy)
    this.fish = null;                     // {t0}
    this.fishCooldownUntil = 0;
    this.swipeUntil = 0;

    if (!this.demo) this._bindEvents();
    requestAnimationFrame((t) => this._loop(t));
  }

  setSkin(name) { if (SKINS[name]) this.skin = name; }

  // ------------------------------------------------------------- input ----
  _bindEvents() {
    window.addEventListener("mousemove", (e) => {
      const r = this.cv.getBoundingClientRect();
      const sx = this.cv.width / r.width;
      const x = (e.clientX - r.left) * sx, y = (e.clientY - r.top) * sx;
      const now = performance.now();
      const dt = Math.max(1, now - (this._mt || now));
      this.mouse.speed = Math.hypot(x - this.mouse.x, y - this.mouse.y) / dt * 16;
      this._mt = now;
      this.mouse.x = x; this.mouse.y = y;
      this._wake(now);

      if (this.dragging) return;
      const near = x > -120 && x < this.cv.width + 120 && y > -120 && y < this.cv.height + 120;
      if (near && this.mouse.speed > 30 && !["knead", "overheat"].includes(this.state)) {
        this.state = "alert"; this.stateUntil = now + 900;
      }
      const overHead = x > HEAD.c0 * this.px && x < HEAD.c1 * this.px &&
                       y > (HEAD.r0 + PAD) * this.px && y < (HEAD.r1 + PAD) * this.px;
      if (overHead && this.mouse.speed < 14) {
        this.petHeat = Math.min(this.petHeat + this.mouse.speed * 0.4 + 0.3, 40);
        if (this.petHeat > 8) {
          this.state = "pet"; this.stateUntil = now + 700;
          if (Math.random() < 0.06) this._spawn("heart", x, y - 8);
        }
      }
    });
    window.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey) return;
      const now = performance.now();
      this._wake(now);
      this.keyTimes = this.keyTimes.filter((t) => now - t < 2000);
      this.keyTimes.push(now);
      if (this.keyTimes.length > 14) {
        this.state = "overheat"; this.stateUntil = now + 1600;
      } else if (this.state !== "overheat" || now > this.stateUntil) {
        this.state = "knead"; this.stateUntil = now + 650;
      }
    });
    window.addEventListener("wheel", () => {
      const now = performance.now();
      this._wake(now);
      this.scrollHeat = Math.min(this.scrollHeat + 3, 30);
      if (["idle", "knead", "alert"].includes(this.state)) {
        this.state = "unroll"; this.stateUntil = now + 900;
      }
    }, { passive: true });
    this.cv.addEventListener("mousedown", (e) => {
      this.dragging = true; this.state = "drag"; e.preventDefault();
    });
    window.addEventListener("mouseup", () => {
      if (this.dragging) { this.dragging = false; this.state = "idle"; }
    });
    this.cv.style.cursor = "grab";
  }

  _wake(now) {
    this.lastActive = now;
    if (this.fish) { this.fish = null; this.fishCooldownUntil = now + 20000; }
    if (this.state === "sleep") this.state = "idle";
  }

  _spawn(kind, x, y) {
    this.particles.push({ kind, x, y, vy: -0.5 - Math.random() * 0.3, life: 1 });
  }

  say(text, secs = 4) { this.bubble = { text, until: performance.now() + secs * 1000 }; }

  // -------------------------------------------------------------- loop ----
  _loop(now) {
    if (this.demo) this._demoTick(now);
    else this._liveTick(now);

    if (now > this.nextBlink) {
      this.blinkUntil = now + 140;
      this.nextBlink = now + 2200 + Math.random() * 3000;
    }
    this.petHeat = Math.max(0, this.petHeat - 0.15);
    this.scrollHeat = Math.max(0, this.scrollHeat - 0.25);
    const unrollTarget = this.state === "unroll" ? Math.min(this.scrollHeat * 4, 12 * this.px) : 0;
    this.unrollLen += (unrollTarget - this.unrollLen) * 0.25;
    this.stretch += ((this.dragging ? 1 : 0) - this.stretch) * 0.18;
    if (this.bubble && now > this.bubble.until) this.bubble = null;

    this._draw(now);
    requestAnimationFrame((t) => this._loop(t));
  }

  _liveTick(now) {
    if (!["drag", "sleep", "idle"].includes(this.state) && now > this.stateUntil) this.state = "idle";
    const idleFor = now - this.lastActive;

    // bored -> the fish comes out to play; very bored -> sleep
    if (!this.fish && this.state === "idle" && idleFor > 15000 && idleFor < 70000 &&
        now > this.fishCooldownUntil) {
      this.fish = { t0: now };
    }
    if (this.fish && now - this.fish.t0 > 14000) {
      this.fish = null;
      this.fishCooldownUntil = now + 25000;
    }
    if (this.state === "idle" && !this.fish && idleFor > 80000) this.state = "sleep";
    if (this.state === "sleep" && Math.random() < 0.02)
      this._spawn("zzz", 26 * this.px, (PAD - 1) * this.px);
    if (this.state === "overheat" && Math.random() < 0.4)
      this._spawn("steam", (16 + Math.random() * 10) * this.px, (PAD - 0.5) * this.px);

    // gaze: fish beats mouse
    if (this.fish) {
      const f = this._fishPos(now);
      this._gazeAt(f.x, f.y);
      if (Math.random() < 0.01 && now > this.swipeUntil) this.swipeUntil = now + 700;
    } else {
      this._gazeAt(this.mouse.x, this.mouse.y);
    }
  }

  _gazeAt(x, y) {
    const cx = 22 * this.px, cy = (PAD + 12) * this.px;
    this.gaze.x = Math.max(-1, Math.min(1, (x - cx) / 140));
    this.gaze.y = Math.max(-0.7, Math.min(1, (y - cy) / 140));
  }

  _fishPos(now) {
    const t = (now - (this.fish ? this.fish.t0 : 0)) / 1000;
    const fleeing = now < this.swipeUntil + 250 && now > this.swipeUntil - 250;
    const x = (10 + Math.sin(t * 0.9) * 7 + (fleeing ? 6 : 0)) * this.px;
    const y = (2.6 + Math.sin(t * 2.2) * 1.4 - (fleeing ? 2 : 0)) * this.px;
    return { x, y };
  }

  // ------------------------------------------------------- demo scripts ---
  _demoTick(now) {
    const t = now / 1000;
    const cyc = (n) => t % n;                        // seconds into an n-second loop
    this.state = "idle";
    this._gazeAt(this.cv.width / 2, (PAD + 12) * this.px);

    switch (this.demo) {
      case "skins": {
        const names = Object.keys(SKINS);
        this.skin = names[Math.floor(t / 1.6) % names.length];
        this._gazeAt(this.cv.width / 2, 0);
        break;
      }
      case "eyes": {
        const a = t * 1.5;
        this._gazeAt((17 + Math.cos(a) * 16) * this.px, (PAD + 6 + Math.sin(a) * 10) * this.px);
        break;
      }
      case "hunt": {
        const ph = cyc(2.4);
        this._gazeAt(ph < 1.2 ? 0 : this.cv.width, (PAD + 4) * this.px);
        if (ph > 1.1 && ph < 2.0) this.state = "alert";
        break;
      }
      case "pet":
        if (cyc(2.5) < 1.6) {
          this.state = "pet";
          if (Math.random() < 0.05)
            this._spawn("heart", (18 + Math.random() * 8) * this.px, (PAD + 2) * this.px);
        }
        break;
      case "knead":
        this.state = "knead";
        break;
      case "overheat":
        this.state = "overheat";
        if (Math.random() < 0.4)
          this._spawn("steam", (16 + Math.random() * 10) * this.px, (PAD - 0.5) * this.px);
        break;
      case "drag":
        this.stretch = 0.5 + Math.sin(t * 2.4) * 0.5;
        break;
      case "fish":
        if (!this.fish) this.fish = { t0: now };
        this.fish.t0 = Math.min(this.fish.t0, now);   // never expires
        {
          const f = this._fishPos(now);
          this._gazeAt(f.x, f.y);
          if (cyc(3) > 2.4 && now > this.swipeUntil) this.swipeUntil = now + 700;
        }
        break;
      case "unroll":
        this.scrollHeat = 18 + Math.sin(t * 3) * 8;
        this.state = "unroll";
        break;
      case "stretch":
        this.tall = cyc(3) < 1.8 ? Math.min(1, this.tall + 0.06) : Math.max(0, this.tall - 0.06);
        if (cyc(3) < 0.1 && !this.bubble) this.say("stretch with me!", 1.6);
        break;
      case "pomodoro": {
        const left = 1500 - Math.floor(t * 60) % 1500;
        this.timerText = { label: `FOCUS ${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`, color: "#e5484d" };
        break;
      }
      case "reminder":
        if (cyc(4) < 0.1 && !this.bubble) { this.say("meow! laundry time!", 2.2); }
        if (this.bubble) this.state = "meow";
        break;
      case "note":
        this.pinned = "ship it friday";
        break;
      case "name":
        if (cyc(4) < 0.1 && !this.bubble) this.say("welcome back, rachel!", 2.2);
        break;
      case "peek": {
        const ph = cyc(5);
        const hidden = 20 * this.px;
        const target = (ph > 1.4 && ph < 3.4) ? 0 : hidden;
        this.slideX += (target - this.slideX) * 0.08;
        if (ph > 1.5 && ph < 1.7 && !this.bubble) this.say("psst. still here.", 1.4);
        break;
      }
      case "meow":
        if (cyc(2.5) < 0.1 && !this.bubble) { this.say("meow!", 1); }
        if (this.bubble) this.state = "meow";
        break;
      case "sleep":
        this.state = "sleep";
        if (Math.random() < 0.02) this._spawn("zzz", 26 * this.px, (PAD - 1) * this.px);
        break;
    }
  }

  // -------------------------------------------------------------- draw ----
  _draw(now) {
    const { cx, px } = this;
    const pal = SKINS[this.skin];
    cx.clearRect(0, 0, this.cv.width, this.cv.height);
    cx.imageSmoothingEnabled = false;

    const bob = Math.sin(now / 700) > 0.75 ? 1 : 0;
    const shiver = this.state === "overheat" ? ((Math.floor(now / 60) % 2) ? 1 : -1) : 0;
    const sy = 1 + this.stretch * 0.28 + this.tall * 0.35;
    const bottom = (PAD + ROWS) * px + bob;
    const yof = (r) => bottom - (ROWS - r) * px * sy;
    const xof = (c) => c * px + shiver + this.slideX;
    const ph = px * sy + 0.6;

    let knead = null;
    if (this.state === "knead") knead = (Math.floor(now / 160) % 2) ? [14, 19] : [20, 25];

    this._drawCells(pal, xof, yof, ph, knead);

    if (pal.collar) this._drawCollar(pal, xof, yof);
    this._drawFace(now, pal, xof, yof);
    if (this.fish) this._drawFish(now);
    if (now < this.swipeUntil) this._drawSwipe(now, pal);
    this._drawPaper(pal);
    this._drawParticles();
    this._drawTexts();
  }

  _drawCells(pal, xof, yof, ph, knead) {
    const { cx, px } = this;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = SPRITE[r][c];
        if (ch === ".") continue;
        let color;
        if (ch === "P") color = PINK;
        else if (ch === "R") color = BLUSH;
        else color = pal[ch] || pal.B;
        if ("BGS".includes(ch) && this.state === "overheat")
          color = this._blend(color, "#d86a5a", 0.4);
        let y = yof(r);
        if (r >= ROWS - 4 && knead && knead.some((k) => c >= k && c <= k + 2)) y -= px * 0.7;
        cx.fillStyle = color;
        cx.fillRect(xof(c), y, px, ph);
      }
    }
  }

  _drawCollar(pal, xof, yof) {
    const { cx, px } = this;
    cx.fillStyle = "#c8433e";
    cx.fillRect(xof(15.5), yof(16.6), px * 14.5, px * 1.1);
    cx.fillStyle = "#e8b93c";
    cx.fillRect(xof(21.6), yof(17.6), px * 1.6, px * 1.6);
    cx.fillStyle = pal["#"];
    cx.fillRect(xof(22.1), yof(18.2), px * 0.6, px * 0.6);
  }

  _drawFace(now, pal, xof, yof) {
    const { cx, px } = this;
    const closed = now < this.blinkUntil || this.state === "sleep" || this.state === "pet";
    const dark = this.skin === "void" ? "#e8e4da" : pal["#"];
    const gx = this.gaze.x * px * 0.6, gy = this.gaze.y * px * 0.5;

    for (const [ec, er] of [EYE_L, EYE_R]) {
      const x = xof(ec), y = yof(er);
      cx.fillStyle = dark;
      if (closed) {
        if (this.state === "pet") {          // content little arcs
          cx.fillRect(x, y + px * 1.2, px * 0.6, px * 0.6);
          cx.fillRect(x + px * 0.5, y + px * 0.7, px * 0.9, px * 0.6);
          cx.fillRect(x + px * 1.3, y + px * 1.2, px * 0.6, px * 0.6);
        } else {
          cx.fillRect(x, y + px * 1.1, px * 1.9, px * 0.55);
        }
        continue;
      }
      const wide = this.state === "alert";
      // blank stare: solid dark rounded-ish blocks, no shine
      const w = wide ? px * 2.2 : px * 1.8, h = wide ? px * 3 : px * 2.6;
      cx.fillRect(x + gx, y + gy + px * 0.3, w, h - px * 0.6);
      cx.fillRect(x + gx + px * 0.25, y + gy, w - px * 0.5, h);
    }
    // nose + flat mouth
    cx.fillStyle = "#c98a80";
    cx.fillRect(xof(NOSE[0]) - px * 0.1, yof(NOSE[1]), px * 1.2, px * 0.8);
    cx.fillStyle = pal["#"];
    if (this.state === "meow" || this.state === "overheat") {
      cx.fillRect(xof(21.7), yof(14.6), px * 1.6, px * 1.2);
    } else {
      cx.fillRect(xof(21.4), yof(14.7), px * 2.2, px * 0.4);
    }
    // whiskers
    cx.fillStyle = pal["#"];
    cx.fillRect(xof(30.6), yof(12.4), px * 2.6, px * 0.35);
    cx.fillRect(xof(30.3), yof(14.2), px * 2.6, px * 0.35);
    cx.fillRect(xof(12.4), yof(13.2), px * 2.2, px * 0.35);
  }

  _drawFish(now) {
    const { cx, px } = this;
    const f = this._fishPos(now);
    const flip = Math.cos((now - this.fish.t0) / 1000 * 0.9) < 0 ? -1 : 1;
    cx.save();
    cx.translate(f.x + 3 * px, f.y + 1.5 * px);
    cx.scale(flip, 1);
    cx.translate(-3 * px, -1.5 * px);
    cx.fillStyle = FISH_BLUE;
    cx.fillRect(px * 0.8, 0, px * 3.4, px * 2.6);
    cx.fillRect(px * 0.2, px * 0.6, px * 4.6, px * 1.4);
    cx.fillRect(px * 4.4, px * -0.3, px * 1.3, px * 1.2);   // tail top
    cx.fillRect(px * 4.4, px * 1.7, px * 1.3, px * 1.2);    // tail bottom
    cx.fillStyle = FISH_DARK;
    cx.fillRect(px * 1.4, px * 0.7, px * 0.7, px * 0.7);    // eye
    cx.fillRect(px * 2.6, px * 0.3, px * 0.5, px * 2.0);    // fin line
    cx.restore();
  }

  _drawSwipe(now, pal) {
    const { cx, px } = this;
    const t = 1 - Math.abs((this.swipeUntil - now) / 700 * 2 - 1);   // 0->1->0
    const reach = t * 5.5;
    const x = xof0(this, 17.5), base = (PAD + 18) * px;
    cx.fillStyle = pal.B;
    cx.fillRect(x, base - reach * px, px * 2.4, reach * px + px);
    cx.strokeStyle = pal["#"];
    cx.lineWidth = 1;
    cx.strokeRect(x, base - reach * px, px * 2.4, reach * px + px);
  }

  _drawPaper(pal) {
    if (this.unrollLen < 3) return;
    const { cx, px } = this;
    const x0 = 6 * px, y0 = (PAD + ROWS - 2.4) * px, ln = this.unrollLen;
    cx.fillStyle = "#f5f5f5";
    cx.fillRect(x0, y0, ln, px * 1.6);
    cx.strokeStyle = pal["#"];
    cx.strokeRect(x0, y0, ln, px * 1.6);
    cx.fillStyle = "#9a9a9a";
    for (let i = 0; i < Math.floor(ln / 12); i++) {
      cx.fillRect(x0 + 6 + i * 12, y0 + px * 0.4, 6, 1.5);
      cx.fillRect(x0 + 6 + i * 12, y0 + px * 1.0, 6, 1.5);
    }
  }

  _drawParticles() {
    const { cx, px } = this;
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.y += p.vy; p.life -= 0.012;
      cx.globalAlpha = Math.max(0, p.life);
      if (p.kind === "heart") {
        cx.fillStyle = "#e8546a";
        const s = px * 0.55;
        cx.fillRect(p.x - s, p.y - s, s, s); cx.fillRect(p.x + s * 0.2, p.y - s, s, s);
        cx.fillRect(p.x - s, p.y - s * 0.4, s * 2.2, s);
        cx.fillRect(p.x - s * 0.4, p.y + s * 0.6, s, s * 0.8);
      } else if (p.kind === "steam") {
        cx.fillStyle = "#b9b4ac";
        cx.fillRect(p.x + Math.sin(p.life * 10) * 3, p.y, px * 0.9, px * 0.9);
      } else if (p.kind === "zzz") {
        cx.fillStyle = "#8d8a86";
        cx.font = `${px * 2.2}px "VT323", monospace`;
        cx.fillText("z", p.x + (1 - p.life) * 10, p.y);
      }
      cx.globalAlpha = 1;
    }
  }

  _drawTexts() {
    const { cx, px } = this;
    let y = px * 1.6;
    cx.textAlign = "center";
    if (this.pinned) {
      cx.font = `${px * 2}px "VT323", monospace`;
      const w = cx.measureText(this.pinned).width + px * 3;
      cx.fillStyle = "#fffdf6";
      cx.fillRect(this.cv.width / 2 - w / 2, y - px * 1.2, w, px * 2.6);
      cx.strokeStyle = "#e8b93c";
      cx.strokeRect(this.cv.width / 2 - w / 2, y - px * 1.2, w, px * 2.6);
      cx.fillStyle = "#5a544e";
      cx.fillText(this.pinned, this.cv.width / 2, y + px * 0.7);
      y += px * 3.4;
    }
    if (this.timerText) {
      cx.font = `bold ${px * 2.2}px "VT323", monospace`;
      cx.fillStyle = this.timerText.color;
      cx.fillText(this.timerText.label, this.cv.width / 2, y + px);
      y += px * 3;
    }
    if (this.bubble) {
      cx.font = `${px * 2}px "VT323", monospace`;
      const w = cx.measureText(this.bubble.text).width + px * 3;
      cx.fillStyle = "#fffdf6";
      cx.fillRect(this.cv.width / 2 - w / 2, y - px * 1.2, w, px * 2.8);
      cx.strokeStyle = "#5a544e";
      cx.strokeRect(this.cv.width / 2 - w / 2, y - px * 1.2, w, px * 2.8);
      cx.fillStyle = "#5a544e";
      cx.fillText(this.bubble.text, this.cv.width / 2, y + px * 0.8);
    }
    cx.textAlign = "left";
  }

  _blend(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const mix = (sa, sb) => Math.round(sa + (sb - sa) * t);
    return `rgb(${mix(pa >> 16, pb >> 16)},${mix((pa >> 8) & 255, (pb >> 8) & 255)},${mix(pa & 255, pb & 255)})`;
  }
}

function xof0(cat, c) { return c * cat.px + cat.slideX; }

window.PixelCat = PixelCat;
window.CAT_SKINS = SKINS;
