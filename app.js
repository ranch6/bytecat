/* page glue: boot the demo cat + pattern swatches */
const canvas = document.getElementById("hero-cat");
const cat = new PixelCat(canvas, { px: 8 });
window.demoCat = cat;

document.getElementById("swatches").addEventListener("click", (e) => {
  const btn = e.target.closest(".swatch");
  if (!btn) return;
  cat.setPattern(btn.dataset.pattern);
  document.querySelectorAll(".swatch").forEach((s) => s.classList.toggle("active", s === btn));
});
