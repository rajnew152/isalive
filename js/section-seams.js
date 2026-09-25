/* =============================================================================
   section-seams.js — feathers the top edge of the industries wheel into the
   manifesto section above it. The wheel's hub and glows start right at the
   section's top edge, which read as a hard line against the manifesto's plain
   bottom band. A gradient band in the manifesto's bottom colour (its --mf-below
   token, so both themes match) sits over the wheel's top edge while the section
   scrolls in, and fades away as the wheel pins to the top of the viewport.
   ============================================================================= */
(function () {
  "use strict";

  function init() {
    const wheel = document.getElementById("section-cinematic-project");
    const above = document.getElementById("section-manifesto");
    if (!wheel || !above) return;

    const band = document.createElement("div");
    band.className = "bp-seam";
    band.setAttribute("aria-hidden", "true");
    wheel.appendChild(band);

    const syncColour = () => {
      const c = getComputedStyle(above).getPropertyValue("--mf-below").trim();
      if (c) band.style.setProperty("--seam-from", c);
    };
    syncColour();
    window.addEventListener("lia:themechange", () => requestAnimationFrame(syncColour));

    let raf = 0;
    const update = () => {
      raf = 0;
      const top = wheel.getBoundingClientRect().top;
      // full strength until the edge is nearly under the header, then gone by the time the wheel pins
      const o = Math.max(0, Math.min(1, (top - 4) / 60));
      band.style.opacity = o.toFixed(3);
      band.style.visibility = o === 0 || top > window.innerHeight ? "hidden" : "visible";
    };
    window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
