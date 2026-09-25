/* =============================================================================
   waveform.js — the hero's circular waveform canvas (port of the site's
   CircularWaveformCanvas component). `activity` is a mutable object with
   { intensity: 0..1, mode: "idle"|"listening"|"processing"|"speaking"|"error" }.
   ============================================================================= */
(function () {
  "use strict";
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  function create(wrapper, canvas, activity, showCore = false) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return { destroy() {} };

    const pointer = { x: 0, y: 0, active: false };
    let raf = 0, size = 0, visible = true, time = 0, paused = false, running = false, throttle = 1, frameNo = 0;

    function resize() {
      const w = Math.max(1, Math.floor(wrapper.offsetWidth));
      const dpr = window.devicePixelRatio || 1;
      size = w;
      canvas.width = w * dpr; canvas.height = w * dpr;
      canvas.style.width = w + "px"; canvas.style.height = w + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function ring(radius, alpha, width, a0 = 0, a1 = 2 * Math.PI) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, radius, a0, a1);
      ctx.strokeStyle = `rgba(240, 110, 150, ${alpha})`;
      ctx.lineWidth = width;
      ctx.stroke();
    }

    function drawWave(t, intensity, mode) {
      const mid = size / 2;
      const g = ctx.createLinearGradient(0, mid, size, mid);
      g.addColorStop(0, "rgba(255, 122, 58, 0)");
      g.addColorStop(0.18, "rgba(255, 122, 58, 0.9)");
      g.addColorStop(0.48, "rgba(255, 196, 214, 0.82)");
      g.addColorStop(0.52, "rgba(246, 205, 255, 0.82)");
      g.addColorStop(0.82, "rgba(200, 70, 255, 0.9)");
      g.addColorStop(1, "rgba(200, 70, 255, 0)");
      const i = mode === "speaking" || mode === "listening" ? Math.max(intensity, 0.2) : Math.max(intensity, 0.08);
      ctx.beginPath();
      for (let x = 0; x <= size; x += 2) {
        const d = Math.abs(x - mid);
        const y = mid
          + Math.sin(0.08 * x + t * (7 + 6 * i)) * (10 + 20 * i) * Math.exp(-d / (0.14 * size))
          + Math.sin(0.34 * x - t * (11 + 9 * i)) * (4 + 8 * i) * Math.exp(-d / (0.22 * size));
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = g;
      ctx.lineWidth = 2.1 + 1.3 * i;
      ctx.shadowBlur = 18 + 10 * i;
      ctx.shadowColor = "rgba(255, 170, 190, 0.5)";
      ctx.stroke();
    }

    function drawOrbits(t, intensity, mode) {
      const c = size / 2;
      const base = 0.265 * size;
      const o = clamp(Math.max(intensity,
        mode === "listening" ? 0.24 + 0.18 * Math.abs(Math.sin(2.8 * t))
        : mode === "speaking" ? 0.22 + 0.13 * Math.abs(Math.sin(1.1 * t))
        : mode === "processing" ? 0.14 + 0.06 * Math.abs(Math.sin(1.8 * t))
        : mode === "error" ? 0.18 + 0.05 * Math.abs(Math.sin(7.4 * t))
        : 0.04));
      for (let k = 0; k < 4; k += 1) {
        const g = ctx.createLinearGradient(c - base, c, c + base, c);
        g.addColorStop(0, `rgba(255, 112, 58, ${0.95 - 0.16 * k})`);
        g.addColorStop(0.44, `rgba(255, 78, 140, ${0.72 - 0.12 * k})`);
        g.addColorStop(0.56, `rgba(232, 68, 200, ${0.72 - 0.12 * k})`);
        g.addColorStop(1, `rgba(196, 72, 255, ${0.95 - 0.16 * k})`);
        ctx.beginPath();
        for (let deg = 0; deg <= 360; deg += 1) {
          const a = (deg / 360) * Math.PI * 2;
          const pa = Math.atan2(pointer.y, pointer.x || 1);
          const pd = pointer.active ? Math.min(Math.hypot(pointer.x, pointer.y) / (1.6 * base), 1) : 0;
          const amp = 1 + o * (1.15 + 0.08 * k);
          const wob = 18 * Math.sin(3.2 * a - 1.35 * t + 0.65 * k) * amp
            + 10 * Math.cos(6.7 * a + 1.9 * t - k) * amp
            + Math.sin(12.4 * a - 1.5 * t + 2 * k) * (5 + 12 * o);
          const r = base + 12 * k + wob + Math.cos(a - pa - 0.2 * t) * pd * (16 + 12 * o) + Math.sin(t * (1 + 2 * o) + k) * (4 + 8 * o);
          const sy = 0.94 + Math.sin(2 * a - t) * (0.03 + 0.04 * o);
          const x = c + Math.cos(a) * r;
          const y = c + Math.sin(a) * r * sy;
          deg === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.35 + 0.75 * o;
        ctx.shadowBlur = 22 + 16 * o;
        ctx.shadowColor = k < 2 ? "rgba(255, 110, 90, 0.55)" : "rgba(206, 80, 255, 0.55)";
        ctx.stroke();
      }
    }

    function frame() {
      if (paused || !visible) { running = false; return; }
      running = true;
      // while the scroll reveal scales/fades the orb, draw every other frame
      if (throttle > 1 && (frameNo++ % throttle) !== 0) { raf = requestAnimationFrame(frame); return; }
      const t = time;
      const c = size / 2;
      const s = clamp(activity.intensity);
      const coreR = size * (0.19 + 0.018 * s);
      ctx.clearRect(0, 0, size, size);
      ctx.shadowBlur = 0;
      const light = document.documentElement.classList.contains("light");
      const bg = ctx.createRadialGradient(c, c, 0.04 * size, c, c, 0.5 * size);
      if (light) {
        bg.addColorStop(0, "rgba(255, 245, 248, 0.92)");
        bg.addColorStop(0.4, `rgba(253, 236, 242, ${0.66 + 0.07 * s})`);
        bg.addColorStop(1, "rgba(255, 245, 248, 0)");
      } else {
        bg.addColorStop(0, "rgba(13, 7, 34, 0.95)");
        bg.addColorStop(0.4, `rgba(9, 6, 28, ${0.74 + 0.08 * s})`);
        bg.addColorStop(1, "rgba(0, 0, 0, 0)");
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
      ring(0.39 * size, 0.16 + 0.08 * s, 1.2 + 0.35 * s);
      ring(0.43 * size, 0.12 + 0.06 * s, 0.9, 0.08 * Math.PI, 1.7 * Math.PI);
      ring(0.47 * size, 0.08 + 0.04 * s, 0.7, 0.55 * Math.PI, 1.4 * Math.PI);
      drawWave(t, s, activity.mode);
      drawOrbits(t, s, activity.mode);

      const rg = ctx.createLinearGradient(c - 0.25 * size, c, c + 0.25 * size, c);
      rg.addColorStop(0, "rgba(255, 122, 58, 1)");
      rg.addColorStop(0.5, "rgba(255, 220, 230, 0.2)");
      rg.addColorStop(1, "rgba(200, 70, 255, 1)");
      ctx.beginPath();
      ctx.arc(c, c, 0.306 * size + 6 * s, 0, 2 * Math.PI);
      ctx.strokeStyle = rg;
      ctx.lineWidth = 3 + 1.5 * s;
      ctx.shadowBlur = 30 + 18 * s;
      ctx.shadowColor = "rgba(255, 90, 140, 0.7)";
      ctx.stroke();

      if (showCore) {
        const cg = ctx.createRadialGradient(c, c, 0.04 * size, c, c, 1.35 * coreR);
        if (light) {
          cg.addColorStop(0, "rgba(255, 245, 248, 0.98)"); cg.addColorStop(0.75, "rgba(252, 234, 240, 0.94)"); cg.addColorStop(1, "rgba(249, 224, 234, 0.85)");
        } else {
          cg.addColorStop(0, "rgba(14, 12, 38, 0.98)"); cg.addColorStop(0.75, "rgba(6, 4, 17, 0.96)"); cg.addColorStop(1, "rgba(3, 2, 10, 0.85)");
        }
        ctx.beginPath(); ctx.arc(c, c, 1.18 * coreR, 0, 2 * Math.PI); ctx.fillStyle = cg; ctx.fill();
      }
      time += 0.016 + 0.009 * s;
      raf = requestAnimationFrame(frame);
    }
    const resume = () => { if (!running && !paused && visible) { cancelAnimationFrame(raf); frame(); } };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left - r.width / 2;
      pointer.y = e.clientY - r.top - r.height / 2;
      pointer.active = true;
    };
    const onLeave = () => { pointer.active = false; };
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    }, { threshold: 0 });
    io.observe(wrapper);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    resize();
    frame();

    return {
      /* stop drawing while the orb is faded out by the scroll reveal */
      setPaused(p) { paused = !!p; resume(); },
      setThrottle(n) { throttle = Math.max(1, n | 0); },
      destroy() {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerleave", onLeave);
      },
    };
  }

  window.LiaWaveform = { create, clamp };
})();
