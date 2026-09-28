/* =============================================================================
   card-flip.js — clicking a card in the Platform or Testimonials deck flips it
   (css/card-flip.css turns .tk-flip.is-flipped over to its back); clicking again
   flips it back. Cards can only be clicked while their deck is fanned out
   (.tk__wheel.is-interactive), and every card turns face-up again as soon as
   the deck stops being interactive (gathered, hidden, scrolled back).
   The existing click ripple (js/toolkit.js, js/testimonials.js) still plays.
   ============================================================================= */
(function () {
  "use strict";

  function init() {
    const wheels = document.querySelectorAll("#section-toolkit .tk__wheel, #testimonials .tk__wheel");
    wheels.forEach((wheel) => {
      const flips = Array.from(wheel.querySelectorAll(".tk-flip"));
      if (!flips.length) return;
      flips.forEach((flip) => {
        const card = flip.closest(".tk-card");
        if (!card) return;
        card.addEventListener("click", () => {
          if (!wheel.classList.contains("is-interactive")) return;
          flip.classList.toggle("is-flipped");
        });
      });
      new MutationObserver(() => {
        if (!wheel.classList.contains("is-interactive")) flips.forEach((f) => f.classList.remove("is-flipped"));
      }).observe(wheel, { attributes: true, attributeFilter: ["class"] });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
