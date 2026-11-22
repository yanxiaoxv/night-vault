// Night Vault — hand-in program for the make.fun stealth-game entry.
//
// What this file does, in order:
//   1. Pre-flight: walks game/ and screenshots/ and refuses to stage
//      anything the scorer would refuse (too many files, oversized
//      screenshots, undersized art), failing loudly instead of handing
//      in a dead entry.
//   2. Stages game/ and screenshots/ into the output directory
//      (MAKEFUN_OUTPUT_DIR when set, /output otherwise).
//   3. Asks the vendored make.fun library for the dossier over the
//      staged tree and writes it as dossier.json, then prints a short
//      summary of what was handed in.
//
// Node 22, standard library only. Run it with: node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const CAPS = Object.freeze({
  dossierTextBytes: 163840,
  shotCountMax: 4,
  shotCountMin: 3,
  shotBytes: 262144,
  shotLongSideMax: 1280,
  shotShortSideMin: 480,
  gameFiles: 993,
  gameBytes: 50331648,
  gamePathBytes: 1000,
});

// Every regular file under dir, as { rel, bytes } with rel using '/'.
function collectFiles(dir, prefix = '') {
  const found = [];
  for (const name of readdirSync(dir).sort()) {
    const abs = join(dir, name);
    const rel = prefix === '' ? name : `${prefix}/${name}`;
    const st = statSync(abs);
    if (st.isDirectory()) found.push(...collectFiles(abs, rel));
    else if (st.isFile()) found.push({ rel, bytes: st.size });
  }
  return found;
}

// Pixel dimensions from the file header alone; null when unrecognised.
function imageSize(buf) {
  // PNG: 8-byte signature, then IHDR with big-endian width/height.
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: walk the marker segments until a start-of-frame carries the size.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let at = 2;
    while (at + 9 < buf.length) {
      if (buf[at] !== 0xff) return null;
      const marker = buf[at + 1];
      const segLen = buf.readUInt16BE(at + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) return { width: buf.readUInt16BE(at + 7), height: buf.readUInt16BE(at + 5) };
      if (segLen < 2) return null;
      at += 2 + segLen;
    }
  }
  return null;
}

function refuse(problem) {
  throw new Error(`night-vault hand-in refused: ${problem}`);
}

// The checks the scorer runs, run here first so a bad tree never stages.
function preflight(root) {
  const gameDir = join(root, 'game');
  if (!existsSync(gameDir)) refuse('game/ is missing');
  const gameFiles = collectFiles(gameDir, 'game');
  const gameBytes = gameFiles.reduce((sum, f) => sum + f.bytes, 0);
  if (gameFiles.length > CAPS.gameFiles) refuse(`game/ holds ${gameFiles.length} files, over the ${CAPS.gameFiles} cap`);
  if (gameBytes > CAPS.gameBytes) refuse(`game/ totals ${gameBytes} bytes, over the ${CAPS.gameBytes} cap`);
  for (const f of gameFiles) {
    if (Buffer.byteLength(f.rel) > CAPS.gamePathBytes) refuse(`path too long: ${f.rel}`);
  }

  const shotDir = join(root, 'screenshots');
  const shots = existsSync(shotDir) ? collectFiles(shotDir, 'screenshots') : [];
  if (shots.length < CAPS.shotCountMin || shots.length > CAPS.shotCountMax) {
    refuse(`screenshots/ holds ${shots.length} files, need ${CAPS.shotCountMin}-${CAPS.shotCountMax}`);
  }
  for (const shot of shots) {
    if (shot.bytes > CAPS.shotBytes) refuse(`${shot.rel} is ${shot.bytes} bytes, over the ${CAPS.shotBytes} cap`);
    const size = imageSize(readFileSync(join(root, shot.rel)));
    if (size === null) refuse(`${shot.rel}: cannot read image dimensions`);
    const longSide = Math.max(size.width, size.height);
    const shortSide = Math.min(size.width, size.height);
    if (longSide > CAPS.shotLongSideMax) refuse(`${shot.rel} is ${size.width}x${size.height}, long side over ${CAPS.shotLongSideMax}`);
    if (shortSide < CAPS.shotShortSideMin) refuse(`${shot.rel} is ${size.width}x${size.height}, short side under ${CAPS.shotShortSideMin}`);
  }
  return { gameFiles, gameBytes, shots };
}

function stage(root, out) {
  mkdirSync(out, { recursive: true });
  cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(root, 'screenshots'))) {
    cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
}

const root = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const report = preflight(root);
stage(root, out);

const dossier = buildDossier(out, {
  text_max_bytes: CAPS.dossierTextBytes,
  screenshots: { max: CAPS.shotCountMax, max_bytes: CAPS.shotBytes },
  game_max_files: CAPS.gameFiles,
  game_max_bytes: CAPS.gameBytes,
  game_path_max_bytes: CAPS.gamePathBytes,
});
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`night-vault: staged ${report.gameFiles.length} game files (${report.gameBytes} bytes) and ${report.shots.length} screenshots`);
console.log(`night-vault: dossier.json written, ${dossier.byteLength} bytes`);
