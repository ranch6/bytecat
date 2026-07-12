/* BYTECAT — pixel cat engine (browser)
   One class drives both the interactive hero cat and the looping
   feature demos (pass { demo: "knead" } etc. to script it).

   Bodies: sitting (standard / fat / short-legged) plus a standing pose used
   for fish play — the cat rears up and bats the fish with two live arms,
   modeled on a frame-by-frame reference. */

// legend: . none | # outline | B base | G patch | S spot | P inner ear | R blush
const SPRITES = {
  sit_std: [
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
  sit_fat: [
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
  sit_short: [
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
  stand: [
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
};
const COLS = 34, MAX_ROWS = 30;
const PAD = 8;                       // rows of headroom above the cat

// anatomy anchors, in cell units (head is identical across bodies)
const EYE_L = [12.9, 7.8], EYE_R = [19.9, 7.8];
const NOSE = [16.4, 11.0];
const HEAD = { c0: 8, c1: 26, r0: 0, r1: 14 };
const ARM_L = [13.6, 16.6], ARM_R = [20.4, 16.6];   // standing shoulders
const FISH_PLAY_ROW = 17.0;          // fish hover height during play (chest)

const SKINS = {
  ink:      { B: "#fdfcf8", G: "#dcd8cc", S: "#fdfcf8", "#": "#141312" },
  patch:    { B: "#f6f1e5", G: "#8d8a86", S: "#f6f1e5", "#": "#4a4440" },
  tabby:    { B: "#f4efe2", G: "#a89f92", S: "#a89f92", "#": "#4a4440", stripes: "#6e6558" },
  orange:   { B: "#f6ead2", G: "#e0a45c", S: "#e0a45c", "#": "#4a4034" },
  chonk:    { B: "#f6e7cd", G: "#e0a45c", S: "#e0a45c", "#": "#4a4034", stripes: "#c47f3a", body: "sit_fat" },
  calico:   { B: "#f7f2e8", G: "#e0a45c", S: "#57504e", "#": "#4a4440" },
  siamese:  { B: "#efe4cd", G: "#6b5646", S: "#efe4cd", "#": "#453a30" },
  cloud:    { B: "#fbfaf5", G: "#f1eee6", S: "#fbfaf5", "#": "#4a4440", fluffy: true },
  void:     { B: "#3b3740", G: "#322e38", S: "#322e38", "#": "#221f28" },
  white:    { B: "#f9f6ee", G: "#efe9db", S: "#f9f6ee", "#": "#4a4440" },
  munchkin: { B: "#f6e9d0", G: "#e8a95e", S: "#e8a95e", "#": "#4a4034", stripes: "#c8823c", body: "sit_short" },
  lucky:    { B: "#f9f6ee", G: "#e0a45c", S: "#57504e", "#": "#4a4440", collar: true },
};
const PINK = "#e9a0ab", BLUSH = "#f2b8bc";
const FISH_BLUE = "#7d9fc7", FISH_DARK = "#4a6b96", DROP_BLUE = "#a8c4e0";

class PixelCat {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.cx = canvas.getContext("2d");
    this.px = opts.px || 6;
    canvas.width = COLS * this.px;
    canvas.height = (MAX_ROWS + PAD) * this.px;
    this.skin = opts.skin || "patch";
    this.demo = opts.demo || null;
    this.crosshair = !!opts.crosshair;

    this.state = "idle";   // idle|pet|knead|alert|drag|sleep|overheat|stretch|meow
    this.stateUntil = 0;
    this.blinkUntil = 0;
    this.nextBlink = performance.now() + 2500;
    this.lastActive = performance.now();
    this.mouse = { x: -999, y: -999, speed: 0 };
    this.gaze = { x: 0, y: 0 };
    this.gazeTarget = { x: 0, y: 0 };
    this.stretch = 0;
    this.tall = 0;
    this.tailUp = 0;
    this.dragging = false;
    this.petHeat = 0;
    this.keyTimes = [];
    this.particles = [];
    this.bubble = null;
    this.pinned = null;
    this.timerText = null;
    this.slideX = 0;

    // fish toy + standing play pose
    this.fish = null;                 // {x,y cells, vx,vy, dir, phase, spin, born, visitMs}
    this.fishCooldownUntil = 0;
    this.pose = 0;                    // 0 = sitting … 1 = standing (eased)
    this.batCooldownUntil = 0;
    this.paws = {                     // live arm endpoints (px coords)
      L: { x: 0, y: 0 }, R: { x: 0, y: 0 },
    };

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
    this.particles.push({
      kind, x, y, life: 1,
      vy: kind === "drop" ? 0.6 + Math.random() * 0.5 : -0.5 - Math.random() * 0.3,
      vx: kind === "drop" ? (Math.random() - 0.5) * 1.4 : 0,
    });
  }

  // -------------------------------------------------------------- loop ----
  _loop(now) {
    if (this.paused) {
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
    this.gaze.x += (this.gazeTarget.x - this.gaze.x) * 0.14;
    this.gaze.y += (this.gazeTarget.y - this.gaze.y) * 0.14;
    const engaged = this.fish || ["alert", "overheat", "stretch"].includes(this.state);
    this.tailUp += ((engaged ? 1 : 0) - this.tailUp) * 0.07;
    this.pose += ((this.fish ? 1 : 0) - this.pose) * 0.12;   // sit <-> stand
    if (this.bubble && now > this.bubble.until) this.bubble = null;

    this._draw(now);
    requestAnimationFrame((t) => this._loop(t));
  }

  _liveTick(now) {
    if (!["drag", "sleep", "idle"].includes(this.state) && now > this.stateUntil) this.state = "idle";
    const idleFor = now - this.lastActive;

    // bored -> long fish session; and sometimes the fish just pops in
    // right next to the cat, unannounced
    if (!this.fish && this.state === "idle" && now > this.fishCooldownUntil) {
      if (idleFor > 15000 && idleFor < 70000) this._spawnFish(now, 18000);
      else if (idleFor > 4000 && Math.random() < 0.0002) this._spawnFish(now, 9000, true);
    }
    if (this.fish && now - this.fish.born > this.fish.visitMs && this.fish.phase === "swim") {
      this.fish = null;
      this.fishCooldownUntil = now + 25000;
    }
    if (this.state === "idle" && !this.fish && idleFor > 80000) this.state = "sleep";
    if (this.state === "sleep" && Math.random() < 0.02)
      this._spawn("zzz", 26 * this.px, (PAD - 1) * this.px);
    if (this.state === "overheat" && Math.random() < 0.4)
      this._spawn("steam", (11 + Math.random() * 11) * this.px, (PAD - 0.5) * this.px);

    if (this.fish) this._gazeAt(this.fish.x * this.px, (this.fish.y + PAD) * this.px);
    else this._gazeAt(this.mouse.x, this.mouse.y);
  }

  _gazeAt(x, y) {
    const cx = 17 * this.px, cy = (PAD + 9) * this.px;
    this.gazeTarget.x = Math.max(-1, Math.min(1, (x - cx) / (26 * this.px)));
    this.gazeTarget.y = Math.max(-0.8, Math.min(1, (y - cy) / (22 * this.px)));
  }

  // ------------------------------------------------------------- fish -----
  _spawnFish(now, visitMs, beside) {
    // beside: materialize right next to the cat instead of swimming in
    const x = beside
      ? (Math.random() < 0.5 ? 5 + Math.random() * 3 : 26 + Math.random() * 3)
      : -3;
    this.fish = { x, y: FISH_PLAY_ROW, vx: 0, vy: 0, dir: x > 17 ? -1 : 1,
                  phase: "swim", spin: 0, born: now, visitMs: visitMs || 18000 };
    // paws start at the shoulders
    this.paws.L = { x: ARM_L[0] * this.px, y: (ARM_L[1] + PAD) * this.px };
    this.paws.R = { x: ARM_R[0] * this.px, y: (ARM_R[1] + PAD) * this.px };
  }

  _fishTick(now) {
    const f = this.fish;
    const px = this.px;
    if (f.phase === "swim") {
      f.x += f.dir * 0.07;
      f.y = FISH_PLAY_ROW + Math.sin(now / 420) * 1.2;
      if (f.x > 31) f.dir = -1;
      if (f.x < 2 && f.dir === -1) f.dir = 1;
    } else {                               // toss: gravity + tumble
      f.vy += 0.035;
      f.x += f.vx;
      f.y += f.vy;
      f.spin += 0.3;
      if (f.y >= FISH_PLAY_ROW && f.vy > 0) {
        f.phase = "swim";
        f.y = FISH_PLAY_ROW;
        f.spin = 0;
        f.dir = f.x > 17 ? -1 : 1;
      }
      if (f.x < -4) { f.x = -3; f.phase = "swim"; f.spin = 0; f.dir = 1; }
      if (f.x > 37) { f.x = 36; f.phase = "swim"; f.spin = 0; f.dir = -1; }
    }

    // arms: paw targets track the fish (near arm reaches, far arm supports)
    const fpx = f.x * px, fpy = (f.y + PAD) * px;
    const leftNear = f.x < 17;
    const near = leftNear ? "L" : "R", far = leftNear ? "R" : "L";
    const nearSh = leftNear ? ARM_L : ARM_R, farSh = leftNear ? ARM_R : ARM_L;
    let nearT, farT;
    if (f.phase === "toss" || f.y < 11) {          // fish overhead: reach up!
      nearT = { x: fpx, y: fpy + px };
      farT = { x: (farSh[0] + (leftNear ? -0.6 : 0.6)) * px, y: (farSh[1] + PAD + 3) * px };
    } else {                                        // chest height: bat / hug
      nearT = { x: fpx + (leftNear ? 1.6 : -1.6) * px, y: fpy + 0.4 * px };
      farT = { x: fpx + (leftNear ? 3.6 : -3.6) * px, y: fpy + 2.4 * px };
    }
    const clampReach = (sh, t) => {
      const sx = sh[0] * px, sy = (sh[1] + PAD) * px, max = 9.5 * px;
      const d = Math.hypot(t.x - sx, t.y - sy);
      if (d <= max) return t;
      return { x: sx + (t.x - sx) / d * max, y: sy + (t.y - sy) / d * max };
    };
    nearT = clampReach(nearSh, nearT);
    farT = clampReach(farSh, farT);
    this.paws[near].x += (nearT.x - this.paws[near].x) * 0.22;
    this.paws[near].y += (nearT.y - this.paws[near].y) * 0.22;
    this.paws[far].x += (farT.x - this.paws[far].x) * 0.16;
    this.paws[far].y += (farT.y - this.paws[far].y) * 0.16;

    // contact: the paw actually batting the fish launches it (with a splash)
    const pawNear = this.paws[near];
    if (f.phase === "swim" && now > this.batCooldownUntil &&
        Math.hypot(pawNear.x - fpx, pawNear.y - fpy) < 1.6 * px) {
      f.phase = "toss";
      f.vx = (f.x > 17 ? 1 : -1) * (0.12 + Math.random() * 0.1);
      f.vy = -(0.5 + Math.random() * 0.15);
      f.spin = 0;
      this.batCooldownUntil = now + 1400;
      for (let i = 0; i < 3; i++) this._spawn("drop", fpx, fpy);
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
        if (!this.fish) this._spawnFish(now, 1e9);
        this._gazeAt(this.fish.x * this.px, (this.fish.y + PAD) * this.px);
        break;
      case "stretch":
        this.tall = cyc(3) < 1.8 ? Math.min(1, this.tall + 0.06) : Math.max(0, this.tall - 0.06);
        if (cyc(3) < 0.1 && !this.bubble) this.say("stretch with me!", 1.6);
        break;
      case "pomodoro": {
        const left = 1500 - Math.floor(t * 60) % 1500;
        this.timerText = { label: `FOCUS ${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`, color: "#c8433e" };
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
  _grid() {
    if (this.pose >= 0.5) return SPRITES.stand;
    return SPRITES[SKINS[this.skin].body || "sit_std"];
  }

  _draw(now) {
    const { cx, px } = this;
    const pal = SKINS[this.skin];
    const grid = this._grid();
    const rows = grid.length;
    const standing = this.pose >= 0.5;
    cx.clearRect(0, 0, this.cv.width, this.cv.height);
    cx.imageSmoothingEnabled = false;

    if (this.crosshair) this._drawCrosshair();

    const breathe = 1 + Math.sin(now / 1100) * 0.011;
    const shiver = this.state === "overheat" ? ((Math.floor(now / 60) % 2) ? 1 : -1) : 0;
    // little hop during the sit<->stand transition
    const hop = Math.sin(Math.min(1, Math.abs(this.pose - 0.5) * 2) * Math.PI) * -3;
    const sy = breathe + this.stretch * 0.24 + this.tall * 0.3;
    const bottom = (PAD + MAX_ROWS) * px + hop;
    const yof = (r) => bottom - (rows - r) * px * sy;
    const xof = (c) => c * px + shiver + this.slideX;
    const ph = px * sy + 0.6;

    // raised tail behind the body (always raised when standing)
    if (standing || this.tailUp >= 0.5) this._drawTail(now, pal, xof, yof, rows, standing);

    let knead = null;
    if (this.state === "knead" && !standing)
      knead = (Math.floor(now / 170) % 2) ? [13, 15] : [17, 19];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = grid[r][c];
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

    // tabby stripes: forehead + flanks
    if (pal.stripes) {
      cx.fillStyle = pal.stripes;
      for (const c of [15, 17, 19])
        for (const r of [4, 5])
          if ("BG".includes(grid[r][c])) cx.fillRect(xof(c), yof(r), px, ph);
      for (const r of [21, 23, 25]) {
        if (r >= rows) continue;
        for (let c = 0; c < COLS; c++)
          if ("BGS".includes(grid[r][c]) && (c <= 12 || c >= 21))
            cx.fillRect(xof(c), yof(r), px, ph);
      }
    }

    if (pal.collar && !standing) this._drawCollar(pal, xof, yof);
    this._drawFace(now, pal, xof, yof, standing);
    if (!standing && this.tailUp < 0.5) this._drawTail(now, pal, xof, yof, rows, false);
    if (standing && this.fish) this._drawArms(pal);
    if (this.fish) this._drawFish(now);
    this._drawParticles();
    this._drawTexts();
  }

  _drawCrosshair() {
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

  _drawTail(now, pal, xof, yof, rows, standing) {
    const { cx, px } = this;
    const m = standing ? 1 : this.tailUp;
    const asleep = this.state === "sleep";
    const excited = !!this.fish;
    const speed = asleep ? 2600 : excited ? 260 : 900;
    const amp = asleep ? 0.05 : excited ? 0.16 : 0.08;

    const rootC = (standing ? 21.5 : 25.4 - m * 1.6);
    const rootR = rows - (standing ? 4.5 : 2.1 + m * 3.6);
    let ang = standing ? 0.55 : (-3.05) * (1 - m) + 0.5 * m;
    const dAng = standing ? 0.15 : (-0.04) * (1 - m) + 0.15 * m;

    let x = xof(rootC), y = yof(rootR);
    const w = px * (pal.fluffy ? 2.2 : 1.6), segs = 10;
    for (let i = 0; i < segs; i++) {
      const wave = Math.sin(now / speed - i * 0.55) * amp * (i / segs + 0.3);
      ang += dAng + wave;
      x += Math.cos(ang) * px * 1.05;
      y -= Math.sin(ang) * px * 1.05;
      cx.fillStyle = pal["#"];
      cx.fillRect(x - w / 2 - 1, y - w / 2 - 1, w + 2, w + 2);
      cx.fillStyle = (pal.stripes && i % 3 === 2) ? pal.stripes : pal.G;
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

  _drawFace(now, pal, xof, yof, standing) {
    const { cx, px } = this;
    const closed = now < this.blinkUntil || this.state === "sleep" || this.state === "pet";
    const dark = this.skin === "void" ? "#e8e4da" : pal["#"];
    const gx = this.gaze.x * px * 1.3, gy = this.gaze.y * px * 1.0;

    for (const [ec, er] of [EYE_L, EYE_R]) {
      const x = xof(ec), y = yof(er);
      cx.fillStyle = dark;
      if (closed) {
        if (this.state === "pet") {
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
    cx.fillStyle = "#c98a80";
    cx.fillRect(xof(NOSE[0]), yof(NOSE[1]), px * 1.2, px * 0.8);
    cx.fillStyle = dark;
    const happyOpen = standing && Math.floor(now / 2600) % 3 === 0;
    if (this.state === "meow" || this.state === "overheat" || happyOpen) {
      cx.fillRect(xof(16.2), yof(12.2), px * 1.6, px * 1.2);
    } else {
      cx.fillRect(xof(16.0), yof(12.4), px * 2.2, px * 0.4);
    }
    cx.fillStyle = dark;
    cx.fillRect(xof(25.4), yof(9.8), px * 2.6, px * 0.35);
    cx.fillRect(xof(25.1), yof(11.4), px * 2.6, px * 0.35);
    cx.fillRect(xof(6.0), yof(9.8), px * 2.6, px * 0.35);
    cx.fillRect(xof(6.3), yof(11.4), px * 2.6, px * 0.35);
  }

  _drawArms(pal) {
    // two live arms: shoulder -> elbow -> paw, chasing this.paws targets
    const { cx, px } = this;
    const seg = (x1, y1, x2, y2, wOut, wIn) => {
      cx.strokeStyle = pal["#"]; cx.lineWidth = wOut; cx.lineCap = "round";
      cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke();
      cx.strokeStyle = pal.B; cx.lineWidth = wIn;
      cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke();
    };
    for (const [side, sh] of [["L", ARM_L], ["R", ARM_R]]) {
      const sxp = sh[0] * px + this.slideX, syp = (sh[1] + PAD) * px;
      const p = this.paws[side];
      const ang = Math.atan2(p.y - syp, p.x - sxp);
      const d = Math.hypot(p.x - sxp, p.y - syp);
      const bend = Math.max(0, 1 - d / (9.5 * px)) * 1.5 * px * (side === "L" ? 1 : -1);
      const mx = (sxp + p.x) / 2 - Math.sin(ang) * bend;
      const my = (syp + p.y) / 2 + Math.cos(ang) * bend;
      seg(sxp, syp, mx, my, px * 2.2, px * 1.55);
      seg(mx, my, p.x, p.y, px * 2.0, px * 1.35);
      cx.fillStyle = pal.B;
      cx.fillRect(p.x - px * 0.9, p.y - px * 0.9, px * 1.8, px * 1.8);
      cx.strokeStyle = pal["#"]; cx.lineWidth = 1.5;
      cx.strokeRect(p.x - px * 0.9, p.y - px * 0.9, px * 1.8, px * 1.8);
    }
  }

  _drawFish(now) {
    const { cx, px } = this;
    const f = this.fish;
    const fx = f.x * px + this.slideX, fy = (f.y + PAD) * px;
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

  _drawParticles() {
    const { cx, px } = this;
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      if (p.kind === "drop") { p.vy += 0.08; p.x += p.vx; }
      p.y += p.vy;
      p.life -= p.kind === "drop" ? 0.03 : 0.012;
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
      } else if (p.kind === "drop") {
        cx.fillStyle = DROP_BLUE;
        cx.fillRect(p.x, p.y, px * 0.6, px * 0.8);
      } else if (p.kind === "zzz") {
        cx.fillStyle = "#8d8a86";
        cx.font = `${px * 2.2}px "IBM Plex Mono", monospace`;
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
      cx.font = `${px * 1.8}px "IBM Plex Mono", monospace`;
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
      cx.font = `bold ${px * 2}px "IBM Plex Mono", monospace`;
      cx.fillStyle = this.timerText.color;
      cx.fillText(this.timerText.label, this.cv.width / 2, y + px);
      y += px * 3;
    }
    if (this.bubble) {
      cx.font = `${px * 1.8}px "IBM Plex Mono", monospace`;
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
