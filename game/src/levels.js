// Night Vault — the three nights: tile maps, guard patrols and objectives.
// Map legend: '#' wall, 'C' crate (cover: blocks sight and movement),
// '.' lamplit floor, ':' shadow pool (hides you), 'E' the vault door (exit),
// 'S' where the burglar slips in. Guards are listed apart, with the tile
// waypoints of their patrols and the way they first face.

export const TILE_WALL = '#';
export const TILE_CRATE = 'C';
export const TILE_FLOOR = '.';
export const TILE_SHADOW = ':';
export const TILE_EXIT = 'E';
export const TILE_START = 'S';

export const LEVELS = [
  {
    name: 'Night One — The Lobby',
    objective: 'Cross the lobby and reach the vault door. Stay out of the lantern light cones.',
    hint: 'WASD or arrows to move · hold SHIFT to sneak · guards cannot see through crates',
    coins: 2,
    parSeconds: 75,
    map: [
      '################################',
      '#..............................#',
      '#..S......CC........::.........#',
      '#.........CC........::....C....#',
      '#...................::....C....#',
      '#....#####..........::.........#',
      '#....#...#....CC...............#',
      '#....#...#....CC......####.....#',
      '#....#####..........#......#...#',
      '#..............................#',
      '#........::..........####......#',
      '#..C.....::....C.....#..#......#',
      '#..C.....::....C.....####......#',
      '#.............................E#',
      '#.....####..........####......E#',
      '#.............................E#',
      '#..C..........CC...............#',
      '#..C..........CC......::.......#',
      '#..............................#',
      '################################',
    ],
    guards: [
      { waypoints: [[7, 4], [7, 10], [13, 10], [13, 4]], face: 1.6 },
      { waypoints: [[24, 11], [24, 5], [28, 5], [28, 11]], face: -1.6 },
    ],
  },
  {
    name: 'Night Two — The Strongrooms',
    objective: 'The strongrooms are watched in pairs. Toss a coin to pull a guard off his route.',
    hint: 'Click, or press F, to toss a coin — guards go to look at the ping · shadow pools hide you',
    coins: 3,
    parSeconds: 110,
    map: [
      '################################',
      '#..............................#',
      '#..S....C....#####......::.....#',
      '#.......C....#...#......::..C..#',
      '#..::...C....#...#.............#',
      '#..::........#####.....####....#',
      '#..............................#',
      '#....CC......::......C.........#',
      '#....CC......::......C....E....#',
      '#....................C....E....#',
      '#....#####...::......C....E....#',
      '#....#...#...::................#',
      '#....#...#..........####.......#',
      '#....#####....C.....#..#....C..#',
      '#.............C.....####....C..#',
      '#..C....::..........::......C..#',
      '#..C....::....CC....::.........#',
      '#.......::....CC...............#',
      '#..............................#',
      '################################',
    ],
    guards: [
      { waypoints: [[11, 6], [20, 6], [20, 10], [11, 10]], face: 0 },
      { waypoints: [[26, 15], [26, 8], [29, 8], [29, 15]], face: 3.1 },
      { waypoints: [[6, 16], [6, 11], [16, 11], [16, 16]], face: -1.6 },
    ],
  },
  {
    name: 'Night Three — The Vault',
    objective: 'The vault guard never leaves his post — he only turns. Time the shadows, take the door.',
    hint: 'The sentry by the door rotates in place · cross behind his light, or spend a coin',
    coins: 3,
    parSeconds: 130,
    map: [
      '################################',
      '#..............................#',
      '#..S...C.....#####......C......#',
      '#......C.....#...#......C...E..#',
      '#..::..C.....#...#..........E..#',
      '#..::........#####......C...E..#',
      '#..............................#',
      '#....####..........::..........#',
      '#....#..#....CC....::....####..#',
      '#....#..#....CC....::....#..#..#',
      '#....####..........::....####..#',
      '#..............................#',
      '#..C......#####......C.........#',
      '#..C......#...#......C....::...#',
      '#.........#####......C....::...#',
      '#..............................#',
      '#....::......C......::.........#',
      '#....::......C......::....C....#',
      '#..............................#',
      '################################',
    ],
    guards: [
      { waypoints: [[9, 6], [22, 6], [22, 11], [9, 11]], face: 0 },
      { waypoints: [[17, 17], [17, 13], [25, 13], [25, 17]], face: -3.1 },
      { waypoints: [[6, 15], [6, 9], [11, 9], [11, 15]], face: 1.6 },
      { sentry: true, at: [26, 4], sweep: 1.9, face: 2.4 },
    ],
  },
];

/** The tile character at a grid position, walls outside the map. */
export function tileAt(level, col, row) {
  if (row < 0 || row >= level.map.length) return TILE_WALL;
  const line = level.map[row];
  if (col < 0 || col >= line.length) return TILE_WALL;
  return line[col];
}

/** Walls and crates are solid: they stop feet and lantern light alike. */
export function isSolidTile(tile) {
  return tile === TILE_WALL || tile === TILE_CRATE;
}
