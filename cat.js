/* BYTECAT — pixel cat engine (browser) */

// Sprite legend: . transparent | # outline | B body | W chest | P pink | S stripe slot
const SPRITE = [
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
];
const COLS = 20, ROWS = 17;

// Eye sockets (row, col of top-left of each 2x2 eye)
const EYES = [ [5, 3], [5, 11] ];
const NOSE = [7, 7.5];          // drawn as a small pink T
const HEAD_BOX = { r0: 0, r1: 9, c0: 0, c1: 15 }; // pettable zone
const PAWS = [ [16, 2], [16, 6], [16, 10], [16, 13] ]; // knead columns

const PALETTES = {
  orange: { B: "#e8963c", S: "#b4641e", W: "#f7e3c3", "#": "#1c1210", P: "#e87c9a", eye: "#7ec24a" },
  gray:   { B: "#8b8f98", S: "#5b5f68", W: "#e8e8ea", "#": "#17181c", P: "#e87c9a", eye: "#e8b93c" },
  black:  { B: "#2e2b33", S: "#211f26", W: "#c9c4bd", "#": "#0c0b0e", P: "#e87c9a", eye: "#e8b93c" },
  white:  { B: "#f2ede2", S: "#d8d0be", W: "#ffffff", "#": "#2a2620", P: "#e87c9a", eye: "#4a9ec2" },
  calico: { B: "#f2ede2", S: "#e8963c", W: "#ffffff", "#": "#2a2620", P: "#e87c9a", eye: "#7ec24a", extra: "#4a4149" },
};

class PixelCat {
  constructor(canvas, opts = {}) {
    this.cv = canvas;
    this.cx = canvas.getContext("2d");
    this.px = opts.px || Math.floor(canvas.width / COLS);
    this.pattern = opts.pattern || "orange";
    this.mouse = { x: -999, y: -999, vx: 0, vy: 0, speed: 0 };
    this.state = "idle";           // idle | pet | knead | alert | drag | sleep | overheat
    this.stateUntil = 0;
    this.blinkUntil = 0;
    this.nextBlink = performance.now() + 2500;
    this.lastActive = performance.now();
    this.kneadPhase = 0;
    this.stretch = 0;              // 0..1 mochi stretch while dragged
    this.dragging = false;
    this.particles = [];           // {x,y,vy,life,kind}
    this.keyTimes = [];
    this.petHeat = 0;
    this.scrollHeat = 0;
    this.unrollLen = 0;
    this._bindEvents(opts);
    requestAnimationFrame((t) => this._loop(t));
  }

  setPattern(name) { if (PALETTES[name]) this.pattern = name; }

