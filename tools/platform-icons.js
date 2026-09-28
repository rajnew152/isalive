/*
 * platform-icons.js
 * -----------------
 * Adds a line icon (Lucide, ISC licence) to each Platform card face
 * (assets/toolkit/agni-*.svg), centred in the empty band above the title,
 * drawn in the card's own title colour on a soft disc of the same colour.
 * Re-running replaces the previous icon (group id "bp-icon").
 *
 *   node tools/platform-icons.js
 */
const fs = require("fs");
const path = require("path");

const ICONS = {
  "agni-agent-builder.svg": /* bot */ '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  "agni-knowledge-base.svg": /* book-open */ '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  "agni-tools.svg": /* wrench */ '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  "agni-calling.svg": /* phone-call */ '<path d="M13 2a9 9 0 0 1 9 9"/><path d="M13 6a5 5 0 0 1 5 5"/><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  "agni-analytics.svg": /* bar-chart-3 */ '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  "agni-webhooks.svg": /* webhook */ '<path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"/>',
  "agni-languages.svg": /* languages */ '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
};

const DIR = path.join(__dirname, "..", "assets", "toolkit");
const CX = 147.5, CY = 108, R = 38, S = 2.3; // disc centre / radius, icon scale (24 → 55px)

for (const [file, icon] of Object.entries(ICONS)) {
  const p = path.join(DIR, file);
  let svg = fs.readFileSync(p, "utf8").replace(/\n?<g id="bp-icon"[\s\S]*?<\/g><\/g>/, "");
  /* the title is the first path after the card's background rect: use its fill */
  const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1]);
  const ink = fills[2];
  const o = (24 * S) / 2;
  const group = `\n<g id="bp-icon"><circle cx="${CX}" cy="${CY}" r="${R}" fill="${ink}" fill-opacity="0.14"/>` +
    `<g transform="translate(${CX - o} ${CY - o}) scale(${S})" fill="none" stroke="${ink}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${icon}</g></g>`;
  svg = svg.replace(/\n?<\/svg>\s*$/, group + "\n</svg>\n");
  fs.writeFileSync(p, svg);
  console.log(file, "icon in", ink);
}
