// Warden patrol AI & archetype builder: learnable waypoint loops, A* corner-clearing pursuit,
// Acute Listener hearing trim, acoustic lure response, and sweeping last-known search behavior.

import { computeVisionConePolygon, normalizeAngle } from './visibility.js';
import { emitGuardFootstepRipple } from './acoustics.js';
import { computeAStarPath } from './pathfinding.js';

export function updateGuardPatrol(state, guard, dt, audio) {
  const geometry = state.geometry;
  const prevStep = guard.stepAccum;

  if (guard.tier === 'LOCKDOWN' || guard.tier === 'SEARCH') {
    const target = guard.lastKnown;
    if (target) {
      const speedMult = guard.tier === 'LOCKDOWN' ? 1.32 : 1.12;
      const arrived = followAStarToTarget(guard, target, guard.baseSpeed * speedMult, dt, geometry);
      if (arrived) {
        if (guard.tier === 'LOCKDOWN') guard.tier = 'SEARCH';
        advanceSearchSweep(guard, dt);
      }
    } else {
      guard.tier = 'WARY';
      guard.recovering = true;
    }
  } else if (guard.investigateTarget) {
    const arrived = followAStarToTarget(guard, guard.investigateTarget, guard.baseSpeed * 1.06, dt, geometry);
    if (arrived) {
      advanceSearchSweep(guard, dt);
    }
  } else if (guard.tier === 'WARY' && guard.lastKnown && !guard.recovering) {
    const angle = Math.atan2(guard.lastKnown.y - guard.y, guard.lastKnown.x - guard.x);
    guard.facing = turnToward(guard.facing, angle, dt * 4.4);
  } else {
    guard.navPath = null;
    const wp = guard.waypoints[guard.waypointIdx];
    if (guard.waitTimer > 0) {
      guard.waitTimer -= dt;
      if (wp && wp.lookAngle !== undefined) {
        guard.facing = turnToward(guard.facing, wp.lookAngle, dt * 2.4);
      } else {
        guard.lookSweepPhase += dt * 1.6;
        guard.facing = normalizeAngle(guard.facing + Math.sin(guard.lookSweepPhase) * dt * 0.55);
      }
    } else if (wp) {
      const arrived = moveTowardPoint(guard, wp.x, wp.y, guard.baseSpeed, dt, geometry);
      if (arrived) {
        guard.waitTimer = wp.wait !== undefined ? wp.wait : 0.7;
        guard.waypointIdx = (guard.waypointIdx + 1) % guard.waypoints.length;
      }
    }
  }

  const strideDist = guard.tier === 'LOCKDOWN' ? 38 : 46;
  if (guard.stepAccum - prevStep > 0 && guard.stepAccum >= strideDist) {
    guard.stepAccum %= strideDist;
    emitGuardFootstepRipple(state, guard);
    if (audio) {
      audio.playSpatialGuardFootstep(guard.x, guard.y, state.player.x, state.player.y);
    }
  }
}

export function advanceSearchSweep(guard, dt) {
  const isSearch = guard.tier === 'SEARCH' || guard.tier === 'LOCKDOWN';
  guard.lookSweepPhase += dt * (isSearch ? 2.6 : 2.1);
  guard.facing = normalizeAngle(guard.facing + Math.sin(guard.lookSweepPhase) * dt * (isSearch ? 2.2 : 1.7));
  guard.searchTimer = Math.max(0, guard.searchTimer - dt);
  if (guard.searchTimer <= 0) {
    guard.investigateTarget = null;
    guard.investigateKind = null;
    guard.navPath = null;
    guard.recovering = true;
    if (guard.tier === 'SEARCH') {
      guard.tier = 'WARY';
      guard.suspicion = Math.min(guard.suspicion, 0.48);
    }
  }
}

