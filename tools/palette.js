/*
 * palette.js
 * ----------
 * Better Pitch warm palette. Re-maps the replica's cool accent hues (blue →
 * violet → fuchsia) onto the brand's warm range (magenta → pink → red →
 * orange), keeping every colour's lightness, saturation and alpha. Neutral
 * greys and colours that are already warm, green or teal are left alone.
 *
 * Handles #hex, rgb()/rgba(), hsl()/hsla(), bare "H S% L%" custom properties
 * (shadcn-style theme tokens), lab() and oklch() (Tailwind v4 output).
 *
 *   node tools/palette.js <file> [...]   re-colour stylesheets / scripts in place
 *                                         (once: files get a marker, originals are
 *                                         kept in tools/palette-originals/)
 *   require("./palette").warmHtml(html)   used by the build for inline styles
 */
const fs = require("fs");
const path = require("path");

const MARK = "palette: better-pitch warm";

/* hue remap (HSL degrees): only [200, 335] moves; piecewise linear */
const MAP = [[200, 285], [250, 330], [275, 345], [300, 360], [335, 380]];
function mapHue(h) {
  if (h < MAP[0][0] || h > MAP[MAP.length - 1][0]) return h;
  for (let i = 1; i < MAP.length; i++) {
    const [h0, n0] = MAP[i - 1], [h1, n1] = MAP[i];
    if (h <= h1) return (n0 + ((h - h0) / (h1 - h0)) * (n1 - n0)) % 360;
  }
  return h;
}

/* ---------------------------------------------------------------- colour maths */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
/* returns null when the colour should not change */
function warmRgb(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (s < 0.12 || l < 0.03 || l > 0.985) return null;
  const nh = mapHue(h);
  if (nh === h) return null;
  return hslToRgb(nh, s, l).map((v) => Math.max(0, Math.min(255, Math.round(v))));
}

const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* CIE Lab (D50, as CSS lab()) ⇄ sRGB */
function labToRgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200, e = 216 / 24389, k = 24389 / 27;
  const f = (t) => (t * t * t > e ? t * t * t : (116 * t - 16) / k);
  const X = f(fx) * 0.96422, Y = (L > k * e ? Math.pow(fy, 3) : L / k), Z = f(fz) * 0.82521;
  // D50 → D65 (Bradford) → linear sRGB
  const x = 0.9554734 * X - 0.0230985 * Y + 0.0632593 * Z;
  const y = -0.0283697 * X + 1.0099956 * Y + 0.0210414 * Z;
  const z = 0.0123140 * X - 0.0205077 * Y + 1.3303659 * Z;
  return [3.2404542 * x - 1.5371385 * y - 0.4985314 * z, -0.969266 * x + 1.8760108 * y + 0.041556 * z, 0.0556434 * x - 0.2040259 * y + 1.0572252 * z]
    .map((c) => clamp01(gam(clamp01(c))) * 255);
}
function rgbToLab(r, g, b) {
  const [R, G, B] = [r, g, b].map((c) => lin(c / 255));
  const x = 0.4124564 * R + 0.3575761 * G + 0.1804375 * B, y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B, z = 0.0193339 * R + 0.119192 * G + 0.9503041 * B;
  const X = 1.0478112 * x + 0.0228866 * y - 0.050127 * z, Y = 0.0295424 * x + 0.9904844 * y - 0.0170491 * z, Z = -0.0092345 * x + 0.0150436 * y + 0.7521316 * z;
  const e = 216 / 24389, k = 24389 / 27, f = (t) => (t > e ? Math.cbrt(t) : (k * t + 16) / 116);
  const fx = f(X / 0.96422), fy = f(Y), fz = f(Z / 0.82521);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
/* OKLCH ⇄ sRGB */
function oklchToRgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map((c) => clamp01(gam(clamp01(c))) * 255);
}
function rgbToOklch(r, g, b) {
  const [R, G, B] = [r, g, b].map((c) => lin(c / 255));
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360];
}

const num = (v) => (Math.round(v * 10000) / 10000).toString();
const pct = (s) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s));

