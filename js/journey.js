/* =============================================================================
   journey.js — the "Today / I bridge / the two." pinned sentence sequence
   (port of the trajectory section of guillaumezhu.com). One sentence at a time
   slides through the centre of a pinned stage while two slices of a gradient
   image enter from the sides, meet in the middle and finally grow to fill the
   viewport. When the Toolkit section scrolls in, the stage shrinks slightly and
   rounds its bottom corners, exactly like the reference hand-off.
   ============================================================================= */
(function () {
  "use strict";
  const CREAM = "#f5e7df", DARK = "#1f1d1d", BLACK = "#0a0a0a";
  /* scroll-scrubbed strengths read by js/journey-fluid.js */
  const fluid = { idle: 0, interaction: 0, zoom: 1 };

  function splitLetters(el) {
    if (el.dataset.split) return;
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = el.textContent.trim().split("").map((ch) =>
      ch === " " ? "<span>&nbsp;</span>" : `<span class="letter" aria-hidden="true">${ch}</span>`
    ).join("");
    el.dataset.split = "1";
  }

  /* 1 - (2 * clamp(8, 40, 2.5vw - 8)) / vw : the gutter the stage shrinks into */
  function gutterScale() {
    const w = window.innerWidth;
    return 1 - gsap.utils.clamp(8, 40, w * 0.025 - 8) * 2 / w;
  }

  function init() {
    const root = document.getElementById("section-journey");
    if (!root || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    const pinHeight = root.querySelector(".traj__pin-height");
    const container = root.querySelector(".traj__container");
    const center = root.querySelector(".traj__center");
    const sentences = Array.from(root.querySelectorAll(".traj__sentence"));
    const left = root.querySelector(".traj__visual--left");
    const right = root.querySelector(".traj__visual--right");
    if (!pinHeight || !container || !sentences.length || !left || !right) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* the team cards (js/team.js) extend the pin height by their own height; the
       sentence timeline keeps the length the stylesheet gives the pin height */
    const team = root.querySelector(".traj__team");
    const sentenceEnd = () => "+=" + (pinHeight.offsetHeight - (team ? team.offsetHeight : 0) - window.innerHeight);

    sentences.forEach(splitLetters);
    const first = sentences[0];
    const last = sentences[sentences.length - 1];

    /* the two slices show one full-viewport image: size it to the stage (not 100vw,
       which includes the scrollbar) so the halves line up at the seam */
    const sizeBackground = () => {
      const size = `${container.clientWidth}px ${container.clientHeight}px`;
      left.style.backgroundSize = size;
      right.style.backgroundSize = size;
    };
    sizeBackground();
    ScrollTrigger.addEventListener("refreshInit", sizeBackground);
    /* also follow the stage's own size (the scrollbar appearing after the preloader,
       window / zoom changes) so the halves never drift apart at the seam */
    if (window.ResizeObserver) new ResizeObserver(sizeBackground).observe(container);

    const halfW = () => container.clientWidth / 2 + 1;
    const sliceW = () => container.clientWidth * 0.48;
    const sliceH = () => container.clientHeight * (window.innerWidth <= 768 ? 0.26 : 0.3);
    const fullH = () => container.clientHeight;

    if (reduced) {
      /* static end state: the final sentence on the full gradient */
      pinHeight.style.height = "100vh";
      gsap.set(container, { backgroundColor: BLACK });
      gsap.set([left, right], { xPercent: 0, yPercent: -50, opacity: 1, width: halfW, height: fullH, borderRadius: 0 });
      gsap.set(sentences, { autoAlpha: 0 });
      gsap.set(last, { autoAlpha: 1, color: CREAM });
      return;
    }

    gsap.set(left, { xPercent: -101, yPercent: -50 });
    gsap.set(right, { xPercent: 101, yPercent: -50 });

    ScrollTrigger.create({
      trigger: pinHeight,
      start: "top top",
      end: "bottom bottom",
      pin: container,
      pinSpacing: false,
      anticipatePin: 1,
    });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: pinHeight, start: "top top", end: sentenceEnd, scrub: true, invalidateOnRefresh: true },
    });
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let playSentence = null;
    const below = { yPercent: 50, y: () => container.clientHeight * 0.5 };
    const above = { yPercent: -50, y: () => -container.clientHeight * 0.5 };
    const rest = { yPercent: 0, y: 0 };

    /* no empty hold before the first sentence: it starts rising as the stage arrives */
    tl.fromTo(first, below, { ...rest, ease: "power3.out", immediateRender: true });
    tl.fromTo(first.querySelectorAll("span"), below, { ...rest, ease: "power3.out", stagger: 0.02, immediateRender: true }, "<");

    sentences.forEach((s, i) => {
      const next = sentences[i + 1];
      if (!next) return;
      const dialogue = next.classList.contains("is-dialogue");
      const both = next.classList.contains("is-both");

      if (dialogue) {
        /* the stage turns cream while the current sentence is centred. The final
           sentence keeps its cream letters (as on the reference once its letters
           carry the cream fill), so cream-on-cream it only reads through the
           gradient cards as they slide in and meet */
        tl.set(container, { backgroundColor: CREAM }, "<+=0.2");
        tl.set(sentences.filter((el) => !el.classList.contains("is-both")), { color: DARK }, "<");
      }
      if (both) {
        tl.fromTo(left, { xPercent: -101, opacity: 0 }, { xPercent: -30, opacity: 1, ease: "power3.out" }, "<+=0.15");
        tl.fromTo(right, { xPercent: 101, opacity: 0 }, { xPercent: 30, opacity: 1, ease: "power3.out" }, "<");
      }

      tl.fromTo(s, rest, { ...above, ease: "power3.in", immediateRender: false });
      tl.fromTo(s.querySelectorAll("span"), rest, { ...above, stagger: 0.02, ease: "power3.in", immediateRender: false }, "<+=0.1");
      tl.fromTo(next, below, { ...rest, ease: "power3.out", immediateRender: true }, "<+=0.10");
      tl.fromTo(next.querySelectorAll("span"), below, { ...rest, ease: "power3.out", stagger: 0.02, immediateRender: true }, "<");

      if (both) {
        tl.fromTo(left, { xPercent: -30, width: sliceW }, { xPercent: 0, width: halfW, ease: "power3.inOut", immediateRender: false }, "<");
        tl.fromTo(right, { xPercent: 30, width: sliceW }, { xPercent: 0, width: halfW, ease: "power3.inOut", immediateRender: false }, "<");
        tl.set(next, { color: CREAM }, ">-=0.05");
        tl.fromTo([left, right], { height: sliceH, borderRadius: 24 }, { height: fullH, borderRadius: 0, ease: "power3.inOut", immediateRender: false }, ">+=0.2");
        /* hold on the full-screen gradient: the reference's neutral hold, then the
           "wake up" (fluid distortion starts, the text turns into an outline),
           then the play phase where hovering the letters fills them again */
        tl.to({}, { duration: 0.05 });
        tl.addLabel("fluidWake");
        tl.to(fluid, { idle: 0.01, duration: 0.14, ease: "sine.inOut" }, "fluidWake");
        tl.to(fluid, { idle: 0.012, duration: 0.14, ease: "sine.inOut" }, ">");
        tl.to(fluid, { interaction: 1, zoom: 1.02, duration: 0.28, ease: "sine.inOut" }, "fluidWake");
        if (finePointer) {
          tl.fromTo(next, { "--traj-fill": 1, "--traj-stroke": "0px" },
            { "--traj-fill": 0, "--traj-stroke": "1.5px", duration: 0.28, ease: "sine.inOut", immediateRender: false }, "fluidWake");
        }
        tl.addLabel("fluidPlay");
        tl.to({}, { duration: 0.27 });
        tl.set(container, { backgroundColor: BLACK }, ">");
        playSentence = next;
      }
    });

    /* hover-to-fill is live from the play phase on, including the section's end
       and the hand-off, where the outlined text is still on screen */
    if (playSentence && finePointer) {
      const togglePlay = () => {
        const t = tl.labels.fluidPlay;
        playSentence.classList.toggle("is-pointer-play", t !== undefined && tl.time() >= t);
      };
      tl.eventCallback("onUpdate", togglePlay);
      ScrollTrigger.addEventListener("refresh", togglePlay);
      togglePlay();
    }

    /* hand-off: as the Toolkit section arrives the stage shrinks into a rounded strip */
    const toolkit = document.getElementById("section-toolkit");
    if (toolkit) {
      const title = toolkit.querySelector(".tk__title");
      const hand = gsap.timeline({
        scrollTrigger: { trigger: toolkit, start: "top bottom", end: "top 30%", scrub: true, invalidateOnRefresh: true },
      });
      hand.to(container, { scaleX: gutterScale, scaleY: 0.98, borderRadius: "0px 0px 32px 32px", transformOrigin: "center top", ease: "none" }, 0);
      hand.to(center, { scale: 0.9, transformOrigin: "center center", ease: "none" }, 0);
      if (title) hand.fromTo(title, { fontWeight: 500 }, { fontWeight: 700, ease: "none" }, 0);
    }
  }

  window.LiaJourney = { init, fluid };
})();
