// Night Vault — the burglar: movement, stance, noise and the coin toss.
// Walking is quick but her heels click: guards close by hear her. Sneaking
// (SHIFT) is silent and low. A tossed coin arcs to the clicked spot and
// pings on landing — every guard in earshot goes to look at it.

import { PLAYER, TILE } from './config.js';
import { TILE_SHADOW, isSolidTile, tileAt } from './levels.js';

export class Player {
  constructor(level) {
    let start = [1, 1];
    level.map.forEach((line, row) => {
      const col = line.indexOf('S');
      if (col >= 0) start = [col, row];
    });
    this.startX = start[0] * TILE + TILE / 2;
    this.startY = start[1] * TILE + TILE / 2;
    this.reset(level);
  }

  reset(level) {
    this.level = level;
    this.x = this.startX;
    this.y = this.startY;
    this.angle = 0;
    this.moving = false;
    this.sneaking = false;
    this.stepPhase = 0;
    this.coinsLeft = level.coins;
  }

  tilePosition() {
    return [Math.floor(this.x / TILE), Math.floor(this.y / TILE)];
  }

  get inShadow() {
    const [col, row] = this.tilePosition();
    return tileAt(this.level, col, row) === TILE_SHADOW;
  }

  /** The ring guards can hear her in right now (0 when sneaking or still). */
  get noiseRadius() {
    return this.moving && !this.sneaking ? PLAYER.walkNoiseRadius : 0;
  }

  hitsWall(x, y) {
    const r = PLAYER.radius - 2;
    for (const [cx, cy] of [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]]) {
      if (isSolidTile(tileAt(this.level, Math.floor(cx / TILE), Math.floor(cy / TILE)))) return true;
    }
    return false;
  }

  /**
   * Move from the input vector. Returns a footstep event ('step') on the
   * stride beat while walking, so the world can make noise and sound.
   */
  update(dt, moveX, moveY, sneaking) {
    this.sneaking = sneaking;
    const length = Math.hypot(moveX, moveY);
    this.moving = length > 0.01;
    if (!this.moving) return null;
    const speed = sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const nx = this.x + (moveX / length) * speed * dt;
    const ny = this.y + (moveY / length) * speed * dt;
    if (!this.hitsWall(nx, ny)) {
      this.x = nx;
      this.y = ny;
    } else if (!this.hitsWall(nx, this.y)) {
      this.x = nx;
    } else if (!this.hitsWall(this.x, ny)) {
      this.y = ny;
    }
    this.angle = Math.atan2(moveY, moveX);
    this.stepPhase += dt * (sneaking ? 5.2 : 8.4);
    if (this.stepPhase >= Math.PI * 2) {
      this.stepPhase -= Math.PI * 2;
      return sneaking ? null : 'step';
    }
    return null;
  }
}

/** A decoy coin in flight or landed; `landed` fires the ping exactly once. */
export class TossedCoin {
  constructor(fromX, fromY, toX, toY) {
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
    this.progress = 0;
    this.flightSeconds = 0.38;
    this.landed = false;
    this.pingAge = 0;
  }

  get x() {
    return this.fromX + (this.toX - this.fromX) * this.progress;
  }

  get y() {
    return this.fromY + (this.toY - this.fromY) * this.progress;
  }

  /** The arc's height above the floor, for the renderer's little hop. */
  get hop() {
    return Math.sin(this.progress * Math.PI) * 16;
  }

  update(dt) {
    if (!this.landed) {
      this.progress = Math.min(1, this.progress + dt / this.flightSeconds);
      if (this.progress >= 1) {
        this.landed = true;
        return 'ping';
      }
    } else {
      this.pingAge += dt;
    }
    return null;
  }

  get pingRadius() {
    return this.landed ? Math.min(PLAYER.coinNoiseRadius, this.pingAge * 620) : 0;
  }

  get faded() {
    return this.landed && this.pingAge > 1.1;
  }
}
