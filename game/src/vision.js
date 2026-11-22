// Night Vault — lantern light: line of sight and vision-cone geometry.
// Walls and crates stop light. A guard's cone is built by sweeping rays
// across his facing arc and marching each one until it hits something
// solid, which gives the jagged, wall-hugging cone the player learns to read.

import { TILE } from './config.js';
import { isSolidTile, tileAt } from './levels.js';

/** True when the tile holding world point (x, y) blocks sight. */
export function pointBlocked(level, x, y) {
  return isSolidTile(tileAt(level, Math.floor(x / TILE), Math.floor(y / TILE)));
}

/** March a ray from (x, y) along `angle`; return how far it got before a wall. */
export function rayDistance(level, x, y, angle, maxDistance) {
  const step = 4;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let px = x;
  let py = y;
  let travelled = 0;
  while (travelled < maxDistance) {
    px += dx;
    py += dy;
    travelled += step;
    if (pointBlocked(level, px, py)) return travelled;
  }
  return maxDistance;
}

/** Unbroken straight sight line between two points (fine steps, no corners cut). */
export function hasLineOfSight(level, x1, y1, x2, y2) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(distance / 5));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (pointBlocked(level, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}

/**
 * The visible polygon of a cone: origin, facing angle, half-angle and range.
 * Rays are cast a little past both edges so the cone's rim hugs the walls.
 */
export function buildVisionPolygon(level, x, y, angle, halfAngle, range) {
  const rayCount = 44;
  const points = [[x, y]];
  for (let i = 0; i <= rayCount; i += 1) {
    const rayAngle = angle - halfAngle + (2 * halfAngle * i) / rayCount;
    const distance = rayDistance(level, x, y, rayAngle, range);
    points.push([x + Math.cos(rayAngle) * distance, y + Math.sin(rayAngle) * distance]);
  }
  return points;
}

/** Smallest signed turn from one angle to another, in (-PI, PI]. */
export function angleDifference(from, to) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Can a guard at (gx, gy) facing `angle` see the point (px, py)?
 * Checks range, the cone's arc and an unbroken sight line.
 */
export function canSeePoint(level, gx, gy, angle, halfAngle, range, px, py) {
  const dx = px - gx;
  const dy = py - gy;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return false;
  if (distance > 1 && Math.abs(angleDifference(angle, Math.atan2(dy, dx))) > halfAngle) return false;
  return hasLineOfSight(level, gx, gy, px, py);
}
