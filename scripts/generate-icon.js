// Creates a valid ICO file with a 256x256 PNG image inside it
// The Rakam brand color #0c0f1a is used as the icon background
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const COLOR = { r: 12, g: 15, b: 26 }; // #0c0f1a

// Create raw RGBA pixel data
function createPixels() {
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      pixels[i] = COLOR.r;
      pixels[i + 1] = COLOR.g;
      pixels[i + 2] = COLOR.b;
      pixels[i + 3] = 255;
    }
  }
  // Draw a gold "R" shape using simple rectangles
  const gold = { r: 201, g: 151, b: 43 }; // #c9972b
  function drawRect(x1, y1, x2, y2, color) {
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
          const i = (y * SIZE + x) * 4;
          pixels[i] = color.r;
          pixels[i + 1] = color.g;
          pixels[i + 2] = color.b;
          pixels[i + 3] = 255;
        }
      }
    }
  }
  // R letter: vertical bar + top horizontal + middle horizontal + diagonal leg
  const ox = 70, oy = 50, thick = 24;
  drawRect(ox, oy, ox + thick, oy + 156, gold);           // left vertical
  drawRect(ox, oy, ox + 90, oy + thick, gold);             // top horizontal
  drawRect(ox + 90, oy, ox + 116, oy + 80, gold);          // right vertical (top)
  drawRect(ox, oy + 68, ox + 90, oy + 68 + thick, gold);   // middle horizontal
  drawRect(ox + 70, oy + 92, ox + 116, oy + 206, gold);    // right leg diagonal
  return pixels;
}

// Create minimal valid PNG
function createPNG(pixels) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = (c >>> 8) ^ crc32Table[(c ^ buf[i]) & 0xff];
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  const crc32Table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crc32Table[n] = c >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT - filter each row with filter byte 0 (None)
  const rawData = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    rawData[y * (SIZE * 4 + 1)] = 0; // filter byte
    pixels.copy(rawData, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  const compressed = zlib.deflateSync(rawData);

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend)
  ]);
}

function createICO(pngData) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);    // reserved
  header.writeUInt16LE(1, 2);    // type: ICO
  header.writeUInt16LE(1, 4);    // count: 1 image

  // ICO directory entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry[0] = 0;   // width (0 = 256)
  entry[1] = 0;   // height (0 = 256)
  entry[2] = 0;   // palette
  entry[3] = 0;   // reserved
  entry.writeUInt16LE(1, 4);     // color planes
  entry.writeUInt16LE(32, 6);    // bits per pixel
  entry.writeUInt32LE(pngData.length, 8);  // size of PNG data
  entry.writeUInt32LE(22, 12);             // offset to PNG data (6 + 16 = 22)

  return Buffer.concat([header, entry, pngData]);
}

const pixels = createPixels();
const png = createPNG(pixels);
const ico = createICO(png);

const outPath = path.join(__dirname, '..', 'assets', 'icon.ico');
fs.writeFileSync(outPath, ico);
console.log(`Created ${outPath} (${ico.length} bytes)`);
console.log(`PNG data: ${png.length} bytes`);