export function assignGuardArchetypes(levelDef, geometry) {
  return levelDef.guards.map((g, idx) => {
    const archetype = g.archetype || 'warden';
    const isListener = archetype === 'listener';
    const start = g.waypoints[0];
    const next = g.waypoints[1] || start;
    const initialFacing = start.lookAngle !== undefined
      ? start.lookAngle
      : Math.atan2(next.y - start.y, next.x - start.x);

    const guard = {
      id: g.id,
      index: idx,
      tag: `W${idx + 1}`,
      archetype,
      hearingMultiplier: isListener ? 1.48 : 1.0,
      x: start.x,
      y: start.y,
      radius: 15,
      facing: initialFacing,
      baseSpeed: g.speed,
      halfFov: ((g.fovDeg || 62) * Math.PI) / 360,
      range: g.range || 250,
      waypoints: g.waypoints.map((w) => ({ ...w })),
      waypointIdx: g.waypoints.length > 1 ? 1 : 0,
      waitTimer: 0.35 + idx * 0.18,
      tier: 'QUIET', // QUIET | WARY | SEARCH | LOCKDOWN
      suspicion: 0,
      recovering: false,
      nearMissCandidate: false,
      callout: '',
      seesPlayer: false,
      exposedHold: 0,
      searchTimer: 0,
      searchMaxTime: 4.5,
      investigateTarget: null,
      investigateKind: null,
      lastKnown: null,
      lookSweepPhase: 0,
      stridePhase: idx * 1.4,
      stepAccum: idx * 18,
      visionPolygon: [],
    };
    guard.visionPolygon = computeVisionConePolygon(
      guard.x, guard.y, guard.facing, guard.halfFov, guard.range, geometry,
    );
    return guard;
  });
}

export function investigateSoundOrigin(guard, x, y, kind) {
  if (guard.tier === 'LOCKDOWN') return;
  const isChime = kind === 'chime' || kind === 'smoke-chime';
  const dur = isChime ? 4.4 : 3.0;
  guard.investigateTarget = { x, y };
  guard.investigateKind = isChime ? 'chime' : kind;
  guard.lastKnown = { x, y };
  guard.navPath = null;
  guard.searchTimer = dur;
  guard.searchMaxTime = dur;
  guard.recovering = false;
  guard.callout = isChime ? 'HEARD CHIME' : 'WHAT WAS THAT?';
  if (guard.tier === 'QUIET' || guard.tier === 'WARY') {
    guard.tier = 'WARY';
    const floorSusp = kind === 'smoke-chime' ? 0.30 : isChime ? 0.40 : 0.34;
    guard.suspicion = kind === 'smoke-chime' ? Math.min(0.32, Math.max(guard.suspicion, floorSusp)) : Math.max(guard.suspicion, floorSusp);
  }
}

function followAStarToTarget(guard, target, speed, dt, geometry) {
  const key = `${Math.round(target.x / 20)},${Math.round(target.y / 20)}`;
  if (!guard.navPath || guard.navPathKey !== key) {
    guard.navPath = computeAStarPath(geometry.navGrid, guard.x, guard.y, target.x, target.y);
    guard.navPathKey = key;
  }
  while (guard.navPath.length > 1 && Math.hypot(guard.navPath[0].x - guard.x, guard.navPath[0].y - guard.y) < 12) {
    guard.navPath.shift();
  }
  const wp = guard.navPath[0] || target;
  const reached = moveTowardPoint(guard, wp.x, wp.y, speed, dt, geometry);
  if (reached && guard.navPath.length > 1) {
    guard.navPath.shift();
    return false;
  }
  return reached && guard.navPath.length <= 1;
}

function resolveCircleObstacles(entity, obstacles) {
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const cx = Math.max(obs.x, Math.min(entity.x, obs.x + obs.w));
    const cy = Math.max(obs.y, Math.min(entity.y, obs.y + obs.h));
    const dx = entity.x - cx;
    const dy = entity.y - cy;
    const d2 = dx * dx + dy * dy;
    const r = entity.radius;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      const push = r - d;
      entity.x += (dx / d) * push;
      entity.y += (dy / d) * push;
    }
  }
}

function turnToward(current, target, maxStep) {
  const diff = normalizeAngle(target - current);
  if (Math.abs(diff) <= maxStep) return target;
  return normalizeAngle(current + Math.sign(diff) * maxStep);
}

function moveTowardPoint(guard, tx, ty, speed, dt, geometry) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return true;

  const targetAngle = Math.atan2(dy, dx);
  guard.facing = turnToward(guard.facing, targetAngle, dt * 5.6);

  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  resolveCircleObstacles(guard, geometry.obstacles);

  guard.stridePhase += dt * (speed / 12);
  guard.stepAccum += step;
  return dist - step <= 4;
}
