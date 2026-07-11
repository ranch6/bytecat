/* BYTECAT — pixel cat engine (browser)
   One class drives both the interactive hero cat and the looping
   feature demos (pass { demo: "knead" } etc. to script it). */

// legend: . none | # outline | B base | G patch | S spot | P inner ear | R blush
const SPRITE = [
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
];
const COLS = 34, ROWS = 30;
const PAD = 8;                       // rows of headroom above the cat

// anatomy anchors, in cell units
const EYE_L = [12.9, 7.8], EYE_R = [19.9, 7.8];
const NOSE = [16.4, 11.0];
const HEAD = { c0: 8, c1: 26, r0: 0, r1: 14 };
const SHOULDER = [12.4, 20.0];       // left shoulder, for fish swipes
const FISH_BASE_ROW = 21.0;          // fish hover height while swimming
const SWIPE_MS = 620;                // full swipe: windup, strike, retract

const SKINS = {
  ink:     { B: "#fdfcf8", G: "#dcd8cc", S: "#fdfcf8", "#": "#141312", label: "ink" },
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
    this.crosshair = !!opts.crosshair;   // dashed index lines tracking the pointer

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
    this.tailUp = 0;                      // 0 = wrapped on ground, 1 = raised
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
    this.swipeStart = -9999;
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
    if (this.paused) {                     // offscreen: idle cheaply
      requestAnimationFrame((t) => this._loop(t));
      return;
    }
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
    // tail rises when engaged, settles when calm
    const engaged = this.fish || ["alert", "overheat", "stretch"].includes(this.state);
    this.tailUp += ((engaged ? 1 : 0) - this.tailUp) * 0.07;
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
      this._spawn("steam", (11 + Math.random() * 11) * this.px, (PAD - 0.5) * this.px);

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
      f.x += f.dir * 0.06;
      f.y = FISH_BASE_ROW + Math.sin(now / 420) * 1.0;
      if (f.x > 9.8) f.dir = -1;
      if (f.x < 0.6 && f.dir === -1) f.dir = 1;
      // fish drifts into paw range -> begin the swipe (windup first)
      if (f.x > 7.4 && f.dir === 1 && now - this.swipeStart > 2600) {
        this.swipeStart = now;
        this.swipeHit = false;
      }
      // contact happens at the strike apex, mid-swipe
      const st = now - this.swipeStart;
      if (!this.swipeHit && st > SWIPE_MS * 0.42 && st < SWIPE_MS * 0.56 && f.x > 5.8) {
        this.swipeHit = true;
        f.phase = "toss";
        f.vx = -(0.2 + Math.random() * 0.1);
        f.vy = -(0.48 + Math.random() * 0.16);
        f.spin = 0;
      }
    } else {                               // toss: gravity + tumble
      f.vy += 0.035;
      f.x += f.vx;
      f.y += f.vy;
      f.spin += 0.3;
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
            this._spawn("heart", (12 + Math.random() * 9) * this.px, (PAD + 2) * this.px);
        }
        break;
      case "knead":
        this.state = "knead";
        break;
      case "overheat":
        this.state = "overheat";
        if (Math.random() < 0.4)
          this._spawn("steam", (11 + Math.random() * 11) * this.px, (PAD - 0.5) * this.px);
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

    if (this.crosshair) this._drawCrosshair();

    // breathing: a slow, subtle vertical swell
    const breathe = 1 + Math.sin(now / 1100) * 0.011;
    const shiver = this.state === "overheat" ? ((Math.floor(now / 60) % 2) ? 1 : -1) : 0;
    const sy = breathe + this.stretch * 0.24 + this.tall * 0.3;
    const bottom = (PAD + ROWS) * px;
    const yof = (r) => bottom - (ROWS - r) * px * sy;
    const xof = (c) => c * px + shiver + this.slideX;
    const ph = px * sy + 0.6;

    if (this.tailUp >= 0.5) this._drawTail(now, pal, xof, yof);   // raised: behind

    let knead = null;
    if (this.state === "knead") knead = (Math.floor(now / 170) % 2) ? [13, 15] : [17, 19];

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
        if (r >= 20 && knead && c >= knead[0] && c <= knead[1]) y -= px * 0.8;
        cx.fillStyle = color;
        cx.fillRect(xof(c), y, px, ph);
      }
    }

    if (pal.collar) this._drawCollar(pal, xof, yof);
    this._drawFace(now, pal, xof, yof);
    if (this.tailUp < 0.5) this._drawTail(now, pal, xof, yof);    // wrapped: in front
    if (this.fish) this._drawFish(now);
    this._drawSwipe(now, pal, xof, yof);
    this._drawParticles();
    this._drawTexts();
  }

  _drawCrosshair() {
    // dashed index lines through the tracked point (fish beats pointer)
    const { cx } = this;
    let tx = this.mouse.x, ty = this.mouse.y;
    if (this.fish) { tx = this.fish.x * this.px; ty = (this.fish.y + PAD) * this.px; }
    if (tx < -50 || tx > this.cv.width + 50 || ty < -50 || ty > this.cv.height + 50) return;
    tx = Math.max(0, Math.min(this.cv.width, tx));
    ty = Math.max(0, Math.min(this.cv.height, ty));
    cx.save();
    cx.strokeStyle = "#9a968a";
    cx.lineWidth = 1;
    cx.setLineDash([4, 4]);
    cx.beginPath(); cx.moveTo(tx, 0); cx.lineTo(tx, this.cv.height); cx.stroke();
    cx.beginPath(); cx.moveTo(0, ty); cx.lineTo(this.cv.width, ty); cx.stroke();
    cx.restore();
  }

  _drawTail(now, pal, xof, yof) {
    // two natural poses, blended: wrapped along the ground when calm,
    // raised and flicking when engaged. The wave travels toward the tip.
    const { cx, px } = this;
    const m = this.tailUp;
    const asleep = this.state === "sleep";
    const excited = !!this.fish;
    const speed = asleep ? 2600 : excited ? 260 : 900;
    const amp = asleep ? 0.05 : excited ? 0.16 : 0.08;

    // pose parameters, lerped by m
    const rootC = 25.4 - m * 1.6, rootR = 27.9 - m * 3.6;
    let ang = (-3.05) * (1 - m) + 0.5 * m;
    const dAng = (-0.04) * (1 - m) + 0.15 * m;

    let x = xof(rootC), y = yof(rootR);
    const w = px * 1.6, segs = 10;
    for (let i = 0; i < segs; i++) {
      const wave = Math.sin(now / speed - i * 0.55) * amp * (i / segs + 0.3);
      ang += dAng + wave;
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
    cx.fillRect(xof(12.6), yof(14.8), px * 9.0, px * 1.1);
    cx.fillStyle = "#e8b93c";
    cx.fillRect(xof(16.3), yof(15.7), px * 1.6, px * 1.6);
    cx.fillStyle = pal["#"];
    cx.fillRect(xof(16.8), yof(16.3), px * 0.6, px * 0.6);
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
      cx.fillRect(xof(16.2), yof(12.2), px * 1.6, px * 1.2);
    } else {
      cx.fillRect(xof(16.0), yof(12.4), px * 2.2, px * 0.4);
    }
    // whiskers
    cx.fillStyle = dark;
    cx.fillRect(xof(25.4), yof(9.8), px * 2.6, px * 0.35);
    cx.fillRect(xof(25.1), yof(11.6), px * 2.6, px * 0.35);
    cx.fillRect(xof(6.0), yof(9.8), px * 2.6, px * 0.35);
    cx.fillRect(xof(6.3), yof(11.6), px * 2.6, px * 0.35);
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
    // realistic three-phase paw swipe: wind up, strike fast, retract slow.
    // the leg bends at an elbow that straightens as the paw extends.
    const st = now - this.swipeStart;
    if (!this.fish || st < 0 || st > SWIPE_MS) return;
    const { cx, px } = this;
    const t = st / SWIPE_MS;
    let reach;
    if (t < 0.22) reach = -1.1 * (t / 0.22);                       // wind up (pull back)
    else if (t < 0.5) {
      const k = (t - 0.22) / 0.28;
      reach = -1.1 + (7.2 + 1.1) * (1 - (1 - k) * (1 - k));        // strike, ease-out
    } else {
      const k = (t - 0.5) / 0.5;
      reach = 7.2 * (1 - k * k * (3 - 2 * k));                     // retract, smooth
    }
    const sxp = xof(SHOULDER[0]), syp = yof(SHOULDER[1]);
    const fx = this.fish.x * px, fy = (this.fish.y + PAD) * px;
    const ang = Math.atan2(fy - syp, fx - sxp);
    const ex = sxp + Math.cos(ang) * reach * px;
    const ey = syp + Math.sin(ang) * reach * px;
    // elbow bows outward when the leg is bent, straightens at full reach
    const bend = Math.max(0, 1 - Math.abs(reach) / 7.2) * 1.6 * px;
    const mx = (sxp + ex) / 2 - Math.sin(ang) * bend;
    const my = (syp + ey) / 2 + Math.cos(ang) * bend;
    const seg = (x1, y1, x2, y2, wOut, wIn) => {
      cx.strokeStyle = pal["#"]; cx.lineWidth = wOut;
      cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke();
      cx.strokeStyle = pal.B; cx.lineWidth = wIn;
      cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke();
    };
    seg(sxp, syp, mx, my, px * 2.2, px * 1.6);   // upper leg
    seg(mx, my, ex, ey, px * 2.0, px * 1.4);     // forearm
    cx.fillStyle = pal.B;                         // paw
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
