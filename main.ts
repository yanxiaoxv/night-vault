// main.ts — the entrypoint that hands this game entry in.
//
// It works in four steps:
//   1. Locate: the entry root is this file's own directory; the output
//      directory is MAKEFUN_OUTPUT_DIR when set, else /output.
//   2. Pre-flight: game/ and screenshots/ are walked and measured before
//      anything is copied, and the run stops with a named complaint when a
//      cap is broken — including each screenshot's pixel size, read from
//      its own PNG or JPEG header bytes.
//   3. Stage: the checked files are copied into the output directory.
//   4. Dossier: the vendored library summarises the staged tree and the
//      result is written as dossier.json, followed by a short receipt.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The contest caps this entry is held to, each named once.
const SHOTS_MIN = 3;
const SHOTS_MAX = 4;
const SHOT_MAX_BYTES = 262144;
const SHOT_LONG_SIDE_MAX = 1280;
const SHOT_SHORT_SIDE_MIN = 480;
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50331648;

/** The caps handed to buildDossier, exactly as the contest's gate sets them. */
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Stop the run with a message that names the violation. */
function refuse(complaint: string): never {
  throw new Error(`main: ${complaint}`);
}

/** One file found on disk: where it sits relative to its root, and its size. */
interface FoundFile {
  rel: string;
  abs: string;
  bytes: number;
}

/** Code-unit order for relative paths, the same on every machine. */
const byRelPath = (a: FoundFile, b: FoundFile): number => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0);

/** Every regular file under root, recursively, in relative-path order. */
function collectFiles(root: string): FoundFile[] {
  const found: FoundFile[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile()) {
        found.push({ rel: relative(root, abs).split(sep).join('/'), abs, bytes: statSync(abs).size });
      }
    }
  };
  walk(root);
  found.sort(byRelPath);
  return found;
}

/**
 * A picture's pixel size from its header bytes, or null when the bytes are
 * neither PNG nor JPEG. PNG keeps width and height as big-endian u32s in the
 * IHDR chunk that follows the 8-byte signature. JPEG is a walk over marker
 * segments: each opens with 0xFF and a marker byte, most then carry a
 * big-endian length; a start-of-frame segment's payload opens with the
 * sample precision, then height, then width.
 */
function pictureSize(bytes: Uint8Array): { width: number; height: number } | null {
  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 24 && PNG_SIGNATURE.every((b, i) => bytes[i] === b)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let at = 2;
    while (at + 4 <= bytes.length) {
      if (bytes[at] !== 0xff) return null;
      const marker = bytes[at + 1]!;
      // TEM, RST0-RST7, SOI and EOI stand alone: no length field follows them.
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
        at += 2;
        continue;
      }
      const segmentLength = view.getUint16(at + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        if (at + 9 > bytes.length) return null;
        return { width: view.getUint16(at + 7), height: view.getUint16(at + 5) };
      }
      at += 2 + segmentLength;
    }
  }
  return null;
}

/** The screenshots, once each has passed the count, byte and dimension caps. */
function checkedScreenshots(dir: string): FoundFile[] {
  const shots: FoundFile[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const abs = join(dir, entry.name);
    shots.push({ rel: entry.name, abs, bytes: statSync(abs).size });
  }
  shots.sort(byRelPath);
  if (shots.length < SHOTS_MIN || shots.length > SHOTS_MAX) {
    refuse(`screenshots/: ${shots.length} images, but the entry must carry ${SHOTS_MIN} to ${SHOTS_MAX}`);
  }
  for (const shot of shots) {
    if (shot.bytes > SHOT_MAX_BYTES) {
      refuse(`screenshots/${shot.rel}: ${shot.bytes} bytes, over the ${SHOT_MAX_BYTES} a screenshot may be`);
    }
    const size = pictureSize(readFileSync(shot.abs));
    if (size === null) refuse(`screenshots/${shot.rel}: not a PNG or JPEG image`);
    const longSide = Math.max(size.width, size.height);
    const shortSide = Math.min(size.width, size.height);
    if (longSide > SHOT_LONG_SIDE_MAX) {
      refuse(`screenshots/${shot.rel}: long side ${longSide}px, over the ${SHOT_LONG_SIDE_MAX}px allowed`);
    }
    if (shortSide < SHOT_SHORT_SIDE_MIN) {
      refuse(`screenshots/${shot.rel}: short side ${shortSide}px, under the ${SHOT_SHORT_SIDE_MIN}px required`);
    }
  }
  return shots;
}

/** The game tree's files, once the count and total-byte caps have passed. */
function checkedGame(dir: string): FoundFile[] {
  if (!existsSync(dir)) refuse('game/: no such directory beside main.ts');
  const files = collectFiles(dir);
  if (files.length > GAME_MAX_FILES) {
    refuse(`game/: ${files.length} files, over the ${GAME_MAX_FILES} allowed`);
  }
  const total = files.reduce((sum, f) => sum + f.bytes, 0);
  if (total > GAME_MAX_BYTES) {
    refuse(`game/: ${total} bytes in all, over the ${GAME_MAX_BYTES} allowed`);
  }
  return files;
}

/** Copy files under destRoot at their relative paths; returns the bytes copied. */
function stageAll(files: FoundFile[], destRoot: string): number {
  let copied = 0;
  for (const file of files) {
    const target = join(destRoot, file.rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(file.abs, target);
    copied += file.bytes;
  }
  return copied;
}

// --- the run itself -------------------------------------------------------

const entryRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameFiles = checkedGame(join(entryRoot, 'game'));
const shotsDir = join(entryRoot, 'screenshots');
const shotFiles = existsSync(shotsDir) ? checkedScreenshots(shotsDir) : null;

mkdirSync(outputDir, { recursive: true });
const gameBytes = stageAll(gameFiles, join(outputDir, 'game'));
const shotBytes = shotFiles === null ? 0 : stageAll(shotFiles, join(outputDir, 'screenshots'));

const dossier = buildDossier(outputDir, DOSSIER_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);

const shotReport = shotFiles === null ? 'no screenshots/ folder to stage' : `${shotFiles.length} screenshots, ${shotBytes} bytes`;
console.log(`staged into ${outputDir}: ${gameFiles.length} game files, ${gameBytes} bytes; ${shotReport}`);
console.log(`dossier.json: ${dossier.length} bytes`);
