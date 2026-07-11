/* page glue: hero cat, coat swatches, live status readout, figure demos */

const hero = new PixelCat(document.getElementById("hero-cat"), {
  px: 7, skin: "ink", crosshair: true,
});
window.demoCat = hero;

// coat swatches
const swatchRow = document.getElementById("swatches");
for (const name of Object.keys(CAT_SKINS)) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `swatch swatch-${name}` + (name === hero.skin ? " active" : "");
  b.dataset.skin = name;
  b.title = name;
  swatchRow.appendChild(b);
}
swatchRow.addEventListener("click", (e) => {
  const btn = e.target.closest(".swatch");
  if (!btn) return;
  hero.setSkin(btn.dataset.skin);
  swatchRow.querySelectorAll(".swatch").forEach((s) => s.classList.toggle("active", s === btn));
});

// live status readout, index-card style
const statusBox = document.getElementById("status-box");
const CAT_CENTER = { x: Math.round(17 * hero.px), y: Math.round((8 + 15) * hero.px) };
setInterval(() => {
  const stateMap = {
    overheat: "OVERHEAT", sleep: "NAPPING", alert: "ALERT",
    pet: "CONTENT", knead: "KNEADING", drag: "AIRBORNE", meow: "VOCAL",
  };
  const sys = stateMap[hero.state] || "NOMINAL";
  const fish = hero.fish
    ? `${Math.round(hero.fish.x * hero.px)}, ${Math.round((hero.fish.y + 8) * hero.px)}`
    : "—";
  const mx = hero.mouse.x, my = hero.mouse.y;
  const prox = (mx > -900)
    ? Math.max(0, Math.round(Math.hypot(mx - CAT_CENTER.x, my - CAT_CENTER.y))) + "px"
    : "—";
  const buffer = hero.state === "pet" ? "PURRING" : hero.state === "overheat" ? "VENTING" : "STABLE";
  statusBox.innerHTML =
    `<div>[SYSTEM_STATUS]: ${sys}</div>` +
    `<div>[CAT_COORDS]: ${CAT_CENTER.x}, ${CAT_CENTER.y}</div>` +
    `<div>[FISH_COORDS]: ${fish}</div>` +
    `<div>[PROXIMITY]: ${prox}</div>` +
    `<div>[BUFFER]: ${buffer}</div>`;
}, 150);

// figure demo loops (each is the real engine in scripted mode);
// demos only animate while their figure is on screen
const demoCats = new Map();
document.querySelectorAll("canvas[data-demo]").forEach((c) => {
  const cat = new PixelCat(c, { px: 4, demo: c.dataset.demo, skin: "ink" });
  cat.paused = true;
  demoCats.set(c, cat);
});
const io = new IntersectionObserver((entries) => {
  for (const e of entries) demoCats.get(e.target).paused = !e.isIntersecting;
}, { rootMargin: "80px" });
demoCats.forEach((_cat, c) => io.observe(c));

// copy install command
const copyBtn = document.getElementById("copy-btn");
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(document.getElementById("install-cmd").textContent.trim());
    copyBtn.textContent = "COPIED ✓";
  } catch {
    copyBtn.textContent = "SELECT + ⌘C";
  }
  setTimeout(() => { copyBtn.textContent = "COPY"; }, 1800);
});
