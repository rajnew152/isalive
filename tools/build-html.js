/*
 * build-html.js
 * -------------
 * Rebuilds lia-replica/index.html from the reference site's server-rendered
 * markup (the HTTrack mirror / a saved copy of https://www.lialive.ai/).
 *
 * The reference site is a Next.js app. Its SSR output already contains every
 * section with the exact Tailwind classes and inline styles, so we keep that
 * DOM verbatim and only:
 *   - strip the Next.js runtime (script chunks, RSC payload, preloads, GTM)
 *   - rewrite asset URLs to the local ./assets and ./css folders
 *   - inject the client-only pieces that were never server-rendered
 *     (header menu, section dots nav, chat widget, hero caption node)
 *   - append our own stylesheets and scripts
 *
 * Usage:  node tools/build-html.js <path-to-source-html> [out=index.html]
 */
const fs = require("fs");
const path = require("path");

const src = process.argv[2];
const out = process.argv[3] || path.join(__dirname, "..", "index.html");
if (!src) {
  console.error("usage: node tools/build-html.js <source.html> [out]");
  process.exit(1);
}

let html = fs.readFileSync(src, "utf8");

/* ---------- 1. normalise HTTrack artefacts (if the mirror is used) ---------- */
html = html
  .replace(/<!-- Mirrored from[\s\S]*?-->/g, "")
  .replace(/<!-- Added by HTTrack -->[\s\S]*?<!-- \/Added by HTTrack -->/g, "")
  // HTTrack rewrote data: URIs into fake files; restore the noise texture
  .replace(
    /url\(_data_image\/svg%2bxml%3bbase64%2cPHN2ZyB4bWxucz0iaHR0cDovL3d3\.html\)/g,
    "url(&quot;data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC45IiBudW1PY3RhdmVzPSIyIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDEgMCAwIDAgMCAxIDAgMCAwIDAgMSAwIDAgMCAwLjYgMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIvPjwvc3ZnPg==&quot;)"
  )
  .replace(/url\(%27\/logo\/lia%20white%201\.png%27\.html\)/g, "url(&#x27;/logo/lia%20white%201.png&#x27;)");

/* ---------- 2. split head / body ---------- */
const bodyStart = html.indexOf("<body");
const bodyEndIdx = html.lastIndexOf("</body>");
let body = html.slice(html.indexOf(">", bodyStart) + 1, bodyEndIdx);

