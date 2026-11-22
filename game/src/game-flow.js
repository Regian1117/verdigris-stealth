// Stage lifecycle & heist flow controller: stage loading, capture attribution, completion scoring,
// and safe double-tap R restart arming extracted from main.js.

import { buildLevelGeometry, getLevelDefinition } from './levels.js';
import { computeHeistSummary, createGameState } from './state.js';
import { computePlayerVisibility, updateDynamicLights } from './lighting.js';
import { assignGuardArchetypes } from './patrol.js';
import { createPlayerState } from './player.js';

export function loadStage(levelNumber, status = 'PLAYING', progress = null) {
  const level = getLevelDefinition(levelNumber);
  const geometry = buildLevelGeometry(level);
  updateDynamicLights(geometry, 0, 0);

  const player = createPlayerState(level);
  const guards = assignGuardArchetypes(level, geometry);
  const playerVisibility = computePlayerVisibility(player, geometry);

  return createGameState(level, geometry, player, guards, playerVisibility, {
    status,
    lastRunSummary: progress ? progress.lastRunSummary : null,
    completedStages: progress ? progress.completedStages : new Set(),
  });
}

export function triggerCapture(state, guard) {
  if (!state || state.status === 'CAUGHT') return state;
  state.status = 'CAUGHT';
  state.caughtBy = guard ? (guard.tag || guard.id || 'W1') : 'W1';
  state.caughtTier = guard ? (guard.tier || 'LOCKDOWN') : 'LOCKDOWN';
  return state;
}

export function completeStageHeist(state, progress, audio) {
  if (!state) return null;
  state.status = 'COMPLETE';
  const summary = computeHeistSummary(state);
  if (progress) {
    progress.completedStages.add(state.level.id);
    progress.lastRunSummary = summary;
  }
  state.lastRunSummary = summary;
  if (audio) audio.playExtractionChord(true);
  return summary;
}

export function requestSafeRestart(state, onConfirm) {
  if (!state) return false;
  if (state.restartArmedTimer > 0) {
    state.restartArmedTimer = 0;
    if (onConfirm) onConfirm();
    return true;
  }
  state.restartArmedTimer = 2.6;
  state.bannerText = 'PRESS R AGAIN TO RESTART';
  state.bannerKind = 'warn';
  state.bannerTimer = 2.6;
  return false;
}
