// Level geometry constructor and stage lookup for VERDIGRIS: world bounds, perimeter walls,
// raycast occluder segments/corners, snuffable lamps, rotating brass sentries, and active smoke clouds.

import { CAMPAIGN_LEVEL_DATA } from './level-data.js';

export const WORLD_WIDTH = 1120;
export const WORLD_HEIGHT = 660;

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
    sentries: (levelDef.sentries || []).map((s) => ({
      ...s,
      angle: s.baseAngle,
      active: s.active !== false,
      snuffSmoke: 0,
      polygon: null,
    })),
    smokeClouds: [],
  };
}

export function getLevelDefinition(levelNumber) {
  const idx = Math.max(0, Math.min(CAMPAIGN_LEVEL_DATA.length - 1, (levelNumber | 0) - 1));
  return CAMPAIGN_LEVEL_DATA[idx];
}

export { CAMPAIGN_LEVEL_DATA as CAMPAIGN_LEVELS };

const WALL_T = 24;
