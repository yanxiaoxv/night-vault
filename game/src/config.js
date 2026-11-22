// Night Vault — shared tuning constants for the whole game.
// One place for the numbers every other module reads: field size, tile size,
// movement speeds, guard senses and the scoring table.

export const FIELD = { width: 1024, height: 640 };
export const TILE = 32;
export const GRID_COLS = FIELD.width / TILE; // 32
export const GRID_ROWS = FIELD.height / TILE; // 20

export const PLAYER = {
  radius: 11,
  walkSpeed: 150, // px per second, makes noise
  sneakSpeed: 84, // px per second, silent
  walkNoiseRadius: 58, // guards inside this ring hear footsteps
  coinThrowRange: 250, // furthest a decoy coin can be tossed
  coinNoiseRadius: 255, // guards inside this ring investigate a coin ping
};

export const GUARD = {
  radius: 12,
  patrolSpeed: 62,
  investigateSpeed: 96,
  chaseSpeed: 138,
  returnSpeed: 104,
  turnRate: 3.4, // radians per second toward a heading
  visionRange: 196,
  visionHalfAngle: 0.62, // radians, about 35 degrees each side
  catchDistance: 24,
  loseSightSeconds: 2.2, // chase gives up to investigating the last seen spot
  lookAroundSeconds: 1.6,
};

export const DETECTION = {
  fillSecondsAtPointBlank: 0.45, // standing in the open next to a guard
  fillSecondsAtEdge: 2.4, // at the cone's rim, far away
  sneakMultiplier: 0.55, // sneaking is harder to notice
  shadowMultiplier: 0.42, // standing in a shadow pool is harder still
  decayPerSecond: 0.38, // suspicion drains when unseen
  glanceNoiseDistance: 74, // footsteps this close make a guard glance over
};

export const SCORE = {
  levelBase: 1000,
  timePenaltyPerSecond: 4,
  minimumTimeBonus: 120,
  ghostBonus: 500, // finish a night never fully spotted
  unspentCoinBonus: 25,
  spottedPenalty: 150,
};

export const COLORS = {
  floorLit: '#232a47',
  floorLitAlt: '#26304e',
  floorShadow: '#101527',
  floorShadowEdge: '#171e38',
  wall: '#4d5a85',
  wallTop: '#7585b3',
  wallSide: '#333d5f',
  crate: '#8a5a2b',
  crateLight: '#b07a3a',
  crateDark: '#5f3c1a',
  exit: '#2fe08a',
  exitDark: '#0d5c38',
  player: '#2ee6a8',
  playerCloak: '#0f7a5c',
  guard: '#d64545',
  guardDark: '#8e2626',
  guardCap: '#f5f0e6',
  coneCalm: 'rgba(255, 196, 64, 0.20)',
  coneEdge: 'rgba(255, 196, 64, 0.05)',
  gold: '#ffd75e',
  ink: '#e8ecf8',
  inkDim: '#9aa5c7',
};
