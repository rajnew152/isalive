/*
 * next-globe.js
 * -------------
 * The closing "Ready when you are, let's put your calls to work." section
 * takes the place of the old CTA footer: the "Where AI calling becomes
 * revenue." block is dropped, and the reveal card at the end of the sentence
 * shows the globe footer (#section-footer: stars, globe, logo and links)
 * instead of the gradient contact card.
 *
 * build-html.js runs this after palette.js: the footer's inline colours must
 * be warmed first, and palette.js skips everything inside #section-next.
 */

const RE = /\n\n<!-- =+ -->\n(<div id="section-footer"[\s\S]*?)<div class="relative z-20 flex flex-col items-center[\s\S]*?<\/a><\/div>\n(<footer class="relative z-20 page-container[\s\S]*?<\/div>)\n\n(<!-- =+ -->\n<!-- Appended section 3[\s\S]*?)<footer class="nx-footer" aria-label="Footer">[\s\S]*?<\/footer>\n/;

function apply(html) {
  const found = [...html.matchAll(new RegExp(RE.source, "g"))].length;
  if (found !== 1) throw new Error(`next-globe: expected 1 match, found ${found}`);
  return html.replace(RE, '\n\n$3<div class="nx-footer" aria-label="Footer">\n$1\n$2\n      </div>\n');
}

module.exports = { apply };
