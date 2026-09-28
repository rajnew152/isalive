/* =============================================================================
   toolkit.js — the "Toolkit" card deck (port of the toolkit section of
   guillaumezhu.com). Every card sits on the rim of a huge invisible wheel; the
   pinned scroll progress deals the front-end cards out one by one along the
   rim, gathers them back into a stack, flips the top card (Shopify to Figma)
   while the subtitle changes, then deals the art-direction deck the same way.
   The art deck ends on a "Transition" card: the deck gathers behind it, a wavy
   cream front rises inside it, then it grows until it covers the whole stage.
   Cards are clickable once dealt: a bounce ripples out from the clicked card.
   Thresholds are the ones of the reference.
   ============================================================================= */
(function () {
  "use strict";
  const STEP = 3.5;                    // degrees between two cards on the rim
  const POP_FROM = 0.94;               // scale a card is dealt in from
  const POP_EASE = "elastic.out(0.6, 0.3)";
  const POP_DUR = 0.5;
  const FRONT_DEAL_END = 0.3;          // front-end deck dealt out
  const FRONT_STACK_END = 0.35;        // gathered back into a stack
  const FLIP_END = 0.45;               // Shopify card flipped to Figma
  const ART_DEAL_END = 0.75;           // art-direction deck dealt out
  const ART_STACK_END = 0.8;           // gathered behind the transition card
  const CREAM_END = 0.95;              // transition card filled with cream
  const GROW_EASE = "power3.in";       // then it grows over the stage until 1
  const CREAM = "#f5e7df";             // fallback for --gz-cream

  /* ---- cream fill of the transition card: 2D port of the reference shader, a
     front rising from the bottom that wobbles with value noise mid-way ---- */
  function creamReveal(canvas, reduced) {
    const ctx = canvas && canvas.getContext && canvas.getContext("2d");
    if (!ctx) return { setProgress() {}, resize() {}, onDraw() {} };
    const fract = (v) => v - Math.floor(v);
    function hash(x, y, z) {
      x = fract(x * 0.3183099 + 0.1) * 17;
      y = fract(y * 0.3183099 + 0.1) * 17;
      z = fract(z * 0.3183099 + 0.1) * 17;
      return fract(x * y * z * (x + y + z));
    }
    function noise(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      let fx = x - ix, fy = y - iy;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      const bottom = hash(ix, iy, 0) + (hash(ix + 1, iy, 0) - hash(ix, iy, 0)) * fx;
      const top = hash(ix, iy + 1, 0) + (hash(ix + 1, iy + 1, 0) - hash(ix, iy + 1, 0)) * fx;
      return bottom + (top - bottom) * fy;
    }
    /* --tk-cover (css/palette.css) is the cover colour; the reference cream otherwise */
    const rootStyle = getComputedStyle(document.documentElement);
    const color = rootStyle.getPropertyValue("--tk-cover").trim() || rootStyle.getPropertyValue("--gz-cream").trim() || CREAM;
    const t0 = performance.now();
    const now = () => (performance.now() - t0) / 1000;
    let progress = 0, raf = null, w = 1, h = 1;
    /* onDraw(front): told the cream's outline after every frame: "none", "full", or
       the wavy front as [u 0..1 across, v 0..1 down] points (the ROI layer follows it) */
    let hook = null;

    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      if (progress <= 0) { if (hook) hook("none"); return; }
      ctx.fillStyle = color;
      if (progress >= 1) { ctx.fillRect(0, 0, w, h); if (hook) hook("full"); return; }
      const front = -0.08 + 1.16 * progress;             // mix(-0.08, 1.08, p)
      const wobble = Math.sin(progress * Math.PI) * 0.15; // noise envelope * strength
      const steps = 48;
      const pts = [];
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const n = noise(u * 2 - time * 0.45, time * 0.35) - 0.5;
        const v = 1 - (front + n * wobble);
        ctx.lineTo(u * w, h * v);
        pts.push([u, v]);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      if (hook) hook(pts);
    }
    function loop() { draw(now()); raf = requestAnimationFrame(loop); }
    function stop() { if (raf !== null) cancelAnimationFrame(raf); raf = null; }
    function setProgress(p) {
      p = gsap.utils.clamp(0, 1, p);
      if (p === progress) return;
      progress = p;
      if (!reduced && p > 0 && p < 1) { if (raf === null) raf = requestAnimationFrame(loop); return; }
      stop();
      draw(now());
    }
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(canvas.clientWidth, 1);
      h = Math.max(canvas.clientHeight, 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(now());
    }
    resize();
    return { setProgress, resize, onDraw(fn) { hook = fn; } };
  }

  function init() {
    const root = document.getElementById("section-toolkit");
    if (!root || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    const pinHeight = root.querySelector(".tk__pin-height");
    const container = root.querySelector(".tk__container");
    const frontWheel = root.querySelector(".tk__wheel--frontend");
    const frontSlots = Array.from(root.querySelectorAll(".tk__wheel--frontend .tk__slot"));
    const artWheel = root.querySelector(".tk__wheel--art");
    const artSlots = Array.from(root.querySelectorAll(".tk__wheel--art .tk__slot"));
    const flipSlot = root.querySelector(".tk__slot--transition");
    const flipper = flipSlot && flipSlot.querySelector(".tk-card__flipper");
    const subFront = root.querySelector(".tk__subtitle--front");
    const subArt = root.querySelector(".tk__subtitle--art");
    const header = root.querySelector(".tk__header");
    const subWrap = root.querySelector(".tk__subtitle-wrap");
    const creamCard = root.querySelector(".tk-card--transition");
    const creamSlot = creamCard && creamCard.closest(".tk__slot");
    if (!pinHeight || !container || !artWheel || !artSlots.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* without the front-end deck (removed by tools/brand-content.js) the stage opens
       straight on the art-direction deck: the pin progress is mapped onto the art phases */
    const artOnly = !frontWheel || !frontSlots.length;

    const norm = (v, a, b) => gsap.utils.clamp(0, 1, (v - a) / (b - a));
    const TOP_Z = frontSlots.length + artSlots.length + 10;
    let stacked = false;
    let ripple = null, rippleSlot = null, rippleZ = 0;
    const cream = creamReveal(creamCard && creamCard.querySelector(".tk-card__cream"), reduced);
    let grown = false;

    /* ---- keep the cards clear of the subtitle: on short or narrow viewports the
       stylesheet position lets them overlap, so the deck moves down and, if it
       still does not fit, the cards shrink until it does ---- */
    function fit() {
      root.style.removeProperty("--tk-wheel-top");
      root.style.removeProperty("--tk-card-w");
      const probe = artSlots[0].querySelector(".tk-card");
      if (!header || !subWrap || !probe) return;
      const stageH = container.clientHeight;
      const h = probe.offsetHeight;
      const center = artWheel.offsetTop;
      const fontSize = parseFloat(getComputedStyle(subWrap).fontSize) || 20;
      const textBottom = header.offsetTop + subWrap.offsetTop + fontSize * 1.3;
      const gap = Math.max(20, stageH * 0.03);
      const lift = (hh) => Math.max(hh * 0.06, 24 + hh * 0.035); // hover lift / click bounce
      if (center - h / 2 - lift(h) >= textBottom + gap) return;
      const bottom = stageH - Math.max(16, stageH * 0.03);
      const newH = Math.max(80, Math.min(h, (bottom - textBottom - gap - 24) / 1.06));
      const minCenter = textBottom + gap + lift(newH) + newH / 2;
      const newCenter = Math.min(Math.max(center, minCenter), Math.max(minCenter, bottom - newH / 2));
      if (newH < h) root.style.setProperty("--tk-card-w", (newH * 295 / 417).toFixed(2) + "px");
      root.style.setProperty("--tk-wheel-top", newCenter.toFixed(2) + "px");
    }

    /* ---- scale at which the transition card covers the whole stage ---- */
    let coverKey = "", cover = 8;
    function coverScale() {
      const key = window.innerWidth + "x" + window.innerHeight;
      if (key === coverKey) return cover;
      const r = creamCard.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const needW = Math.max(cx, window.innerWidth - cx) * 2;
      const needH = Math.max(cy, window.innerHeight - cy) * 2;
      cover = Math.max(needW / Math.max(creamCard.offsetWidth, 1), needH / Math.max(creamCard.offsetHeight, 1)) * 1.1;
      coverKey = key;
      return cover;
    }

    function fan(slots, wheel) {
      slots.forEach((s, i) => { s.classList.add("is-visible"); gsap.set(s, { rotation: i * STEP, zIndex: i + 1, scale: 1 }); });
      gsap.set(wheel, { rotation: -((slots.length - 1) * STEP) / 2, autoAlpha: 1, pointerEvents: "auto" });
      wheel.classList.add("is-interactive");
    }
    function resetFront() {
      if (artOnly) return;
      frontSlots.forEach((s, i) => { s.classList.toggle("is-visible", i === 0); gsap.set(s, { rotation: i * STEP, zIndex: i + 1, scale: 1 }); });
      frontWheel.classList.add("is-interactive");
      gsap.set(frontWheel, { rotation: 0, autoAlpha: 1, pointerEvents: "auto" });
    }
    function resetArt() {
      artSlots.forEach((s, i) => { s.classList.toggle("is-visible", i === 0); gsap.set(s, { rotation: i * STEP, zIndex: i + 1, scale: 1 }); });
      artWheel.classList.remove("is-interactive");
      gsap.set(artWheel, { rotation: 0, autoAlpha: 0, pointerEvents: "none" });
      if (creamCard) gsap.set(creamCard, { clearProps: "transform,transition" });
      grown = false;
      cream.setProgress(0);
    }
    function resetFlip() {
      if (flipper) gsap.set(flipper, { rotationY: 0 });
      if (subFront) gsap.set(subFront, { autoAlpha: 1 });
      if (subArt) gsap.set(subArt, { autoAlpha: 0 });
    }

    /* ---- click ripple: the clicked card bounces, its neighbours follow weaker and later ---- */
    function bounce(targets, strength) {
      const tl = gsap.timeline();
      tl.to(targets, { y: 6 * strength, scale: 1 - 0.03 * strength, duration: 0.08, ease: "power2.in" });
      tl.to(targets, { y: -24 * strength, scale: 1 + 0.07 * strength, duration: 0.18, ease: "power3.out" });
      tl.to(targets, { y: 0, scale: 1, duration: 0.42, ease: "elastic.out(0.8, 0.35)" });
      return tl;
    }
    function rippleFrom(slots, index) {
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
    function wireInteractions(slots) {
      slots.forEach((slot, i) => {
        const card = slot.querySelector(".tk-card");
        if (!card) return;
        card.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") gsap.set(slot, { zIndex: TOP_Z }); });
        card.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch" && slot !== rippleSlot) gsap.set(slot, { zIndex: i + 1 }); });
        card.addEventListener("click", () => {
          killRipple();
          const tl = rippleFrom(slots, i);
          if (!tl) return;
          ripple = tl; rippleSlot = slot; rippleZ = i + 1;
          gsap.set(slot, { zIndex: TOP_Z });
          tl.eventCallback("onComplete", () => { if (ripple === tl) { releaseRipple(); ripple = null; } });
          tl.play();
        });
      });
    }

    fit();
    resetFront(); resetArt(); resetFlip();
    wireInteractions(frontSlots); wireInteractions(artSlots);

    /* ROI calculator on the cream cover (moved in by tools/roi-stage.js): the pin holds
       ROI_HOLD viewports longer than the deck needs, and the calculator fades in there */
    const roi = container.querySelector("#roi-calculator.tk__roi");
    const ROI_HOLD = 1.6;   // viewports; css/roi-stage.css adds the same 160vh
    const ROI_FADE = 0.35;  // viewports of the hold used by the fade-in

    if (reduced) {
      /* no cover animation: the calculator goes back to being its own section */
      if (roi) { roi.classList.remove("tk__roi"); root.after(roi); root.classList.remove("tk--roi"); }
      pinHeight.style.height = "100vh";
      if (artOnly) { gsap.set(frontWheel, { autoAlpha: 0 }); fan(artSlots, artWheel); if (subArt) gsap.set(subArt, { autoAlpha: 1 }); }
      else fan(frontSlots, frontWheel);
      window.addEventListener("resize", fit);
      return;
    }

    /* deal cards out one by one (count grows with progress) or take them back */
    function deal(slots, wheel, count, state) {
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
    /* gather the dealt cards back into a single stack (t: 0 fanned, 1 stacked) */
    function gather(slots, wheel, t) {
      gsap.killTweensOf(wheel);
      slots.forEach((s, i) => gsap.set(s, { rotation: i * STEP * (1 - t) }));
      gsap.set(wheel, { rotation: -((slots.length - 1) * STEP) / 2 * (1 - t) });
    }

    const front = { count: 0, rot: 0 }, art = { count: 0, rot: 0 };

    function update(p) {
      if (ripple) killRipple();
      if (artOnly) p = FLIP_END + p * (1 - FLIP_END);

      const artPhase = p >= FLIP_END;
      const artInteractive = artPhase && p < ART_STACK_END;
      gsap.set(artWheel, { autoAlpha: artPhase ? 1 : 0, pointerEvents: artInteractive ? "auto" : "none" });
      artWheel.classList.toggle("is-interactive", artInteractive);
      if (!artOnly) {
        gsap.set(frontWheel, { autoAlpha: artPhase ? 0 : 1, pointerEvents: artPhase ? "none" : "auto" });
        frontWheel.classList.toggle("is-interactive", !artPhase);
      }

      if (!artOnly) {
        /* 1. deal the front-end deck */
        const dealt = Math.min(Math.floor(Math.min(p / FRONT_DEAL_END, 1) * frontSlots.length), frontSlots.length - 1);
        deal(frontSlots, frontWheel, dealt, front);
        if (p < FRONT_DEAL_END) {
          if (stacked) {
            frontSlots.forEach((s, i) => s.classList.toggle("is-visible", i <= front.count));
            stacked = false;
          }
          return;
        }

        /* 2. gather it into a stack, leaving only the flip card */
        gather(frontSlots, frontWheel, norm(p, FRONT_DEAL_END, FRONT_STACK_END));
        if (p >= FRONT_STACK_END && !stacked) {
          frontSlots.forEach((s) => { if (s !== flipSlot) s.classList.remove("is-visible"); });
          if (flipSlot) flipSlot.classList.add("is-visible");
          stacked = true;
        }
        if (p < FRONT_STACK_END && stacked) {
          frontSlots.forEach((s, i) => s.classList.toggle("is-visible", i <= front.count));
          stacked = false;
        }
      }

      /* 3. flip Shopify to Figma while the subtitle swaps */
      const flip = norm(p, FRONT_STACK_END, FLIP_END);
      if (flipper) gsap.set(flipper, { rotationY: 180 * flip });
      if (subFront) gsap.set(subFront, { autoAlpha: 1 - norm(flip, 0, 0.5) });
      if (subArt) gsap.set(subArt, { autoAlpha: norm(flip, 0.5, 1) });

      /* 4. deal the art-direction deck (the transition card comes last) */
      const artDealt = Math.min(Math.floor(norm(p, FLIP_END, ART_DEAL_END) * artSlots.length), artSlots.length - 1);
      deal(artSlots, artWheel, artDealt, art);

      /* 5. gather the art deck behind the transition card */
      if (p >= ART_DEAL_END) {
        gather(artSlots, artWheel, norm(p, ART_DEAL_END, ART_STACK_END));
        if (creamSlot) gsap.set(creamSlot, { zIndex: artSlots.length + 20 });
      }
      if (!creamCard) return;

      /* 6. the cream front rises inside the transition card */
      cream.setProgress(norm(p, ART_STACK_END, CREAM_END));

      /* 7. the card grows until it covers the stage */
      if (p >= CREAM_END) {
        const t = gsap.parseEase(GROW_EASE)(norm(p, CREAM_END, 1));
        gsap.set(creamCard, { transition: "none", yPercent: -50, y: 0, scale: gsap.utils.interpolate(1, coverScale(), t) });
        grown = true;
      } else if (grown) {
        gsap.set(creamCard, { clearProps: "transform,transition" });
        grown = false;
      }
    }

    ScrollTrigger.addEventListener("refreshInit", () => { fit(); coverKey = ""; });
    ScrollTrigger.addEventListener("refresh", () => cream.resize());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

    /* ---- the ROI layer: shown (display) only once it starts fading in, so its own
       reveal animations (js/roi.js, in-view) play when it actually appears; scaled
       down if the calculator is taller than the stage ---- */
    let roiShown = false;
    function fitRoi() {
      const inner = roi && roi.firstElementChild;
      if (!inner || !roiShown) return;
      inner.style.transform = "";
      inner.style.width = inner.style.maxWidth = inner.style.flexShrink = "";
      const cs = getComputedStyle(roi);
      const room = roi.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const roomW = roi.clientWidth;
      if (roomW < 768) {
        const s = Math.min(1, room / Math.max(inner.offsetHeight, 1));
        if (s < 1) inner.style.transform = `scale(${s.toFixed(3)})`;
        return;
      }
      /* fill the whole screen: the calculator gets taller as its layout widens, so
         pick the layout width whose fit-to-height scale also fills the width (never
         shrinking the text below ROI_MIN_SCALE), then scale it to fit both ways */
      const ROI_MIN_SCALE = 0.72;
      inner.style.flexShrink = "0";   // the stage is a flex row: keep the chosen width
      const heightAt = (w) => { inner.style.width = inner.style.maxWidth = w + "px"; return Math.max(inner.offsetHeight, 1); };
      let lo = Math.min(roomW, 900), hi = roomW * 2.5;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2, s = room / heightAt(mid);
        if (s * mid <= roomW && s >= ROI_MIN_SCALE) lo = mid; else hi = mid;
      }
      const s = Math.min(roomW / lo, room / heightAt(lo));
      inner.style.transform = `scale(${s.toFixed(3)})`;
    }
    function showRoi(r) {
      if (!roi) return;
      const on = r > 0;
      if (on !== roiShown) { roi.classList.toggle("is-on", on); roiShown = on; if (on) fitRoi(); }
      gsap.set(roi, { opacity: r, pointerEvents: r > 0.5 ? "auto" : "none" });
    }
    if (roi) ScrollTrigger.addEventListener("refresh", fitRoi);
    /* the cream's latest outline (from the canvas), redrawn every frame while it wobbles */
    let creamPhase = false, creamFront = "none";
    if (roi) cream.onDraw((front) => { creamFront = front; if (creamPhase) creamClip(); });

    const trigger = ScrollTrigger.create({
      trigger: pinHeight,
      start: "top top",
      end: "bottom bottom",
      pin: container,
      pinSpacing: false,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => progress(self),
      onRefresh: (self) => progress(self),
    });
    /* the deck uses the pin minus the hold; the hold belongs to the calculator */
    function progress(self) {
      if (!roi) { update(self.progress); return; }
      const vh = window.innerHeight, hold = vh * ROI_HOLD;
      const range = Math.max(self.end - self.start - hold, 1);
      const y = self.scroll() - self.start;
      const p = gsap.utils.clamp(0, 1, y / range);
      update(p);
      if (y >= range) { creamPhase = false; roiFrame(1); }
      else if (p >= CREAM_END) { creamPhase = false; roiFrame(norm(p, CREAM_END, 1)); }
      else if (p > ART_STACK_END) { creamPhase = true; creamClip(); }
      else { creamPhase = false; roiFrame(-1); }
    }

    /* ---- the calculator opens with the transition card. While the cream rises
       inside the card, the calculator layer is clipped to the cream's wavy front
       (so the cream carries the calculator in); while the card then grows over the
       stage, it is clipped to the card's rounded outline and scaled with it
       (cover-fit around the card's centre), reaching full screen together ---- */
    function roiGeometry() {
      const r = creamCard.getBoundingClientRect(), s = container.getBoundingClientRect();
      /* contain-fit: the whole calculator shows inside the card (centred), and it
         grows with the card until both fill the stage */
      const f = Math.min(1, r.width / s.width, r.height / s.height);
      const ox = r.left + r.width / 2 - s.left, oy = r.top + r.height / 2 - s.top;
      /* the clip lives in the layer's own (unscaled) coordinates: map on-screen
         points back through the scale about (ox, oy) */
      const lx = (x) => ox + (x - s.left - ox) / f, ly = (yy) => oy + (yy - s.top - oy) / f;
      roi.style.transformOrigin = `${ox}px ${oy}px`;
      roi.style.transform = `scale(${f.toFixed(4)})`;
      return { r, s, f, lx, ly };
    }
    function roiFrame(g) {
      if (g < 0) { showRoi(0); roi.style.clipPath = roi.style.transform = ""; return; }
      showRoi(1);
      if (g >= 1) { roi.style.clipPath = roi.style.transform = ""; return; }
      const { r, s, f, lx, ly } = roiGeometry();
      const top = Math.max(0, ly(r.top)), left = Math.max(0, lx(r.left));
      const bottom = Math.max(0, s.height - ly(r.bottom)), right = Math.max(0, s.width - lx(r.right));
      const rx = (r.width * 0.068) / f, ry = (r.height * 0.048) / f;
      roi.style.clipPath = `inset(${top.toFixed(1)}px ${right.toFixed(1)}px ${bottom.toFixed(1)}px ${left.toFixed(1)}px round ${rx.toFixed(1)}px / ${ry.toFixed(1)}px)`;
    }

    function creamClip() {
      if (creamFront === "none") { showRoi(0); return; }
      showRoi(1);
      const { r, lx, ly } = roiGeometry();
      const rx = r.width * 0.068, ry = r.height * 0.048;
      /* the card's rounded outline: how far below its top edge the outline starts at x */
      const edgeTop = (x) => {
        const d = x < r.left + rx ? r.left + rx - x : x > r.right - rx ? x - (r.right - rx) : 0;
        return d ? ry - ry * Math.sqrt(Math.max(0, 1 - (d / rx) ** 2)) : 0;
      };
      const pts = [];
      const wave = creamFront === "full" ? Array.from({ length: 49 }, (_, i) => [i / 48, 0]) : creamFront;
      for (const [u, v] of wave) {
        const x = r.left + u * r.width;
        pts.push([x, r.top + Math.max(v * r.height, edgeTop(x))]);
      }
      /* the bottom corners of the card, right then left */
      for (let k = 0; k <= 6; k++) {
        const a = (Math.PI / 2) * (k / 6);
        pts.push([r.right - rx + rx * Math.cos(a), r.bottom - ry + ry * Math.sin(a)]);
      }
      for (let k = 0; k <= 6; k++) {
        const a = Math.PI / 2 + (Math.PI / 2) * (k / 6);
        pts.push([r.left + rx + rx * Math.cos(a), r.bottom - ry + ry * Math.sin(a)]);
      }
      roi.style.clipPath = "polygon(" + pts.map(([x, y]) => `${lx(x).toFixed(1)}px ${ly(y).toFixed(1)}px`).join(",") + ")";
    }

    /* links to the calculator (menu, footer, side dots) land where it is fully shown */
    if (roi) {
      document.addEventListener("click", (e) => {
        const t = e.target.closest && e.target.closest('a[href="#roi-calculator"], button[data-section="roi-calculator"]');
        if (!t || !root.contains(roi)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        window.scrollTo({ top: trigger.end - window.innerHeight * (ROI_HOLD - ROI_FADE) / 2, behavior: "smooth" });
      }, true);
    }
  }

  window.LiaToolkit = { init };
})();
