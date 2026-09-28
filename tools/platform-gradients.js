/*
 * platform-gradients.js
 * ---------------------
 * Gives each Platform card face (assets/toolkit/agni-*.svg) the grainy,
 * blurred-gradient look of the deck's "Transition" card, each in its own
 * colour way from the site's palette (dark plum, bright pink, violet, peach,
 * cream...) with its own title / pill / icon colours; titles can be a
 * gradient ([from, to]).
 * The first run copies the flat originals to tools/palette-originals/agni/;
 * every run starts from those copies, so it can be re-run safely.
 *
 *   node tools/platform-gradients.js
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "assets", "toolkit");
const BACKUP = path.join(__dirname, "palette-originals", "agni");

const WAVES = {
  low:  "M-40 262C40 215 120 300 200 244S300 176 340 206L340 460L-40 460Z",
  high: "M-40 190C50 150 110 240 190 200S290 120 340 150L340 460L-40 460Z",
  tilt: "M-40 330C60 300 140 250 210 270S300 230 340 240L340 460L-40 460Z",
};

/* base: card ground; glow: [colour, cx, cy, r, opacity]; wave: [from, to, shape];
   grain: [colour, opacity]; title: colour or [from, to]; pill / pillInk; icon: stroke, disc: [fill, opacity] */
const CARDS = {
  "agni-agent-builder.svg": {   // dark plum, magenta glow, violet wave, pink → coral title
    base: "#2B1626", glow: ["#E345C4", 50, 60, 160, 0.75], wave: ["#5B36C9", "#8A5CF0", "low"],
    grain: ["#FFFFFF", 0.16], title: ["#FF5FA8", "#FF9478"], pill: "#FF5FA8", pillInk: "#2B1626",
    icon: "#FF7AB8", disc: ["#FF5FA8", 0.18],
  },
  "agni-knowledge-base.svg": {  // light lavender-cream, violet ink
    base: "#F6F0FF", glow: ["#C9B6FF", 250, 60, 150, 0.9], wave: ["#FFC2DA", "#FF9FC4", "tilt"],
    grain: ["#4B2A8C", 0.10], title: "#4B2A8C", pill: "#6D3BD8", pillInk: "#FFFFFF",
    icon: "#6D3BD8", disc: ["#6D3BD8", 0.12],
  },
  "agni-tools.svg": {           // orange fire into deep plum, cream type
    base: "#E8502F", glow: ["#FFB05A", 60, 50, 150, 0.8], wave: ["#3A0F2A", "#6B1D4A", "low"],
    grain: ["#FFFFFF", 0.22], title: "#FFF4EE", pill: "#2B0D05", pillInk: "#FFD9CF",
    icon: "#FFF4EE", disc: ["#FFFFFF", 0.2],
  },
  "agni-calling.svg": {         // violet ground, pink wave rising, coral pill
    base: "#5B36C9", glow: ["#9B7CFF", 240, 70, 150, 0.85], wave: ["#F73679", "#FF7AA8", "high"],
    grain: ["#FFFFFF", 0.2], title: "#FFE3F3", pill: "#FF9478", pillInk: "#2A1060",
    icon: "#FFE3F3", disc: ["#FFFFFF", 0.18],
  },
  "agni-analytics.svg": {       // near-black night, magenta glow, magenta → coral title
    base: "#0F0A1F", glow: ["#E345C4", 150, 40, 120, 0.55], wave: ["#2A1660", "#4B2A8C", "tilt"],
    grain: ["#FFFFFF", 0.14], title: ["#E345C4", "#FF9478"], pill: "#E345C4", pillInk: "#FFFFFF",
    icon: "#F07AD8", disc: ["#E345C4", 0.2],
  },
  "agni-webhooks.svg": {        // hot pink into deep rose, plum pill
    base: "#F73679", glow: ["#FF9A6B", 40, 40, 140, 0.8], wave: ["#C21A55", "#7A0F36", "high"],
    grain: ["#FFFFFF", 0.22], title: "#FFFFFF", pill: "#2B1626", pillInk: "#FFD9E6",
    icon: "#FFFFFF", disc: ["#FFFFFF", 0.2],
  },
  "agni-languages.svg": {       // soft peach, pink → magenta wave, plum ink
    base: "#FFE4D6", glow: ["#FFB08A", 230, 50, 150, 0.9], wave: ["#FF6B8A", "#E345C4", "low"],
    grain: ["#4A1238", 0.10], title: "#4A1238", pill: "#4A1238", pillInk: "#FFE4D6",
    icon: "#4A1238", disc: ["#4A1238", 0.12],
  },
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

fs.mkdirSync(BACKUP, { recursive: true });
for (const [file, c] of Object.entries(CARDS)) {
  const live = path.join(DIR, file), orig = path.join(BACKUP, file);
  if (!fs.existsSync(orig)) fs.copyFileSync(live, orig);
  let svg = fs.readFileSync(orig, "utf8");

  const [gr, gg, gb] = rgb(c.grain[0]);
  const [gc, gx, gy, grad, gop] = c.glow;
  const titleFill = Array.isArray(c.title) ? "url(#ink)" : c.title;
  const inkDef = Array.isArray(c.title)
    ? `<linearGradient id="ink" x1="40" y1="0" x2="255" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c.title[0]}"/><stop offset="1" stop-color="${c.title[1]}"/></linearGradient>`
    : "";
  const scene = `<defs>
<clipPath id="card"><rect width="295" height="417" rx="22.618"/></clipPath>
<linearGradient id="wave" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.wave[0]}"/><stop offset="1" stop-color="${c.wave[1]}"/></linearGradient>${inkDef}
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 ${gr}  0 0 0 0 ${gg}  0 0 0 0 ${gb}  0 0 0 1.1 -0.45"/></filter>
</defs>
<g clip-path="url(#card)">
<rect width="295" height="417" fill="${c.base}"/>
<circle cx="${gx}" cy="${gy}" r="${grad}" fill="${gc}" opacity="${gop}" filter="url(#soft)"/>
<path d="${WAVES[c.wave[2]]}" fill="url(#wave)" filter="url(#soft)"/>
<rect width="295" height="417" fill="${c.grain[0]}" filter="url(#grain)" opacity="${c.grain[1] * 1.6}"/>
</g>`;

  svg = svg.replace(/<defs>[\s\S]*?<\/defs>\n?/, "");
  svg = svg.replace(/<rect width="295" height="417" rx="22\.618" fill="[^"]*"\/>/, scene);
  const after = svg.indexOf("</g>", svg.indexOf('clip-path="url(#card)"')) + 4;
  const head = svg.slice(0, after);
  let tail = svg.slice(after), n = 0;
  tail = tail.replace(/fill="[^"]*"/g, (m) => {
    n++;
    if (n === 1) return `fill="${titleFill}"`;  // title
    if (n === 2) return `fill="${c.pill}"`;     // pill
    if (n === 3) return `fill="${c.pillInk}"`;  // pill label
    return m;
  });
  tail = tail.replace(/(<g id="bp-icon"><circle [^>]*?)fill="[^"]*" fill-opacity="[^"]*"/, `$1fill="${c.disc[0]}" fill-opacity="${c.disc[1]}"`)
             .replace(/(<g id="bp-icon">[\s\S]*?<g [^>]*?)stroke="[^"]*"/, `$1stroke="${c.icon}"`);
  fs.writeFileSync(live, head + tail);
  console.log(file, "ok");
}
