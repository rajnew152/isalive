/* =============================================================================
   team.js — the contributor cards at the end of the journey section. The
   journey keeps its own scroll length (the stylesheet's pin height); the cards
   block sits after that, inside the same pin height, one viewport per card, so
   the gradient stage stays pinned underneath while each card scrolls up and is
   pinned over the previous one. A card darkens and shrinks a little while the
   next one covers it; the last card shrinks into a rounded strip as the Toolkit
   arrives, like the journey stage itself does.
   ============================================================================= */
(function () {
  "use strict";

  function gutterScale() {
    const w = window.innerWidth;
    return 1 - gsap.utils.clamp(8, 40, w * 0.025 - 8) * 2 / w;
  }

  function init() {
    const root = document.getElementById("section-journey");
    const team = root && root.querySelector(".traj__team");
    if (!root || !team || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    const pinHeight = root.querySelector(".traj__pin-height");
    const cards = Array.from(team.querySelectorAll(".team-card"));
    if (!pinHeight || !cards.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* the journey's pin length comes from the stylesheet; the cards start where the
       "outcomes." hold ends and add one viewport each (js/journey.js subtracts the
       block again, so its own timeline keeps its original length) */
    const layout = () => {
      pinHeight.style.height = "";
      team.style.marginTop = "";
      if (reduced) { pinHeight.style.height = "auto"; return; }
      const base = pinHeight.offsetHeight;
      team.style.marginTop = (base - window.innerHeight) + "px";
      pinHeight.style.height = (base + team.offsetHeight) + "px";
    };
    layout();
    if (reduced) return;
    ScrollTrigger.addEventListener("refreshInit", layout);

    /* "My journey": pinned over the whole block; it rises and fades in with the
       first card, so title and card arrive together */
    const heading = team.querySelector(".team-heading");
    const title = heading && heading.querySelector(".team-heading__title");
    if (heading && title) {
      gsap.set(heading, { zIndex: cards.length + 1 });
      ScrollTrigger.create({
        trigger: heading,
        start: "top top",
        endTrigger: team,
        end: "bottom bottom",
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      });
      gsap.fromTo(title, { autoAlpha: 0, y: 70, scale: 0.94, filter: "blur(8px)" }, {
        autoAlpha: 1, y: 0, scale: 1, filter: "blur(0px)", ease: "power2.out",
        scrollTrigger: { trigger: cards[0], start: "top bottom", end: "top 30%", scrub: true, invalidateOnRefresh: true },
      });
      /* the "outcomes." sentence clears out of the way as the title comes in */
      const center = root.querySelector(".traj__center");
      if (center) {
        gsap.fromTo(center, { opacity: 1 }, {
          opacity: 0, ease: "none",
          scrollTrigger: { trigger: cards[0], start: "top bottom", end: "top 55%", scrub: true, invalidateOnRefresh: true },
        });
      }
    }

    cards.forEach((card, i) => {
      gsap.set(card, { zIndex: i + 1 });
      ScrollTrigger.create({
        trigger: card,
        start: "top top",
        endTrigger: team,
        end: "bottom bottom",
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      });
      /* the card underneath recedes while the next one slides over it */
      const next = cards[i + 1];
      if (next) {
        const inner = card.querySelector(".team-card__inner");
        const shade = card.querySelector(".team-card__shade");
        const cover = gsap.timeline({
          scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true, invalidateOnRefresh: true },
        });
        cover.to(inner, { scale: 0.94, transformOrigin: "center center", ease: "none" }, 0);
        if (shade) cover.to(shade, { opacity: 0.4, ease: "none" }, 0);
        cover.fromTo(card, { "--team-glow": 1 }, { "--team-glow": 0, ease: "none" }, 0); // its glow gives way to the next card's
      }
    });

    /* keep the cards (and the title) inside the orange / purple stage: whatever part
       of them falls outside the stage's on-screen box is clipped away, so during the
       hand-off (when the stage shrinks and scrolls off) nothing hangs outside it */
    const stage = root.querySelector(".traj__container");
    if (stage) {
      const clipEls = [heading, ...cards].filter(Boolean);
      let raf = 0;
      const clipToStage = () => {
        raf = 0;
        const c = stage.getBoundingClientRect();
        if (c.bottom < -50 || c.top > window.innerHeight + 50) return;
        clipEls.forEach((el) => {
          const r = el.getBoundingClientRect();
          const t = Math.max(0, c.top - r.top), rt = Math.max(0, r.right - c.right);
          const b = Math.max(0, r.bottom - c.bottom), l = Math.max(0, c.left - r.left);
          el.style.clipPath = t || rt || b || l ? `inset(${t}px ${rt}px ${b}px ${l}px)` : "";
        });
      };
      const queue = () => { if (!raf) raf = requestAnimationFrame(clipToStage); };
      window.addEventListener("scroll", queue, { passive: true });
      ScrollTrigger.addEventListener("refresh", queue);
    }

    /* hand-off: the last card recedes a little as the Toolkit arrives (the gradient
       stage behind it shrinks into its rounded strip, see js/journey.js) */
    const toolkit = document.getElementById("section-toolkit");
    if (toolkit) {
      const last = cards[cards.length - 1].querySelector(".team-card__inner");
      const hand = gsap.timeline({
        scrollTrigger: { trigger: toolkit, start: "top bottom", end: "top 30%", scrub: true, invalidateOnRefresh: true },
      });
      hand.to(last, { scale: 0.96, transformOrigin: "center center", ease: "none" }, 0);
      if (heading) hand.to(heading, { opacity: 0, ease: "none" }, 0);
    }
  }

  window.LiaTeam = { init };
})();
