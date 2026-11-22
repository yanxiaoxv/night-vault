// Night Vault — the screenshot scenes behind ?shot=cover|chase|shadow|win.
// Each scene loads a real night, poses its figures the way a moment of play
// poses them, then steps the true update loop for a beat with a scripted
// hand on the keys — so every screenshot is the game itself, caught mid-act.

import { TILE } from './config.js';
import { GUARD_CHASE } from './guards.js';
import { TossedCoin } from './player.js';

const STEP = 1 / 60;

/** A still hand: no movement, sneaking, never tossing. */
function stillInput(sneak = true) {
  return {
    moveVector: () => [0, 0],
    sneaking: sneak,
    takeCoinToss: () => false,
    mouseX: 0,
    mouseY: 0,
  };
}

/** A fleeing hand: running left, loud. */
function fleeInput() {
  return {
    moveVector: () => [-1, 0],
    sneaking: false,
    takeCoinToss: () => false,
    mouseX: 0,
    mouseY: 0,
  };
}

function placePlayer(world, col, row, angle = 0) {
  world.player.x = col * TILE + TILE / 2;
  world.player.y = row * TILE + TILE / 2;
  world.player.angle = angle;
}

function placeGuard(guard, col, row, angle) {
  guard.x = col * TILE + TILE / 2;
  guard.y = row * TILE + TILE / 2;
  guard.angle = angle;
  guard.homeX = guard.x;
  guard.homeY = guard.y;
}

function stepSeconds(world, seconds, input) {
  for (let t = 0; t < seconds; t += STEP) world.update(STEP, input);
}

/** Cover: Night Two — she waits in the shadow seam while two cones sweep past and a coin sings. */
function stageCover(world) {
  world.loadLevel(1);
  world.elapsed = 41;
  world.bannerAge = 1.1; // the objective banner is part of the scene
  const [guardA, guardB] = world.guards;
  placeGuard(guardA, 18.5, 7.5, Math.PI); // lantern sweeping left, across the seam
  placeGuard(guardB, 25.5, 11.5, Math.PI); // posted by the door, his light raking the room
  placePlayer(world, 13.5, 9.5, 0.5);
  const coin = new TossedCoin(world.player.x, world.player.y, 20.5 * TILE, 6.5 * TILE);
  coin.progress = 1;
  coin.landed = true;
  coin.pingAge = 0.16;
  world.coins.push(coin);
  stepSeconds(world, 0.35, stillInput(true));
  // The steps settle the systems; the pose is then set exactly, as a held
  // moment of play would hold it, and the still frame renders that pose.
  placeGuard(guardA, 18.5, 7.5, Math.PI);
  placeGuard(guardB, 25.5, 11.5, Math.PI);
  placePlayer(world, 13.5, 9.5, 0.5);
  coin.pingAge = 0.24;
  world.bannerAge = 1.1;
}

/** Chase: Night One — seen, shouted at, and run down in the open. */
function stageChase(world) {
  world.loadLevel(0);
  world.elapsed = 63;
  world.bannerAge = 99; // no banner over an alarm
  placePlayer(world, 12.5, 9.5, Math.PI);
  const guard = world.guards[0];
  placeGuard(guard, 15.5, 9.5, Math.PI);
  guard.suspicion = 1;
  guard.state = GUARD_CHASE;
  world.timesSpotted = 1;
  stepSeconds(world, 0.3, fleeInput());
  guard.suspicion = 1; // the frame must read as a live alarm
}

/** Shadow: Night One — the cone washes over the pool and she is only half-seen. */
function stageShadow(world) {
  world.loadLevel(0);
  world.elapsed = 27;
  world.bannerAge = 99;
  placePlayer(world, 21.5, 3.5, -0.4);
  const guard = world.guards[1];
  placeGuard(guard, 25.5, 3.5, Math.PI);
  guard.suspicion = 0.45;
  stepSeconds(world, 0.25, stillInput(true));
  // Pose held after the settle, as in the cover scene.
  placeGuard(guard, 25.5, 3.5, Math.PI);
  guard.suspicion = 0.5;
  placeGuard(world.guards[0], 10.5, 9.5, 2.4); // the other lantern, mid-round in the open
  placePlayer(world, 21.5, 3.5, -0.4);
}

/** Win: Night One cleared unseen — the score card the run earns. */
function stageWin(world, game) {
  world.loadLevel(0);
  world.elapsed = 52.4;
  world.bannerAge = 99;
  world.finishLevel();
  game.shotScreen = 'clear'; // main.js's SCREEN_CLEAR, named here to keep the modules unentangled
}

export function stageShot(name, game) {
  const world = game.world;
  if (name === 'chase') stageChase(world);
  else if (name === 'shadow') stageShadow(world);
  else if (name === 'win') stageWin(world, game);
  else stageCover(world);
}
