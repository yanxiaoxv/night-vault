// Night Vault — the lantern guards: patrols, suspicion and the hunt.
// A guard walks his waypoints by grid path so he uses the corridors like a
// person. His suspicion fills while the burglar is in his lantern cone and
// drains when she is gone; full suspicion means the chase is on. Lose her
// and he searches the last place he saw or heard something, then gives up
// and walks back to his round.

import { DETECTION, GUARD, TILE } from './config.js';
import { isSolidTile, tileAt } from './levels.js';
import { angleDifference, canSeePoint } from './vision.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_LOOK = 'look';
export const GUARD_CHASE = 'chase';
export const GUARD_RETURN = 'return';

/** Breadth-first path over open tiles between two tile positions, or null. */
export function findGridPath(level, fromCol, fromRow, toCol, toRow) {
  if (fromCol === toCol && fromRow === toRow) return [];
  const key = (c, r) => r * 64 + c;
  const cameFrom = new Map([[key(fromCol, fromRow), null]]);
  const queue = [[fromCol, fromRow]];
  while (queue.length > 0) {
    const [col, row] = queue.shift();
    if (col === toCol && row === toRow) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = col + dc;
      const nr = row + dr;
      if (cameFrom.has(key(nc, nr))) continue;
      if (isSolidTile(tileAt(level, nc, nr))) continue;
      cameFrom.set(key(nc, nr), [col, row]);
      queue.push([nc, nr]);
    }
  }
  if (!cameFrom.has(key(toCol, toRow))) return null;
  const path = [];
  let node = [toCol, toRow];
  while (node !== null && !(node[0] === fromCol && node[1] === fromRow)) {
    path.unshift(node);
    node = cameFrom.get(key(node[0], node[1]));
  }
  return path;
}

const tileCentre = (col, row) => [col * TILE + TILE / 2, row * TILE + TILE / 2];

export class Guard {
  constructor(level, definition, index) {
    this.index = index;
    this.sentry = Boolean(definition.sentry);
    const startTile = this.sentry ? definition.at : definition.waypoints[0];
    const [x, y] = tileCentre(startTile[0], startTile[1]);
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.homeY = y;
    this.angle = definition.face ?? 0;
    this.waypoints = definition.waypoints ?? null;
    this.waypointIndex = 1;
    this.sweep = definition.sweep ?? 0; // sentry: how far his head swings
    this.sweepPhase = index * 1.7;
    this.state = GUARD_PATROL;
    this.suspicion = 0;
    this.seesPlayer = false;
    this.path = [];
    this.pathTarget = null;
    this.investigateX = 0;
    this.investigateY = 0;
    this.lastSeenX = 0;
    this.lastSeenY = 0;
    this.loseTimer = 0;
    this.lookTimer = 0;
    this.lookBaseAngle = definition.face ?? 0; // a sentry sweeps around the way he first faces
    this.warned = false; // the rising-warning blip already sounded this fill
  }

  get alerted() {
    return this.state === GUARD_CHASE;
  }

  tilePosition() {
    return [Math.floor(this.x / TILE), Math.floor(this.y / TILE)];
  }

  /** Steer along a BFS path toward a tile; true once there. */
  followPath(level, targetCol, targetRow, speed, dt) {
    const targetKey = `${targetCol},${targetRow}`;
    if (this.pathTarget !== targetKey) {
      const [col, row] = this.tilePosition();
      this.path = findGridPath(level, col, row, targetCol, targetRow) ?? [];
      this.pathTarget = targetKey;
    }
    if (this.path.length === 0) return true;
    const [tx, ty] = tileCentre(this.path[0][0], this.path[0][1]);
    return this.moveToward(level, tx, ty, speed, dt, true);
  }

