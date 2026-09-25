/* =============================================================================
   journey-fluid.js — the liquid distortion of the orange / purple gradient in
   the "Today / I bridge / the two." section (port of createImageDistortionScene
   from guillaumezhu.com). Once the two gradient slices driven by js/journey.js
   meet and fill the stage, a WebGL canvas showing the same image takes over:
   the picture slowly flows on its own and is dragged by the pointer like a
   fluid. Self-contained: it only reads the slices' geometry, so journey.js is
   untouched. Falls back to the static slices when WebGL is unavailable.
   ============================================================================= */
(function () {
  "use strict";

  const IMAGE_URL = "assets/trajectory/background.webp";

  /* same values as the reference scene + its trajectory "wake up" settings */
  const CFG = {
    radius: 0.35,
    velocityGain: 0.25,
    positionDamping: 0.1,
    velocityDamping: 0.15,
    strengthRise: 0.15,
    strengthDecay: 0.03,
    idleSpeed: 1,
    idleFrequency: [5, 20],
    idleStable: 0.012,
    zoomActive: 1.02,
    maxPixelRatio: 1.5,
    wakeSeconds: 1.4,
  };

  const VERT = `attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

  const FRAG = `precision highp float;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_idleSpeed;
uniform float u_idleStrength;
uniform vec2 u_idleFrequency;
uniform vec2 u_mouse;
uniform vec2 u_velocity;
uniform float u_strength;
uniform float u_radius;
uniform float u_zoom;
uniform float u_interactionStrength;
varying vec2 v_uv;

void main() {
  vec2 uv = v_uv;
  float time = u_time * u_idleSpeed;

  vec2 idleFlow = vec2(
    sin(uv.y * u_idleFrequency.x + time) +
      sin(uv.x * 1.7 - time * 0.63) * 0.5,
    cos(uv.x * u_idleFrequency.y - time * 0.7) +
      cos(uv.y * 1.5 + time * 0.47) * 0.5
  ) / 1.5;

  vec2 mouseDelta = uv - u_mouse;
  mouseDelta.x *= u_resolution.x / u_resolution.y;
  float mouseInfluence = smoothstep(u_radius, 0.0, length(mouseDelta));
  vec2 mouseOffset = u_velocity * mouseInfluence * u_strength;

  /* the image is stretched to the stage, exactly like the CSS slices */
  vec2 imageUv = uv + idleFlow * u_idleStrength - mouseOffset * u_interactionStrength;
  imageUv = (imageUv - 0.5) / u_zoom + 0.5;
  gl_FragColor = texture2D(u_image, imageUv);
}`;

  const damp = (k, dt) => 1 - Math.pow(1 - k, dt * 60);

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return sh;
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(log || "shader compile failed");
  }

  function init() {
    const root = document.getElementById("section-journey");
    if (!root || root.dataset.fluid) return;
    const container = root.querySelector(".traj__container");
    const visuals = root.querySelector(".traj__visuals");
    const left = root.querySelector(".traj__visual--left");
    const right = root.querySelector(".traj__visual--right");
    if (!container || !visuals || !left || !right) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.dataset.fluid = "1";

    const wrap = document.createElement("div");
    wrap.className = "traj__fluid";
    const canvas = document.createElement("canvas");
    canvas.className = "traj__fluid-canvas";
    wrap.appendChild(canvas);
    visuals.appendChild(wrap);

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) { wrap.remove(); return; }

    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (err) {
      console.error("journey-fluid: unable to build the shader", err);
      wrap.remove();
      return;
    }

    const U = {};
    ["u_image", "u_resolution", "u_time", "u_idleSpeed", "u_idleStrength", "u_idleFrequency", "u_mouse",
      "u_velocity", "u_strength", "u_radius", "u_zoom", "u_interactionStrength"]
      .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(prog);
    const aPos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(U.u_image, 0);
    gl.uniform1f(U.u_idleSpeed, CFG.idleSpeed);
    gl.uniform2fv(U.u_idleFrequency, CFG.idleFrequency);
    gl.uniform1f(U.u_radius, CFG.radius);

    let texture = null;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };
    img.src = IMAGE_URL;

    /* pointer state (same damping model as the reference) */
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const target = { x: 0.5, y: 0.5 }, pos = { x: 0.5, y: 0.5 }, prev = { x: 0.5, y: 0.5 };
    const vel = { x: 0, y: 0 }, smoothVel = { x: 0, y: 0 };
    let strength = 0, hovering = false, primed = true;

    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      const r = container.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
      if (primed) {
        pos.x = prev.x = target.x; pos.y = prev.y = target.y;
        vel.x = vel.y = smoothVel.x = smoothVel.y = 0; strength = 0; primed = false;
      }
      hovering = true;
    };
    const onLeave = () => { hovering = false; primed = true; };
    if (finePointer) {
      container.addEventListener("pointerenter", onMove, { passive: true });
      container.addEventListener("pointermove", onMove, { passive: true });
      container.addEventListener("pointerleave", onLeave);
    }

    let visible = false, raf = 0, last = 0, time = 0, wake = 0, shown = false;

    /* the canvas takes over only while both slices exactly fill the stage */
    function slicesFill() {
      const c = container.getBoundingClientRect();
      const l = left.getBoundingClientRect();
      const r = right.getBoundingClientRect();
      const near = (a, b) => Math.abs(a - b) <= 1;
      return parseFloat(getComputedStyle(left).opacity) > 0.99 &&
        near(l.left, c.left) && near(r.right, c.right) &&
        near(l.top, c.top) && near(l.bottom, c.bottom) &&
        near(r.top, c.top) && near(r.bottom, c.bottom) && l.right >= r.left - 1;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, CFG.maxPixelRatio);
      const w = Math.max(1, Math.round(container.clientWidth * dpr));
      const h = Math.max(1, Math.round(container.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = last ? Math.min(Math.max((now - last) / 1000, 1 / 240), 1 / 30) : 1 / 60;
      last = now;

      const active = !!texture && slicesFill();
      /* strengths come from the scroll-scrubbed journey timeline; without it,
         wake up over time instead */
      const scrubbed = window.LiaJourney && window.LiaJourney.fluid;
      wake += ((active ? 1 : 0) - wake) * Math.min(1, dt / (CFG.wakeSeconds / 4));
      if (!active) wake = 0;
      const idleStrength = scrubbed ? scrubbed.idle : CFG.idleStable * wake;
      const interaction = scrubbed ? scrubbed.interaction : wake;
      const zoom = scrubbed ? scrubbed.zoom : 1 + (CFG.zoomActive - 1) * wake;

      if (active !== shown) {
        shown = active;
        wrap.style.opacity = active ? "1" : "0";
        if (!active) time = 0;
      }

      if (active) {
        time += dt;
        const pd = damp(CFG.positionDamping, dt);
        pos.x += (target.x - pos.x) * pd;
        pos.y += (target.y - pos.y) * pd;
        vel.x = (pos.x - prev.x) / dt * CFG.velocityGain;
        vel.y = (pos.y - prev.y) / dt * CFG.velocityGain;
        prev.x = pos.x; prev.y = pos.y;
        const vd = damp(CFG.velocityDamping, dt);
        smoothVel.x += (vel.x - smoothVel.x) * vd;
        smoothVel.y += (vel.y - smoothVel.y) * vd;
        const goal = hovering ? Math.min(Math.hypot(smoothVel.x, smoothVel.y) * 6, 1) : 0;
        strength += (goal - strength) * damp(strength < goal ? CFG.strengthRise : CFG.strengthDecay, dt);

        resize();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1f(U.u_idleStrength, idleStrength);
        gl.uniform1f(U.u_interactionStrength, finePointer ? interaction : 0);
        gl.uniform1f(U.u_zoom, zoom);
        gl.uniform2f(U.u_mouse, pos.x, pos.y);
        gl.uniform2f(U.u_velocity, smoothVel.x, smoothVel.y);
        gl.uniform1f(U.u_strength, strength);
        gl.uniform2f(U.u_resolution, canvas.width, canvas.height);
        gl.uniform1f(U.u_time, time);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(frame);
    }

    const start = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }).observe(container);
    document.addEventListener("visibilitychange", start);
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      visible = false;
      wrap.remove();
    });
  }

  window.LiaJourneyFluid = { init };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
