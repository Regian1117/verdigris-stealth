// 4-tier segmented detection ladder (QUIET -> WARY -> SEARCH -> LOCKDOWN), Smoke Veil & cover
// line-of-sight checks, rotating sentry spotting, and fair near-miss cooldown recovery.

import { computeVisionConePolygon, isPointInVisionCone } from './visibility.js';
import { recordNearMiss, syncGlobalDetectionTier } from './state.js';

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

  const directBump = check.dist < guard.radius + player.radius + 4;
  const effectiveRange = vis.inSmoke ? 24 : vis.hidden ? guard.range * 0.44 : guard.range;
  const spotted = directBump || (check.visible && check.dist <= effectiveRange);

  guard.seesPlayer = spotted;

  if (spotted) {
    guard.recovering = false;
    guard.investigateTarget = null;
    guard.lastKnown = { x: player.x, y: player.y };

    const distWeight = Math.max(0.35, 1.38 - check.dist / guard.range);
    const angleWeight = 1.0 - check.angleRatio * 0.35;
    const rate = directBump ? 3.2 : 1.05 * vis.visibilityFactor * distWeight * angleWeight;

    guard.suspicion = Math.min(1, guard.suspicion + dt * rate);
    if (guard.suspicion >= 0.30 && guard.tier !== 'LOCKDOWN') {
      guard.nearMissCandidate = true;
    }

    if (guard.suspicion >= 1) {
      transitionDetectionTier(state, guard, 'LOCKDOWN', audio);
      guard.exposedHold += dt;
      if (check.dist < 38 || guard.exposedHold >= 0.78) {
        state.status = 'CAUGHT';
        state.caughtBy = guard.id;
      }
    } else if (guard.suspicion >= 0.55) {
      transitionDetectionTier(state, guard, 'SEARCH', audio);
      guard.exposedHold = Math.max(0, guard.exposedHold - dt * 0.5);
    } else if (guard.suspicion >= 0.10) {
      transitionDetectionTier(state, guard, 'WARY', audio);
      guard.exposedHold = Math.max(0, guard.exposedHold - dt);
    }
  } else {
    guard.exposedHold = Math.max(0, guard.exposedHold - dt * 1.6);

    if (guard.tier === 'LOCKDOWN') {
      transitionDetectionTier(state, guard, 'SEARCH', audio);
      guard.recovering = true;
    } else if (guard.tier === 'SEARCH') {
      if (!guard.recovering) {
        guard.recovering = true;
        if (vis.hidden || vis.nearCover || vis.inSmoke) {
          state.bannerText = 'NEAR MISS · HIDE TO COOL';
          state.bannerKind = 'warn';
          state.bannerTimer = 2.6;
        }
      }
      if (guard.searchTimer <= 0 || vis.inSmoke) {
        decaySuspicionToCalm(guard, dt, state);
      }
    } else if (guard.tier === 'WARY') {
      if (!guard.investigateTarget) {
        if (!guard.recovering && guard.nearMissCandidate && (vis.hidden || vis.nearCover || vis.inSmoke)) {
          state.bannerText = 'NEAR MISS · HIDE TO COOL';
          state.bannerKind = 'warn';
          state.bannerTimer = 2.6;
        }
        guard.recovering = true;
        decaySuspicionToCalm(guard, dt, state);
      }
    } else if (guard.suspicion > 0) {
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
  syncGlobalDetectionTier(state);
}

export function transitionDetectionTier(state, guard, nextTier, audio) {
  const prev = guard.tier;
  if (prev === nextTier) return prev;
  guard.tier = nextTier;

  if (nextTier === 'WARY') {
    if (!guard.callout || guard.callout === 'HEARD CHIME') guard.callout = 'WHAT WAS THAT?';
    if (prev === 'QUIET' && audio) audio.playSuspicionSting(false);
  } else if (nextTier === 'SEARCH') {
    guard.searchMaxTime = 4.6;
    guard.searchTimer = Math.max(guard.searchTimer, 4.6);
    guard.callout = 'WHAT WAS THAT?';
    if (prev === 'QUIET' || prev === 'WARY') {
      if (audio) audio.playSuspicionSting(false);
    }
  } else if (nextTier === 'LOCKDOWN') {
    guard.callout = 'LOCKDOWN!';
    guard.nearMissCandidate = false;
    guard.searchMaxTime = 5.2;
    guard.searchTimer = 5.2;
    if (audio) audio.playSuspicionSting(true);
  }
  syncGlobalDetectionTier(state);
  return nextTier;
}

export function decaySuspicionToCalm(guard, dt, state) {
  if (guard.seesPlayer) return;
  const decayRate = guard.tier === 'SEARCH' ? 0.16 : 0.25;
  guard.suspicion = Math.max(0, guard.suspicion - dt * decayRate);

  if (guard.tier === 'SEARCH' && guard.suspicion < 0.50 && guard.searchTimer <= 0) {
    guard.tier = 'WARY';
  }

  if (guard.suspicion <= 0.01 && guard.tier !== 'QUIET') {
    if (state && guard.nearMissCandidate) {
      recordNearMiss(state, 'NEAR MISS! ESCAPED TO SHADOW');
    }
    guard.suspicion = 0;
    guard.tier = 'QUIET';
    guard.recovering = false;
    guard.nearMissCandidate = false;
    guard.callout = '';
    guard.lastKnown = null;
    guard.investigateTarget = null;
    guard.investigateKind = null;
    guard.searchTimer = 0;
  }
}

export function applySentrySpotting(state, dt, audio) {
  if (!state.playerVisibility.inSentryBeam || state.guards.length === 0) return;
  let nearest = state.guards[0];
  let bestD = Infinity;
  for (const g of state.guards) {
    const d = Math.hypot(g.x - state.player.x, g.y - state.player.y);
    if (d < bestD) {
      bestD = d;
      nearest = g;
    }
  }
  nearest.lastKnown = { x: state.player.x, y: state.player.y };
  nearest.recovering = false;
  nearest.suspicion = Math.min(1, nearest.suspicion + dt * 0.72);
  if (nearest.suspicion >= 0.30) nearest.nearMissCandidate = true;
  if (nearest.suspicion >= 0.55) {
    transitionDetectionTier(state, nearest, 'SEARCH', audio);
  } else {
    transitionDetectionTier(state, nearest, 'WARY', audio);
  }
}
