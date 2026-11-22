// Five handcrafted architectural stealth heist stages with distinct color palettes,
// cover geometry, snuffable wall lamps, acoustic floor zones, and learnable guard patrols.

export const WORLD_WIDTH = 1120;
export const WORLD_HEIGHT = 660;
const WALL_T = 24;

export const CAMPAIGN_LEVELS = [
  {
    id: 1,
    slug: 'limestone-cloister',
    name: 'The Limestone Cloister',
    subtitle: 'Quiet monastic arches & golden lantern courts',
    relicName: 'Gilded Reliquary',
    chimes: 3,
    palette: {
      surround: '#080e18',
      floorBase: '#0e1726',
      floorAlt: '#121d30',
      floorJoint: 'rgba(130, 160, 200, 0.10)',
      litFloor: '#243149',
      hatch: 'rgba(92, 134, 196, 0.14)',
      wallTop: '#d9d3c3',
      wallSouth: '#7d776b',
      wallRim: '#f4f0e4',
      coverTop: '#cfc8b6',
      coverSouth: '#6f6a5f',
      lightCore: '#ffd984',
      lightMid: '#e89d3c',
      accent: '#7cd8c8',
      swatch: ['#0e1726', '#d9d3c3', '#f4b94b'],
    },
    playerSpawn: { x: 96, y: 556, facing: -0.45 },
    relic: { x: 984, y: 126 },
    exit: { x: 1018, y: 562, radius: 34 },
    surfaces: [
      { x: 160, y: 296, w: 780, h: 68, type: 'rug', color: '#2b2040', trim: '#c7a457' },
      { x: 520, y: 100, w: 120, h: 170, type: 'gravel' },
      { x: 520, y: 390, w: 120, h: 170, type: 'gravel' },
    ],
    obstacles: [
      // Cloister courtyard colonnade & sanctuary partitions
      { x: 210, y: 150, w: 84, h: 84, kind: 'pillar', height: 14 },
      { x: 210, y: 426, w: 84, h: 84, kind: 'pillar', height: 14 },
      { x: 430, y: 140, w: 56, h: 136, kind: 'wall', height: 15 },
      { x: 430, y: 384, w: 56, h: 136, kind: 'wall', height: 15 },
      { x: 676, y: 140, w: 56, h: 136, kind: 'wall', height: 15 },
      { x: 676, y: 384, w: 56, h: 136, kind: 'wall', height: 15 },
      { x: 856, y: 264, w: 96, h: 132, kind: 'wall', height: 15 },
      { x: 856, y: 468, w: 70, h: 70, kind: 'pillar', height: 14 },
    ],
    lights: [
      { id: 'l1-a', x: 355, y: 330, radius: 195, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l1-b', x: 582, y: 192, radius: 205, snuffable: false, lit: true, kind: 'lantern' },
      { id: 'l1-c', x: 582, y: 472, radius: 205, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l1-d', x: 964, y: 156, radius: 185, snuffable: false, lit: true, kind: 'lantern' },
    ],
    guards: [
      {
        id: 'g1-1',
        speed: 78,
        fovDeg: 62,
        range: 245,
        waypoints: [
          { x: 356, y: 112, wait: 1.0, lookAngle: 0.7 },
          { x: 356, y: 548, wait: 1.1, lookAngle: -0.7 },
        ],
      },
      {
        id: 'g1-2',
        speed: 82,
        fovDeg: 62,
        range: 250,
        waypoints: [
          { x: 582, y: 108, wait: 0.8 },
          { x: 792, y: 108, wait: 0.9, lookAngle: 1.6 },
          { x: 792, y: 552, wait: 0.9, lookAngle: 3.14 },
          { x: 582, y: 552, wait: 0.8 },
        ],
      },
      {
        id: 'g1-3',
        speed: 76,
        fovDeg: 60,
        range: 235,
        waypoints: [
          { x: 998, y: 238, wait: 1.2, lookAngle: 2.8 },
          { x: 998, y: 452, wait: 1.1, lookAngle: 3.4 },
        ],
      },
    ],
  },
  {
    id: 2,
    slug: 'copper-conservatory',
    name: 'The Copper Conservatory',
    subtitle: 'Verdigris-patina colonnades & gravel walkways',
    relicName: 'Silver Astrolabe',
    chimes: 3,
    palette: {
      surround: '#061314',
      floorBase: '#0b1e1e',
      floorAlt: '#0f2727',
      floorJoint: 'rgba(91, 200, 174, 0.11)',
      litFloor: '#1b3c39',
      hatch: 'rgba(91, 200, 174, 0.15)',
      wallTop: '#5bc8ae',
      wallSouth: '#1e5c50',
      wallRim: '#9cf0da',
      coverTop: '#5bc8ae',
      coverSouth: '#1e5c50',
      lightCore: '#ffe092',
      lightMid: '#d7a246',
      accent: '#6fffe9',
      swatch: ['#0b1e1e', '#5bc8ae', '#f2c86b'],
    },
    playerSpawn: { x: 92, y: 558, facing: -0.4 },
    relic: { x: 560, y: 330 },
    exit: { x: 1016, y: 112, radius: 34 },
    surfaces: [
      { x: 165, y: 92, w: 790, h: 64, type: 'gravel' },
      { x: 165, y: 504, w: 790, h: 64, type: 'gravel' },
      { x: 472, y: 248, w: 176, h: 164, type: 'rug', color: '#143c38', trim: '#63d2b6' },
    ],
    obstacles: [
      // Symmetrical verdigris copper conservatory pillars & planter walls
      { x: 204, y: 210, w: 76, h: 76, kind: 'copperPillar', height: 15 },
      { x: 204, y: 392, w: 76, h: 76, kind: 'copperPillar', height: 15 },
      { x: 382, y: 184, w: 66, h: 112, kind: 'copperWall', height: 15 },
      { x: 382, y: 364, w: 66, h: 112, kind: 'copperWall', height: 15 },
      { x: 672, y: 184, w: 66, h: 112, kind: 'copperWall', height: 15 },
      { x: 672, y: 364, w: 66, h: 112, kind: 'copperWall', height: 15 },
      { x: 840, y: 210, w: 76, h: 76, kind: 'copperPillar', height: 15 },
      { x: 840, y: 392, w: 76, h: 76, kind: 'copperPillar', height: 15 },
    ],
    lights: [
      { id: 'l2-a', x: 242, y: 340, radius: 190, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l2-b', x: 560, y: 164, radius: 205, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l2-c', x: 560, y: 496, radius: 205, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l2-d', x: 878, y: 340, radius: 195, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l2-e', x: 560, y: 330, radius: 150, snuffable: false, lit: true, kind: 'lantern' },
    ],
    guards: [
      {
        id: 'g2-1',
        speed: 82,
        fovDeg: 62,
        range: 250,
        waypoints: [
          { x: 326, y: 122, wait: 0.9, lookAngle: 1.45 },
          { x: 326, y: 540, wait: 1.0, lookAngle: -0.35 },
        ],
      },
      {
        id: 'g2-2',
        speed: 84,
        fovDeg: 64,
        range: 248,
        waypoints: [
          { x: 476, y: 120, wait: 0.8 },
          { x: 644, y: 120, wait: 0.8 },
          { x: 644, y: 230, wait: 1.0, lookAngle: 2.3 },
          { x: 476, y: 230, wait: 0.9, lookAngle: 0.85 },
        ],
      },
      {
        id: 'g2-3',
        speed: 84,
        fovDeg: 64,
        range: 248,
        waypoints: [
          { x: 644, y: 542, wait: 0.8 },
          { x: 476, y: 542, wait: 0.8 },
          { x: 476, y: 432, wait: 1.0, lookAngle: -0.8 },
          { x: 644, y: 432, wait: 0.9, lookAngle: -2.35 },
        ],
      },
      {
        id: 'g2-4',
        speed: 80,
        fovDeg: 62,
        range: 255,
        waypoints: [
          { x: 788, y: 536, wait: 0.9, lookAngle: -1.8 },
          { x: 788, y: 126, wait: 1.0, lookAngle: 0.4 },
          { x: 966, y: 248, wait: 0.9, lookAngle: 2.5 },
          { x: 966, y: 536, wait: 0.8 },
        ],
      },
    ],
  },
  {
    id: 3,
    slug: 'crimson-archive',
    name: 'The Crimson Archive',
    subtitle: 'Mahogany bookcases, candlelight & creaky oak planks',
    relicName: 'Sealed Ledger',
    chimes: 3,
    palette: {
      surround: '#12080d',
      floorBase: '#1e1016',
      floorAlt: '#26141c',
      floorJoint: 'rgba(218, 128, 146, 0.11)',
      litFloor: '#42222c',
      hatch: 'rgba(210, 108, 134, 0.15)',
      wallTop: '#a84757',
      wallSouth: '#521c27',
      wallRim: '#e08b98',
      coverTop: '#9c3d4a',
      coverSouth: '#4f1c26',
      lightCore: '#ffcf86',
      lightMid: '#de7d3d',
      accent: '#f7b267',
      swatch: ['#1e1016', '#9c3d4a', '#ffae52'],
    },
    playerSpawn: { x: 88, y: 330, facing: 0 },
    relic: { x: 980, y: 330 },
    exit: { x: 1004, y: 566, radius: 34 },
    surfaces: [
      { x: 170, y: 140, w: 230, h: 110, type: 'timber' },
      { x: 170, y: 410, w: 230, h: 110, type: 'timber' },
      { x: 500, y: 278, w: 356, h: 104, type: 'rug', color: '#451525', trim: '#e0ad58' },
      { x: 640, y: 92, w: 250, h: 78, type: 'timber' },
    ],
    obstacles: [
      // Carved crimson-wood library bookcases & reading stacks
      { x: 210, y: 102, w: 156, h: 48, kind: 'bookcase', height: 15 },
      { x: 210, y: 266, w: 62, h: 128, kind: 'bookcase', height: 15 },
      { x: 210, y: 510, w: 156, h: 48, kind: 'bookcase', height: 15 },
      { x: 422, y: 168, w: 60, h: 114, kind: 'bookcase', height: 15 },
      { x: 422, y: 378, w: 60, h: 114, kind: 'bookcase', height: 15 },
      { x: 622, y: 168, w: 156, h: 50, kind: 'bookcase', height: 15 },
      { x: 622, y: 442, w: 156, h: 50, kind: 'bookcase', height: 15 },
      { x: 862, y: 168, w: 54, h: 112, kind: 'bookcase', height: 15 },
      { x: 862, y: 380, w: 54, h: 112, kind: 'bookcase', height: 15 },
    ],
    lights: [
      { id: 'l3-a', x: 356, y: 330, radius: 195, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l3-b', x: 564, y: 156, radius: 200, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l3-c', x: 564, y: 504, radius: 200, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l3-d', x: 756, y: 330, radius: 205, snuffable: false, lit: true, kind: 'lantern' },
      { id: 'l3-e', x: 966, y: 330, radius: 160, snuffable: false, lit: true, kind: 'lantern' },
    ],
    guards: [
      {
        id: 'g3-1',
        speed: 84,
        fovDeg: 64,
        range: 255,
        waypoints: [
          { x: 356, y: 190, wait: 0.9, lookAngle: 0.45 },
          { x: 356, y: 472, wait: 0.9, lookAngle: -0.45 },
        ],
      },
      {
        id: 'g3-2',
        speed: 86,
        fovDeg: 64,
        range: 255,
        waypoints: [
          { x: 548, y: 102, wait: 0.8 },
          { x: 806, y: 102, wait: 0.9, lookAngle: 1.6 },
          { x: 806, y: 266, wait: 0.9, lookAngle: 2.9 },
          { x: 548, y: 266, wait: 0.8 },
        ],
      },
      {
        id: 'g3-3',
        speed: 86,
        fovDeg: 64,
        range: 255,
        waypoints: [
          { x: 806, y: 558, wait: 0.8 },
          { x: 548, y: 558, wait: 0.9, lookAngle: -1.5 },
          { x: 548, y: 392, wait: 0.9, lookAngle: 0.2 },
          { x: 806, y: 392, wait: 0.8 },
        ],
      },
      {
        id: 'g3-4',
        speed: 82,
        fovDeg: 62,
        range: 245,
        waypoints: [
          { x: 966, y: 112, wait: 1.0, lookAngle: 2.4 },
          { x: 1034, y: 240, wait: 0.8 },
          { x: 1034, y: 454, wait: 0.9, lookAngle: 3.1 },
          { x: 966, y: 112, wait: 0.6 },
        ],
      },
    ],
  },
  {
    id: 4,
    slug: 'moonlit-canal-lock',
    name: 'The Moonlit Canal Lock',
    subtitle: 'Midnight water locks, sodium lamps & bridge patrols',
    relicName: 'Brass Chronometer',
    chimes: 3,
    palette: {
      surround: '#051019',
      floorBase: '#091b29',
      floorAlt: '#0d2436',
      floorJoint: 'rgba(116, 198, 232, 0.11)',
      litFloor: '#1b384d',
      hatch: 'rgba(104, 196, 238, 0.16)',
      wallTop: '#8aa5b8',
      wallSouth: '#394f61',
      wallRim: '#c5e3f6',
      coverTop: '#b88b58',
      coverSouth: '#5e4226',
      lightCore: '#ffd478',
      lightMid: '#eb8d34',
      accent: '#5be4ff',
      swatch: ['#091b29', '#b88b58', '#5be4ff'],
    },
    playerSpawn: { x: 86, y: 562, facing: -0.45 },
    relic: { x: 160, y: 116 },
    exit: { x: 1004, y: 120, radius: 34 },
    surfaces: [
      { x: 438, y: 148, w: 196, h: 106, type: 'timber' },
      { x: 438, y: 422, w: 196, h: 106, type: 'timber' },
      { x: 676, y: 276, w: 344, h: 116, type: 'gravel' },
    ],
    obstacles: [
      // Canal water basins (block movement, NOT vision/light)
      { x: 456, y: 24, w: 160, h: 124, kind: 'water', height: 0, blocksSight: false },
      { x: 456, y: 254, w: 160, h: 168, kind: 'water', height: 0, blocksSight: false },
      { x: 456, y: 528, w: 160, h: 108, kind: 'water', height: 0, blocksSight: false },
      // Timber cargo crates on west and east stone quays
      { x: 176, y: 224, w: 88, h: 72, kind: 'crate', height: 14 },
      { x: 176, y: 404, w: 88, h: 72, kind: 'crate', height: 14 },
      { x: 334, y: 144, w: 64, h: 102, kind: 'crate', height: 14 },
      { x: 334, y: 416, w: 64, h: 102, kind: 'crate', height: 14 },
      { x: 696, y: 144, w: 72, h: 98, kind: 'crate', height: 14 },
      { x: 696, y: 418, w: 72, h: 98, kind: 'crate', height: 14 },
      { x: 874, y: 234, w: 82, h: 76, kind: 'crate', height: 14 },
      { x: 874, y: 392, w: 82, h: 76, kind: 'crate', height: 14 },
    ],
    lights: [
      { id: 'l4-a', x: 288, y: 336, radius: 195, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l4-b', x: 536, y: 202, radius: 190, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l4-c', x: 536, y: 474, radius: 190, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l4-d', x: 828, y: 200, radius: 195, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l4-e', x: 828, y: 494, radius: 195, snuffable: false, lit: true, kind: 'lantern' },
    ],
    guards: [
      {
        id: 'g4-1',
        speed: 82,
        fovDeg: 62,
        range: 245,
        waypoints: [
          { x: 116, y: 294, wait: 0.9, lookAngle: 0.25 },
          { x: 292, y: 104, wait: 0.9, lookAngle: 1.5 },
          { x: 292, y: 354, wait: 0.9, lookAngle: 3.1 },
          { x: 116, y: 294, wait: 0.7 },
        ],
      },
      {
        id: 'g4-2',
        speed: 84,
        fovDeg: 64,
        range: 255,
        waypoints: [
          { x: 424, y: 200, wait: 0.9, lookAngle: 0.05 },
          { x: 648, y: 200, wait: 0.9, lookAngle: 3.14 },
        ],
      },
      {
        id: 'g4-3',
        speed: 84,
        fovDeg: 64,
        range: 255,
        waypoints: [
          { x: 648, y: 474, wait: 0.9, lookAngle: 3.14 },
          { x: 424, y: 474, wait: 0.9, lookAngle: 0.0 },
        ],
      },
      {
        id: 'g4-4',
        speed: 86,
        fovDeg: 62,
        range: 250,
        waypoints: [
          { x: 822, y: 104, wait: 0.8, lookAngle: 1.7 },
          { x: 822, y: 558, wait: 0.9, lookAngle: -1.4 },
        ],
      },
      {
        id: 'g4-5',
        speed: 82,
        fovDeg: 62,
        range: 240,
        waypoints: [
          { x: 998, y: 254, wait: 1.0, lookAngle: 2.75 },
          { x: 998, y: 536, wait: 1.0, lookAngle: -2.4 },
        ],
      },
    ],
  },
  {
    id: 5,
    slug: 'grand-bellfoundry',
    name: 'The Grand Bellfoundry',
    subtitle: 'Molten bronze hearths, bell molds & elite wardens',
    relicName: 'Sovereign Bell Blueprint',
    chimes: 4,
    palette: {
      surround: '#0c0910',
      floorBase: '#15121a',
      floorAlt: '#1c1824',
      floorJoint: 'rgba(206, 154, 96, 0.11)',
      litFloor: '#342429',
      hatch: 'rgba(186, 134, 102, 0.15)',
      wallTop: '#c79454',
      wallSouth: '#5e4124',
      wallRim: '#f3cb8f',
      coverTop: '#c79454',
      coverSouth: '#5e4124',
      lightCore: '#ffba66',
      lightMid: '#e85d2a',
      accent: '#ff9f43',
      swatch: ['#15121a', '#c79454', '#ff6b35'],
    },
    playerSpawn: { x: 86, y: 564, facing: -0.4 },
    relic: { x: 994, y: 330 },
    exit: { x: 994, y: 98, radius: 34 },
    surfaces: [
      { x: 162, y: 274, w: 760, h: 112, type: 'gravel' },
      { x: 460, y: 92, w: 220, h: 90, type: 'rug', color: '#2e1c2b', trim: '#d89b52' },
      { x: 460, y: 478, w: 220, h: 90, type: 'rug', color: '#2e1c2b', trim: '#d89b52' },
    ],
    obstacles: [
      // Heavy bronze bell molds & foundry buttresses
      { x: 196, y: 152, w: 86, h: 86, kind: 'bellMold', height: 16 },
      { x: 196, y: 424, w: 86, h: 86, kind: 'bellMold', height: 16 },
      { x: 376, y: 132, w: 64, h: 120, kind: 'wall', height: 15 },
      { x: 376, y: 408, w: 64, h: 120, kind: 'wall', height: 15 },
      { x: 520, y: 280, w: 102, h: 102, kind: 'bellMold', height: 16 },
      { x: 700, y: 132, w: 64, h: 120, kind: 'wall', height: 15 },
      { x: 700, y: 408, w: 64, h: 120, kind: 'wall', height: 15 },
      { x: 848, y: 186, w: 78, h: 78, kind: 'bellMold', height: 16 },
      { x: 848, y: 396, w: 78, h: 78, kind: 'bellMold', height: 16 },
    ],
    lights: [
      { id: 'l5-a', x: 326, y: 330, radius: 195, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l5-b', x: 572, y: 162, radius: 215, snuffable: false, lit: true, kind: 'brazier' },
      { id: 'l5-c', x: 572, y: 498, radius: 215, snuffable: false, lit: true, kind: 'brazier' },
      { id: 'l5-d', x: 806, y: 330, radius: 200, snuffable: true, lit: true, kind: 'sconce' },
      { id: 'l5-e', x: 960, y: 330, radius: 165, snuffable: true, lit: true, kind: 'sconce' },
    ],
    guards: [
      {
        id: 'g5-1',
        speed: 86,
        fovDeg: 64,
        range: 255,
        waypoints: [
          { x: 326, y: 104, wait: 0.8 },
          { x: 326, y: 556, wait: 0.8 },
        ],
      },
      {
        id: 'g5-2',
        speed: 88,
        fovDeg: 64,
        range: 255,
        waypoints: [
          { x: 472, y: 104, wait: 0.7 },
          { x: 662, y: 104, wait: 0.7 },
          { x: 662, y: 234, wait: 0.9, lookAngle: 2.35 },
          { x: 472, y: 234, wait: 0.8, lookAngle: 0.8 },
        ],
      },
      {
        id: 'g5-3',
        speed: 88,
        fovDeg: 64,
        range: 255,
        waypoints: [
          { x: 662, y: 556, wait: 0.7 },
          { x: 472, y: 556, wait: 0.7 },
          { x: 472, y: 426, wait: 0.9, lookAngle: -0.75 },
          { x: 662, y: 426, wait: 0.8, lookAngle: -2.35 },
        ],
      },
      {
        id: 'g5-4',
        speed: 86,
        fovDeg: 62,
        range: 248,
        waypoints: [
          { x: 804, y: 104, wait: 0.8, lookAngle: 1.5 },
          { x: 804, y: 556, wait: 0.8, lookAngle: -1.5 },
        ],
      },
      {
        id: 'g5-5',
        speed: 84,
        fovDeg: 62,
        range: 245,
        waypoints: [
          { x: 966, y: 196, wait: 0.9, lookAngle: 2.7 },
          { x: 1044, y: 268, wait: 0.7 },
          { x: 1044, y: 534, wait: 0.9, lookAngle: 3.1 },
          { x: 966, y: 534, wait: 0.8 },
        ],
      },
      {
        id: 'g5-6',
        speed: 82,
        fovDeg: 60,
        range: 238,
        waypoints: [
          { x: 120, y: 98, wait: 0.9, lookAngle: 0.7 },
          { x: 120, y: 360, wait: 0.9, lookAngle: -0.2 },
        ],
      },
    ],
  },
];

export function getLevelDefinition(levelNumber) {
  const idx = Math.max(0, Math.min(CAMPAIGN_LEVELS.length - 1, (levelNumber | 0) - 1));
  return CAMPAIGN_LEVELS[idx];
}

export function buildLevelGeometry(levelDef) {
  const perimeter = [
    { x: 0, y: 0, w: WORLD_WIDTH, h: WALL_T, kind: 'perimeter', height: 14, blocksSight: true },
    { x: 0, y: WORLD_HEIGHT - WALL_T, w: WORLD_WIDTH, h: WALL_T, kind: 'perimeter', height: 14, blocksSight: true },
    { x: 0, y: WALL_T, w: WALL_T, h: WORLD_HEIGHT - WALL_T * 2, kind: 'perimeter', height: 14, blocksSight: true },
    { x: WORLD_WIDTH - WALL_T, y: WALL_T, w: WALL_T, h: WORLD_HEIGHT - WALL_T * 2, kind: 'perimeter', height: 14, blocksSight: true },
  ];

  const obstacles = [
    ...perimeter,
    ...levelDef.obstacles.map((o) => ({
      ...o,
      blocksSight: o.blocksSight !== false,
    })),
  ];

  const occluderSegments = [];
  const occluderCorners = [];

  for (const obs of obstacles) {
    if (!obs.blocksSight) continue;
    const x1 = obs.x;
    const y1 = obs.y;
    const x2 = obs.x + obs.w;
    const y2 = obs.y + obs.h;
    occluderSegments.push(
      { ax: x1, ay: y1, bx: x2, by: y1 },
      { ax: x2, ay: y1, bx: x2, by: y2 },
      { ax: x2, ay: y2, bx: x1, by: y2 },
      { ax: x1, ay: y2, bx: x1, by: y1 },
    );
    if (obs.kind !== 'perimeter') {
      occluderCorners.push(
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
      );
    }
  }

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    wallThickness: WALL_T,
    obstacles,
    sightObstacles: obstacles.filter((o) => o.blocksSight),
    occluderSegments,
    occluderCorners,
    surfaces: levelDef.surfaces.map((s) => ({ ...s })),
    lights: levelDef.lights.map((l) => ({
      ...l,
      flickerPhase: (l.x * 0.017 + l.y * 0.031) % (Math.PI * 2),
      snuffSmoke: 0,
      polygon: null,
    })),
  };
}
