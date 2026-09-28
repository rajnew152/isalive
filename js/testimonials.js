/* =============================================================================
   testimonials.js — the Results deck (#testimonials), a single-deck cut of the
   Toolkit stage (js/toolkit.js): the cards sit on the rim of a huge invisible
   wheel and the pinned scroll progress deals them out one by one, then the fan
   holds for the rest of the pin. Cards are clickable once dealt (a bounce
   ripples out from the clicked card) and lift on hover. When the closing
   section arrives the stage shrinks into a rounded strip, like every hand-off
   on the reference site.
   ============================================================================= */
(function () {
  "use strict";
  const STEP = 3.5;                    // degrees between two cards on the rim
  const POP_FROM = 0.94;               // scale a card is dealt in from
  const POP_EASE = "elastic.out(0.6, 0.3)";
  const POP_DUR = 0.5;
  const DEAL_END = 0.72;               // whole deck dealt; the fan holds until 1

  function gutterScale() {
    const w = window.innerWidth;
    return 1 - gsap.utils.clamp(8, 40, w * 0.025 - 8) * 2 / w;
  }

  function init() {
    const root = document.getElementById("testimonials");
    if (!root || !root.classList.contains("tm") || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    const pinHeight = root.querySelector(".tk__pin-height");
    const container = root.querySelector(".tk__container");
    const wheel = root.querySelector(".tk__wheel");
    const slots = Array.from(root.querySelectorAll(".tk__slot"));
    const header = root.querySelector(".tk__header");
    const subWrap = root.querySelector(".tk__subtitle-wrap");
    if (!pinHeight || !container || !wheel || !slots.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const TOP_Z = slots.length + 10;
    let ripple = null, rippleSlot = null, rippleZ = 0;

    /* ---- keep the cards clear of the subtitle on short or narrow viewports (same
       rule as the Toolkit): move the deck down, and shrink it if it still overlaps ---- */
    function fit() {
      root.style.removeProperty("--tk-wheel-top");
      root.style.removeProperty("--tk-card-w");
      const probe = slots[0].querySelector(".tk-card");
      if (!header || !subWrap || !probe) return;
      const stageH = container.clientHeight;
      const h = probe.offsetHeight;
      const center = wheel.offsetTop;
      const fontSize = parseFloat(getComputedStyle(subWrap).fontSize) || 20;
      const textBottom = header.offsetTop + subWrap.offsetTop + fontSize * 1.3;
      const gap = Math.max(20, stageH * 0.03);
      const lift = (hh) => Math.max(hh * 0.06, 24 + hh * 0.035);
      if (center - h / 2 - lift(h) >= textBottom + gap) return;
      const bottom = stageH - Math.max(16, stageH * 0.03);
      const newH = Math.max(80, Math.min(h, (bottom - textBottom - gap - 24) / 1.06));
      const minCenter = textBottom + gap + lift(newH) + newH / 2;
      const newCenter = Math.min(Math.max(center, minCenter), Math.max(minCenter, bottom - newH / 2));
      if (newH < h) root.style.setProperty("--tk-card-w", (newH * 295 / 417).toFixed(2) + "px");
      root.style.setProperty("--tk-wheel-top", newCenter.toFixed(2) + "px");
    }

    function fan() {
      slots.forEach((s, i) => { s.classList.add("is-visible"); gsap.set(s, { rotation: i * STEP, zIndex: i + 1, scale: 1 }); });
      gsap.set(wheel, { rotation: -((slots.length - 1) * STEP) / 2, autoAlpha: 1, pointerEvents: "auto" });
      wheel.classList.add("is-interactive");
    }
    function reset() {
      slots.forEach((s, i) => { s.classList.toggle("is-visible", i === 0); gsap.set(s, { rotation: i * STEP, zIndex: i + 1, scale: 1 }); });
      wheel.classList.add("is-interactive");
      gsap.set(wheel, { rotation: 0, autoAlpha: 1, pointerEvents: "auto" });
    }

    /* ---- click ripple: the clicked card bounces, its neighbours follow weaker and later ---- */
    function bounce(targets, strength) {
      const tl = gsap.timeline();
      tl.to(targets, { y: 6 * strength, scale: 1 - 0.03 * strength, duration: 0.08, ease: "power2.in" });
      tl.to(targets, { y: -24 * strength, scale: 1 + 0.07 * strength, duration: 0.18, ease: "power3.out" });
      tl.to(targets, { y: 0, scale: 1, duration: 0.42, ease: "elastic.out(0.8, 0.35)" });
      return tl;
    }
    function rippleFrom(index) {
      if (!slots[index].classList.contains("is-visible")) return null;
      const tl = gsap.timeline({ paused: true });
      slots.forEach((s, i) => {
        if (!s.classList.contains("is-visible")) return;
        const d = Math.abs(i - index);
        tl.add(bounce(s.querySelectorAll(".tk-card__motion"), Math.max(0.25, 1 - d * 0.18)), d * 0.045);
      });
      return tl;
    }
    function releaseRipple() {
      if (!rippleSlot) return;
      const hovered = window.matchMedia("(any-hover: hover) and (any-pointer: fine)").matches && rippleSlot.matches(":hover");
      gsap.set(rippleSlot, { zIndex: hovered ? TOP_Z : rippleZ });
      rippleSlot = null; rippleZ = 0;
    }
    function killRipple() {
      if (ripple) ripple.kill();
      releaseRipple();
      const motions = root.querySelectorAll(".tk-card__motion");
      gsap.killTweensOf(motions, "y,scale");
      gsap.set(motions, { y: 0, scale: 1 });
      ripple = null;
    }
    slots.forEach((slot, i) => {
      const card = slot.querySelector(".tk-card");
      if (!card) return;
      card.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") gsap.set(slot, { zIndex: TOP_Z }); });
      card.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch" && slot !== rippleSlot) gsap.set(slot, { zIndex: i + 1 }); });
      card.addEventListener("click", () => {
        killRipple();
        const tl = rippleFrom(i);
        if (!tl) return;
        ripple = tl; rippleSlot = slot; rippleZ = i + 1;
        gsap.set(slot, { zIndex: TOP_Z });
        tl.eventCallback("onComplete", () => { if (ripple === tl) { releaseRipple(); ripple = null; } });
        tl.play();
      });
    });

    fit();
    reset();

    if (reduced) {
      pinHeight.style.height = "100vh";
      fan();
      window.addEventListener("resize", fit);
      return;
    }

    /* deal cards out one by one (count grows with progress) or take them back */
    const state = { count: 0, rot: 0 };
    function deal(count) {
      if (count !== state.count) {
        if (count > state.count) {
          for (let i = state.count + 1; i <= count; i++) {
            slots[i].classList.add("is-visible");
            gsap.fromTo(slots[i], { scale: POP_FROM }, { scale: 1, ease: POP_EASE, duration: POP_DUR });
          }
        } else {
          for (let i = state.count; i > count; i--) slots[i].classList.remove("is-visible");
        }
        state.count = count;
      }
      if (count !== state.rot) {
        gsap.to(wheel, { rotation: -(count * STEP) / 2, ease: POP_EASE, duration: POP_DUR, overwrite: true });
        state.rot = count;
      }
    }
    function update(p) {
      if (ripple) killRipple();
      deal(Math.min(Math.floor(Math.min(p / DEAL_END, 1) * slots.length), slots.length - 1));
    }

    ScrollTrigger.addEventListener("refreshInit", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

    ScrollTrigger.create({
      trigger: pinHeight,
      start: "top top",
      end: "bottom bottom",
      pin: container,
      pinSpacing: false,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => update(self.progress),
      onRefresh: (self) => update(self.progress),
    });

    /* hand-off: the stage shrinks into a rounded strip as the closing section arrives */
    const next = document.getElementById("section-next");
    if (next) {
      const hand = gsap.timeline({
        scrollTrigger: { trigger: next, start: "top bottom", end: "top 30%", scrub: true, invalidateOnRefresh: true },
      });
      hand.to(container, { scaleX: gutterScale, scaleY: 0.98, borderRadius: "0px 0px 32px 32px", transformOrigin: "center top", ease: "none" }, 0);
      if (header) hand.to(header, { scale: 0.9, transformOrigin: "center center", ease: "none" }, 0);
    }
  }

  window.LiaTestimonials = { init };
})();
