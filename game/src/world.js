// Night Vault — the simulation: one night's guards, coins, noise and score.
// The world owns the state the renderer only reads. It loads a level, steps
// the burglar and the guards, carries noise to the guards' ears, counts
// every full spotting, and calls the night won or lost.

import { DETECTION, GUARD, PLAYER, SCORE, TILE } from './config.js';
import { LEVELS, TILE_EXIT, tileAt } from './levels.js';
import { Guard } from './guards.js';
import { Player, TossedCoin } from './player.js';

export const WORLD_PLAYING = 'playing';
export const WORLD_CAUGHT = 'caught';
export const WORLD_CLEAR = 'clear';

export class World {
  constructor(sound) {
    this.sound = sound;
    this.levelIndex = 0;
    this.totalScore = 0;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.player = new Player(this.level);
    this.guards = this.level.guards.map((definition, i) => new Guard(this.level, definition, i));
    this.coins = [];
    this.elapsed = 0;
    this.state = WORLD_PLAYING;
    this.stateAge = 0;
    this.timesSpotted = 0;
    this.everAlerted = false;
    this.caughtBy = null;
    this.clearStats = null;
    this.bannerAge = 0;
  }

  restartLevel() {
    this.loadLevel(this.levelIndex);
  }

  get anyAlert() {
    return this.guards.some((guard) => guard.alerted || guard.suspicion >= 1);
  }

  get maxSuspicion() {
    return this.guards.reduce((max, guard) => Math.max(max, guard.suspicion), 0);
  }

  /** The exit door tiles of the current level, as pixel rectangles. */
  exitRects() {
    const rects = [];
    this.level.map.forEach((line, row) => {
      for (let col = 0; col < line.length; col += 1) {
        if (line[col] === TILE_EXIT) rects.push([col * TILE, row * TILE, TILE, TILE]);
      }
    });
    return rects;
  }

  playerOnExit() {
    const [col, row] = this.player.tilePosition();
    return tileAt(this.level, col, row) === TILE_EXIT;
  }

  /** Toss a decoy coin toward a point, if she has one and it is in reach. */
  tossCoin(targetX, targetY) {
    if (this.player.coinsLeft <= 0 || this.state !== WORLD_PLAYING) return;
    const player = this.player;
    const distance = Math.hypot(targetX - player.x, targetY - player.y);
    const scale = distance > PLAYER.coinThrowRange ? PLAYER.coinThrowRange / distance : 1;
    const landX = player.x + (targetX - player.x) * scale;
    const landY = player.y + (targetY - player.y) * scale;
    const col = Math.floor(landX / TILE);
    const row = Math.floor(landY / TILE);
    if (tileAt(this.level, col, row) === '#' || tileAt(this.level, col, row) === 'C') return;
    player.coinsLeft -= 1;
    this.coins.push(new TossedCoin(player.x, player.y, landX, landY));
    this.sound.coinToss();
  }

  /** Carry a noise to every guard in earshot. */
  makeNoise(x, y, radius, strong) {
    for (const guard of this.guards) {
      if (Math.hypot(guard.x - x, guard.y - y) <= radius) guard.hearNoise(this, x, y, strong);
    }
  }

  onCaught(guard) {
    if (this.state !== WORLD_PLAYING) return;
    this.state = WORLD_CAUGHT;
    this.stateAge = 0;
    this.caughtBy = guard;
    this.sound.caughtThud();
  }

  finishLevel() {
    const timeBonus = Math.max(SCORE.minimumTimeBonus, SCORE.levelBase - Math.floor(this.elapsed) * SCORE.timePenaltyPerSecond);
    const ghost = this.timesSpotted === 0;
    const coinBonus = this.player.coinsLeft * SCORE.unspentCoinBonus;
    const spottedCost = this.timesSpotted * SCORE.spottedPenalty;
    const levelScore = Math.max(50, timeBonus + (ghost ? SCORE.ghostBonus : 0) + coinBonus - spottedCost);
    this.clearStats = {
      seconds: this.elapsed,
      timesSpotted: this.timesSpotted,
      ghost,
      coinBonus,
      levelScore,
    };
    this.totalScore += levelScore;
    this.state = WORLD_CLEAR;
    this.stateAge = 0;
    if (this.levelIndex === LEVELS.length - 1) this.sound.gameClear();
    else this.sound.levelClear();
  }

  /** Advance the whole night by dt seconds. Input comes from main. */
  update(dt, input) {
    this.stateAge += dt;
    if (this.state !== WORLD_PLAYING) return;
    this.elapsed += dt;
    this.bannerAge += dt;

    const [moveX, moveY] = input.moveVector();
    const stepEvent = this.player.update(dt, moveX, moveY, input.sneaking);
    if (stepEvent === 'step') {
      this.sound.footstep();
      this.makeNoise(this.player.x, this.player.y, DETECTION.glanceNoiseDistance, false);
    }
    if (input.takeCoinToss()) this.tossCoin(input.mouseX, input.mouseY);

    for (const coin of [...this.coins]) {
      if (coin.update(dt) === 'ping') {
        this.sound.coinPing();
        this.makeNoise(coin.toX, coin.toY, PLAYER.coinNoiseRadius, true);
      }
      if (coin.faded) this.coins.splice(this.coins.indexOf(coin), 1);
    }

    for (const guard of this.guards) {
      const events = guard.updateDetection(this, dt);
      for (const event of events) {
        if (event === 'warning') this.sound.warning();
        if (event === 'alerted') {
          this.timesSpotted += 1;
          this.everAlerted = true;
          this.sound.alertSting();
          if (guard.sentry) {
            // The sentry cannot leave his post: he shouts the others over.
            this.makeNoise(this.player.x, this.player.y, 9999, true);
          }
        }
      }
      guard.update(this, dt, this.elapsed);
      if (this.state !== WORLD_PLAYING) return;
    }

    if (this.playerOnExit()) this.finishLevel();
  }
}