  /** Move toward a point, turning the body (and lantern) to face the way. */
  moveToward(level, tx, ty, speed, dt, popOnArrive = false) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 3) {
      if (popOnArrive) this.path.shift();
      return this.path.length === 0 && distance < 3;
    }
    const wanted = Math.atan2(dy, dx);
    this.turnToward(wanted, dt);
    const step = Math.min(distance, speed * dt);
    const nx = this.x + Math.cos(this.angle) * step * Math.max(0.25, Math.cos(angleDifference(this.angle, wanted)) + 0.35);
    const ny = this.y + Math.sin(this.angle) * step * Math.max(0.25, Math.cos(angleDifference(this.angle, wanted)) + 0.35);
    // Slide along walls: try the full move, then each axis alone.
    if (!this.hitsWall(level, nx, ny)) {
      this.x = nx;
      this.y = ny;
    } else if (!this.hitsWall(level, nx, this.y)) {
      this.x = nx;
    } else if (!this.hitsWall(level, this.x, ny)) {
      this.y = ny;
    }
    if (popOnArrive && Math.hypot(tx - this.x, ty - this.y) < TILE * 0.45) this.path.shift();
    return false;
  }

  hitsWall(level, x, y) {
    const r = GUARD.radius - 2;
    for (const [cx, cy] of [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]]) {
      if (isSolidTile(tileAt(level, Math.floor(cx / TILE), Math.floor(cy / TILE)))) return true;
    }
    return false;
  }

  turnToward(wanted, dt) {
    const diff = angleDifference(this.angle, wanted);
    const maxTurn = GUARD.turnRate * dt;
    this.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
  }

  /** A noise reached this guard: coins are chased down, footsteps only glanced at. */
  hearNoise(world, x, y, strong) {
    if (this.state === GUARD_CHASE) return;
    if (strong) {
      this.state = GUARD_INVESTIGATE;
      this.investigateX = x;
      this.investigateY = y;
      this.pathTarget = null;
      world.sound.guardHears();
    } else if (this.state === GUARD_PATROL) {
      // A footstep nearby: pause and turn toward it, briefly suspicious.
      this.state = GUARD_LOOK;
      this.lookTimer = 0.7;
      this.lookBaseAngle = Math.atan2(y - this.y, x - this.x);
      this.suspicion = Math.min(0.45, this.suspicion + 0.18);
    }
  }

  /** Detection maths for this frame; returns events for the world to count. */
  updateDetection(world, dt) {
    const player = world.player;
    const level = world.level;
    const distance = Math.hypot(player.x - this.x, player.y - this.y);
    const seen = canSeePoint(level, this.x, this.y, this.angle, GUARD.visionHalfAngle, GUARD.visionRange, player.x, player.y);
    this.seesPlayer = seen;
    const wasSpotted = this.suspicion >= 1;
    const events = [];
    if (seen) {
      const closeness = 1 - Math.min(1, distance / GUARD.visionRange); // 1 close, 0 at rim
      const fillSeconds = DETECTION.fillSecondsAtEdge + (DETECTION.fillSecondsAtPointBlank - DETECTION.fillSecondsAtEdge) * closeness;
      let rate = dt / fillSeconds;
      if (player.sneaking) rate *= DETECTION.sneakMultiplier;
      if (player.inShadow) rate *= DETECTION.shadowMultiplier;
      const before = this.suspicion;
      this.suspicion = Math.min(1, this.suspicion + rate);
      if (before < 0.55 && this.suspicion >= 0.55 && !this.warned) {
        this.warned = true;
        events.push('warning');
      }
      this.lastSeenX = player.x;
      this.lastSeenY = player.y;
      this.loseTimer = 0;
      if (this.suspicion >= 1 && !wasSpotted && this.state !== GUARD_CHASE) {
        this.state = GUARD_CHASE;
        events.push('alerted');
      }
    } else {
      this.warned = this.suspicion > 0.55 ? this.warned : false;
      this.suspicion = Math.max(0, this.suspicion - DETECTION.decayPerSecond * dt);
      if (this.state === GUARD_CHASE) {
        this.loseTimer += dt;
        if (this.loseTimer > GUARD.loseSightSeconds) {
          this.state = GUARD_INVESTIGATE;
          this.investigateX = this.lastSeenX;
          this.investigateY = this.lastSeenY;
          this.pathTarget = null;
          this.suspicion = 0.62;
          events.push('lost');
        }
      }
    }
    return events;
  }

  update(world, dt, elapsed) {
    const level = world.level;
    const player = world.player;
    if (this.sentry) {
      // The vault sentry never walks: he sweeps his lantern back and forth.
      this.angle = this.lookBaseAngle + Math.sin(elapsed * 0.55 + this.sweepPhase) * this.sweep;
      if (this.state === GUARD_CHASE) this.state = GUARD_PATROL; // he shouts, others hunt
      if (this.seesPlayer) this.turnToward(Math.atan2(player.y - this.y, player.x - this.x), dt * 0.4);
      return;
    }
    switch (this.state) {
      case GUARD_CHASE: {
        const [pc, pr] = player.tilePosition();
        if (this.followPath(level, pc, pr, GUARD.chaseSpeed, dt)) {
          this.moveToward(level, player.x, player.y, GUARD.chaseSpeed, dt); // same tile: close the last steps
        }
        if (this.seesPlayer) this.turnToward(Math.atan2(player.y - this.y, player.x - this.x), dt);
        if (Math.hypot(player.x - this.x, player.y - this.y) < GUARD.catchDistance) world.onCaught(this);
        break;
      }
      case GUARD_INVESTIGATE: {
        const col = Math.floor(this.investigateX / TILE);
        const row = Math.floor(this.investigateY / TILE);
        const arrived = this.followPath(level, col, row, GUARD.investigateSpeed, dt)
          && Math.hypot(this.investigateX - this.x, this.investigateY - this.y) < TILE;
        if (arrived) {
          this.state = GUARD_LOOK;
          this.lookTimer = GUARD.lookAroundSeconds;
          this.lookBaseAngle = this.angle;
        }
        break;
      }
      case GUARD_LOOK: {
        this.lookTimer -= dt;
        this.angle = this.lookBaseAngle + Math.sin((GUARD.lookAroundSeconds - this.lookTimer) * 4.2) * 0.7;
        if (this.lookTimer <= 0) {
          this.state = GUARD_RETURN;
          this.pathTarget = null;
        }
        break;
      }
      case GUARD_RETURN: {
        const [hc, hr] = [Math.floor(this.homeX / TILE), Math.floor(this.homeY / TILE)];
        if (this.followPath(level, hc, hr, GUARD.returnSpeed, dt)) {
          this.state = GUARD_PATROL;
          // Resume the round at the nearest waypoint.
          let best = 0;
          let bestDistance = Infinity;
          this.waypoints.forEach(([c, r], i) => {
            const d = Math.hypot(c * TILE - this.x, r * TILE - this.y);
            if (d < bestDistance) {
              bestDistance = d;
              best = i;
            }
          });
          this.waypointIndex = best;
          this.pathTarget = null;
        }
        break;
      }
      default: { // GUARD_PATROL
        const [wc, wr] = this.waypoints[this.waypointIndex];
        if (this.followPath(level, wc, wr, GUARD.patrolSpeed, dt)) {
          this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
          this.pathTarget = null;
        }
      }
    }
  }
}
