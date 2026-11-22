// Night Vault — the boot and the screens between the action.
// Owns the canvas, the fixed-step loop and the screen state machine:
// title -> playing -> (paused | caught | night clear) -> next night.

import { FIELD } from './config.js';
import { Input } from './input.js';
import { SoundFX } from './audio.js';
import { World, WORLD_CAUGHT, WORLD_CLEAR } from './world.js';
import { LEVELS } from './levels.js';
import {
  drawCaughtScreen,
  drawLevelClearScreen,
  drawPauseScreen,
  drawScene,
  drawTitleScreen,
} from './render.js';
import { stageShot } from './shots.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAYING = 'playing';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  sound: new SoundFX(),
  input: new Input(canvas),
  world: null,
  screen: SCREEN_TITLE,
  shotScreen: null,
};
game.world = new World(game.sound);
window.__nightVault = game;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  game.screen = 'shot';
  stageShot(shotName, game);
}

function startNight(index) {
  game.world.loadLevel(index);
  game.screen = SCREEN_PLAYING;
}

function handleConfirm() {
  if (game.screen === SCREEN_TITLE) {
    game.world.totalScore = 0;
    startNight(0);
  } else if (game.screen === SCREEN_CAUGHT) {
    startNight(game.world.levelIndex);
  } else if (game.screen === SCREEN_CLEAR) {
    if (game.world.levelIndex >= LEVELS.length - 1) {
      game.world.totalScore = 0;
      startNight(0);
    } else {
      startNight(game.world.levelIndex + 1);
    }
  }
}

function stepGame(dt) {
  const { world, input, sound } = game;
  sound.unlock();
  if (input.takeMute()) sound.toggleMute();

  if (game.screen === SCREEN_PLAYING) {
    if (input.takePause()) {
      game.screen = SCREEN_PAUSED;
      return;
    }
    if (input.keys.has('r')) {
      startNight(world.levelIndex);
      return;
    }
    world.update(dt, input);
    if (world.state === WORLD_CAUGHT) game.screen = SCREEN_CAUGHT;
    else if (world.state === WORLD_CLEAR) game.screen = SCREEN_CLEAR;
    input.takeConfirm(); // a click that tossed a coin must not skip ahead
  } else if (game.screen === SCREEN_PAUSED) {
    if (input.takePause()) game.screen = SCREEN_PLAYING;
    if (input.keys.has('r')) startNight(world.levelIndex);
  } else {
    if (input.takeConfirm()) handleConfirm();
    input.takePause();
    input.takeCoinToss();
  }
}

function drawGame() {
  const { world, sound } = game;
  switch (game.screen) {
    case SCREEN_TITLE:
      drawTitleScreen(ctx, world, sound);
      break;
    case SCREEN_PAUSED:
      drawScene(ctx, world, sound);
      drawPauseScreen(ctx);
      break;
    case SCREEN_CAUGHT:
      drawScene(ctx, world, sound);
      drawCaughtScreen(ctx, world);
      break;
    case SCREEN_CLEAR:
      drawScene(ctx, world, sound);
      drawLevelClearScreen(ctx, world, world.levelIndex >= LEVELS.length - 1);
      break;
    case 'shot':
      drawScene(ctx, world, sound);
      if (game.shotScreen === SCREEN_CLEAR) {
        drawLevelClearScreen(ctx, world, world.levelIndex >= LEVELS.length - 1);
      }
      break;
    default:
      drawScene(ctx, world, sound);
  }
}

let lastTimestamp = 0;
function frame(timestamp) {
  const dt = Math.min(0.05, lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0.016);
  lastTimestamp = timestamp;
  if (game.screen !== 'shot') stepGame(dt);
  else game.world.elapsed += dt; // keep the exit door's pulse alive in stills
  drawGame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export { FIELD };
