#!/usr/bin/env node
/**
 * Generates small, project-owned solid-color PNG fixture images for the
 * Slice 6 evaluation set — one logo (square) and one campaign hero image
 * (600x300, matching the renderer's email width) per brand. No third-party
 * placeholder service, no external network call; pixels are written
 * directly with Node's zlib deflate, so the only "dependency" is Node
 * itself. Run: node scripts/generate-eval-fixture-images.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "fixtures", "eval-assets");

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let cc = n;
      for (let k = 0; k < 8; k++) cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1;
      t[n] = cc >>> 0;
    }
    return t;
  })());
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/** Builds a minimal valid solid-color RGB PNG of the given size. */
function solidColorPng(width, height, [r, g, b]) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = width * 3;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1);
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }
  const idatData = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const FIXTURES = [
  { file: "northstar-cloud-logo.png", width: 240, height: 240, color: [37, 99, 235] },
  { file: "northstar-cloud-hero.png", width: 600, height: 300, color: [59, 130, 246] },
  { file: "harvest-co-logo.png", width: 240, height: 240, color: [234, 88, 12] },
  { file: "harvest-co-hero.png", width: 600, height: 300, color: [251, 146, 60] },
  { file: "roots-forward-logo.png", width: 240, height: 240, color: [21, 128, 61] },
  { file: "roots-forward-hero.png", width: 600, height: 300, color: [74, 222, 128] },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const fixture of FIXTURES) {
  const png = solidColorPng(fixture.width, fixture.height, fixture.color);
  writeFileSync(path.join(OUT_DIR, fixture.file), png);
  console.log(`Wrote ${fixture.file} (${fixture.width}x${fixture.height})`);
}
