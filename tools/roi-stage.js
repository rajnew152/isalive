/*
 * roi-stage.js
 * ------------
 * The ROI calculator (#roi-calculator) moves inside the Toolkit stage: once the
 * transition card's cream has grown over the stage, the calculator fades in on
 * that cream (js/toolkit.js, css/roi-stage.css) instead of following the
 * Toolkit as its own section.
 *
 * build-html.js runs this after palette.js: palette.js skips everything inside
 * #section-toolkit, and the calculator's inline colours must be warm already.
 */

const RE = /(<section id="section-toolkit" class="tk tk--art-only")([\s\S]*?)(\n    <\/div>\n  <\/div>\n<\/section>\n)\n\n<!-- =+ -->\n(<section id="roi-calculator" class=")[^"]*(">[\s\S]*?<\/section>)\n/;

function apply(html) {
  const found = [...html.matchAll(new RegExp(RE.source, "g"))].length;
  if (found !== 1) throw new Error(`roi-stage: expected 1 match, found ${found}`);
  html = html.replace(RE, (m, open, body, close, roiOpen, roiRest) =>
    open.replace('class="tk tk--art-only"', 'class="tk tk--art-only tk--roi"') + body +
    "\n\n      <!-- ROI calculator on the cream cover (tools/roi-stage.js) -->\n      " +
    roiOpen + "tk__roi" + roiRest + close);
  return html.replace('<link rel="stylesheet" href="css/testimonials.css"/>',
    '<link rel="stylesheet" href="css/testimonials.css"/>\n<link rel="stylesheet" href="css/roi-stage.css"/>');
}

module.exports = { apply };
