/* =============================================================================
   next.js — the closing "If our visions align, let's shape what's next
   together." section (port of the next-section of guillaumezhu.com). The
   sentence is written letter by letter along a wavy SVG path while the view
   pans to follow the writing head. Once the sentence is complete its final dot
   detaches, drifts to the centre of the footer card and grows into a circular
   clip that reveals the card. When this section arrives, the Toolkit stage
   shrinks into a rounded strip, like every hand-off on the reference site.
   ============================================================================= */
(function () {
  "use strict";
  const WRITE_START = 0.04; // scroll progress at which the sentence starts writing
  const WRITE_END = 0.82;   // sentence complete; the dot sequence uses the rest
  const ORB_R = 14;

  function gutterScale() {
    const w = window.innerWidth;
    return 1 - gsap.utils.clamp(8, 40, w * 0.025 - 8) * 2 / w;
  }

  function init() {
    const root = document.getElementById("section-next");
    if (!root || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    const pinHeight = root.querySelector(".nx__pin-height");
    const container = root.querySelector(".nx__container");
    const svg = root.querySelector(".nx__svg");
    const path = root.querySelector("#nxPath");
    const text = root.querySelector(".nx__text");
    const textPath = root.querySelector("#nxTextPath");
    const cream = root.querySelector("#nxTextCream");
    const grad = root.querySelector("#nxTextGradientPart");
    const orb = root.querySelector("#nxOrb");
    const footer = root.querySelector(".nx-footer");
    if (!pinHeight || !container || !svg || !path || !text || !textPath || !cream || !grad || !orb || !footer) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { clamp, interpolate } = gsap.utils;
    const norm = (v, a, b) => clamp(0, 1, (v - a) / (b - a));

    const VW = svg.viewBox.baseVal.width, VH = svg.viewBox.baseVal.height;
    svg.style.aspectRatio = `${VW} / ${VH}`;

    /* ---- the camera: the viewBox origin, eased towards the writing head ---- */
    const view = { x: 0, y: 0 };
    const applyView = () => svg.setAttribute("viewBox", `${view.x} ${view.y} ${VW} ${VH}`);
    const panY = gsap.quickTo(view, "y", { duration: 0.2, ease: "power1", onUpdate: applyView });
    const panX = gsap.quickTo(view, "x", { duration: 0.2, ease: "power1", onUpdate: applyView });
    const setClip = gsap.quickSetter(footer, "clipPath");
    const setClipW = gsap.quickSetter(footer, "webkitClipPath");
    gsap.set(orb, { autoAlpha: 0 });
    gsap.set(footer, { clipPath: "circle(0px at 50% 50%)", webkitClipPath: "circle(0px at 50% 50%)" });

    /* ---- the sentence: the period is never a glyph, the orb plays its part ---- */
    const creamStr = cream.textContent.trim() + " ";
    const gradStr = grad.textContent.trim().replace(/\.$/, "");
    const creamChars = creamStr.split(""), gradChars = gradStr.split("");
    const TOTAL = creamChars.length + gradChars.length;
    let shown = -1;
    function showChars(c) {
      cream.textContent = creamChars.slice(0, Math.min(c, creamChars.length)).join("");
      grad.textContent = gradChars.slice(0, Math.max(0, c - creamChars.length)).join("");
      shown = c;
    }

    /* path length at which the curve reaches a given x (x grows along the path) */
    function lengthAtX(x) {
      let lo = 0, hi = path.getTotalLength();
      for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        if (path.getPointAtLength(mid).x < x) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }

    /* path length at the end of every letter (so the camera follows the real letters,
       whose widths vary, rather than a uniform fraction of the path) */
    let endLen = 0, charEnds = [], endPoint = { x: 0, y: 0 };
    function measure() {
      const keep = shown;
      cream.textContent = creamStr;
      grad.textContent = gradStr + ".";
      const withDot = textPath.getComputedTextLength();
      grad.textContent = gradStr;
      const noDot = textPath.getComputedTextLength();
      const last = text.getNumberOfChars() - 1;
      charEnds = [];
      for (let i = 0; i <= last; i++) charEnds.push(lengthAtX(text.getEndPositionOfChar(i).x));
      endLen = charEnds[last] + Math.max(0, (withDot - noDot) / 2);
      const e = path.getPointAtLength(endLen);
      endPoint = { x: e.x, y: e.y };
      gsap.set(orb, { attr: { cx: endPoint.x, cy: endPoint.y } });
      showChars(Math.max(keep, 0));
    }
    function headAt(t) {
      const f = t * TOTAL, c = Math.floor(f), lastIdx = charEnds.length - 1;
      const from = c > 0 ? charEnds[Math.min(c - 1, lastIdx)] : 0;
      const to = charEnds[Math.min(c, lastIdx)];
      const len = c >= TOTAL ? charEnds[lastIdx] : interpolate(from, to, f - c);
      return path.getPointAtLength(Math.min(len, endLen));
    }

    /* ---- geometry that depends on the viewport ---- */
    let textLift = 0, footerRadius = 0, lead = 0;
    const footerCenter = { x: 0, y: 0 }; // in viewBox units, relative to the svg box
    function layout() {
      const c = container.getBoundingClientRect(), f = footer.getBoundingClientRect(), s = svg.getBoundingClientRect();
      const ctm = svg.getScreenCTM();
      textLift = ctm ? ((f.top - c.top) / 2 - c.height / 2) / Math.abs(ctm.d) : -200;
      footerRadius = Math.hypot(footer.offsetWidth / 2, footer.offsetHeight / 2);
      footerCenter.x = (f.left + f.width / 2 - s.left) * (VW / s.width);
      footerCenter.y = (f.top + f.height / 2 - s.top) * (VH / s.height);
      lead = VW * (c.width / s.width) * 0.1;
    }

    let lastLift = null, lastReveal = 0, lastOrbAlpha = 0, footerInteractive = false;
    function update(progress) {
      if (!charEnds.length) return;
      const t = norm(progress, WRITE_START, WRITE_END);
      const n = norm(progress, WRITE_END, 1);

      /* follow the writing head, slightly ahead of centre until the sentence settles */
      const offset = interpolate(lead, 0, norm(t, 0.8, 1));
      const head = headAt(t);
      panY(head.y - VH / 2 - 30);
      panX(head.x - footerCenter.x - offset);

      const c = Math.floor(t * TOTAL);
      if (c !== shown) showChars(c);

      /* the dot leaves the sentence, the sentence lifts, the dot becomes the reveal */
      const dotFree = n > 0.06;
      const lift = norm(n, 0.3, 0.6);
      const y = textLift * lift;
      if (y !== lastLift) { gsap.set(text, { y }); lastLift = y; }
      const target = lift > 0 ? { x: view.x + footerCenter.x, y: view.y + footerCenter.y } : endPoint;
      const cx = interpolate(endPoint.x, target.x, lift);
      const cy = interpolate(endPoint.y, target.y, lift);
      const fill = interpolate("#ff6b4a", "#9b7cff", lift);

      const reveal = norm(n, 0.6, 1);
      const radius = interpolate(0, footerRadius, reveal);
      if (reveal > 0 || lastReveal > 0) {
        const clip = `circle(${radius}px at 50% 50%)`;
        setClip(clip); setClipW(clip);
      }
      lastReveal = reveal;
      const interactive = reveal > 0.4;
      if (interactive !== footerInteractive) { gsap.set(footer, { pointerEvents: interactive ? "auto" : "none" }); footerInteractive = interactive; }

      const orbAlpha = dotFree ? 1 - norm(radius, ORB_R - 2.1, ORB_R + 4.9) : 0;
      if (orbAlpha > 0 || lastOrbAlpha > 0) gsap.set(orb, { autoAlpha: orbAlpha, attr: { cx, cy, r: ORB_R, fill } });
      lastOrbAlpha = orbAlpha;
    }

    measure();
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); layout(); update(current()); });

    let trigger = null;
    const current = () => (trigger ? trigger.progress : reduced ? 1 : 0);

    if (reduced) {
      pinHeight.style.height = "100vh";
      update(1);
      return;
    }

    trigger = ScrollTrigger.create({
      trigger: pinHeight,
      start: "top top",
      end: "bottom bottom",
      pin: container,
      pinSpacing: false,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: (self) => { layout(); update(self.progress); },
      onUpdate: (self) => update(self.progress),
    });

    /* hand-off: the Toolkit stage shrinks into a rounded strip as this section arrives */
    const toolkit = document.getElementById("section-toolkit");
    if (toolkit) {
      const stage = toolkit.querySelector(".tk__container");
      const header = toolkit.querySelector(".tk__header");
      if (stage) {
        const hand = gsap.timeline({
          scrollTrigger: { trigger: root, start: "top bottom", end: "top 30%", scrub: true, invalidateOnRefresh: true },
        });
        hand.to(stage, { scaleX: gutterScale, scaleY: 0.98, borderRadius: "0px 0px 32px 32px", transformOrigin: "center top", ease: "none" }, 0);
        if (header) hand.to(header, { scale: 0.9, transformOrigin: "center center", ease: "none" }, 0);
      }
    }
  }

  window.LiaNext = { init };
})();
