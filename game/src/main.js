// VERDIGRIS lean loop & render dispatcher: delegates stage lifecycle to game-flow.js,
// lighting & exit aperture to render-lights.js, and composes deterministic showcase shots.

import { WORLD_HEIGHT, WORLD_WIDTH } from './levels.js';
import { syncGlobalDetectionTier } from './state.js';
import { computeVisionConePolygon } from './visibility.js';
import { computePlayerVisibility, toggleWallLamp, updateDynamicLights } from './lighting.js';
import { aimAndTossChime, emitChimeDistraction, emitGuardFootstepRipple, updateSoundRipples } from './acoustics.js';
import { updateGuardPatrol } from './patrol.js';
import { applySentrySpotting, propagateAlertPulse, updateGuardDetection } from './detection.js';
import { deploySmokeVeil, interactWithNearbyObject, updatePlayerMovement } from './player.js';
import { createStealthAudio } from './audio.js';
import { bindKeyboardAndMouse, createInputState } from './input.js';
import { completeStageHeist, loadStage as createStageState, requestSafeRestart } from './game-flow.js';
import { renderDynamicLightPools, renderExitAperture } from './render-lights.js';
import { renderCoverArchitecture, renderFloorAndShadowHatch, renderRelicAndExitGate, renderSmokeVeils } from './render-world.js';
import {
  renderFootstepRipples, renderGuardsAndAlertMeters, renderGuardVisionCones,
  renderPatrolRouteGuides, renderPlayerAndThrowArc,
} from './render-entities.js';
import { renderCaughtModal, renderHudBar, renderMissionCompleteModal, renderTitleMissionSelect } from './render-hud.js';