  _bindEvents(opts) {
    const rectOf = () => this.cv.getBoundingClientRect();
    window.addEventListener("mousemove", (e) => {
      const r = rectOf();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const now = performance.now();
      const dt = Math.max(1, now - (this._lastMoveT || now));
      this.mouse.speed = Math.hypot(x - this.mouse.x, y - this.mouse.y) / dt * 16;
      this._lastMoveT = now;
      this.mouse.x = x; this.mouse.y = y;
      this.lastActive = now;

      if (this.dragging) return;
      // fast cursor near the cat -> alert (hunt mode)
      const near = x > -80 && x < this.cv.width + 80 && y > -80 && y < this.cv.height + 80;
      if (near && this.mouse.speed > 28 && this.state !== "knead") {
        this.state = "alert"; this.stateUntil = now + 900;
      }
      // petting: slow strokes over the head
      const overHead = x > HEAD_BOX.c0 * this.px && x < HEAD_BOX.c1 * this.px &&
                       y > HEAD_BOX.r0 * this.px && y < HEAD_BOX.r1 * this.px;
      if (overHead && this.mouse.speed < 14) {
        this.petHeat = Math.min(this.petHeat + this.mouse.speed * 0.4 + 0.3, 40);
        if (this.petHeat > 8) {
          this.state = "pet"; this.stateUntil = now + 700;
          if (Math.random() < 0.06) this._spawn("heart", x, y - 6);
        }
      }
    });
    window.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey) return;
      const now = performance.now();
      this.lastActive = now;
      this.keyTimes = this.keyTimes.filter((t) => now - t < 2000);
      this.keyTimes.push(now);
      this.kneadPhase++;
      if (this.keyTimes.length > 14) {           // typing frenzy -> overheat
        this.state = "overheat"; this.stateUntil = now + 1600;
        if (Math.random() < 0.5) this._spawn("steam", 8 * this.px, -2);
      } else if (this.state !== "overheat" || now > this.stateUntil) {
        this.state = "knead"; this.stateUntil = now + 650;
      }
    });
    this.cv.addEventListener("mousedown", (e) => {
      this.dragging = true; this.state = "drag";
      this.lastActive = performance.now();
      e.preventDefault();
    });
    window.addEventListener("mouseup", () => {
      if (this.dragging) { this.dragging = false; this.state = "idle"; }
    });
    window.addEventListener("wheel", () => {
      const now = performance.now();
      this.lastActive = now;
      this.scrollHeat = Math.min(this.scrollHeat + 3, 30);
      if (this.state === "idle" || this.state === "knead" || this.state === "alert") {
        this.state = "unroll"; this.stateUntil = now + 900;
      }
    }, { passive: true });
    this.cv.style.cursor = "grab";
  }

  _spawn(kind, x, y) {
    this.particles.push({ kind, x, y, vy: -0.4 - Math.random() * 0.4, life: 1 });
  }

  _loop(t) {
    const now = performance.now();
    // state expiry
    if (this.state !== "drag" && this.state !== "sleep" && now > this.stateUntil && this.state !== "idle") {
      this.state = "idle";
    }
    this.petHeat = Math.max(0, this.petHeat - 0.15);
    this.scrollHeat = Math.max(0, this.scrollHeat - 0.25);
    const unrollTarget = this.state === "unroll" ? Math.min(this.scrollHeat * 4, 12 * this.px) : 0;
    this.unrollLen += (unrollTarget - this.unrollLen) * 0.25;
    // sleep when nothing happens for a while
    if (this.state === "idle" && now - this.lastActive > 14000) this.state = "sleep";
    if (this.state === "sleep" && now - this.lastActive < 300) this.state = "idle";
    if (this.state === "sleep" && Math.random() < 0.02) this._spawn("zzz", 14 * this.px, 2 * this.px);
    // blinking
    if (now > this.nextBlink) { this.blinkUntil = now + 140; this.nextBlink = now + 2200 + Math.random() * 3000; }
    // mochi stretch easing
    const target = this.dragging ? 1 : 0;
    this.stretch += (target - this.stretch) * 0.18;

    this._draw(now);
    requestAnimationFrame((tt) => this._loop(tt));
  }

  _draw(now) {
    const { cx, px } = this;
    const pal = PALETTES[this.pattern];
    cx.clearRect(0, 0, this.cv.width, this.cv.height);
    cx.imageSmoothingEnabled = false;

    // gentle idle bob / overheat shiver
    let bob = Math.sin(now / 600) > 0.7 ? 1 : 0;
    if (this.state === "overheat") bob = (Math.floor(now / 60) % 2);
    const shiver = this.state === "overheat" ? ((Math.floor(now / 60) % 2) ? 1 : -1) : 0;
    // mochi: stretch rows when dragged
    const stretchY = 1 + this.stretch * 0.35;

    cx.save();
    cx.translate(shiver, bob);
    cx.scale(1, stretchY);
    cx.translate(0, -(stretchY - 1) * ROWS * px);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = SPRITE[r][c];
        if (ch === ".") continue;
        let color = pal[ch] || pal.B;
        if (ch === "S" && this.pattern === "calico" && r > 9) color = pal.extra;
        if (ch === "B" && this.state === "overheat") color = this._blend(color, "#d83a3f", 0.35);
        // knead: lift alternating front paws (bottom row)
        if (r === ROWS - 1 && this.state === "knead") {
          const lift = (Math.floor(this.kneadPhase) % 2 === 0) ? [2, 6] : [10, 13];
          if (lift.some((k) => Math.abs(c - k) <= 1)) {
            cx.fillStyle = color;
            cx.fillRect(c * px, (r - 0.6) * px, px, px);
            continue;
          }
        }
        cx.fillStyle = color;
        cx.fillRect(c * px, r * px, px, px);
      }
    }
    this._drawFace(now, pal);
    cx.restore();
    this._drawPaper(pal);
    this._drawParticles(pal);
  }

  _drawPaper(pal) {
    if (this.unrollLen < 3) return;
    const { cx, px } = this;
    const x0 = 2 * px, y0 = (ROWS - 1.55) * px, ln = this.unrollLen;
    cx.fillStyle = "#f5f5f5";
    cx.fillRect(x0, y0, ln, px * 1.4);
    cx.strokeStyle = pal["#"];
    cx.strokeRect(x0, y0, ln, px * 1.4);
    cx.fillStyle = "#9a9a9a";
    for (let i = 0; i < Math.floor(ln / 10); i++) {
      cx.fillRect(x0 + 5 + i * 10, y0 + 3, 5, 1.5);
      cx.fillRect(x0 + 5 + i * 10, y0 + 7, 5, 1.5);
    }
  }

  _drawFace(now, pal) {
    const { cx, px } = this;
    const closed = now < this.blinkUntil || this.state === "sleep" || this.state === "pet";
    // gaze offset toward mouse
    const cxr = 8 * px, cyr = 6 * px;
    let dx = Math.max(-1, Math.min(1, (this.mouse.x - cxr) / 120));
    let dy = Math.max(-0.5, Math.min(1, (this.mouse.y - cyr) / 120));
    for (const [er, ec] of EYES) {
      const x = ec * px, y = er * px;
      if (closed) {
        cx.fillStyle = pal["#"];
        if (this.state === "pet") { // happy ^ ^
          cx.fillRect(x, y + px * 0.6, px * 0.7, px * 0.5);
          cx.fillRect(x + px * 1.3, y + px * 0.6, px * 0.7, px * 0.5);
          cx.fillRect(x + px * 0.6, y + px * 0.1, px * 0.8, px * 0.5);
        } else {
          cx.fillRect(x, y + px * 0.7, px * 2, px * 0.5);
        }
        continue;
      }
      const wide = this.state === "alert";
      cx.fillStyle = wide ? "#ffffff" : pal.eye;
      cx.fillRect(x, y, px * 2, px * 2);
      cx.fillStyle = pal["#"];
      const pw = wide ? px * 1.2 : px;
      cx.fillRect(x + px * 0.5 + dx * px * 0.5 - (wide ? px * 0.1 : 0),
                  y + px * 0.5 + dy * px * 0.4 - (wide ? px * 0.1 : 0), pw, pw);
    }
    // nose + mouth
    cx.fillStyle = pal.P;
    cx.fillRect(NOSE[1] * px, NOSE[0] * px, px, px * 0.7);
    cx.fillStyle = pal["#"];
    if (this.state === "overheat" || this.state === "alert") {
      cx.fillRect((NOSE[1] - 0.2) * px, (NOSE[0] + 0.9) * px, px * 1.4, px * 0.8); // :o
    } else {
      cx.fillRect((NOSE[1] - 0.6) * px, (NOSE[0] + 0.9) * px, px * 0.6, px * 0.4);
      cx.fillRect((NOSE[1] + 1.0) * px, (NOSE[0] + 0.9) * px, px * 0.6, px * 0.4);
    }
  }

  _drawParticles(pal) {
    const { cx, px } = this;
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.y += p.vy; p.life -= 0.012;
      cx.globalAlpha = Math.max(0, p.life);
      if (p.kind === "heart") {
        cx.fillStyle = "#e8546a";
        const s = px * 0.5;
        cx.fillRect(p.x - s, p.y - s, s, s); cx.fillRect(p.x + s * 0.2, p.y - s, s, s);
        cx.fillRect(p.x - s, p.y - s * 0.4, s * 2.2, s);
        cx.fillRect(p.x - s * 0.4, p.y + s * 0.6, s, s * 0.8);
      } else if (p.kind === "steam") {
        cx.fillStyle = "#c9c9c9";
        cx.fillRect(p.x + Math.sin(p.life * 10) * 3, p.y, px * 0.8, px * 0.8);
      } else if (p.kind === "zzz") {
        cx.fillStyle = "#9a9a9a";
        cx.font = `${px * 1.6}px monospace`;
        cx.fillText("z", p.x + (1 - p.life) * 8, p.y);
      }
      cx.globalAlpha = 1;
    }
  }

  _blend(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const mix = (sa, sb) => Math.round(sa + (sb - sa) * t);
    const r = mix(pa >> 16, pb >> 16), g = mix((pa >> 8) & 255, (pb >> 8) & 255), bl = mix(pa & 255, pb & 255);
    return `rgb(${r},${g},${bl})`;
  }
}

window.PixelCat = PixelCat;
window.CAT_PALETTES = PALETTES;
