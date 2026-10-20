/**
 * Draws the seed's barcodes as one SVG (docs/barcodes.svg), so the scanner
 * can be tried by pointing a phone at a computer screen. The codes are the
 * ones garner-app's scripts/seed.mjs attaches to each product.
 *
 *   node scripts/barcode-sheet.mjs
 */
import { writeFileSync } from 'node:fs';

const PRODUCTS = [
  ['7790070410122', 'Leche Entera La Serenísima 1L'],
  ['7791234000012', 'Pan Lactal 500g'],
  ['7791234000029', 'Arroz Largo Fino 1kg'],
  ['7791234000036', 'Aceite de Girasol 900ml'],
  ['7790767000049', 'Galletitas Surtidas Arcor 400g'],
  ['7791234000050', 'Agua Mineral 2L'],
  // Not in the catalog: scanning it shows the "no lo tenemos" answer.
  ['4006381333931', 'Fuera del catálogo'],
];

// EAN-13: each digit as 7 modules, from three code sets; the first digit is
// carried by which of L and G the left half uses.
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = L.map((code) => [...code].reverse().map((bit) => (bit === '0' ? '1' : '0')).join(''));
const R = L.map((code) => [...code].map((bit) => (bit === '0' ? '1' : '0')).join(''));
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

function modules(code) {
  const digits = [...code].map(Number);
  const parity = PARITY[digits[0]];
  const left = digits.slice(1, 7).map((d, i) => (parity[i] === 'L' ? L[d] : G[d])).join('');
  const right = digits.slice(7).map((d) => R[d]).join('');
  return `101${left}01010${right}101`;
}

const MODULE = 3;
const QUIET = 11 * MODULE;
const BAR_HEIGHT = 90;
const CELL_W = 2 * QUIET + 95 * MODULE;
const CELL_H = BAR_HEIGHT + 70;
const COLUMNS = 2;

const cells = PRODUCTS.map(([code, name], index) => {
  const x0 = (index % COLUMNS) * CELL_W;
  const y0 = Math.floor(index / COLUMNS) * CELL_H;
  const bars = [...modules(code)]
    .map((bit, i) => (bit === '1' ? `<rect x="${x0 + QUIET + i * MODULE}" y="${y0 + 20}" width="${MODULE}" height="${BAR_HEIGHT}"/>` : ''))
    .join('');
  return `${bars}
  <text x="${x0 + CELL_W / 2}" y="${y0 + BAR_HEIGHT + 40}" text-anchor="middle" font-size="16">${code}</text>
  <text x="${x0 + CELL_W / 2}" y="${y0 + BAR_HEIGHT + 60}" text-anchor="middle" font-size="14">${name}</text>`;
});

const width = COLUMNS * CELL_W;
const height = Math.ceil(PRODUCTS.length / COLUMNS) * CELL_H;

writeFileSync(
  new URL('../docs/barcodes.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="sans-serif">
  <rect width="100%" height="100%" fill="#fff"/>
  <g fill="#000">
  ${cells.join('\n  ')}
  </g>
</svg>
`,
);
console.log(`Wrote docs/barcodes.svg (${PRODUCTS.length} codes).`);
