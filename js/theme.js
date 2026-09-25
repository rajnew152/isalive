/* =============================================================================
   theme.js — light / dark switching (next-themes behaviour: `class` attribute
   on <html>, storage key "theme", default "dark", system detection disabled).
   ============================================================================= */
(function () {
  "use strict";
  const root = document.documentElement;

  function current() {
    return root.classList.contains("light") ? "light" : "dark";
  }

  function apply(theme) {
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.colorScheme = theme;
    try { localStorage.setItem("theme", theme); } catch (e) { /* ignore */ }
    syncControls();
    window.dispatchEvent(new CustomEvent("lia:themechange", { detail: { theme } }));
  }

  function syncControls() {
    const dark = current() === "dark";
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      const sun = btn.querySelector(".lucide-sun");
      const moon = btn.querySelector(".lucide-moon");
      // classes mirror the React component: sun visible in light, moon in dark
      if (sun) { sun.classList.toggle("scale-0", dark); sun.classList.toggle("rotate-45", dark); sun.classList.toggle("opacity-0", dark); sun.classList.toggle("scale-100", !dark); sun.classList.toggle("rotate-0", !dark); sun.classList.toggle("opacity-100", !dark); }
      if (moon) { moon.classList.toggle("scale-100", dark); moon.classList.toggle("rotate-0", dark); moon.classList.toggle("opacity-100", dark); moon.classList.toggle("scale-0", !dark); moon.classList.toggle("-rotate-45", !dark); moon.classList.toggle("opacity-0", !dark); }
      const wrap = btn.closest(".sm-extra");
      if (wrap) wrap.style.color = dark ? "#ffffff" : "#0a0a0f";
    }
    // menu button colour follows the theme when the menu is closed
    const toggle = document.querySelector("#staggered-menu .sm-toggle");
    if (toggle && toggle.getAttribute("aria-expanded") !== "true") {
      toggle.style.color = dark ? "#ffffff" : "#0a0a0f";
    }
  }

  function init() {
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.addEventListener("click", () => apply(current() === "dark" ? "light" : "dark"));
    syncControls();
  }

  window.LiaTheme = { init, apply, current, isDark: () => current() === "dark" };
})();
