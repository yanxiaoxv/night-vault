// Night Vault — everything the player sees: the lamplit vault, the cones,
// the figures, the HUD and the screens between nights. Readability is the
// whole game at thumbnail size: amber cones on a deep blue floor, crimson
// guards, a mint burglar, an emerald door that glows.

import { COLORS, FIELD, GUARD, TILE } from './config.js';
import { TILE_CRATE, TILE_EXIT, TILE_SHADOW, TILE_WALL } from './levels.js';
import { buildVisionPolygon } from './vision.js';
import { WORLD_CLEAR } from './world.js';

const FONT_DISPLAY = 'Georgia, "Times New Roman", serif';
const FONT_BODY = 'system-ui, "Segoe UI", sans-serif';

function tileRect(col, row) {
  return [col * TILE, row * TILE, TILE, TILE];
}

export function drawFloor(ctx, world) {
  const { level } = world;
  for (let row = 0; row < level.map.length; row += 1) {
    for (let col = 0; col < level.map[row].length; col += 1) {
      const tile = level.map[row][col];
      if (tile === TILE_WALL || tile === TILE_CRATE) continue;
      const [x, y] = tileRect(col, row);
      if (tile === TILE_SHADOW) {
        ctx.fillStyle = COLORS.floorShadow;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.floorShadowEdge;
        ctx.fillRect(x, y, TILE, 3);
      } else {
        ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floorLit : COLORS.floorLitAlt;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
  // Shadow pools get soft round hearts so they read as pools, not tiles.
  ctx.fillStyle = 'rgba(6, 8, 18, 0.30)';
  for (let row = 0; row < level.map.length; row += 1) {
    for (let col = 0; col < level.map[row].length; col += 1) {
      if (level.map[row][col] !== TILE_SHADOW) continue;
      const [x, y] = tileRect(col, row);
      ctx.beginPath();
      ctx.ellipse(x + TILE / 2, y + TILE / 2, TILE * 0.55, TILE * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawWallsAndCrates(ctx, world) {
  const { level } = world;
  for (let row = 0; row < level.map.length; row += 1) {
    for (let col = 0; col < level.map[row].length; col += 1) {
      const tile = level.map[row][col];
      const [x, y] = tileRect(col, row);
      if (tile === TILE_WALL) {
        ctx.fillStyle = COLORS.wallSide;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE - 6);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 5);
      } else if (tile === TILE_CRATE) {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
        ctx.strokeStyle = COLORS.crateDark;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4);
        ctx.lineTo(x + 4, y + TILE - 4);
        ctx.stroke();
        ctx.fillStyle = COLORS.crateLight;
        ctx.fillRect(x + 1, y + 1, TILE - 2, 4);
      }
    }
  }
}

export function drawExitDoor(ctx, world) {
  const rects = world.exitRects();
  if (rects.length === 0) return;
  const pulse = 0.72 + 0.28 * Math.sin(world.elapsed * 4);
  const minX = Math.min(...rects.map((r) => r[0]));
  const minY = Math.min(...rects.map((r) => r[1]));
  const maxX = Math.max(...rects.map((r) => r[0] + TILE));
  const maxY = Math.max(...rects.map((r) => r[1] + TILE));
  ctx.save();
  ctx.shadowColor = COLORS.exit;
  ctx.shadowBlur = 22 * pulse;
  ctx.fillStyle = COLORS.exit;
  for (const [x, y] of rects) ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.restore();
  ctx.fillStyle = '#083d24';
  for (const [x, y] of rects) ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // The word EXIT runs along the door: rotated up a tall thin door, flat
  // across a wide one, so it is never clipped by the door's own tiles.
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (maxY - minY > maxX - minX) ctx.rotate(-Math.PI / 2);
  ctx.font = `bold 15px ${FONT_BODY}`;
  ctx.fillStyle = '#d2ffe6';
  ctx.shadowColor = 'rgba(0, 40, 20, 0.9)';
  ctx.shadowBlur = 4;
  ctx.fillText('EXIT', 0, 0);
  ctx.restore();
}

function coneColor(suspicion, alerted) {
  const heat = alerted ? 1 : suspicion;
  const green = Math.round(196 - 150 * heat);
  const blue = Math.round(64 - 44 * heat);
  return {
    fill: `rgba(255, ${green}, ${blue}, ${alerted ? 0.38 : 0.28})`,
    edge: `rgba(255, ${green}, ${blue}, 0.06)`,
    rim: `rgba(255, ${green}, ${blue}, 0.35)`,
  };
}

export function drawVisionCones(ctx, world) {
  for (const guard of world.guards) {
    const polygon = buildVisionPolygon(world.level, guard.x, guard.y, guard.angle, GUARD.visionHalfAngle, GUARD.visionRange);
    const colors = coneColor(guard.suspicion, guard.alerted);
    const gradient = ctx.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, GUARD.visionRange);
    gradient.addColorStop(0, colors.fill);
    gradient.addColorStop(1, colors.edge);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.rim;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

export function drawCoins(ctx, world) {
  for (const coin of world.coins) {
    if (coin.landed) {
      // The ping: one expanding ring every guard in the game reacts to.
      ctx.strokeStyle = `rgba(255, 215, 94, ${Math.max(0, 0.8 - coin.pingAge * 0.65)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(coin.toX, coin.toY, coin.pingRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y - coin.hop, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a87e14';
    ctx.font = `bold 7px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', coin.x, coin.y - coin.hop + 0.5);
  }
}

export function drawGuardFigure(ctx, guard) {
  ctx.save();
  ctx.translate(guard.x, guard.y);
  // Lantern glow at his feet.
  ctx.fillStyle = 'rgba(255, 196, 64, 0.13)';
  ctx.beginPath();
  ctx.arc(0, 0, 21, 0, Math.PI * 2);
  ctx.fill();
  // Body: crimson coat, dark outline, white cap, facing tick.
  ctx.fillStyle = COLORS.guard;
  ctx.strokeStyle = COLORS.guardDark;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.guardCap;
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff7ea';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(guard.angle) * 15, Math.sin(guard.angle) * 15);
  ctx.stroke();
  ctx.restore();

  // Suspicion arc over his head, then the mark that matters.
  if (guard.suspicion > 0.03 && !guard.alerted) {
    ctx.strokeStyle = `rgba(255, ${Math.round(200 - 140 * guard.suspicion)}, 60, 0.95)`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 20, 8, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
    ctx.stroke();
  }
  ctx.font = `bold 19px ${FONT_BODY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (guard.alerted) {
    ctx.fillStyle = '#ff4545';
    ctx.fillText('!', guard.x, guard.y - 26);
  } else if (guard.suspicion > 0.4) {
    ctx.fillStyle = '#ffb03a';
    ctx.fillText('?', guard.x, guard.y - 26);
  }
}

export function drawPlayerFigure(ctx, world) {
  const player = world.player;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.noiseRadius > 0) {
    ctx.strokeStyle = 'rgba(232, 236, 248, 0.30)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, player.noiseRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (player.inShadow) {
    ctx.strokeStyle = 'rgba(160, 200, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
  }
  const crouch = player.sneaking ? 0.88 : 1;
  ctx.scale(crouch, crouch);
  ctx.fillStyle = COLORS.playerCloak;
  ctx.beginPath();
  ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.player;
  ctx.strokeStyle = '#06382a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // The hood's point shows the way she faces.
  ctx.fillStyle = '#06382a';
  ctx.beginPath();
  ctx.moveTo(Math.cos(player.angle) * 13, Math.sin(player.angle) * 13);
  ctx.lineTo(Math.cos(player.angle + 2.5) * 7, Math.sin(player.angle + 2.5) * 7);
  ctx.lineTo(Math.cos(player.angle - 2.5) * 7, Math.sin(player.angle - 2.5) * 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (player.inShadow) {
    ctx.fillStyle = 'rgba(190, 215, 255, 0.95)';
    ctx.font = `bold 9px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', player.x, player.y - 22);
  }
}

function formatSeconds(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function drawHud(ctx, world, sound) {
  ctx.fillStyle = 'rgba(8, 10, 22, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, 34);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `bold 14px ${FONT_BODY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.level.name, 12, 18);
  ctx.fillStyle = COLORS.inkDim;
  ctx.font = `12px ${FONT_BODY}`;
  ctx.fillText(`Time ${formatSeconds(world.elapsed)}`, 300, 18);
  ctx.fillText(`Spotted ×${world.timesSpotted}`, 392, 18);
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(`Coins ○ ${world.player.coinsLeft}`, 500, 18);
  // The alarm eye: how close the most suspicious guard is to the shout.
  const suspicion = world.maxSuspicion;
  ctx.fillStyle = COLORS.inkDim;
  ctx.fillText('ALARM', 640, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(692, 11, 130, 13);
  ctx.fillStyle = world.anyAlert ? '#ff4545' : `rgb(255, ${Math.round(205 - 140 * suspicion)}, 60)`;
  ctx.fillRect(692, 11, 130 * suspicion, 13);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(692, 11, 130, 13);
  ctx.fillStyle = COLORS.inkDim;
  ctx.textAlign = 'right';
  ctx.fillText(sound.muted ? 'M — sound off' : 'M — sound on', FIELD.width - 12, 18);
  ctx.textAlign = 'left';
}

export function drawObjectiveBanner(ctx, world) {
  if (world.bannerAge > 4.6 || world.state === WORLD_CLEAR) return;
  const alpha = world.bannerAge < 3.8 ? 1 : Math.max(0, (4.6 - world.bannerAge) / 0.8);
  ctx.save();
  ctx.globalAlpha = alpha;
  const width = 660;
  const height = 86;
  const x = (FIELD.width - width) / 2;
  const y = 52;
  ctx.fillStyle = 'rgba(8, 10, 24, 0.88)';
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.gold;
  ctx.font = `bold 19px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.fillText(world.level.name, FIELD.width / 2, y + 24);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `13.5px ${FONT_BODY}`;
  ctx.fillText(world.level.objective, FIELD.width / 2, y + 48);
  ctx.fillStyle = COLORS.inkDim;
  ctx.font = `12px ${FONT_BODY}`;
  ctx.fillText(world.level.hint, FIELD.width / 2, y + 68);
  ctx.restore();
}

function drawVignette(ctx) {
  const gradient = ctx.createRadialGradient(512, 320, 300, 512, 320, 640);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(2,3,8,0.42)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

/** The whole playfield: floor, cones, figures, HUD, banner. */
export function drawScene(ctx, world, sound) {
  drawFloor(ctx, world);
  drawExitDoor(ctx, world);
  drawVisionCones(ctx, world);
  drawWallsAndCrates(ctx, world);
  drawCoins(ctx, world);
  for (const guard of world.guards) drawGuardFigure(ctx, guard);
  drawPlayerFigure(ctx, world);
  drawVignette(ctx);
  drawHud(ctx, world, sound);
  drawObjectiveBanner(ctx, world);
}

function centreCard(ctx, width, height) {
  const x = (FIELD.width - width) / 2;
  const y = (FIELD.height - height) / 2;
  ctx.fillStyle = 'rgba(6, 8, 18, 0.82)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = 'rgba(13, 17, 34, 0.97)';
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 14);
  ctx.fill();
  ctx.stroke();
  return [x, y, width, height];
}

export function drawTitleScreen(ctx, world, sound) {
  drawScene(ctx, world, sound);
  ctx.fillStyle = 'rgba(4, 5, 12, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = `bold 74px ${FONT_DISPLAY}`;
  ctx.fillText('NIGHT VAULT', FIELD.width / 2, 218);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `19px ${FONT_BODY}`;
  ctx.fillText('Three nights. One vault. Every lantern is a promise you must not break.', FIELD.width / 2, 268);
  ctx.fillStyle = COLORS.inkDim;
  ctx.font = `15.5px ${FONT_BODY}`;
  ctx.fillText('Slip past the lantern guards, hide in the shadow pools, toss coins to bend their patrols,', FIELD.width / 2, 316);
  ctx.fillText('and reach the green vault door unseen. Get spotted and they hunt; get caught and the night restarts.', FIELD.width / 2, 340);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `14.5px ${FONT_BODY}`;
  ctx.fillText('WASD / arrows — move      SHIFT — sneak (silent)      Click / F — toss a coin      P — pause      M — mute', FIELD.width / 2, 392);
  ctx.fillStyle = COLORS.gold;
  ctx.font = `bold 21px ${FONT_BODY}`;
  ctx.fillText('Press ENTER or click to begin Night One', FIELD.width / 2, 452);
  ctx.fillStyle = COLORS.inkDim;
  ctx.font = `12.5px ${FONT_BODY}`;
  ctx.fillText('Finish a night never fully spotted for the GHOST bonus.', FIELD.width / 2, 492);
}

export function drawPauseScreen(ctx) {
  const [x, y, width] = centreCard(ctx, 380, 170);
  ctx.fillStyle = COLORS.gold;
  ctx.font = `bold 30px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.fillText('Paused', FIELD.width / 2, y + 55);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `15px ${FONT_BODY}`;
  ctx.fillText('P or ESC to slip back into the dark', FIELD.width / 2, y + 95);
  ctx.fillStyle = COLORS.inkDim;
  ctx.font = `13px ${FONT_BODY}`;
  ctx.fillText('R restarts the night', FIELD.width / 2, y + 122);
  void x;
  void width;
}

export function drawCaughtScreen(ctx, world) {
  ctx.fillStyle = `rgba(90, 6, 6, ${Math.min(0.55, world.stateAge * 0.8)})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const [, y] = centreCard(ctx, 430, 180);
  ctx.fillStyle = '#ff6b6b';
  ctx.font = `bold 36px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.fillText('CAUGHT', FIELD.width / 2, y + 58);
  ctx.fillStyle = COLORS.ink;
  ctx.font = `15.5px ${FONT_BODY}`;
  ctx.fillText('A lantern guard has you by the collar.', FIELD.width / 2, y + 98);
  ctx.fillStyle = COLORS.gold;
  ctx.font = `bold 16px ${FONT_BODY}`;
  ctx.fillText('Press ENTER to try the night again', FIELD.width / 2, y + 136);
}

export function drawLevelClearScreen(ctx, world, isFinal) {
  const stats = world.clearStats;
  const [, y] = centreCard(ctx, 460, isFinal ? 330 : 272);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.exit;
  ctx.font = `bold 32px ${FONT_DISPLAY}`;
  ctx.fillText(isFinal ? 'THE VAULT IS YOURS' : 'NIGHT CLEARED', FIELD.width / 2, y + 52);
  ctx.font = `15.5px ${FONT_BODY}`;
  ctx.fillStyle = COLORS.ink;
  const lines = [
    `Time in the dark — ${formatSeconds(stats.seconds)}`,
    `Fully spotted — ${stats.timesSpotted} time${stats.timesSpotted === 1 ? '' : 's'}`,
    stats.ghost ? 'GHOST — never fully spotted: +500' : 'No ghost bonus this night',
    `Unspent coins — +${stats.coinBonus}`,
    `This night — ${stats.levelScore} points`,
  ];
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, y + 96 + i * 27));
  if (isFinal) {
    ctx.fillStyle = COLORS.gold;
    ctx.font = `bold 20px ${FONT_BODY}`;
    ctx.fillText(`Total score — ${world.totalScore}`, FIELD.width / 2, y + 96 + lines.length * 27 + 8);
    ctx.font = `15px ${FONT_BODY}`;
    ctx.fillStyle = COLORS.ink;
    const rank = world.totalScore >= 3300 ? 'Rank: PERFECT GHOST' : world.totalScore >= 2600 ? 'Rank: MASTER OF SHADOWS' : world.totalScore >= 1800 ? 'Rank: SEASONED BURGLAR' : 'Rank: LUCKY CAT';
    ctx.fillText(rank, FIELD.width / 2, y + 96 + lines.length * 27 + 38);
  }
  ctx.fillStyle = COLORS.gold;
  ctx.font = `bold 16px ${FONT_BODY}`;
  ctx.fillText(isFinal ? 'Press ENTER to play again' : 'Press ENTER for the next night', FIELD.width / 2, y + (isFinal ? 318 : 244));
}
