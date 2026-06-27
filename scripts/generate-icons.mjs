// Generates PWA / iOS icons from the Aksara brand mark (maroon tile + gold
// graduation cap) into /public. Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

const MAROON = "#83103e";
const MAROON_DARK = "#57102b";
const GOLD = "#e2a22f";

// Lucide "graduation-cap" paths, drawn as gold strokes, centered & scaled.
function cap(scale, stroke) {
  // lucide viewBox is 24x24; center it at (256,256) of a 512 canvas.
  const s = scale; // overall scale of the 24-unit glyph
  const tx = 256 - 12 * s;
  const ty = 256 - 12 * s;
  return `
    <g transform="translate(${tx} ${ty}) scale(${s})"
       fill="none" stroke="${GOLD}" stroke-width="${stroke}"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
      <path d="M22 10v6"/>
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
    </g>`;
}

// `padded` = leave maskable safe-zone padding (cap smaller, tile full-bleed).
function svg({ rounded, capScale, capStroke }) {
  const tile = rounded
    ? `<rect x="0" y="0" width="512" height="512" rx="112" fill="url(#g)"/>`
    : `<rect x="0" y="0" width="512" height="512" fill="url(#g)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${MAROON}"/>
        <stop offset="1" stop-color="${MAROON_DARK}"/>
      </linearGradient>
    </defs>
    ${tile}
    ${cap(capScale, capStroke)}
  </svg>`;
}

const roundedSvg = svg({ rounded: true, capScale: 13, capStroke: 1.6 });
const fullBleedSvg = svg({ rounded: false, capScale: 11, capStroke: 1.7 }); // maskable

async function png(svgStr, size, name) {
  await sharp(Buffer.from(svgStr)).resize(size, size).png().toFile(join(publicDir, name));
  console.log("wrote", name);
}

await mkdir(publicDir, { recursive: true });
await png(roundedSvg, 192, "icon-192.png");
await png(roundedSvg, 512, "icon-512.png");
await png(fullBleedSvg, 512, "icon-512-maskable.png");
await png(roundedSvg, 180, "apple-icon.png");
await png(roundedSvg, 32, "favicon-32.png");
console.log("done");
