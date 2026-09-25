# LIA website replica (college project)

A static, dependency-free reconstruction of the homepage of https://www.lialive.ai/ —
layout, content, assets, typography, animations, interactions and responsive behaviour.

## Run it

Any static file server works. With Node installed:

```
node tools/serve.js          # http://localhost:8090/
```

or open `index.html` directly in a browser (all assets are relative).

## What is where

| Path | Purpose |
| --- | --- |
| `index.html` | The complete homepage markup (every section, every mock-up) |
| `css/fonts.css` | `@font-face` rules for Geist / Geist Mono / Cormorant Garamond (local `.woff2`) |
| `css/tailwind.css` | The compiled Tailwind v4 stylesheet used by the reference site (font paths made local) |
| `css/site.css` | Styles of the client-rendered components (menu, section dots, chat widget, preloader) |
| `js/lib/motion.js` | Small animation toolkit (cubic-bezier tweens, in-view reveals, springs, interpolation) |
| `js/theme.js` | Light / dark toggle (class on `<html>`, persisted as `theme`) |
| `js/preloader.js` | Logo splash with clip-path exit |
| `js/menu.js` | Header + staggered slide-in menu (GSAP) |
| `js/waveform.js` | Hero circular waveform canvas |
| `js/voice.js` | Hero voice-agent states (idle → connecting → listening → processing → speaking) |
| `js/hero.js` | Hero entrance + pinned scroll reveal (GSAP ScrollTrigger) |
| `js/features.js` | 12 feature cards moving along the arc, desktop + mobile modes |
| `js/gallery.js` | Partner-logo fly-through with spring-smoothed scroll progress |
| `js/wheel.js` | Industries wheel: scroll-linked rotation, Prev/Next, wheel smoothing |
| `js/faq.js` | Accordion + reveals |
| `js/roi.js` | ROI calculator (sliders, agent buttons, gauge, animated counters) |
| `js/footer.js` | CTA reveals, shooting stars, globe |
| `js/section-nav.js` | Right-hand section dots (desktop) |
| `js/chat.js` | Chat launcher pill + full-screen chat overlay |
| `js/smooth-scroll.js` | Inertial mouse-wheel scrolling (keyboard, touch and scrollbar stay native) |
| `js/main.js` | Boot sequence |
| `js/journey.js` | Appended section 1: the pinned "Today / I bridge / the two." sentence sequence (replicated from guillaumezhu.com) |
| `js/toolkit.js` | Appended section 2: the "Toolkit" fanned card deck with the Shopify-to-Figma flip, ending on the "Transition" card that fills with cream and grows over the screen (replicated from guillaumezhu.com) |
| `js/next.js` | Appended section 3: the closing sentence written along a curve whose final dot reveals the footer card (replicated from guillaumezhu.com) |
| `css/journey-toolkit.css` | Styles of the three appended sections (fixed cream/dark palette, independent of the theme toggle) |
| `tools/brand-content.js` | **Better Pitch content layer**: every brand/copy change (logos, headings, FAQ, results, links, meta, JSON-LD), with copy adapted from ravan.ai. `build-html.js` applies it as its last step and aborts if any rule stops matching |
| `js/card-demo.js`, `css/card-demo.css` | Service cards in the hero carousel: red/orange/magenta card gradient and the "Try it with your business" demo (enterprise name + description → browser voice chat with a scripted, per-service agent). Opening a demo centres its card and holds page scroll until it is closed |
| `tools/palette.js`, `css/palette.css` | **Warm palette** (orange → pink → magenta). `palette.js` re-maps cool hues (blue/violet/fuchsia) to warm ones keeping lightness and alpha: the build applies it to inline styles and `<style>` blocks (not class names; the guillaumezhu sections are skipped), and it was run once in place on `css/tailwind.css`, `css/site.css`, `js/chat.js`, `js/voice.js` (marked at the top; originals in `tools/palette-originals/`). `palette.css` hue-rotates the footer globe map image. New colours added to those files should be written warm directly |
| `css/brand.css` | Sizing for the Better Pitch wordmark in the header, menu, footer and preloader |
| `assets/betterpitch.svg`, `assets/betterpitch-icon.svg`, `assets/betterpitch.ico`, `assets/logo/betterpitch-*.svg`, `assets/testimonials/result-*.svg` | Better Pitch wordmark (gradient + white), stacked lockup, "bp" monogram, favicon and the Results-card avatars |
| `tools/extra-sections.html` | Markup of the three appended sections; `build-html.js` inserts it right after the footer |
| `assets/toolkit/`, `assets/trajectory/`, `assets/footer/` | Card artwork and the gradient backgrounds used by the appended sections |
| `js/vendor/` | GSAP 3 + ScrollTrigger (the same libraries the reference uses) |
| `assets/`, `fonts/` | Original images, logos, maps, photos and font files |
| `tools/` | `build-html.js` (regenerates `index.html` from the reference markup), `serve.js` |

## Notes on fidelity

* The markup is the reference site's own server-rendered DOM (Next.js + Tailwind v4),
  so classes, inline styles, spacing and typography are exact. Only asset URLs were
  rewritten and the Next.js runtime removed.
* Every scroll-driven behaviour uses the same constants as the original bundles
  (pin distances, scrub values, easing, keyframe arrays, spring stiffness/damping).
* The live site's voice and text chat talk to a private LIA backend
  (`/api/voice-token`, a websocket). That service is not part of the replica, so the
  identical UI/state machine runs locally: the microphone level drives the visuals,
  speech recognition/synthesis are used where the browser supports them, and the chat
  answers with a local reply.
* Links to other pages of the site (pricing, blog, contact, …) point to the live site.
