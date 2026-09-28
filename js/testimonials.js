/* =============================================================================
   testimonials.js — the Results wall (#testimonials), a slothUI-style
   testimonial masonry: four card columns drifting vertically in alternating
   directions (CSS keyframes in css/testimonials.css). This script only makes
   the loop seamless: each column's card set is repeated until one half of the
   track covers the wall, then that half is duplicated, so the -50% translate
   always lands on identical content. .is-ready starts the animation; without
   JS the wall simply stands still — never a gap.
   ============================================================================= */
(function () {
  "use strict";

  function init() {
    const root = document.getElementById("testimonials");
    if (!root || !root.classList.contains("tw")) return;
    const wall = root.querySelector(".tw__wall");
    const tracks = Array.from(root.querySelectorAll(".tw__track"));
    if (!wall || !tracks.length) return;

    function build() {
      const wallH = wall.clientHeight || window.innerHeight;
      tracks.forEach((track) => {
        const set = track.querySelector(".tw__set");
        if (!set) return;
        track.querySelectorAll(".tw__set[aria-hidden]").forEach((c) => c.remove());
        /* one half must cover the wall on its own, or the loop scrolls a hole into view */
        const per = Math.max(1, Math.ceil(wallH / Math.max(1, set.offsetHeight)));
        for (let i = 1; i < per * 2; i++) {
          const clone = set.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          track.appendChild(clone);
        }
      });
      root.classList.add("is-ready");
    }

    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

    let timer = 0, lastH = wall.clientHeight;
    window.addEventListener("resize", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (Math.abs(wall.clientHeight - lastH) < 2) return;
        lastH = wall.clientHeight;
        build();
      }, 200);
    });

    /* the wall no longer pins, so the page got shorter: re-measure the scroll scenes */
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  window.LiaTestimonials = { init };
})();
