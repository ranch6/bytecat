/* BYTECAT — pixel cat engine (browser)
   One class drives both the interactive hero cat and the looping
   feature demos (pass { demo: "knead" } etc. to script it). */

// legend: . none | # outline | B base | G patch | S spot | P inner ear | R blush
const SPRITE = [
  "...........#...........#..........",
  "...........##.........##..........",
  "..........#P#.#######.#P#.........",
  "..........#PP#BBBBBGG#PP#.........",
  ".........#PPPBBBBBGGGGPPP#........",
  ".........#BBBBBBBBGGGGGGG#........",
  "........##BBBBBBBGGGGGGGG##.......",
  "..........#BBBBBBGGGGGGG#.........",
  "..........#BBBBBBBGGGGGG#.........",
  "..........#BBBBBBBGGGGGG#.........",
  "..........#BBBBBBBBGGGGG#.........",
  "..........#BBBBBBBBBBBBB#.........",
  "...........#RBBBBBBBBBR#..........",
  "...........#RBBBBBBBBBR#..........",
  "...........#BBBBBBBBBBB#..........",
  "..........#GBBBBBBBBBBBB#.........",
  ".........#GGGBBBBBBBBBBBB#........",
  ".........#GGGBBBBBBBBBBBB#........",
  ".....####GGGG#BBBBBB#BBBBB####....",
  ".....#GGGGGGG#BBBBBB#BBBBBSSB#....",
  "....#BGGGGGGB#BB##BB#BBBBSSSSB#...",
  "....#BBBBBBBB#BB##BB#BBBBSSSSB#...",
  "....#BBBBBBBB#BB##BB#BBBBBSSBB#...",
  "....#BBBBBBBB#BB##BB#BBBBBBBBB#...",
  ".....#BBBB##B#BB##BB#BB##BBBB#....",
  "......####..###########..####.....",
];
const COLS = 34, ROWS = 26;
const PAD = 8;                       // rows of headroom above the cat

