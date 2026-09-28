/* =============================================================================
   wheel.js — "Built for every industry" cinematic wheel. Pinned section whose
   ten glass segments rotate a full turn with scroll (GSAP ScrollTrigger,
   scrub .9) while each label counter-rotates; Prev/Next nudge the wheel by
   36° (power3.out, .95s). Also ports the site's wheel-smoothing handler that
   slows mouse-wheel scrolling while the section is pinned.
   ============================================================================= */
(function () {
  "use strict";

  function init() {
    const section = document.getElementById("section-cinematic-project");
    if (!section || !window.gsap) return;
    const wheel = section.querySelector("[data-cinematic-wheel]");
    const details = Array.from(section.querySelectorAll("[data-cinematic-wheel-detail]"));
    const buttons = section.querySelectorAll(".top-\\[78\\%\\] button");
    if (!wheel || !details.length) return;

    /* keep the whole globe on screen: the wheel has fixed pixel sizes, so on a short
       window its lower rim falls below the viewport; scale the wheel block (ring,
       hub, logo, labels) down from its top edge until the full circle fits */
    const stage = wheel.parentElement;
    function fitGlobe() {
      stage.style.scale = "";
      const top = stage.getBoundingClientRect().top;
      let bottom = -Infinity;
      wheel.querySelectorAll(".cps-wheel-glass").forEach((g) => { bottom = Math.max(bottom, g.getBoundingClientRect().bottom); });
      const room = section.getBoundingClientRect().top + window.innerHeight * 0.985 - top;
      const s = bottom > top ? Math.min(1, room / (bottom - top)) : 1;
      if (s < 1) { stage.style.transformOrigin = "50% 0"; stage.style.scale = s.toFixed(4); }
    }
    fitGlobe();
    window.addEventListener("resize", fitGlobe);

    let manual = 0;
    function nudge(dir) {
      manual += -(36 * dir);
      gsap.to(wheel, { "--manual-rotation": `${manual}deg`, duration: 0.95, ease: "power3.out" });
      gsap.to(details, { "--manual-counter-rotation": `${-manual}deg`, duration: 0.95, ease: "power3.out" });
    }
    if (buttons[0]) buttons[0].addEventListener("click", () => nudge(1));
    if (buttons[1]) buttons[1].addEventListener("click", () => nudge(-1));

    gsap.set(wheel, { "--scroll-rotation": "0deg" });
    gsap.set(details, { "--scroll-counter-rotation": "0deg" });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let trigger = null;
    gsap.context(() => {
      trigger = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerWidth < 768 ? Math.max(1.8 * window.innerHeight, 1100) : window.innerWidth < 1024 ? Math.max(2.2 * window.innerHeight, 1500) : Math.max(2.65 * window.innerHeight, 1900)}`,
          scrub: 0.9,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
        .to(wheel, { "--scroll-rotation": "-360deg", duration: 1 }, 0)
        .to(details, { "--scroll-counter-rotation": "360deg", duration: 1 }, 0)
        .scrollTrigger ?? null;
    }, section);
    requestAnimationFrame(() => ScrollTrigger.refresh());

    /* wheel smoothing while pinned (fine pointers only). Wheel notches set a target
       the page glides towards; inside the pinned range the glide speed is capped so
       the wheel turns slowly. Speed itself is eased (never jumps), so there is no
       judder at the range edges and no back-and-forth between competing updates. */
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const range = () => (trigger && trigger.end > trigger.start ? { start: trigger.start, end: trigger.end } : null);
    const FOLLOW = 9.5;   // 1/s — how quickly the page closes the gap to the target
    const RESPONSE = 10;  // 1/s — how quickly the scroll speed adapts (acceleration smoothing)
    let desired = window.scrollY, lastSet = null, raf = null, lastT = 0, vel = 0;
    let seenY = window.scrollY, seenT = performance.now(), seenVel = 0; // current page speed, px/s
    const stop = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null; lastSet = null; vel = 0; };
    const step = (now) => {
      const dt = Math.min(Math.max((now - lastT) / 1000, 1 / 240), 0.05); lastT = now;
      const r = range(); if (!r) return void stop();
      const y = window.scrollY;
      if (lastSet !== null && Math.abs(y - lastSet) > 2) { stop(); desired = y; return; } // scrollbar / keyboard took over
      const inside = y >= r.start - 1 && y < r.end;
      const vmax = inside ? window.innerHeight * 1.1 : Infinity;
      const d = desired - y;
      const want = Math.max(-vmax, Math.min(vmax, d * FOLLOW));
      vel += (want - vel) * (1 - Math.exp(-RESPONSE * dt));
      // at least 1px per frame: the browser truncates scroll positions to whole pixels
      let next = y + (Math.abs(vel * dt) < 1 ? Math.sign(d) : vel * dt);
      /* reaching (or crossing) the target ends the glide there — never overshoot */
      if (Math.abs(d) < 1 || (next - desired) * (y - desired) <= 0) { window.scrollTo(0, desired); return void stop(); }
      lastSet = next; window.scrollTo(0, next);
      raf = requestAnimationFrame(step);
    };
    const scrollable = (target) => {
      let t = target instanceof Element ? target : null;
      while (t && t !== document.body && t !== document.documentElement) {
        const o = getComputedStyle(t).overflowY; // style read before the layout read
        if ((o === "auto" || o === "scroll") && t.scrollHeight > t.clientHeight + 1) return true;
        t = t.parentElement;
      }
      return false;
    };
    const onWheel = (e) => {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY) || scrollable(e.target)) return;
      if (document.body.style.overflow === "hidden") return; // menu / chat open
      const r = range(); if (!r) return;
      let dy = e.deltaY;
      if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) dy *= 16; else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) dy *= window.innerHeight;
      const y = window.scrollY, lo = Math.min(y, y + dy), hi = Math.max(y, y + dy);
      /* own every notch that touches the pinned range, and keep owning them until the
         current glide has finished so the hand-back to smooth-scroll is seamless */
      if (!(raf !== null || (hi > r.start && lo < r.end)) || !e.cancelable) return;
      e.preventDefault();
      const maxY = Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - window.innerHeight);
      desired = Math.min(Math.max(desired + dy, 0), maxY);
      if (raf === null) {
        /* continue at the speed the page is already moving (e.g. smooth-scroll's glide) */
        vel = performance.now() - seenT < 100 ? seenVel : 0;
        lastT = performance.now(); lastSet = null; raf = requestAnimationFrame(step);
      }
    };
    /* while idle, keep the target in sync with wherever the page is (smooth-scroll,
       scrollbar, keyboard, anchor links) */
    const onScroll = () => {
      const y = window.scrollY, now = performance.now(), dt = (now - seenT) / 1000;
      if (dt > 0.001) { seenVel = dt < 0.1 ? seenVel * 0.5 + ((y - seenY) / dt) * 0.5 : 0; seenY = y; seenT = now; }
      if (raf === null) desired = y;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  window.LiaWheel = { init };
})();
