/* page glue: hero cat, skin swatches, feature demo loops */

const hero = new PixelCat(document.getElementById("hero-cat"), { px: 7 });
window.demoCat = hero;

// build one swatch per skin
const swatchRow = document.getElementById("swatches");
for (const name of Object.keys(CAT_SKINS)) {
  const b = document.createElement("button");
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

// feature-card demo loops (each is the real engine in scripted mode)
document.querySelectorAll("canvas[data-demo]").forEach((c) => {
  new PixelCat(c, { px: 4, demo: c.dataset.demo });
});
