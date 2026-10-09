// Generates a valid Windows .ico file (16x16, 32x32, 48x48, 256x256) using only Node.js built-ins
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makePNG(size) {
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crcBuf = Buffer.concat([t, data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(crcBuf));
    return Buffer.concat([len, t, data, c]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) {
      const cx = x / size, cy = y / size;
      // Blue gradient background
      const r = Math.floor(37 + cx * 60);
      const g = Math.floor(99 + cy * 20);
      const b = Math.floor(235 - cx * 40);
      // Draw "B" letter in white (simplified)
      const lx = (x / size) - 0.5, ly = (y / size) - 0.5;
      const inStem = lx > -0.25 && lx < -0.05 && Math.abs(ly) < 0.38;
      const inTop = lx > -0.25 && lx < 0.2 && ly > -0.38 && ly < -0.05 &&
        Math.sqrt(Math.pow(lx - 0.05, 2) + Math.pow(ly + 0.2, 2)) < 0.2;
      const inBot = lx > -0.25 && lx < 0.25 && ly > 0.02 && ly < 0.38 &&
        Math.sqrt(Math.pow(lx - 0.05, 2) + Math.pow(ly - 0.2, 2)) < 0.22;
      if (inStem || inTop || inBot) raw.push(255, 255, 255);
      else raw.push(r, g, b);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(raw));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeICO(sizes) {
  const pngs = sizes.map(s => makePNG(s));
  // ICO header: ICONDIR
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type: 1 = ICO
  header.writeUInt16LE(sizes.length, 4); // count
  // Each ICONDIRENTRY is 16 bytes
  const dirSize = sizes.length * 16;
  const dataOffset = 6 + dirSize;
  const entries = [];
  let offset = dataOffset;
  for (let i = 0; i < sizes.length; i++) {
    const entry = Buffer.alloc(16);
    const s = sizes[i];
    entry[0] = s >= 256 ? 0 : s;  // width (0 = 256)
    entry[1] = s >= 256 ? 0 : s;  // height
    entry[2] = 0;  // color count
    entry[3] = 0;  // reserved
    entry.writeUInt16LE(1, 4);    // planes
    entry.writeUInt16LE(32, 6);   // bit count
    entry.writeUInt32LE(pngs[i].length, 8);  // size
    entry.writeUInt32LE(offset, 12);          // offset
    offset += pngs[i].length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...pngs]);
}

const icoPath = path.join(__dirname, 'public', 'icon.ico');
const pngPath = path.join(__dirname, 'public', 'icon.png');

const ico = makeICO([16, 32, 48, 256]);
fs.writeFileSync(icoPath, ico);
console.log('✅ ICO created at public/icon.ico');

// Also write a 256x256 PNG for electron-builder
const png256 = makePNG(256);
fs.writeFileSync(pngPath, png256);
console.log('✅ PNG created at public/icon.png');
