/* =============================================================================
   faq.js — FAQ accordion + reveal animations (framer whileInView / animate
   values from the reference component).
   ============================================================================= */
(function () {
  "use strict";
  const { animate, set, inView, reveal } = LiaMotion;
  const EASE_PANEL = [0.32, 0.72, 0, 1];

  function init() {
    const section = document.getElementById("section-faq");
    if (!section) return;
    const cols = section.querySelector(".grid").children;
    const leftCol = cols[0], rightCol = cols[1];

    /* left column: heading + copy animate when the column is in view (margin -80px) */
    const h2 = leftCol.querySelector("h2"), copy = leftCol.querySelector(".mt-7");
    set(h2, { opacity: 0, y: 24 }); set(copy, { opacity: 0, y: 18 });
    inView(leftCol, () => {
      animate(h2, { opacity: 1, y: 0 }, { duration: 0.7, ease: "easeOut" });
      animate(copy, { opacity: 1, y: 0 }, { duration: 0.7, ease: "easeOut", delay: 0.12 });
    }, { once: true, margin: "-80px" });

    /* right column */
    const divider = rightCol.querySelector(".origin-left");
    reveal(divider, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1 }, { duration: 0.6, ease: "easeOut", margin: "-40px" });

    const items = Array.from(rightCol.children).filter((el) => el.querySelector(":scope > button"));
    let openIndex = null;
    items.forEach((item, i) => {
      reveal(item, { opacity: 0, y: 18 }, { opacity: 1, y: 0 }, { duration: 0.55, ease: "easeOut", delay: 0.08 * i, margin: "-40px" });
      const button = item.querySelector(":scope > button");
      const underline = button.querySelector("span.absolute");
      const label = button.querySelector("span:not(.absolute):not(.shrink-0)");
      const chevron = button.querySelector("span.shrink-0");
      const panel = item.querySelector(":scope > .overflow-hidden");
      const content = panel.firstElementChild;
      set(underline, { scaleX: 0 });
      set(panel, { opacity: 0 }); panel.style.height = "0px";

      button.addEventListener("mouseenter", () => animate(underline, { scaleX: 1 }, { duration: 0.35, ease: "easeOut" }));
      button.addEventListener("mouseleave", () => animate(underline, { scaleX: 0 }, { duration: 0.35, ease: "easeOut" }));

      function apply(open) {
        label.classList.toggle("text-foreground", open);
        label.classList.toggle("text-foreground/75", !open);
        label.classList.toggle("group-hover:text-foreground", !open);
        animate(chevron, { rotate: open ? 180 : 0 }, { duration: 0.3, ease: EASE_PANEL });
        const target = open ? content.getBoundingClientRect().height : 0;
        const from = panel.getBoundingClientRect().height;
        panel.__h && panel.__h.stop();
        panel.__h = LiaMotion.tween({
          duration: 0.35, ease: EASE_PANEL,
          onUpdate(e) { panel.style.height = `${from + (target - from) * e}px`; },
          onComplete() { if (open) panel.style.height = "auto"; },
        });
        animate(panel, { opacity: open ? 1 : 0 }, { duration: 0.25, ease: "easeOut" });
      }
      button.addEventListener("click", () => {
        const next = openIndex === i ? null : i;
        if (openIndex !== null && openIndex !== i) items[openIndex].__apply(false);
        openIndex = next;
        apply(next === i);
      });
      item.__apply = apply;
    });

    const more = rightCol.querySelector(":scope > .mt-8");
    reveal(more, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, { duration: 0.5, ease: "easeOut", delay: 0.08 * items.length, margin: "-40px" });
  }

  window.LiaFaq = { init };
})();
