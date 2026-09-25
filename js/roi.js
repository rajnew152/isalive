/* =============================================================================
   roi.js — ROI calculator: state, formulas, gauge and animated counters
   (port of the reference RoiCalculator component; identical maths).
   ============================================================================= */
(function () {
  "use strict";
  const { tween, reveal } = LiaMotion;
  const AGENT_OPTIONS = [5, 18, 38, 75, 150];
  const usd = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
  const num = (v) => new Intl.NumberFormat("en-US").format(v);
  const fmtK = (v) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v));
  const fmtSalary = (v) => { const t = v / 1000; return `$${t === Math.floor(t) ? t : t.toFixed(1)}K`; };
  const pt = (deg, r = 112) => { const a = (deg * Math.PI) / 180; return { x: 100 + r * Math.cos(a), y: -20 + r * Math.sin(a) }; };
  const ARC_LEN = (Math.abs(-160) / 360) * 2 * Math.PI * 112;

  function init() {
    const section = document.getElementById("roi-calculator");
    if (!section) return;
    const grid = section.querySelector(".grid");
    const leftCol = grid.children[0], rightCol = grid.children[1];
    const controls = Array.from(leftCol.querySelector(".space-y-8").children);
    const sliders = [controls[0], controls[2], controls[3]].map((c) => ({
      fill: c.querySelector(".relative > div"), badge: c.querySelector(".relative > .absolute.right-3"), input: c.querySelector("input[type=range]"),
    }));
    const agentButtons = Array.from(controls[1].querySelectorAll("button"));
    const gaugeSvg = rightCol.querySelector("svg");
    const arc = gaugeSvg.querySelector('path[stroke="url(#arc-grad)"]');
    const dots = Array.from(gaugeSvg.querySelectorAll("circle"));
    const bigNumber = rightCol.querySelector(".text-center > p");
    const monthly = rightCol.querySelector(".text-center > p:last-child");
    const rows = Array.from(rightCol.querySelectorAll(".space-y-4.border-t > div > span:last-child"));
    const stats = Array.from(rightCol.querySelectorAll(".grid-cols-2 .font-poppins"));

    const state = { conversations: 10000, agents: 38, salary: 4167, minutes: 8 };
    const formats = [fmtK, fmtSalary, (v) => `${v}m`];
    const keys = ["conversations", "salary", "minutes"];

    function compute() {
      const { conversations: e, agents: i, salary: s, minutes: d } = state;
      const automated = Math.round(0.85 * e);
      const monthlySavings = Math.round(((s * i) / Math.max(1, e)) * automated * 0.2);
      const year1 = 12 * monthlySavings;
      const reassigned = Math.max(1, Math.round(0.24 * i));
      const payroll = s * i * 12;
      const pct = payroll > 0 ? Math.round((year1 / payroll) * 100) : 0;
      return { automatedMonthly: automated, monthlySavings, year1, fiveYear: 5 * year1, hoursSaved: Math.round((e * d * 0.35 * 12) / 60), agentsReassigned: reassigned, pctPayroll: pct };
    }

    const counters = new Map();
    function animateNumber(el, value, format) {
      const prev = counters.get(el); prev && prev.stop();
      counters.set(el, tween({ duration: 0.85, ease: "easeOut", onUpdate(e) { el.textContent = format(Math.round(value * e)); } }));
    }

    let firstRender = true;
    function render() {
      sliders.forEach((s, i) => {
        const input = s.input, v = state[keys[i]];
        const pct = ((v - +input.min) / (+input.max - +input.min)) * 100;
        s.fill.style.width = `calc(${pct}% + 24px)`;
        s.badge.textContent = formats[i](v);
        input.value = v;
      });
      agentButtons.forEach((b, i) => {
        const on = AGENT_OPTIONS[i] === state.agents;
        b.className = `flex-1 rounded-full py-[11px] text-[13px] font-semibold transition-colors duration-200 ${on ? "bg-[#6d28d9] text-white shadow-[0_0_18px_rgba(109,40,217,0.45)]" : "bg-foreground/[0.05] text-foreground/35 hover:text-foreground/60"}`;
      });
      const r = compute();
      const progress = Math.min(1, r.year1 / 6e5);
      const offset = ARC_LEN * (1 - progress);
      const p = pt(170 + -160 * progress);
      const showDot = p.x > 3 && p.x < 197;
      // stroke-dashoffset animates .85s easeOut (framer animate prop)
      arc.__t && arc.__t.stop();
      const from = parseFloat(arc.getAttribute("stroke-dashoffset")) || ARC_LEN;
      arc.__t = tween({ duration: 0.85, ease: "easeOut", onUpdate(e) { arc.setAttribute("stroke-dashoffset", String(from + (offset - from) * e)); } });
      dots.forEach((c) => { c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.style.display = showDot ? "" : "none"; });
      animateNumber(bigNumber, r.year1, usd);
      monthly.innerHTML = `That&#x27;s ${usd(r.monthlySavings)} saved every month!`;
      rows[0].textContent = `${num(r.automatedMonthly)} tickets`;
      rows[1].textContent = usd(r.fiveYear);
      rows[2].textContent = `${r.pctPayroll}% of annual payroll`;
      animateNumber(stats[0], r.hoursSaved, num);
      animateNumber(stats[1], r.agentsReassigned, num);
      firstRender = false;
    }

    sliders.forEach((s, i) => s.input.addEventListener("input", () => { state[keys[i]] = Number(s.input.value); render(); }));
    agentButtons.forEach((b, i) => {
      b.addEventListener("click", () => { state.agents = AGENT_OPTIONS[i]; render(); });
      b.addEventListener("pointerdown", () => LiaMotion.animate(b, { scale: 0.95 }, { duration: 0.1 }));
      b.addEventListener("pointerup", () => LiaMotion.animate(b, { scale: 1 }, { duration: 0.15 }));
      b.addEventListener("pointerleave", () => LiaMotion.animate(b, { scale: 1 }, { duration: 0.15 }));
    });

    /* reveals (whileInView once, margin -60px) */
    const heading = leftCol.children[0], controlsWrap = leftCol.children[1], results = rightCol;
    reveal(heading, { opacity: 0, y: 20 }, { opacity: 1, y: 0 }, { duration: 0.7, margin: "-60px" });
    reveal(controlsWrap, { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, { duration: 0.7, delay: 0.1, margin: "-60px" });
    reveal(results, { opacity: 0, y: 20 }, { opacity: 1, y: 0 }, { duration: 0.7, delay: 0.12, margin: "-60px" });

    render();
  }

  window.LiaRoi = { init };
})();
