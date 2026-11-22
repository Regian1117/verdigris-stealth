// VERDIGRIS main orchestrator: lean simulation/render loop, stage loader, HUD/world click routing,
// double-tap restart guard, deterministic shot composer, and live verification snapshot API.

import { buildLevelGeometry, getLevelDefinition, WORLD_HEIGHT, WORLD_WIDTH } from './levels.js';
import { computeHeistSummary, createGameState, syncGlobalDetectionTier } from './state.js';
import { computeVisionConePolygon } from './visibility.js';
import { computePlayerVisibility, toggleWallLamp, updateDynamicLights } from './lighting.js';
import { aimAndTossChime, emitChimeDistraction, emitGuardFootstepRipple, updateSoundRipples } from './acoustics.js';
import { assignGuardArchetypes, updateGuardPatrol } from './patrol.js';
import { applySentrySpotting, updateGuardDetection } from './detection.js';
import { createPlayerState, deploySmokeVeil, interactWithNearbyObject, updatePlayerMovement } from './player.js';
import { createStealthAudio } from './audio.js';
import { bindKeyboardAndMouse, createInputState } from './input.js';
import {
  renderCoverArchitecture,
  renderDynamicLightPools,
  renderFloorAndShadowHatch,
  renderRelicAndExitGate,
  renderSmokeVeils,
} from './render-world.js';
import {
  renderFootstepRipples,
  renderGuardsAndAlertMeters,
  renderGuardVisionCones,
  renderPatrolRouteGuides,
  renderPlayerAndThrowArc,
} from './render-entities.js';
import {
  renderCaughtModal,
  renderHudBar,
  renderMissionCompleteModal,
  renderTitleMissionSelect,
} from './render-hud.js';