/* ---------------------------------------------------------------- text rewriting */
function warmText(text, { hex3 = true } = {}) {
  let n = 0;
  const hit = (v) => { n++; return v; };

  // #rrggbb(aa) and (optionally) #rgb(a); never HTML entities (&#8212;)
  // (nor Tailwind arbitrary-value class names built in scripts: bg-[#6d28d9])
  text = text.replace(/(^|[^&\w\\[])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g, (m, pre, hx) => {
    if (hx.length <= 4 && !hex3) return m;
    const full = hx.length <= 4 ? hx.split("").map((c) => c + c).join("") : hx;
    const w = warmRgb(parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16));
    if (!w) return m;
    const out = w.map((v) => v.toString(16).padStart(2, "0")).join("") + full.slice(6);
    return hit(pre + "#" + (hx.length <= 4 && out.length === 6 && /^(.)\1(.)\2(.)\3$/.test(out) ? out[0] + out[2] + out[4] : out));
  });
  // rgb()/rgba() with numeric channels; the alpha part is kept verbatim (may be a template)
  text = text.replace(/(?<![_[])(rgba?\(\s*)(\d{1,3}(?:\.\d+)?)(\s*,\s*|\s+)(\d{1,3}(?:\.\d+)?)(\s*,\s*|\s+)(\d{1,3}(?:\.\d+)?)/g, (m, a, r, s1, g, s2, b) => {
    const w = warmRgb(+r, +g, +b);
    return w ? hit(a + w[0] + s1 + w[1] + s2 + w[2]) : m;
  });
  // hsl()/hsla()
  text = text.replace(/(hsla?\(\s*)(\d+(?:\.\d+)?)(deg)?(\s*,?\s*)(\d+(?:\.\d+)?)%(\s*,?\s*)(\d+(?:\.\d+)?)%/g, (m, a, h, deg, s1, s, s2, l) => {
    if (+s < 12) return m;
    const nh = mapHue(+h);
    return nh === +h ? m : hit(a + num(nh) + (deg || "") + s1 + s + "%" + s2 + l + "%");
  });
  // bare "H S% L%" theme tokens:  --background:260 45% 98.5%
  text = text.replace(/(--[\w-]+:\s*)(\d+(?:\.\d+)?)(\s+)(\d+(?:\.\d+)?)%(\s+)(\d+(?:\.\d+)?)%/g, (m, a, h, s1, s, s2, l) => {
    if (+s < 12) return m;
    const nh = mapHue(+h);
    return nh === +h ? m : hit(a + num(nh) + s1 + s + "%" + s2 + l + "%");
  });
  // lab(L a b [/ alpha])
  text = text.replace(/lab\(\s*(-?[\d.]+%?)\s+(-?[\d.]+)\s+(-?[\d.]+)/g, (m, L, A, B) => {
    const w = warmRgb(...labToRgb(parseFloat(L), +A, +B));
    if (!w) return m;
    const [l2, a2, b2] = rgbToLab(...w);
    return hit(`lab(${num(l2)}${L.endsWith("%") ? "%" : ""} ${num(a2)} ${num(b2)}`);
  });
  // oklch(L C H [/ alpha])
  text = text.replace(/oklch\(\s*(-?[\d.]+%?)\s+(-?[\d.]+%?)\s+(-?[\d.]+)(deg)?/g, (m, L, C, H) => {
    const w = warmRgb(...oklchToRgb(pct(L), pct(C) * (C.endsWith("%") ? 0.4 : 1), +H));
    if (!w) return m;
    const [l2, c2, h2] = rgbToOklch(...w);
    return hit(`oklch(${num(l2 * 100)}% ${num(c2)} ${num(h2)}`);
  });
  return { text, n };
}

/* CSS: only declaration blocks (innermost braces) — selectors such as
   .bg-\[\#6d28d9\] must keep their names */
function warmCss(css) {
  let n = 0;
  const out = css.replace(/\{[^{}]*\}/g, (block) => { const r = warmText(block); n += r.n; return r.text; });
  return { text: out, n };
}

/* HTML: style attributes, <style> blocks and SVG paint attributes only */
function warmHtml(html) {
  let n = 0;
  const add = (r) => { n += r.n; return r.text; };
  html = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/g, (m, a, css, b) => a + add(warmCss(css)) + b);
  html = html.replace(/(\sstyle=")([^"]*)(")/g, (m, a, v, b) => a + add(warmText(v)) + b);
  html = html.replace(/(\s(?:fill|stroke|stop-color|flood-color|color)=")([^"]*)(")/g, (m, a, v, b) => a + add(warmText(v)) + b);
  return { text: html, n };
}

/* whole page: everything except the sections replicated from guillaumezhu.com,
   which keep their own cream / orange / purple art direction */
function warmPage(html) {
  const keep = [];
  html = html.replace(/<section id="section-(?:journey|toolkit|next|manifesto)"[\s\S]*?<\/section>/g, (m) => `\u0000KEEP${keep.push(m) - 1}\u0000`);
  const r = warmHtml(html);
  return { text: r.text.replace(/\u0000KEEP(\d+)\u0000/g, (m, i) => keep[+i]), n: r.n, kept: keep.length };
}

/* ---------------------------------------------------------------- CLI */
if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error("usage: node tools/palette.js <file.css|file.js> [...]"); process.exit(1); }
  const backup = path.join(__dirname, "palette-originals");
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    if (src.includes(MARK)) { console.log("skip (already warm):", f); continue; }
    const css = /\.css$/i.test(f);
    const r = css ? warmCss(src) : warmText(src, { hex3: false });
    if (!r.n) { console.log("no cool colours:", f); continue; }
    fs.mkdirSync(backup, { recursive: true });
    fs.writeFileSync(path.join(backup, path.basename(f)), src);
    const marker = `/* ${MARK} (tools/palette.js; original in tools/palette-originals/) */\n`;
    fs.writeFileSync(f, marker + r.text);
    console.log(`${r.n} colours warmed:`, f);
  }
}

module.exports = { warmPage, warmHtml, warmCss, warmText, mapHue };
