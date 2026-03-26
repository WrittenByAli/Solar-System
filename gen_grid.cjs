const fs = require('fs');

// 64x64 grid of 256x256px cells = 16384x16384 total
const COLS = 64, ROWS = 64, CELL = 256;
const W = COLS * CELL, H = ROWS * CELL;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
svg += `<rect width="${W}" height="${H}" fill="#06050F"/>`;

// Draw grid lines
for (let r = 0; r <= ROWS; r++) {
  const y = r * CELL;
  const isQuad = r % 16 === 0;
  const isHalf = r % 8 === 0;
  const opacity = isQuad ? 0.5 : isHalf ? 0.25 : 0.1;
  const width = isQuad ? 3 : isHalf ? 1.5 : 0.5;
  svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(79,195,247,${opacity})" stroke-width="${width}"/>`;
}
for (let c = 0; c <= COLS; c++) {
  const x = c * CELL;
  const isQuad = c % 16 === 0;
  const isHalf = c % 8 === 0;
  const opacity = isQuad ? 0.5 : isHalf ? 0.25 : 0.1;
  const width = isQuad ? 3 : isHalf ? 1.5 : 0.5;
  svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(79,195,247,${opacity})" stroke-width="${width}"/>`;
}

// Large quadrant labels (very faint, background texture)
const quadSize = W / 4;
for (let qr = 0; qr < 4; qr++) {
  for (let qc = 0; qc < 4; qc++) {
    const cx = qc * quadSize + quadSize / 2;
    const cy = qr * quadSize + quadSize / 2;
    svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="600" fill="rgba(79,195,247,0.04)">${qc},${qr}</text>`;
  }
}

// Corner marker lines - top-left quadrant indicator
const tlSize = W / 4;
svg += `<rect x="0" y="0" width="${tlSize}" height="${tlSize}" fill="rgba(79,195,247,0.04)" stroke="rgba(79,195,247,0.3)" stroke-width="8"/>`;
svg += `<text x="${tlSize/2}" y="${tlSize/2 - 80}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="220" fill="rgba(79,195,247,0.25)" font-weight="bold">TOP LEFT</text>`;
svg += `<text x="${tlSize/2}" y="${tlSize/2 + 80}" text-anchor="middle" dominant-baseline="middle" font-family="monospace" font-size="160" fill="rgba(79,195,247,0.15)">ZOOM IN HERE</text>`;

// Add subtle dot at center of each major quadrant
for (let qr = 0; qr < 4; qr++) {
  for (let qc = 0; qc < 4; qc++) {
    const cx = qc * quadSize + quadSize / 2;
    const cy = qr * quadSize + quadSize / 2;
    svg += `<circle cx="${cx}" cy="${cy}" r="60" fill="rgba(79,195,247,0.08)"/>`;
    svg += `<circle cx="${cx}" cy="${cy}" r="20" fill="rgba(79,195,247,0.25)"/>`;
  }
}

svg += '</svg>';

fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/grid16k.svg', svg);
console.log('Generated public/grid16k.svg, size:', fs.statSync('public/grid16k.svg').size, 'bytes');