/* ---------- 3. strip runtime from body ---------- */
body = body
  // external script chunks + inline RSC payload; keep JSON-LD
  .replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, "")
  .replace(/<template data-dgst="BAILOUT_TO_CLIENT_SIDE_RENDERING"><\/template>/g, "")
  .replace(/<noscript>[\s\S]*?<\/noscript>/g, "")
  .replace(/<div hidden=""><!--\$--><!--\/\$--><\/div>/g, "")
  .replace(/<!--\$!?-->|<!--\/\$-->/g, "")
  // the mirror-only no-JS preloader fallback
  .replace(/<style>\s*#site-preloader[\s\S]*?<\/style>/g, "")
  // give the preloader a stable id (older builds already have it)
  .replace(
    /<div (id="site-preloader" )?class="fixed inset-0 z-\[9999\] flex flex-col items-center justify-center gap-5 bg-background"/,
    '<div id="site-preloader" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-background"'
  );

/* ---------- 4. rewrite asset urls ---------- */
const rewrites = [
  // Next image optimizer -> original testimonial photos
  [/srcSet="[^"]*"/g, ""],
  [/src="(?:\.\.\/)?_next\/[^"]*?testimonials%2F([a-z-]+\.(?:jpe?g))[^"]*"/g, 'src="assets/testimonials/$1"'],
  [/src="\/_next\/image\?url=%2Ftestimonials%2F([a-z-]+\.(?:jpe?g))[^"]*"/g, 'src="assets/testimonials/$1"'],
  // logos / icons
  [/(src|href)="\/?logo\/lia%20white%201\.png"/g, '$1="assets/logo/lia%20white%201.png"'],
  [/(src|href)="\/?logo\/lia white 1\.png"/g, '$1="assets/logo/lia%20white%201.png"'],
  [/(src|href)="\/?logo\/([^"]+)"/g, '$1="assets/logo/$2"'],
  [/(src|href)="\/?(lia\.svg|favicon\.svg|map\.webp|light-map3\.webp)"/g, '$1="assets/$2"'],
  [/href="faviconbcf9\.ico[^"]*"/g, 'href="assets/favicon.ico"'],
  [/href="\/favicon\.ico[^"]*"/g, 'href="assets/favicon.ico"'],
  // masks / css urls inside inline styles
  [/url\(&#x27;\/logo\/lia%20white%201\.png&#x27;\)/g, "url(&#x27;assets/logo/lia%20white%201.png&#x27;)"],
  [/url\('map\.webp'\)/g, "url('assets/map.webp')"],
  [/url\('light-map3\.webp'\)/g, "url('assets/light-map3.webp')"],
  [/url\('\/map\.webp'\)/g, "url('assets/map.webp')"],
  [/url\('\/light-map3\.webp'\)/g, "url('assets/light-map3.webp')"],
  // internal links -> the live site (only the homepage is replicated)
  [/href="(?:index\.html)?#([a-z-]+)"/g, 'href="#$1"'],
  [/href="\/#([a-z-]+)"/g, 'href="#$1"'],
  [/href="\/([a-z][a-z-]*(?:\/[a-z-]+)?)"/g, 'href="https://www.lialive.ai/$1"'],
  [/href="([a-z][a-z-]*)\.html"/g, 'href="https://www.lialive.ai/$1"'],
  [/href="index\.html"/g, 'href="#hero"'],
];
for (const [re, rep] of rewrites) body = body.replace(re, rep);

/* ---------- 5. readable section breaks (block-level only, layout safe) ---------- */
body = body
  .replace(/<section /g, "\n\n<!-- ======================================================================= -->\n<section ")
  .replace(/<\/section>/g, "</section>\n")
  .replace(/<div id="(features|section-gallery|section-footer)"/g, '\n\n<!-- ======================================================================= -->\n<div id="$1"')
  .replace(/<footer /g, "\n<footer ")
  .replace(/<script type="application\/ld\+json">/g, "\n<script type=\"application/ld+json\">")
  .replace(/<div id="site-preloader"/, "\n\n<!-- ===== preloader (client dismisses it) ===== -->\n<div id=\"site-preloader\"");

/* ---------- 6. client-only markup that Next rendered in the browser ---------- */
const partials = fs.readFileSync(path.join(__dirname, "partials.html"), "utf8");
/* the two sections appended after the footer (replicated from guillaumezhu.com) */
const extraSections = fs.readFileSync(path.join(__dirname, "extra-sections.html"), "utf8");

/* ---------- 7. head ---------- */
const head = `<!DOCTYPE html>
<html lang="en" class="geist_a71539c9-module__T19VSG__variable geist_mono_8d43a2aa-module__8Li5zG__variable cormorant_garamond_2ca0db87-module__79sj7G__variable h-full antialiased" suppresshydrationwarning="">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>LIA – AI Voice Agent for Sales, Support, Search &amp; Conversational Commerce</title>
<meta name="description" content="LIA is a limitless intelligent AI agent that engages customers through natural voice and conversation. Automate sales, support, search, lead qualification, negotiations, and conversational commerce with human-like interactions that reduce cognitive load and increase engagement."/>
<meta name="keywords" content="LIA AI Agent,AI Voice Agent,Conversational AI,Voice AI Assistant,AI Sales Agent,Conversational Commerce,AI Customer Support,Human Like AI,Voice Commerce,AI Website Assistant,AI Lead Generation,AI Negotiation Agent,Intelligent Agent,AI Search Assistant,Voice First AI,Customer Engagement AI,AI Business Assistant,Natural Language AI,AI Automation,Website Chatbot,Voice Enabled Commerce,AI Shopping Assistant,Digital Sales Agent,Enterprise AI Agent,Multimodal AI Agent,Customer Experience AI,AI Concierge,AI Agent Platform,Voice Powered AI,Human Centric AI"/>
<meta property="og:title" content="LIA – Your Limitless Intelligent AI Agent"/>
<meta property="og:description" content="Transform customer interactions with LIA, a human-like AI voice agent designed for sales, support, search, negotiations, and conversational commerce. Create natural conversations that reduce cognitive load and drive business outcomes."/>
<meta name="twitter:card" content="summary"/>
<meta name="twitter:title" content="LIA – Your Limitless Intelligent AI Agent"/>
<meta name="twitter:description" content="Transform customer interactions with LIA, a human-like AI voice agent designed for sales, support, search, negotiations, and conversational commerce. Create natural conversations that reduce cognitive load and drive business outcomes."/>
<link rel="icon" href="assets/favicon.ico" sizes="256x256" type="image/x-icon"/>
<link rel="icon" href="assets/favicon.svg"/>
<link rel="preload" href="fonts/caa3a2e1cccd8315.woff2" as="font" crossorigin="" type="font/woff2"/>
<link rel="preload" href="fonts/797e433ab948586e.woff2" as="font" crossorigin="" type="font/woff2"/>
<link rel="preload" as="image" href="assets/favicon.svg"/>
<link rel="preload" as="image" href="assets/logo/lia%20white%201.png"/>
<link rel="stylesheet" href="css/fonts.css"/>
<link rel="stylesheet" href="css/tailwind.css"/>
<link rel="stylesheet" href="css/site.css"/>
<link rel="stylesheet" href="css/journey-toolkit.css"/>
<link rel="stylesheet" href="css/journey-fluid.css"/>
<script>
/* theme bootstrap (identical to the reference site's next-themes inline script: class attribute, key "theme", default dark) */
((a,b,c,d,e,f,g,h)=>{let i=document.documentElement,j=["light","dark"];function k(b){var c;(Array.isArray(a)?a:[a]).forEach(a=>{let c="class"===a,d=c&&f?e.map(a=>f[a]||a):e;c?(i.classList.remove(...d),i.classList.add(f&&f[b]?f[b]:b)):i.setAttribute(a,b)}),c=b,h&&j.includes(c)&&(i.style.colorScheme=c)}if(d)k(d);else try{let a=localStorage.getItem(b)||c,d=g&&"system"===a?window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":a;k(d)}catch(a){}})("class","theme","dark",null,["light","dark"],null,false,true)
</script>
</head>
<body class="min-h-full">`;

const scripts = `

<!-- ===== scripts ===== -->
<script src="js/vendor/gsap.min.js"></script>
<script src="js/vendor/ScrollTrigger.min.js"></script>
<script src="js/lib/motion.js"></script>
<script src="js/theme.js"></script>
<script src="js/preloader.js"></script>
<script src="js/menu.js"></script>
<script src="js/waveform.js"></script>
<script src="js/voice.js"></script>
<script src="js/hero.js"></script>
<script src="js/features.js"></script>
<script src="js/gallery.js"></script>
<script src="js/wheel.js"></script>
<script src="js/faq.js"></script>
<script src="js/roi.js"></script>
<script src="js/footer.js"></script>
<script src="js/journey.js"></script>
<script src="js/journey-fluid.js"></script>
<script src="js/toolkit.js"></script>
<script src="js/next.js"></script>
<script src="js/section-nav.js"></script>
<script src="js/chat.js"></script>
<script src="js/smooth-scroll.js"></script>
<script src="js/main.js"></script>
</body>
</html>
`;

const replica = head + body.trimEnd() + "\n" + extraSections.replace(/^\n+/, "\n") + partials + scripts;

/* ---------- 8. Better Pitch branding + copy (see tools/brand-content.js) ---------- */
const branded = require("./brand-content").apply(replica);

/* ---------------------------------------------------------------- 9. warm palette on inline colours (see tools/palette.js) */
const warmed = require("./palette").warmPage(branded).text;

/* ---------------------------------------------------------------- 10. globe footer inside the closing section's reveal card (see tools/next-globe.js) */
/* ---------------------------------------------------------------- 11. the ROI calculator stays its own section after the Platform deck (tools/roi-stage.js, which
   moved it onto the deck's cover, is no longer applied; the manifesto plays there instead) */
const result = require("./next-globe").apply(warmed)
  .replace('<link rel="stylesheet" href="css/perf.css"/>', '<link rel="stylesheet" href="css/palette.css"/>\n<link rel="stylesheet" href="css/perf.css"/>\n<link rel="stylesheet" href="css/mobile.css"/>')
  .replace('<script src="js/card-demo.js"></script>', '<script src="js/card-demo.js"></script>\n<script src="js/section-seams.js"></script>\n<script src="js/header-contrast.js"></script>');
fs.writeFileSync(out, result);
console.log("wrote", out, result.length, "bytes");