export function startGameLoop() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  activeInput = createInputState();
  activeAudio = createStealthAudio();

  bindKeyboardAndMouse(canvas, activeInput, () => viewport, handleAction);

  const shot = new URLSearchParams(window.location.search).get('shot');
  if (!applyDeterministicShotState(shot)) {
    loadStage(1, 'TITLE');
  }

  window.__VERDIGRIS__ = {
    getSnapshot: getGameSnapshot,
    loadStage,
    loadLevel: loadStage,
    applyShot: applyDeterministicShotState,
    getButtons: () => activeButtons,
    getViewport: () => viewport,
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

export function loadStage(levelNumber, status = 'PLAYING') {
  const level = getLevelDefinition(levelNumber);
  const geometry = buildLevelGeometry(level);
  updateDynamicLights(geometry, 0, 0);

  const player = createPlayerState(level);
  const guards = assignGuardArchetypes(level, geometry);
  const playerVisibility = computePlayerVisibility(player, geometry);

  activeState = createGameState(level, geometry, player, guards, playerVisibility, {
    status,
    lastRunSummary,
    completedStages,
  });
  return activeState;
}

export function applyDeterministicShotState(shotName) {
  if (!shotName) return false;

  if (shotName === 'infiltration') {
    const s = loadStage(2, 'PLAYING');
    s.shotMode = true;
    s.time = 4.6;
    s.elapsed = 28.4;
    s.nearMissCount = 1;
    s.chimesUsed = 1;
    s.treasures[0].collected = true;
    s.lootCollected = 1;
    s.lootScore = 150;
    updateDynamicLights(s.geometry, 0, s.time);

    if (s.geometry.sentries[0]) {
      const sn = s.geometry.sentries[0];
      sn.angle = Math.PI + 0.14;
      sn.polygon = computeVisionConePolygon(sn.x, sn.y, sn.angle, sn.halfFov, sn.range, s.geometry);
    }

    s.player.x = 242; s.player.y = 176; s.player.facing = 0.28;
    s.player.crouching = true; s.player.chimes = 2; s.player.smokes = 2; s.player.noiseLevel = 'SILENT';

    const echoX = 632; const echoY = 204;
    s.guards[0].x = 524; s.guards[0].y = 124;
    s.guards[0].facing = Math.atan2(echoY - 124, echoX - 524);
    s.guards[0].tier = 'WARY'; s.guards[0].suspicion = 0.38; s.guards[0].recovering = true;
    s.guards[0].callout = 'WARY 38%'; s.guards[0].lastKnown = { x: echoX, y: echoY };
    s.guards[1].x = 326; s.guards[1].y = 264; s.guards[1].facing = -2.35;
    s.guards[2].x = 588; s.guards[2].y = 530; s.guards[2].facing = -2.18;
    s.guards[3].x = 788; s.guards[3].y = 330; s.guards[3].facing = -0.92;

    emitChimeDistraction(s, echoX, echoY);
    s.ripples[0].age = 0.78; s.ripples[0].radius = 122; s.ripples[0].label = 'CHIME ECHO';
    for (const g of s.guards) emitGuardFootstepRipple(s, g);
    s.ripples[1].age = 0.42; s.ripples[1].radius = 50;
    s.ripples[2].age = 0.24; s.ripples[2].radius = 38;
    s.ripples[3].age = 0.30; s.ripples[3].radius = 44;
    s.ripples[4].age = 0.18; s.ripples[4].radius = 31;

    recomputeScene(s);
    return true;
  }

  if (shotName === 'alert-recovery') {
    const s = loadStage(3, 'PLAYING');
    s.shotMode = true;
    s.time = 7.4;
    s.elapsed = 41.2;
    s.nearMissCount = 1;
    s.chimesUsed = 1;
    s.smokesUsed = 1;
    s.player.hasKey = true;
    s.treasures[0].collected = true;
    s.lootCollected = 1;
    s.lootScore = 150;
    s.bannerText = 'NEAR MISS · HIDE TO COOL';
    s.bannerKind = 'warn';
    s.bannerTimer = 3.0;

    // Active swirling Smoke Veil positioned so it cleanly slices the RIGHT half of W1's SEARCH cone
    // while the LEFT half sweeps full-length down the aisle (unmistakable raycast occlusion at 244px!)
    s.geometry.smokeClouds.push({ x: 372, y: 382, radius: 66, currentRadius: 66, age: 1.4, duration: 6.5 });
    updateDynamicLights(s.geometry, 0, s.time);

    if (s.geometry.sentries[0]) {
      const sn = s.geometry.sentries[0];
      sn.angle = -1.24;
      sn.polygon = computeVisionConePolygon(sn.x, sn.y, sn.angle, sn.halfFov, sn.range, s.geometry);
    }

    s.player.x = 176; s.player.y = 356; s.player.facing = -0.35;
    s.player.crouching = true; s.player.chimes = 2; s.player.smokes = 1; s.player.noiseLevel = 'SILENT';

    // W1 (Acute Listener) in SEARCH 68% with visible floor timer ring, cone visibly bisected by Smoke Veil
    s.guards[0].x = 342; s.guards[0].y = 222; s.guards[0].facing = 1.66;
    s.guards[0].tier = 'SEARCH'; s.guards[0].suspicion = 0.68; s.guards[0].recovering = true;
    s.guards[0].callout = 'WHAT WAS THAT?';
    s.guards[0].searchTimer = 2.9; s.guards[0].searchMaxTime = 4.6;
    s.guards[0].lastKnown = { x: 266, y: 462 };

    // W2 lured toward cyan chime ripple
    const chimeX = 708; const chimeY = 296;
    s.guards[1].x = 562; s.guards[1].y = 236;
    s.guards[1].facing = Math.atan2(chimeY - 236, chimeX - 562);
    s.guards[1].tier = 'WARY'; s.guards[1].suspicion = 0.44;
    s.guards[1].callout = 'HEARD CHIME'; s.guards[1].investigateKind = 'chime';
    s.guards[1].investigateTarget = { x: chimeX, y: chimeY };
    s.guards[1].lastKnown = { x: chimeX, y: chimeY };

    s.guards[2].x = 786; s.guards[2].y = 548; s.guards[2].facing = 3.0;
    s.guards[3].x = 978; s.guards[3].y = 178; s.guards[3].facing = 1.95;

    emitChimeDistraction(s, chimeX, chimeY);
    s.ripples[0].age = 0.44; s.ripples[0].radius = 128;
    emitGuardFootstepRipple(s, s.guards[0]);
    emitGuardFootstepRipple(s, s.guards[2]);
    emitGuardFootstepRipple(s, s.guards[3]);
    s.ripples[1].age = 0.25; s.ripples[1].radius = 38;
    s.ripples[2].age = 0.36; s.ripples[2].radius = 48;
    s.ripples[3].age = 0.22; s.ripples[3].radius = 34;

    recomputeScene(s);
    return true;
  }

  if (shotName === 'extraction-route') {
    const s = loadStage(4, 'PLAYING');
    s.shotMode = true;
    s.time = 11.2;
    s.elapsed = 52.6;
    s.nearMissCount = 1;
    s.chimesUsed = 1;
    s.smokesUsed = 1;
    s.player.hasKey = true;
    s.player.hasRelic = true;
    for (const t of s.treasures) t.collected = true;
    s.lootCollected = s.treasures.length;
    s.lootScore = 375;

    toggleWallLamp(s.geometry.lights[1], s.geometry);
    s.lampsSnuffed = 1;
    s.geometry.lights[1].snuffSmoke = 0.95;
    updateDynamicLights(s.geometry, 0, s.time);

    if (s.geometry.sentries[0]) {
      const sn = s.geometry.sentries[0];
      sn.angle = 2.66;
      sn.polygon = computeVisionConePolygon(sn.x, sn.y, sn.angle, sn.halfFov, sn.range, s.geometry);
    }

    s.player.x = 716; s.player.y = 120; s.player.facing = -0.06;
    s.player.crouching = true; s.player.chimes = 2; s.player.smokes = 1; s.player.noiseLevel = 'SILENT';

    s.guards[0].x = 278; s.guards[0].y = 336; s.guards[0].facing = -1.45;
    s.guards[1].x = 434; s.guards[1].y = 212; s.guards[1].facing = -0.22;
    s.guards[2].x = 576; s.guards[2].y = 474; s.guards[2].facing = 2.85;
    s.guards[3].x = 822; s.guards[3].y = 296; s.guards[3].facing = -1.92;
    s.guards[4].x = 998; s.guards[4].y = 386; s.guards[4].facing = -2.28;

    for (const g of s.guards) emitGuardFootstepRipple(s, g);
    s.ripples[1].age = 0.26; s.ripples[1].radius = 42;
    s.ripples[3].age = 0.34; s.ripples[3].radius = 48;
    s.ripples[4].age = 0.20; s.ripples[4].radius = 33;

    recomputeScene(s);
    return true;
  }

  if (shotName === 'campaign-select') {
    completedStages.add(1);
    lastRunSummary = {
      stageId: 1,
      stageName: 'The Limestone Cloister',
      rating: 'GHOST',
      score: 2850,
      alarms: 0,
      nearMisses: 2,
      lampsSnuffed: 1,
      chimesUsed: 1,
      smokesUsed: 1,
      lootCollected: 3,
      lootTotal: 3,
      elapsed: 38.4,
    };

    const s = loadStage(1, 'TITLE');
    s.shotMode = true;
    s.selectedStage = 2;
    s.time = 3.2;
    s.geometry.lights[0].x = 134;
    s.geometry.lights[0].y = 240;
    s.geometry.lights[0].polygon = null;
    updateDynamicLights(s.geometry, 0, s.time);

    s.guards[0].x = 128; s.guards[0].y = 356; s.guards[0].facing = -1.15;
    s.guards[1].x = 768; s.guards[1].y = 120; s.guards[1].facing = 1.85;
    s.guards[2].x = 1004; s.guards[2].y = 384; s.guards[2].facing = 2.85;
    emitGuardFootstepRipple(s, s.guards[0]);
    emitGuardFootstepRipple(s, s.guards[2]);
    s.ripples[0].age = 0.30; s.ripples[0].radius = 44;
    s.ripples[1].age = 0.22; s.ripples[1].radius = 34;

    recomputeScene(s);
    return true;
  }

  return false;
}

export function getGameSnapshot() {
  if (!activeState) return null;
  const s = activeState;
  return {
    status: s.status,
    stage: s.level.id,
    stageName: s.level.name,
    detectionTier: s.detectionTier,
    showTelemetry: s.showTelemetry,
    restartArmed: s.restartArmedTimer > 0,
    player: {
      x: Math.round(s.player.x * 10) / 10,
      y: Math.round(s.player.y * 10) / 10,
      crouching: s.player.crouching,
      hidden: s.playerVisibility.hidden,
      inSmoke: s.playerVisibility.inSmoke,
      visibility: s.playerVisibility.label,
      noise: s.player.noiseLevel,
      chimes: s.player.chimes,
      smokes: s.player.smokes,
      hasKey: s.player.hasKey,
      hasRelic: s.player.hasRelic,
    },
    guards: s.guards.map((g) => ({
      id: g.id,
      archetype: g.archetype,
      tier: g.tier,
      suspicion: Math.round(g.suspicion * 100),
      conePts: g.visionPolygon.length,
    })),
    smokeClouds: s.geometry.smokeClouds.length,
    lootCollected: s.lootCollected,
    lootTotal: s.lootTotal,
    nearMissCount: s.nearMissCount,
    lampsSnuffed: s.lampsSnuffed,
    ripples: s.ripples.length,
  };
}

const HUD_TOP = 52;
const HUD_BOTTOM = 38;

let activeState = null;
let activeInput = null;
let activeAudio = null;
let activeButtons = [];
let lastRunSummary = null;
const completedStages = new Set();
let viewport = { width: 1280, height: 800, scale: 1, offsetX: 0, offsetY: 0 };

function recomputeScene(state) {
  for (const g of state.guards) {
    g.visionPolygon = computeVisionConePolygon(g.x, g.y, g.facing, g.halfFov, g.range, state.geometry);
  }
  state.playerVisibility = computePlayerVisibility(state.player, state.geometry);
  syncGlobalDetectionTier(state);
}

function handleAction(type, payload) {
  const s = activeState;
  if (!s) return;

  if (type === 'key') {
    if (s.shotMode) s.shotMode = false;

    if (payload === 'KeyM') { activeAudio.toggleMute(); return; }
    if (payload === 'Tab') { s.showTelemetry = !s.showTelemetry; return; }
    if (payload === 'Escape') { s.status = s.status === 'TITLE' ? 'PLAYING' : 'TITLE'; return; }
    if (payload.startsWith('Digit')) {
      const n = Number(payload.slice(5));
      if (n >= 1 && n <= 5) { loadStage(n, 'PLAYING'); return; }
    }
    if (s.status === 'TITLE' && (payload === 'Enter' || payload === 'Space')) {
      loadStage(s.selectedStage, 'PLAYING');
      return;
    }
    if (s.status === 'CAUGHT' && (payload === 'KeyR' || payload === 'Enter' || payload === 'Space')) {
      loadStage(s.level.id, 'PLAYING');
      return;
    }
    if (s.status === 'COMPLETE' && (payload === 'Enter' || payload === 'Space')) {
      loadStage(s.level.id < 5 ? s.level.id + 1 : 1, 'PLAYING');
      return;
    }

    if (s.status === 'PLAYING') {
      if (payload === 'KeyR') {
        if (s.restartArmedTimer > 0) {
          loadStage(s.level.id, 'PLAYING');
        } else {
          s.restartArmedTimer = 2.6;
          s.bannerText = 'PRESS R AGAIN TO RESTART';
          s.bannerKind = 'warn';
          s.bannerTimer = 2.6;
        }
      } else if (payload === 'KeyF') {
        deploySmokeVeil(s, activeAudio);
      } else if (payload === 'KeyE') {
        interactWithNearbyObject(s, activeAudio);
        if (s.status === 'COMPLETE') finalizeStageClear(s);
      } else if (payload === 'KeyQ') {
        const target = activeInput.mouseInCanvas
          ? activeInput.mouseWorld
          : { x: s.player.x + Math.cos(s.player.facing) * 165, y: s.player.y + Math.sin(s.player.facing) * 165 };
        aimAndTossChime(s, target, activeAudio);
      }
    }
    return;
  }

  if (type === 'rightclick') {
    if (s.shotMode) s.shotMode = false;
    if (s.status === 'PLAYING' && payload.canvasY > HUD_TOP && payload.canvasY < viewport.height - HUD_BOTTOM) {
      deploySmokeVeil(s, activeAudio);
    }
    return;
  }

  if (type === 'click') {
    if (s.shotMode) s.shotMode = false;
    const { canvasX, canvasY, worldX, worldY } = payload;

    // 1. Check all HUD & modal button hitboxes FIRST — never throw a chime when clicking UI!
    for (let i = activeButtons.length - 1; i >= 0; i--) {
      const b = activeButtons[i];
      if (canvasX >= b.x && canvasX <= b.x + b.w && canvasY >= b.y && canvasY <= b.y + b.h) {
        if (b.id === 'start') loadStage(s.selectedStage, 'PLAYING');
        else if (b.id.startsWith('select-')) {
          if (s.selectedStage === b.stage) loadStage(b.stage, 'PLAYING');
          else s.selectedStage = b.stage;
        } else if (b.id.startsWith('stage-')) loadStage(b.stage, 'PLAYING');
        else if (b.id === 'next-stage') loadStage(Math.min(5, s.level.id + 1), 'PLAYING');
        else if (b.id === 'retry') loadStage(s.level.id, 'PLAYING');
        else if (b.id === 'menu') s.status = 'TITLE';
        else if (b.id === 'mute') activeAudio.toggleMute();
        return;
      }
    }

    // 2. Ignore clicks inside top/bottom HUD chrome or non-PLAYING overlays
    if (s.status !== 'PLAYING' || canvasY <= HUD_TOP || canvasY >= viewport.height - HUD_BOTTOM) return;

    // 3. Genuine world click -> toss Brass Chime
    aimAndTossChime(s, { x: worldX, y: worldY }, activeAudio);
  }
}

function finalizeStageClear(state) {
  completedStages.add(state.level.id);
  lastRunSummary = computeHeistSummary(state);
  state.lastRunSummary = lastRunSummary;
}

function updateSimulation(state, dt) {
  if (state.shotMode) return;
  state.time += dt;
  updateDynamicLights(state.geometry, dt, state.time);
  updateSoundRipples(state, dt);

  if (state.bannerTimer > 0) state.bannerTimer = Math.max(0, state.bannerTimer - dt);
  if (state.restartArmedTimer > 0) state.restartArmedTimer = Math.max(0, state.restartArmedTimer - dt);

  if (state.status === 'TITLE') {
    for (const guard of state.guards) {
      updateGuardPatrol(state, guard, dt, null);
      guard.visionPolygon = computeVisionConePolygon(
        guard.x, guard.y, guard.facing, guard.halfFov, guard.range, state.geometry,
      );
    }
    return;
  }

  if (state.status !== 'PLAYING') return;

  state.elapsed += dt;
  updatePlayerMovement(state, activeInput, dt, activeAudio);
  state.playerVisibility = computePlayerVisibility(state.player, state.geometry);
  applySentrySpotting(state, dt, activeAudio);

  if (state.player.hasRelic) {
    const dExit = Math.hypot(state.player.x - state.level.exit.x, state.player.y - state.level.exit.y);
    if (dExit <= state.level.exit.radius * 0.62) {
      state.status = 'COMPLETE';
      finalizeStageClear(state);
      activeAudio.playExtractionChord(true);
      return;
    }
  }

  for (const guard of state.guards) {
    updateGuardPatrol(state, guard, dt, activeAudio);
    updateGuardDetection(state, guard, dt, activeAudio);
    if (state.status === 'CAUGHT') break;
  }
}

function renderFrame(ctx, canvas, state) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || window.innerWidth || 1280;
  const cssH = canvas.clientHeight || window.innerHeight || 800;

  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  const availH = Math.max(200, cssH - HUD_TOP - HUD_BOTTOM);
  const scale = Math.min((cssW - 16) / WORLD_WIDTH, (availH - 12) / WORLD_HEIGHT);
  const offsetX = (cssW - WORLD_WIDTH * scale) * 0.5;
  const offsetY = HUD_TOP + (availH - WORLD_HEIGHT * scale) * 0.5;
  viewport = { width: cssW, height: cssH, scale, offsetX, offsetY };

  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = state.level.palette.surround;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  renderFloorAndShadowHatch(ctx, state);
  renderDynamicLightPools(ctx, state);
  renderPatrolRouteGuides(ctx, state);
  renderGuardVisionCones(ctx, state);
  renderFootstepRipples(ctx, state, false);
  renderRelicAndExitGate(ctx, state);
  renderCoverArchitecture(ctx, state);
  renderSmokeVeils(ctx, state);
  renderFootstepRipples(ctx, state, true);
  renderGuardsAndAlertMeters(ctx, state);
  renderPlayerAndThrowArc(ctx, state, activeInput, { top: HUD_TOP, bottom: cssH - HUD_BOTTOM });

  ctx.restore();

  activeButtons = [];
  if (state.status !== 'TITLE') {
    activeButtons.push(...renderHudBar(ctx, state, cssW, cssH, activeAudio.muted));
  }
  if (state.status === 'TITLE') {
    activeButtons.push(...renderTitleMissionSelect(ctx, state, cssW, cssH));
  } else if (state.status === 'COMPLETE') {
    activeButtons.push(...renderMissionCompleteModal(ctx, state, cssW, cssH));
  } else if (state.status === 'CAUGHT') {
    activeButtons.push(...renderCaughtModal(ctx, state, cssW, cssH));
  }

  ctx.restore();
}

startGameLoop();