export function startGameLoop() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  activeInput = createInputState();
  activeAudio = createStealthAudio();
  bindKeyboardAndMouse(canvas, activeInput, () => viewport, handleAction);

  const shot = new URLSearchParams(window.location.search).get('shot');
  if (!applyDeterministicShotState(shot)) loadStage(1, 'TITLE');

  window.__VERDIGRIS__ = {
    getSnapshot: getGameSnapshot, loadStage, loadLevel: loadStage,
    applyShot: applyDeterministicShotState, getButtons: () => activeButtons, getViewport: () => viewport,
  };

  let lastTs = performance.now();
  function frame(ts) {
    const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
    lastTs = ts;
    updateSimulation(activeState, dt);
    renderFrame(ctx, canvas, activeState);
    activeInput.clearFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function applyDeterministicShotState(shotName) {
  if (!shotName) return false;

  if (shotName === 'infiltration') {
    const s = loadStage(2, 'PLAYING');
    Object.assign(s, { shotMode: true, time: 4.6, elapsed: 28.4, nearMissCount: 1, chimesUsed: 1, lootCollected: 1, lootScore: 150 });
    s.treasures[0].collected = true;
    updateDynamicLights(s.geometry, 0, s.time);
    aimSentry(s.geometry, Math.PI + 0.14);
    Object.assign(s.player, { x: 240, y: 176, facing: 0.28, crouching: true, chimes: 2, smokes: 2, noiseLevel: 'SILENT' });

    const ex = 632; const ey = 204;
    placeGuard(s.guards[0], 524, 124, Math.atan2(ey - 124, ex - 524), { tier: 'WARY', suspicion: 0.38, recovering: true, callout: 'WARY 38%', lastKnown: { x: ex, y: ey } });
    placeGuard(s.guards[1], 326, 264, -2.35);
    placeGuard(s.guards[2], 588, 530, -2.18);
    placeGuard(s.guards[3], 788, 330, -0.92);

    emitChimeDistraction(s, ex, ey);
    Object.assign(s.ripples[0], { age: 0.78, radius: 122, label: 'CHIME ECHO' });
    s.guards.forEach((g) => emitGuardFootstepRipple(s, g));
    [[1, 0.42, 50], [2, 0.24, 38], [3, 0.30, 44], [4, 0.18, 31]].forEach(([i, a, r]) => Object.assign(s.ripples[i], { age: a, radius: r }));
    recomputeScene(s);
    return true;
  }

  if (shotName === 'alert-recovery') {
    const s = loadStage(3, 'PLAYING');
    Object.assign(s, {
      shotMode: true, time: 7.4, elapsed: 41.2, nearMissCount: 1, chimesUsed: 1, smokesUsed: 1,
      lootCollected: 1, lootScore: 150, bannerText: 'NEAR MISS · COOLING ▼', bannerKind: 'warn', bannerTimer: 3.0,
    });
    s.player.hasKey = true; s.treasures[0].collected = true;
    s.geometry.smokeClouds.push({ x: 372, y: 382, radius: 66, currentRadius: 66, age: 1.4, duration: 6.5 });
    updateDynamicLights(s.geometry, 0, s.time);
    aimSentry(s.geometry, -1.24);
    Object.assign(s.player, { x: 176, y: 356, facing: -0.35, crouching: true, chimes: 2, smokes: 1, noiseLevel: 'SILENT' });

    const cx = 708; const cy = 296;
    placeGuard(s.guards[0], 342, 222, 1.66, { tier: 'SEARCH', suspicion: 0.68, recovering: true, callout: 'WHAT WAS THAT?', searchTimer: 2.9, searchMaxTime: 4.6, lastKnown: { x: 266, y: 462 } });
    placeGuard(s.guards[1], 562, 236, Math.atan2(cy - 236, cx - 562));
    placeGuard(s.guards[2], 786, 548, 3.0);
    placeGuard(s.guards[3], 978, 178, 1.95);

    propagateAlertPulse(s, s.guards[0], null);
    Object.assign(s.ripples[0], { age: 0.42, radius: 162 });
    Object.assign(s.guards[1], { tier: 'WARY', suspicion: 0.44, callout: 'HEARD CHIME', investigateKind: 'chime', investigateTarget: { x: cx, y: cy }, lastKnown: { x: cx, y: cy } });

    emitChimeDistraction(s, cx, cy, true);
    Object.assign(s.ripples[1], { age: 0.44, radius: 122 });
    emitGuardFootstepRipple(s, s.guards[2]); emitGuardFootstepRipple(s, s.guards[3]);
    Object.assign(s.ripples[2], { age: 0.36, radius: 48 }); Object.assign(s.ripples[3], { age: 0.22, radius: 34 });
    recomputeScene(s);
    return true;
  }

  if (shotName === 'extraction-route') {
    const s = loadStage(4, 'PLAYING');
    Object.assign(s, { shotMode: true, time: 11.2, elapsed: 52.6, nearMissCount: 1, chimesUsed: 1, smokesUsed: 1, lootCollected: s.treasures.length, lootScore: 375, lampsSnuffed: 1 });
    s.treasures.forEach((t) => { t.collected = true; });
    toggleWallLamp(s.geometry.lights[1], s.geometry);
    s.geometry.lights[1].snuffSmoke = 0.95;
    updateDynamicLights(s.geometry, 0, s.time);
    aimSentry(s.geometry, 2.66);
    Object.assign(s.player, { x: 716, y: 120, facing: -0.06, crouching: true, chimes: 2, smokes: 1, hasKey: true, hasRelic: true, noiseLevel: 'SILENT' });

    [[0, 278, 336, -1.45], [1, 434, 212, -0.22], [2, 576, 474, 2.85], [3, 822, 296, -1.92], [4, 998, 386, -2.28]]
      .forEach(([i, x, y, f]) => placeGuard(s.guards[i], x, y, f));
    s.guards.forEach((g) => emitGuardFootstepRipple(s, g));
    [[1, 0.26, 42], [3, 0.34, 48], [4, 0.20, 33]].forEach(([i, a, r]) => Object.assign(s.ripples[i], { age: a, radius: r }));
    recomputeScene(s);
    return true;
  }

  if (shotName === 'campaign-select') {
    progress.completedStages.add(1);
    progress.lastRunSummary = {
      stageId: 1, stageName: 'The Limestone Cloister', rating: 'GHOST', score: 2850,
      alarms: 0, nearMisses: 2, lampsSnuffed: 1, chimesUsed: 1, smokesUsed: 1, lootCollected: 3, lootTotal: 3, elapsed: 38.4,
    };
    const s = loadStage(1, 'TITLE');
    Object.assign(s, { shotMode: true, selectedStage: 2, time: 3.2 });
    Object.assign(s.geometry.lights[0], { x: 134, y: 240, polygon: null });
    updateDynamicLights(s.geometry, 0, s.time);
    [[0, 128, 356, -1.15], [1, 768, 120, 1.85], [2, 1004, 384, 2.85]].forEach(([i, x, y, f]) => placeGuard(s.guards[i], x, y, f));
    emitGuardFootstepRipple(s, s.guards[0]); emitGuardFootstepRipple(s, s.guards[2]);
    Object.assign(s.ripples[0], { age: 0.30, radius: 44 }); Object.assign(s.ripples[1], { age: 0.22, radius: 34 });
    recomputeScene(s);
    return true;
  }
  return false;
}

export function getGameSnapshot() {
  if (!activeState) return null;
  const s = activeState;
  return {
    status: s.status, stage: s.level.id, stageName: s.level.name, detectionTier: s.detectionTier,
    maxSuspicion: Math.round((s.maxSuspicion || 0) * 100), isCooling: Boolean(s.isCooling),
    showTelemetry: s.showTelemetry, restartArmed: s.restartArmedTimer > 0,
    caughtBy: s.caughtBy, caughtTier: s.caughtTier, audioMuted: activeAudio ? activeAudio.muted : false,
    player: {
      x: Math.round(s.player.x * 10) / 10, y: Math.round(s.player.y * 10) / 10,
      crouching: s.player.crouching, hidden: s.playerVisibility.hidden, inSmoke: s.playerVisibility.inSmoke,
      visibility: s.playerVisibility.label, noise: s.player.noiseLevel,
      chimes: s.player.chimes, smokes: s.player.smokes, hasKey: s.player.hasKey, hasRelic: s.player.hasRelic,
    },
    guards: s.guards.map((g) => ({ id: g.id, archetype: g.archetype, tier: g.tier, suspicion: Math.round(g.suspicion * 100), conePts: g.visionPolygon.length })),
    smokeClouds: s.geometry.smokeClouds.length, alertLinks: (s.alertLinks || []).length,
    lootCollected: s.lootCollected, lootTotal: s.lootTotal, nearMissCount: s.nearMissCount, lampsSnuffed: s.lampsSnuffed, ripples: s.ripples.length,
  };
}

const HUD_TOP = 52;
const HUD_BOTTOM = 38;
const progress = { completedStages: new Set(), lastRunSummary: null };
let activeState = null; let activeInput = null; let activeAudio = null; let activeButtons = [];
let viewport = { width: 1280, height: 800, scale: 1, offsetX: 0, offsetY: 0 };

function loadStage(levelNumber, status = 'PLAYING') {
  activeState = createStageState(levelNumber, status, progress);
  return activeState;
}
function placeGuard(g, x, y, facing, extra = null) {
  g.x = x; g.y = y; g.facing = facing;
  if (extra) Object.assign(g, extra);
}
function aimSentry(geom, angle) {
  const sn = geom.sentries && geom.sentries[0];
  if (!sn) return;
  sn.angle = angle;
  sn.polygon = computeVisionConePolygon(sn.x, sn.y, sn.angle, sn.halfFov, sn.range, geom);
}
function recomputeScene(state) {
  for (const g of state.guards) g.visionPolygon = computeVisionConePolygon(g.x, g.y, g.facing, g.halfFov, g.range, state.geometry);
  state.playerVisibility = computePlayerVisibility(state.player, state.geometry);
  syncGlobalDetectionTier(state);
}

function handleAction(type, payload) {
  const s = activeState;
  if (!s) return;
  if (activeAudio) activeAudio.unlock();

  if (type === 'key') {
    if (s.shotMode) s.shotMode = false;
    if (payload === 'KeyM') { activeAudio.toggleMute(); return; }
    if (payload === 'Tab') { s.showTelemetry = !s.showTelemetry; return; }
    if (payload === 'Escape') { s.status = s.status === 'TITLE' ? 'PLAYING' : 'TITLE'; return; }
    if (payload.startsWith('Digit')) {
      const n = Number(payload.slice(5));
      if (n >= 1 && n <= 5) { loadStage(n, 'PLAYING'); return; }
    }
    if (s.status === 'TITLE' && (payload === 'Enter' || payload === 'Space')) { loadStage(s.selectedStage, 'PLAYING'); return; }
    if (s.status === 'CAUGHT') {
      if (payload === 'KeyR') { requestSafeRestart(s, () => loadStage(s.level.id, 'PLAYING')); return; }
      if (payload === 'Enter' || payload === 'Space') { loadStage(s.level.id, 'PLAYING'); return; }
    }
    if (s.status === 'COMPLETE' && (payload === 'Enter' || payload === 'Space')) { loadStage(s.level.id < 5 ? s.level.id + 1 : 1, 'PLAYING'); return; }
    if (s.status === 'PLAYING') {
      if (payload === 'KeyR') requestSafeRestart(s, () => loadStage(s.level.id, 'PLAYING'));
      else if (payload === 'KeyF') deploySmokeVeil(s, activeAudio);
      else if (payload === 'KeyE') {
        interactWithNearbyObject(s, activeAudio);
        if (s.status === 'COMPLETE') completeStageHeist(s, progress, activeAudio);
      } else if (payload === 'KeyQ') {
        const t = activeInput.mouseInCanvas ? activeInput.mouseWorld : { x: s.player.x + Math.cos(s.player.facing) * 165, y: s.player.y + Math.sin(s.player.facing) * 165 };
        aimAndTossChime(s, t, activeAudio);
      }
    }
    return;
  }

  if (type === 'rightclick') {
    if (s.shotMode) s.shotMode = false;
    if (s.status === 'PLAYING' && payload.canvasY > HUD_TOP && payload.canvasY < viewport.height - HUD_BOTTOM) deploySmokeVeil(s, activeAudio);
    return;
  }

  if (type === 'click') {
    if (s.shotMode) s.shotMode = false;
    const { canvasX, canvasY, worldX, worldY } = payload;
    for (let i = activeButtons.length - 1; i >= 0; i--) {
      const b = activeButtons[i];
      if (canvasX >= b.x && canvasX <= b.x + b.w && canvasY >= b.y && canvasY <= b.y + b.h) {
        if (b.id === 'start') loadStage(s.selectedStage, 'PLAYING');
        else if (b.id.startsWith('select-')) { if (s.selectedStage === b.stage) loadStage(b.stage, 'PLAYING'); else s.selectedStage = b.stage; }
        else if (b.id.startsWith('stage-')) loadStage(b.stage, 'PLAYING');
        else if (b.id === 'next-stage') loadStage(Math.min(5, s.level.id + 1), 'PLAYING');
        else if (b.id === 'retry') loadStage(s.level.id, 'PLAYING');
        else if (b.id === 'menu') s.status = 'TITLE';
        else if (b.id === 'mute') activeAudio.toggleMute();
        return;
      }
    }
    if (s.status !== 'PLAYING' || canvasY <= HUD_TOP || canvasY >= viewport.height - HUD_BOTTOM) return;
    aimAndTossChime(s, { x: worldX, y: worldY }, activeAudio);
  }
}

function updateSimulation(state, dt) {
  if (state.shotMode) return;
  state.time += dt;
  updateDynamicLights(state.geometry, dt, state.time);
  updateSoundRipples(state, dt);
  if (state.bannerTimer > 0) state.bannerTimer = Math.max(0, state.bannerTimer - dt);
  if (state.restartArmedTimer > 0) state.restartArmedTimer = Math.max(0, state.restartArmedTimer - dt);

  if (state.status === 'TITLE') {
    for (const g of state.guards) {
      updateGuardPatrol(state, g, dt, null);
      g.visionPolygon = computeVisionConePolygon(g.x, g.y, g.facing, g.halfFov, g.range, state.geometry);
    }
    return;
  }
  if (state.status !== 'PLAYING') return;

  state.elapsed += dt;
  updatePlayerMovement(state, activeInput, dt, activeAudio);
  state.playerVisibility = computePlayerVisibility(state.player, state.geometry);
  applySentrySpotting(state, dt, activeAudio);

  if (state.player.hasRelic && Math.hypot(state.player.x - state.level.exit.x, state.player.y - state.level.exit.y) <= state.level.exit.radius * 0.62) {
    completeStageHeist(state, progress, activeAudio);
    return;
  }
  for (const g of state.guards) {
    updateGuardPatrol(state, g, dt, activeAudio);
    updateGuardDetection(state, g, dt, activeAudio);
    if (state.status === 'CAUGHT') break;
  }
}

function renderFrame(ctx, canvas, state) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || window.innerWidth || 1280;
  const cssH = canvas.clientHeight || window.innerHeight || 800;
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  }

  const availH = Math.max(200, cssH - HUD_TOP - HUD_BOTTOM);
  const scale = Math.min((cssW - 16) / WORLD_WIDTH, (availH - 12) / WORLD_HEIGHT);
  viewport = { width: cssW, height: cssH, scale, offsetX: (cssW - WORLD_WIDTH * scale) * 0.5, offsetY: HUD_TOP + (availH - WORLD_HEIGHT * scale) * 0.5 };

  ctx.save(); ctx.scale(dpr, dpr);
  ctx.fillStyle = state.level.palette.surround; ctx.fillRect(0, 0, cssW, cssH);

  ctx.save(); ctx.translate(viewport.offsetX, viewport.offsetY); ctx.scale(scale, scale);
  renderFloorAndShadowHatch(ctx, state);
  renderDynamicLightPools(ctx, state);
  renderPatrolRouteGuides(ctx, state);
  renderGuardVisionCones(ctx, state);
  renderFootstepRipples(ctx, state, false);
  renderRelicAndExitGate(ctx, state);
  renderExitAperture(ctx, state);
  renderCoverArchitecture(ctx, state);
  renderSmokeVeils(ctx, state);
  renderFootstepRipples(ctx, state, true);
  renderGuardsAndAlertMeters(ctx, state);
  renderPlayerAndThrowArc(ctx, state, activeInput, { top: HUD_TOP, bottom: cssH - HUD_BOTTOM });
  ctx.restore();

  activeButtons = [];
  if (state.status !== 'TITLE') activeButtons.push(...renderHudBar(ctx, state, cssW, cssH, activeAudio.muted));
  if (state.status === 'TITLE') activeButtons.push(...renderTitleMissionSelect(ctx, state, cssW, cssH));
  else if (state.status === 'COMPLETE') activeButtons.push(...renderMissionCompleteModal(ctx, state, cssW, cssH));
  else if (state.status === 'CAUGHT') activeButtons.push(...renderCaughtModal(ctx, state, cssW, cssH));
  ctx.restore();
}

startGameLoop();
