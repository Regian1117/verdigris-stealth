// Canonical VERDIGRIS game state transitions: 4-tier global detection ladder, near-miss tracking,
// Key/Relic/Loot progression, restart-arm guard, and Ghost/Phantom heist scoring.

export const DETECTION_TIERS = ['QUIET', 'WARY', 'SEARCH', 'LOCKDOWN'];

export function createGameState(level, geometry, player, guards, playerVisibility, options = {}) {
  const treasures = (level.treasures || []).map((t) => ({ ...t, collected: false }));
  return {
    status: options.status || 'PLAYING', // TITLE | PLAYING | COMPLETE | CAUGHT
    selectedStage: level.id,
    level,
    geometry,
    player,
    playerVisibility,
    guards,
    treasures,
    ripples: [],
    detectionTier: 'QUIET',
    detectionTierIndex: 0,
    maxSuspicion: 0,
    time: 1.2,
    elapsed: 0,
    lampsSnuffed: 0,
    sentriesDisabled: 0,
    chimesUsed: 0,
    smokesUsed: 0,
    lootCollected: 0,
    lootTotal: treasures.length,
    lootScore: 0,
    nearMissCount: 0,
    alertsTriggered: 0,
    showTelemetry: false,
    restartArmedTimer: 0,
    bannerText: '',
    bannerKind: 'info',
    bannerTimer: 0,
    caughtBy: null,
    shotMode: false,
    lastRunSummary: options.lastRunSummary || null,
    completedStages: options.completedStages || new Set(),
  };
}

export function setDetectionTier(state, tier) {
  const idx = Math.max(0, DETECTION_TIERS.indexOf(tier));
  const prev = state.detectionTier;
  state.detectionTier = DETECTION_TIERS[idx];
  state.detectionTierIndex = idx;
  if (state.detectionTier === 'LOCKDOWN' && prev !== 'LOCKDOWN') {
    state.alertsTriggered += 1;
  }
  return state.detectionTier;
}

export function recordNearMiss(state, banner = 'NEAR MISS · HIDE TO COOL') {
  state.nearMissCount = (state.nearMissCount || 0) + 1;
  state.bannerText = banner;
  state.bannerKind = 'warn';
  state.bannerTimer = 2.8;
  return state.nearMissCount;
}

export function collectObjectiveItem(state, kind, item = null) {
  if (kind === 'key') {
    if (state.player.hasKey) return false;
    state.player.hasKey = true;
    state.bannerText = `${(state.level.keyItem?.name || 'BRASS KEY').toUpperCase()} TAKEN · RELIC VAULT UNLOCKED`;
    state.bannerKind = 'info';
    state.bannerTimer = 3.0;
    return true;
  }

  if (kind === 'relic') {
    if (state.player.hasRelic) return false;
    if (state.level.keyItem && !state.player.hasKey) {
      state.bannerText = 'VAULT SEALED · FIND THE BRASS KEY FIRST';
      state.bannerKind = 'warn';
      state.bannerTimer = 2.4;
      return false;
    }
    state.player.hasRelic = true;
    state.bannerText = `${state.level.relicName.toUpperCase()} SECURED · REACH EXIT UNSEEN`;
    state.bannerKind = 'exit';
    state.bannerTimer = 3.6;
    return true;
  }

  if (kind === 'loot' && item && !item.collected) {
    item.collected = true;
    state.lootCollected += 1;
    state.lootScore += item.value || 150;
    state.bannerText = `${(item.name || 'TREASURE').toUpperCase()} (+${item.value || 150}) · LOOT ${state.lootCollected}/${state.lootTotal}`;
    state.bannerKind = 'info';
    state.bannerTimer = 2.5;
    return true;
  }

  return false;
}

export function syncGlobalDetectionTier(state) {
  let maxSusp = 0;
  let bestTierIdx = 0;
  for (const g of state.guards) {
    if (g.suspicion > maxSusp) maxSusp = g.suspicion;
    const idx = Math.max(0, DETECTION_TIERS.indexOf(g.tier || 'QUIET'));
    if (idx > bestTierIdx) bestTierIdx = idx;
  }
  state.maxSuspicion = maxSusp;
  return setDetectionTier(state, DETECTION_TIERS[bestTierIdx]);
}

export function computeHeistSummary(state) {
  const alarms = state.alertsTriggered || 0;
  const nearMisses = state.nearMissCount || 0;
  const lampsSnuffed = state.lampsSnuffed || 0;
  const chimesUsed = state.chimesUsed || 0;
  const smokesUsed = state.smokesUsed || 0;
  const lootCollected = state.lootCollected || 0;
  const lootTotal = state.lootTotal || (state.treasures ? state.treasures.length : 0);
  const lootScore = state.lootScore || lootCollected * 150;
  const elapsed = state.elapsed || 0;

  let rating = 'SHADOW';
  if (alarms === 0 && elapsed <= 50 && nearMisses === 0 && lootCollected >= lootTotal) {
    rating = 'PHANTOM';
  } else if (alarms === 0) {
    rating = 'GHOST';
  }

  const score = Math.max(
    400,
    1500
      + (alarms === 0 ? 600 : 0)
      + Math.max(0, Math.round((95 - elapsed) * 5))
      + nearMisses * 100
      + lampsSnuffed * 75
      + lootScore
      + (state.player ? (state.player.chimes + state.player.smokes) * 40 : 0)
      - alarms * 250,
  );

  return {
    stageId: state.level.id,
    stageName: state.level.name,
    rating,
    score,
    alarms,
    nearMisses,
    lampsSnuffed,
    chimesUsed,
    smokesUsed,
    lootCollected,
    lootTotal,
    elapsed,
  };
}
