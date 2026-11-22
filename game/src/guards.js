// Warden guard AI: learnable waypoint patrols, raycast 3-state reactive vision cones
// (PATROL -> SUSPICIOUS / INVESTIGATING -> ALERT / SEARCHING), near-miss tracking, and shadow recovery.

import { computeVisionConePolygon, isPointInVisionCone, normalizeAngle } from './visibility.js';
import { emitGuardFootstepRipple } from './acoustics.js';

export function updateGuardPatrol(state, guard, dt, audio) {
  const geometry = state.geometry;
  const prevStep = guard.stepAccum;

  if (guard.state === 'ALERT' || guard.state === 'SEARCHING') {
    const target = guard.lastKnown;
    if (target) {
      const arrived = moveTowardPoint(guard, target.x, target.y, guard.baseSpeed * 1.32, dt, geometry);
      if (arrived) {
        guard.state = 'SEARCHING';
        guard.lookSweepPhase += dt * 2.5;
        guard.facing = normalizeAngle(guard.facing + Math.sin(guard.lookSweepPhase) * dt * 2.2);
        guard.searchTimer -= dt;
        if (guard.searchTimer <= 0) {
          guard.recovering = true;
          guard.state = 'SUSPICIOUS';
          guard.suspicion = Math.min(guard.suspicion, 0.55);
        }
      }
    } else {
      guard.state = 'SUSPICIOUS';
    }
  } else if (guard.state === 'INVESTIGATING' && guard.investigateTarget) {
    const arrived = moveTowardPoint(
      guard,
      guard.investigateTarget.x,
      guard.investigateTarget.y,
      guard.baseSpeed * 1.05,
      dt,
      geometry,
    );
    if (arrived) {
      guard.lookSweepPhase += dt * 2.1;
      guard.facing = normalizeAngle(guard.facing + Math.sin(guard.lookSweepPhase) * dt * 1.7);
      guard.searchTimer -= dt;
      if (guard.searchTimer <= 0) {
        guard.investigateTarget = null;
        guard.recovering = true;
        guard.state = 'SUSPICIOUS';
      }
    }
  } else if (guard.state === 'SUSPICIOUS' && guard.lastKnown && !guard.recovering) {
    const angle = Math.atan2(guard.lastKnown.y - guard.y, guard.lastKnown.x - guard.x);
    guard.facing = turnToward(guard.facing, angle, dt * 4.2);
  } else {
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

  const strideDist = guard.state === 'ALERT' ? 38 : 46;
  if (guard.stepAccum - prevStep > 0 && guard.stepAccum >= strideDist) {
    guard.stepAccum %= strideDist;
    emitGuardFootstepRipple(state, guard);
    if (audio) {
      audio.playSpatialGuardFootstep(guard.x, guard.y, state.player.x, state.player.y);
    }
  }
}

export function updateGuardDetection(state, guard, dt, audio) {
  const player = state.player;
  const geometry = state.geometry;
  const vis = state.playerVisibility;

  const check = isPointInVisionCone(
    player.x,
    player.y,
    guard.x,
    guard.y,
    guard.facing,
    guard.halfFov,
    guard.range,
    geometry,
  );

  const directBump = check.dist < guard.radius + player.radius + 5;
  const effectiveRange = vis.hidden ? guard.range * 0.44 : guard.range;
  const spotted = directBump || (check.visible && check.dist <= effectiveRange);

  guard.seesPlayer = spotted;

  if (spotted) {
    const prevState = guard.state;
    guard.recovering = false;
    guard.lastKnown = { x: player.x, y: player.y };

    const distWeight = Math.max(0.35, 1.38 - check.dist / guard.range);
    const angleWeight = 1.0 - check.angleRatio * 0.35;
    const rate = directBump ? 3.2 : 1.05 * vis.visibilityFactor * distWeight * angleWeight;

    guard.suspicion = Math.min(1, guard.suspicion + dt * rate);

    if (guard.suspicion >= 0.30 && guard.state !== 'ALERT') {
      guard.nearMissCandidate = true;
    }

    if (guard.suspicion >= 1) {
      guard.state = 'ALERT';
      guard.callout = 'INTRUDER!';
      guard.nearMissCandidate = false;
      guard.searchTimer = 5.4;
      guard.exposedHold += dt;
      if (prevState !== 'ALERT') {
        state.alertsTriggered += 1;
        if (audio) audio.playSuspicionSting(true);
      }
      if (check.dist < 38 || guard.exposedHold >= 0.72) {
        state.status = 'CAUGHT';
        state.caughtBy = guard.id;
      }
    } else if (guard.suspicion >= 0.1) {
      if (guard.state === 'PATROL' && audio) {
        audio.playSuspicionSting(false);
      }
      guard.state = 'SUSPICIOUS';
      if (!guard.callout || guard.callout === 'HEARD CHIME') {
        guard.callout = 'WHAT WAS THAT?';
      }
      guard.exposedHold = Math.max(0, guard.exposedHold - dt);
    }
  } else {
    guard.exposedHold = Math.max(0, guard.exposedHold - dt * 1.6);
    if (guard.state === 'SUSPICIOUS') {
      if (!guard.recovering && guard.nearMissCandidate) {
        guard.recovering = true;
        if (vis.hidden || vis.nearCover) {
          state.bannerText = 'NEAR MISS! COOLING BEHIND COVER';
          state.bannerKind = 'warn';
          state.bannerTimer = 2.8;
        }
      } else {
        guard.recovering = true;
      }
      decaySuspicionToCalm(guard, dt, state);
    } else if (guard.state === 'ALERT') {
      guard.state = 'SEARCHING';
      guard.searchTimer = Math.max(guard.searchTimer, 3.8);
    } else if (guard.state === 'SEARCHING' && guard.searchTimer <= 0) {
      decaySuspicionToCalm(guard, dt, state);
    } else if (guard.state === 'INVESTIGATING' && !guard.investigateTarget) {
      decaySuspicionToCalm(guard, dt, state);
    } else if (guard.state === 'PATROL' && guard.suspicion > 0) {
      decaySuspicionToCalm(guard, dt, state);
    }
  }

  guard.visionPolygon = computeVisionConePolygon(
    guard.x,
    guard.y,
    guard.facing,
    guard.halfFov,
    guard.range,
    geometry,
  );
}

export function decaySuspicionToCalm(guard, dt, state) {
  if (guard.seesPlayer) return;
  const decayRate = guard.state === 'ALERT' || guard.state === 'SEARCHING' ? 0.13 : 0.24;
  guard.suspicion = Math.max(0, guard.suspicion - dt * decayRate);

  if (guard.suspicion <= 0.01 && guard.state !== 'PATROL') {
    if (state && guard.nearMissCandidate && guard.state !== 'ALERT' && guard.state !== 'SEARCHING') {
      state.nearMissCount = (state.nearMissCount || 0) + 1;
      state.bannerText = 'NEAR MISS! COOLING BEHIND COVER';
      state.bannerKind = 'warn';
      state.bannerTimer = 2.2;
    }
    guard.suspicion = 0;
    guard.state = 'PATROL';
    guard.recovering = false;
    guard.nearMissCandidate = false;
    guard.callout = '';
    guard.lastKnown = null;
    guard.investigateTarget = null;
    guard.searchTimer = 0;
  }
}

export function createGuardsForLevel(levelDef, geometry) {
  return levelDef.guards.map((g, idx) => {
    const start = g.waypoints[0];
    const next = g.waypoints[1] || start;
    const initialFacing = start.lookAngle !== undefined
      ? start.lookAngle
      : Math.atan2(next.y - start.y, next.x - start.x);

    const guard = {
      id: g.id,
      index: idx,
      tag: `W${idx + 1}`,
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
      state: 'PATROL', // PATROL | SUSPICIOUS | INVESTIGATING | ALERT | SEARCHING
      suspicion: 0,
      recovering: false,
      nearMissCandidate: false,
      callout: '',
      seesPlayer: false,
      exposedHold: 0,
      searchTimer: 0,
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
  if (guard.state === 'ALERT') return;
  guard.investigateTarget = { x, y };
  guard.investigateKind = kind;
  guard.lastKnown = { x, y };
  guard.searchTimer = kind === 'chime' ? 4.4 : 2.8;
  guard.recovering = false;
  guard.callout = kind === 'chime' ? 'HEARD CHIME' : 'WHAT WAS THAT?';
  if (guard.state === 'PATROL' || guard.state === 'SUSPICIOUS') {
    guard.state = 'INVESTIGATING';
    guard.suspicion = Math.max(guard.suspicion, kind === 'chime' ? 0.42 : 0.34);
  }
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