// anatomy anchors, in cell units
const EYE_L = [12.8, 7.6], EYE_R = [19.8, 7.6];
const NOSE = [16.5, 10.8];
const HEAD = { c0: 9, c1: 25, r0: 0, r1: 14 };
const TAIL_ROOT = [28.2, 22.0];      // behind the right haunch
const SHOULDER = [11.2, 18.0];       // left shoulder, for fish swipes
const FISH_BASE_ROW = 17.5;          // fish hover height while swimming

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

    this.state = "idle";   // idle|pet|knead|alert|drag|sleep|overheat|stretch|meow
    this.stateUntil = 0;
    this.blinkUntil = 0;
    this.nextBlink = performance.now() + 2500;
    this.lastActive = performance.now();
    this.mouse = { x: -999, y: -999, speed: 0 };
    this.gaze = { x: 0, y: 0 };          // smoothed, -1..1
    this.gazeTarget = { x: 0, y: 0 };
    this.stretch = 0;                     // mochi (drag)
    this.tall = 0;                        // stretch-break growth
    this.dragging = false;
    this.petHeat = 0;
    this.keyTimes = [];
    this.particles = [];
    this.bubble = null;
    this.pinned = null;
    this.timerText = null;
    this.slideX = 0;                      // peek-mode offset

    // fish toy: {x,y (cells), vx,vy, dir, phase: swim|toss, spin, born}
    this.fish = null;
    this.fishCooldownUntil = 0;
    this.swipeStart = 0;                  // swipe animation window
    this.swipeHit = false;

    if (!this.demo) this._bindEvents();
    requestAnimationFrame((t) => this._loop(t));
  }

  setSkin(name) { if (SKINS[name]) this.skin = name; }
  say(text, secs = 4) { this.bubble = { text, until: performance.now() + secs * 1000 }; }

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
      const near = x > -160 && x < this.cv.width + 160 && y > -160 && y < this.cv.height + 160;
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
    if (this.fish && !this.demo) { this.fish = null; this.fishCooldownUntil = now + 20000; }
    if (this.state === "sleep") this.state = "idle";
  }

  _spawn(kind, x, y) {
    this.particles.push({ kind, x, y, vy: -0.5 - Math.random() * 0.3, life: 1 });
  }

  // -------------------------------------------------------------- loop ----
  _loop(now) {
    if (this.demo) this._demoTick(now);
    else this._liveTick(now);

    if (this.fish) this._fishTick(now);

    if (now > this.nextBlink) {
      this.blinkUntil = now + 140;
      this.nextBlink = now + 2200 + Math.random() * 3000;
    }
    this.petHeat = Math.max(0, this.petHeat - 0.15);
    this.stretch += ((this.dragging ? 1 : 0) - this.stretch) * 0.18;
    // eased gaze — this is what makes the eyes feel alive
    this.gaze.x += (this.gazeTarget.x - this.gaze.x) * 0.14;
    this.gaze.y += (this.gazeTarget.y - this.gaze.y) * 0.14;
    if (this.bubble && now > this.bubble.until) this.bubble = null;

    this._draw(now);
    requestAnimationFrame((t) => this._loop(t));
  }

  _liveTick(now) {
    if (!["drag", "sleep", "idle"].includes(this.state) && now > this.stateUntil) this.state = "idle";
    const idleFor = now - this.lastActive;

    // bored -> the fish comes out; very bored -> sleep
    if (!this.fish && this.state === "idle" && idleFor > 15000 && idleFor < 70000 &&
        now > this.fishCooldownUntil) this._spawnFish(now);
    if (this.fish && now - this.fish.born > 16000 && this.fish.phase === "swim") {
      this.fish = null;
      this.fishCooldownUntil = now + 25000;
    }
    if (this.state === "idle" && !this.fish && idleFor > 80000) this.state = "sleep";
    if (this.state === "sleep" && Math.random() < 0.02)
      this._spawn("zzz", 26 * this.px, (PAD - 1) * this.px);
    if (this.state === "overheat" && Math.random() < 0.4)
      this._spawn("steam", (12 + Math.random() * 10) * this.px, (PAD - 0.5) * this.px);

    // gaze: fish beats mouse
    if (this.fish) this._gazeAt(this.fish.x * this.px, (this.fish.y + PAD) * this.px);
    else this._gazeAt(this.mouse.x, this.mouse.y);
  }

  _gazeAt(x, y) {
    const cx = 17 * this.px, cy = (PAD + 9) * this.px;
    this.gazeTarget.x = Math.max(-1, Math.min(1, (x - cx) / (26 * this.px)));
    this.gazeTarget.y = Math.max(-0.8, Math.min(1, (y - cy) / (22 * this.px)));
  }

  // ------------------------------------------------------------- fish -----
  _spawnFish(now) {
    this.fish = { x: -3, y: FISH_BASE_ROW, vx: 0, vy: 0, dir: 1,
                  phase: "swim", spin: 0, born: now };
  }

  _fishTick(now) {
    const f = this.fish;
    if (f.phase === "swim") {
      f.x += f.dir * 0.07;
      f.y = FISH_BASE_ROW + Math.sin(now / 420) * 1.1;
      if (f.x > 10.6) f.dir = -1;
      if (f.x < 0.6 && f.dir === -1) f.dir = 1;
      // fish drifts into paw range -> wind up a swipe
      if (f.x > 8.2 && f.dir === 1 && now - this.swipeStart > 2200) {
        this.swipeStart = now;
        this.swipeHit = false;
      }
      // the moment of contact: launch the fish
      const st = now - this.swipeStart;
      if (!this.swipeHit && st > 180 && st < 260 && f.x > 6.5) {
        this.swipeHit = true;
        f.phase = "toss";
        f.vx = -(0.22 + Math.random() * 0.12);
        f.vy = -(0.5 + Math.random() * 0.18);
        f.spin = 0;
      }
    } else {                               // toss: gravity + tumble
      f.vy += 0.035;
      f.x += f.vx;
      f.y += f.vy;
      f.spin += 0.32;
      if (f.y >= FISH_BASE_ROW && f.vy > 0) {   // caught the air again
        f.phase = "swim";
        f.y = FISH_BASE_ROW;
        f.spin = 0;
        f.dir = f.x < 1.5 ? 1 : -1;
      }
      if (f.x < -4) { f.x = -3; f.phase = "swim"; f.spin = 0; f.dir = 1; }
    }
  }

  // ------------------------------------------------------- demo scripts ---
  _demoTick(now) {
    const t = now / 1000;
    const cyc = (n) => t % n;
    this.state = "idle";
    this._gazeAt(17 * this.px, (PAD + 9) * this.px);

    switch (this.demo) {
      case "skins": {
        const names = Object.keys(SKINS);
        this.skin = names[Math.floor(t / 1.6) % names.length];
        break;
      }
      case "eyes": {
        const a = t * 1.4;
        this._gazeAt((17 + Math.cos(a) * 22) * this.px, (PAD + 6 + Math.sin(a) * 14) * this.px);
        break;
      }
      case "hunt": {
        const ph = cyc(2.4);
        this._gazeAt(ph < 1.2 ? -40 : this.cv.width + 40, (PAD + 4) * this.px);
        if (ph > 1.1 && ph < 2.0) this.state = "alert";
        break;
      }
      case "pet":
        if (cyc(2.5) < 1.6) {
          this.state = "pet";
          if (Math.random() < 0.05)
            this._spawn("heart", (13 + Math.random() * 8) * this.px, (PAD + 2) * this.px);
        }
        break;
      case "knead":
        this.state = "knead";
        break;
      case "overheat":
        this.state = "overheat";
        if (Math.random() < 0.4)
          this._spawn("steam", (12 + Math.random() * 10) * this.px, (PAD - 0.5) * this.px);
        break;
      case "drag":
        this.stretch = 0.5 + Math.sin(t * 2.4) * 0.5;
        break;
      case "fish":
        if (!this.fish) this._spawnFish(now);
        this.fish.born = now;              // never expires in demo
        this._gazeAt(this.fish.x * this.px, (this.fish.y + PAD) * this.px);
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
        if (cyc(4) < 0.1 && !this.bubble) this.say("meow! laundry time!", 2.2);
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
        if (cyc(2.5) < 0.1 && !this.bubble) this.say("meow!", 1);
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

    // breathing: a slow, subtle vertical swell
    const breathe = 1 + Math.sin(now / 1100) * 0.011;
    const shiver = this.state === "overheat" ? ((Math.floor(now / 60) % 2) ? 1 : -1) : 0;
    const sy = breathe + this.stretch * 0.26 + this.tall * 0.33;
    const bottom = (PAD + ROWS) * px;
    const yof = (r) => bottom - (ROWS - r) * px * sy;
    const xof = (c) => c * px + shiver + this.slideX;
    const ph = px * sy + 0.6;

    this._drawTail(now, pal, xof, yof);      // behind the body

    let knead = null;
    if (this.state === "knead") knead = (Math.floor(now / 170) % 2) ? [14, 15] : [18, 19];

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
        if (r >= ROWS - 6 && knead && knead.includes(c)) y -= px * 0.8;
        cx.fillStyle = color;
        cx.fillRect(xof(c), y, px, ph);
      }
    }

    if (pal.collar) this._drawCollar(pal, xof, yof);
    this._drawFace(now, pal, xof, yof);
    if (this.fish) this._drawFish(now);
    this._drawSwipe(now, pal, xof, yof);
    this._drawParticles();
    this._drawTexts();
  }

  _drawTail(now, pal, xof, yof) {
    // a segmented tail that sweeps out and curls up, always swaying;
    // slow and low when asleep, lifted when alert
    const { cx, px } = this;
    const asleep = this.state === "sleep";
    const sway = Math.sin(now / (asleep ? 1800 : 750)) * (asleep ? 0.1 : 0.28);
    const lift = this.state === "alert" ? 0.35 : 0;
    let x = xof(TAIL_ROOT[0]), y = yof(TAIL_ROOT[1]);
    let ang = 0.18 + sway * 0.5 + lift;
    const segs = 9, w = px * 1.7;
    for (let i = 0; i < segs; i++) {
      ang += 0.16 + sway * 0.14 + lift * 0.04;        // curl
      x += Math.cos(ang) * px * 1.05;
      y -= Math.sin(ang) * px * 1.05;
      cx.fillStyle = pal["#"];
      cx.fillRect(x - w / 2 - 1, y - w / 2 - 1, w + 2, w + 2);
      cx.fillStyle = pal.G;
      cx.fillRect(x - w / 2, y - w / 2, w, w);
    }
  }

  _drawCollar(pal, xof, yof) {
    const { cx, px } = this;
    cx.fillStyle = "#c8433e";
    cx.fillRect(xof(11.6), yof(14.2), px * 10.8, px * 1.1);
    cx.fillStyle = "#e8b93c";
    cx.fillRect(xof(16.4), yof(15.1), px * 1.6, px * 1.6);
    cx.fillStyle = pal["#"];
    cx.fillRect(xof(16.9), yof(15.7), px * 0.6, px * 0.6);
  }

  _drawFace(now, pal, xof, yof) {
    const { cx, px } = this;
    const closed = now < this.blinkUntil || this.state === "sleep" || this.state === "pet";
    const dark = this.skin === "void" ? "#e8e4da" : pal["#"];
    // generous pupil travel so the tracking is unmissable
    const gx = this.gaze.x * px * 1.3, gy = this.gaze.y * px * 1.0;

    for (const [ec, er] of [EYE_L, EYE_R]) {
      const x = xof(ec), y = yof(er);
      cx.fillStyle = dark;
      if (closed) {
        if (this.state === "pet") {          // content ^ ^
          cx.fillRect(x, y + px * 1.4, px * 0.6, px * 0.6);
          cx.fillRect(x + px * 0.5, y + px * 0.9, px * 0.9, px * 0.6);
          cx.fillRect(x + px * 1.3, y + px * 1.4, px * 0.6, px * 0.6);
        } else {
          cx.fillRect(x, y + px * 1.3, px * 1.9, px * 0.55);
        }
        continue;
      }
      const wide = this.state === "alert";
      const w = wide ? px * 2.1 : px * 1.7, h = wide ? px * 3 : px * 2.5;
      cx.fillRect(x + gx, y + gy + px * 0.3, w, h - px * 0.6);
      cx.fillRect(x + gx + px * 0.25, y + gy, w - px * 0.5, h);
    }
    // nose + flat blank mouth
    cx.fillStyle = "#c98a80";
    cx.fillRect(xof(NOSE[0]), yof(NOSE[1]), px * 1.2, px * 0.8);
    cx.fillStyle = dark;
    if (this.state === "meow" || this.state === "overheat") {
      cx.fillRect(xof(16.3), yof(12.1), px * 1.6, px * 1.2);
    } else {
      cx.fillRect(xof(16.0), yof(12.2), px * 2.2, px * 0.4);
    }
    // whiskers
    cx.fillStyle = dark;
    cx.fillRect(xof(25.2), yof(9.6), px * 2.6, px * 0.35);
    cx.fillRect(xof(24.9), yof(11.4), px * 2.6, px * 0.35);
    cx.fillRect(xof(6.2), yof(9.6), px * 2.6, px * 0.35);
    cx.fillRect(xof(6.5), yof(11.4), px * 2.6, px * 0.35);
  }

  _drawFish(now) {
    const { cx, px } = this;
    const f = this.fish;
    const fx = f.x * px, fy = (f.y + PAD) * px;
    const flip = (f.phase === "swim" ? f.dir : (f.vx < 0 ? -1 : 1));
    cx.save();
    cx.translate(fx, fy);
    if (f.phase === "toss") cx.rotate(f.spin);
    cx.scale(flip, 1);
    cx.fillStyle = FISH_BLUE;
    cx.fillRect(-2.0 * px, -1.3 * px, 3.4 * px, 2.6 * px);
    cx.fillRect(-2.6 * px, -0.7 * px, 4.6 * px, 1.4 * px);
    cx.fillRect(1.6 * px, -1.6 * px, 1.3 * px, 1.2 * px);
    cx.fillRect(1.6 * px, 0.4 * px, 1.3 * px, 1.2 * px);
    cx.fillStyle = FISH_DARK;
    cx.fillRect(-1.5 * px, -0.6 * px, 0.7 * px, 0.7 * px);
    cx.fillRect(-0.2 * px, -1.0 * px, 0.5 * px, 2.0 * px);
    cx.restore();
  }

  _drawSwipe(now, pal, xof, yof) {
    // front-left leg reaches toward the fish, then returns
    const st = now - this.swipeStart;
    if (!this.fish || st < 0 || st > 480) return;
    const { cx, px } = this;
    const t = Math.sin((st / 480) * Math.PI);         // 0->1->0, eased
    const sxp = xof(SHOULDER[0]), syp = yof(SHOULDER[1]);
    const fx = this.fish.x * px, fy = (this.fish.y + PAD) * px;
    const ang = Math.atan2(fy - syp, fx - sxp);
    const len = t * px * 6.5;
    const ex = sxp + Math.cos(ang) * len, ey = syp + Math.sin(ang) * len;
    cx.strokeStyle = pal["#"];
    cx.lineWidth = px * 2.1;
    cx.beginPath(); cx.moveTo(sxp, syp); cx.lineTo(ex, ey); cx.stroke();
    cx.strokeStyle = pal.B;
    cx.lineWidth = px * 1.5;
    cx.beginPath(); cx.moveTo(sxp, syp); cx.lineTo(ex, ey); cx.stroke();
    cx.fillStyle = pal.B;                              // paw
    cx.fillRect(ex - px, ey - px, px * 2, px * 2);
    cx.strokeStyle = pal["#"];
    cx.lineWidth = 1.5;
    cx.strokeRect(ex - px, ey - px, px * 2, px * 2);
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

window.PixelCat = PixelCat;
window.CAT_SKINS = SKINS;
