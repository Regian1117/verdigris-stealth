// VERDIGRIS main game engine loop, level loader, deterministic screenshot composer,
// and state snapshot API for live play and automated verification.

import { buildLevelGeometry, getLevelDefinition, WORLD_HEIGHT, WORLD_WIDTH } from './levels.js';
import { computeVisionConePolygon } from './visibility.js';
import { computePlayerVisibility, toggleWallLamp, updateDynamicLights } from './lighting.js';
import { emitChimeDistraction, emitGuardFootstepRipple, updateSoundRipples } from './acoustics.js';
import { createGuardsForLevel, updateGuardDetection, updateGuardPatrol } from './guards.js';
import { aimAndTossChime, createPlayerState, interactWithNearbyObject, updatePlayerMovement } from './player.js';
import { createStealthAudio } from './audio.js';
import { bindKeyboardAndMouse, createInputState } from './input.js';
import {
  renderCoverArchitecture,
  renderDynamicLightPools,
  renderFloorAndShadowHatch,
  renderRelicAndExitGate,
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

const HUD_TOP = 48;
const HUD_BOTTOM = 26;

let activeState = null;
let activeInput = null;
let activeAudio = null;
let activeButtons = [];
let viewport = { width: 1280, height: 800, scale: 1, offsetX: 0, offsetY: 0 };

export function loadLevel(levelNumber, status = 'PLAYING') {
  const level = getLevelDefinition(levelNumber);
  const geometry = buildLevelGeometry(level);
  updateDynamicLights(geometry, 0, 0);

  const player = createPlayerState(level);
  const guards = createGuardsForLevel(level, geometry);
  const playerVisibility = computePlayerVisibility(player, geometry);

  activeState = {
    status, // TITLE | PLAYING | COMPLETE | CAUGHT
    selectedStage: level.id,
    level,
    geometry,
    player,
    playerVisibility,
    guards,
    ripples: [],
    time: 1.2,
    elapsed: 0,
    lampsSnuffed: 0,
    alertsTriggered: 0,
    showTelemetry: false,
    bannerText: '',
    bannerTimer: 0,
    caughtBy: null,
    shotMode: false,
  };
  return activeState;
}

function recomputeAllVisionCones(state) {
  for (const guard of state.guards) {
    guard.visionPolygon = computeVisionConePolygon(
      guard.x,
      guard.y,
      guard.facing,
      guard.halfFov,
      guard.range,
      state.geometry,
    );
  }
  state.playerVisibility = computePlayerVisibility(state.player, state.geometry);
}

export function applyDeterministicShotState(shotName) {
  if (!shotName) return false;

  if (shotName === 'infiltration') {
    const s = loadLevel(2, 'PLAYING');
    s.shotMode = true;
    s.time = 4.6;
    updateDynamicLights(s.geometry, 0, s.time);

    // Player crouched HIDDEN behind northwest verdigris copper pillar in hatched shadow
    s.player.x = 242;
    s.player.y = 180;
    s.player.facing = 0.28;
    s.player.crouching = true;
    s.player.chimes = 3;

    // Position 4 guards mid-patrol so their cover-clipped amber cones slice cleanly around pillars
    s.guards[0].x = 326; s.guards[0].y = 264; s.guards[0].facing = -2.35; s.guards[0].stridePhase = 1.1;
    s.guards[1].x = 524; s.guards[1].y = 122; s.guards[1].facing = 0.78; s.guards[1].stridePhase = 2.4;
    s.guards[2].x = 588; s.guards[2].y = 534; s.guards[2].facing = -2.18; s.guards[2].stridePhase = 0.6;
    s.guards[3].x = 788; s.guards[3].y = 330; s.guards[3].facing = -0.92; s.guards[3].stridePhase = 3.1;

    // Emit crisp concentric guard footstep ripples
    for (const g of s.guards) {
      emitGuardFootstepRipple(s, g);
    }
    s.ripples[0].age = 0.24; s.ripples[0].radius = 38;
    s.ripples[1].age = 0.42; s.ripples[1].radius = 52;
    s.ripples[2].age = 0.30; s.ripples[2].radius = 44;
    s.ripples[3].age = 0.18; s.ripples[3].radius = 31;

    recomputeAllVisionCones(s);
    return true;
  }

  if (shotName === 'alert-recovery') {
    const s = loadLevel(3, 'PLAYING');
    s.shotMode = true;
    s.time = 7.4;
    updateDynamicLights(s.geometry, 0, s.time);

    // Player crouched safely in hatched shadow behind carved crimson bookcase while Guard 1 cools down
    s.player.x = 184;
    s.player.y = 348;
    s.player.facing = -0.35;
    s.player.crouching = true;
    s.player.chimes = 2;

    // Guard 1 flared vibrant orange SUSPICIOUS ? 68% with radial gauge & dotted last-known marker
    s.guards[0].x = 344;
    s.guards[0].y = 224;
    s.guards[0].facing = 2.04;
    s.guards[0].state = 'SUSPICIOUS';
    s.guards[0].suspicion = 0.68;
    s.guards[0].recovering = true;
    s.guards[0].lastKnown = { x: 278, y: 404 };

    // Guard 2 turning toward a glowing cyan-gold Brass Chime ripple (INVESTIGATING ?)
    const chimeX = 708;
    const chimeY = 296;
    s.guards[1].x = 562;
    s.guards[1].y = 236;
    s.guards[1].facing = Math.atan2(chimeY - 236, chimeX - 562);
    s.guards[1].state = 'INVESTIGATING';
    s.guards[1].suspicion = 0.44;
    s.guards[1].investigateTarget = { x: chimeX, y: chimeY };
    s.guards[1].lastKnown = { x: chimeX, y: chimeY };

    // Guard 3 & 4 patrolling lower/east archive aisles
    s.guards[2].x = 738; s.guards[2].y = 548; s.guards[2].facing = 3.0;
    s.guards[3].x = 978; s.guards[3].y = 178; s.guards[3].facing = 1.95;

    // Glowing Brass Chime lure rings + guard footsteps
    emitChimeDistraction(s, chimeX, chimeY);
    s.ripples[0].age = 0.44;
    s.ripples[0].radius = 128;

    emitGuardFootstepRipple(s, s.guards[0]);
    emitGuardFootstepRipple(s, s.guards[2]);
    emitGuardFootstepRipple(s, s.guards[3]);
    s.ripples[1].age = 0.25; s.ripples[1].radius = 38;
    s.ripples[2].age = 0.36; s.ripples[2].radius = 48;
    s.ripples[3].age = 0.22; s.ripples[3].radius = 34;

    recomputeAllVisionCones(s);
    return true;
  }

  if (shotName === 'extraction-route') {
    const s = loadLevel(4, 'PLAYING');
    s.shotMode = true;
    s.time = 11.2;

    // Snuff the north canal bridge dock lamp to carve a dark corridor!
    toggleWallLamp(s.geometry.lights[1]);
    s.lampsSnuffed = 1;
    s.geometry.lights[1].snuffSmoke = 0.95;
    updateDynamicLights(s.geometry, 0, s.time);

    // Player carrying stolen Brass Chronometer relic sneaking unseen in hatched shadow past overlapping cones
    s.player.hasRelic = true;
    s.player.x = 716;
    s.player.y = 122;
    s.player.facing = -0.06;
    s.player.crouching = true;
    s.player.chimes = 2;

    // Overlapping cover-clipped guard cones across bridges & east quay (leaving snuffed bridge lamp unobstructed!)
    s.guards[0].x = 278; s.guards[0].y = 336; s.guards[0].facing = -1.45;
    s.guards[1].x = 466; s.guards[1].y = 202; s.guards[1].facing = 0.16;
    s.guards[2].x = 576; s.guards[2].y = 474; s.guards[2].facing = 2.85;
    s.guards[3].x = 822; s.guards[3].y = 296; s.guards[3].facing = -1.92;
    s.guards[4].x = 998; s.guards[4].y = 386; s.guards[4].facing = -2.28;

    for (const g of s.guards) emitGuardFootstepRipple(s, g);
    s.ripples[1].age = 0.26; s.ripples[1].radius = 42;
    s.ripples[3].age = 0.34; s.ripples[3].radius = 48;
    s.ripples[4].age = 0.20; s.ripples[4].radius = 33;

    recomputeAllVisionCones(s);
    return true;
  }

  if (shotName === 'campaign-select') {
    const s = loadLevel(1, 'TITLE');
    s.shotMode = true;
    s.selectedStage = 2;
    s.time = 3.2;
    // Place an atmospheric lantern glow on the west cloister flank so both sides gleam behind the title card
    s.geometry.lights[0].x = 134;
    s.geometry.lights[0].y = 240;
    s.geometry.lights[0].polygon = null;
    updateDynamicLights(s.geometry, 0, s.time);

    // Stage live courtyard guards visibly patrolling on both left & right flanks behind translucent mission card
    s.guards[0].x = 136; s.guards[0].y = 356; s.guards[0].facing = -1.15;
    s.guards[1].x = 768; s.guards[1].y = 120; s.guards[1].facing = 1.85;
    s.guards[2].x = 996; s.guards[2].y = 384; s.guards[2].facing = 2.85;
    emitGuardFootstepRipple(s, s.guards[0]);
    emitGuardFootstepRipple(s, s.guards[2]);
    s.ripples[0].age = 0.30; s.ripples[0].radius = 44;
    s.ripples[1].age = 0.22; s.ripples[1].radius = 34;

    recomputeAllVisionCones(s);
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
    player: {
      x: Math.round(s.player.x * 10) / 10,
      y: Math.round(s.player.y * 10) / 10,
      crouching: s.player.crouching,
      hidden: s.playerVisibility.hidden,
      chimes: s.player.chimes,
      hasRelic: s.player.hasRelic,
    },
    guards: s.guards.map((g) => ({
      id: g.id,
      state: g.state,
      suspicion: Math.round(g.suspicion * 100),
    })),
    lampsSnuffed: s.lampsSnuffed,
    ripples: s.ripples.length,
  };
}

function handleAction(type, payload) {
  const s = activeState;
  if (!s) return;

  if (type === 'key') {
    if (s.shotMode) s.shotMode = false;

    if (payload === 'KeyM') {
      activeAudio.toggleMute();
      return;
    }
    if (payload === 'Tab') {
      s.showTelemetry = !s.showTelemetry;
      return;
    }
    if (payload === 'Escape') {
      s.status = s.status === 'TITLE' ? 'PLAYING' : 'TITLE';
      return;
    }
    if (payload.startsWith('Digit')) {
      const n = Number(payload.slice(5));
      if (n >= 1 && n <= 5) {
        loadLevel(n, 'PLAYING');
        return;
      }
    }
    if (s.status === 'TITLE' && (payload === 'Enter' || payload === 'Space')) {
      loadLevel(s.selectedStage, 'PLAYING');
      return;
    }
    if (s.status === 'CAUGHT' && (payload === 'KeyR' || payload === 'Enter' || payload === 'Space')) {
      loadLevel(s.level.id, 'PLAYING');
      return;
    }
    if (s.status === 'COMPLETE' && (payload === 'Enter' || payload === 'Space')) {
      const next = s.level.id < 5 ? s.level.id + 1 : 1;
      loadLevel(next, 'PLAYING');
      return;
    }
    if (s.status === 'PLAYING') {
      if (payload === 'KeyR') {
        loadLevel(s.level.id, 'PLAYING');
      } else if (payload === 'KeyE') {
        interactWithNearbyObject(s, activeAudio);
      } else if (payload === 'KeyQ') {
        const target = activeInput.mouseInCanvas
          ? activeInput.mouseWorld
          : {
              x: s.player.x + Math.cos(s.player.facing) * 165,
              y: s.player.y + Math.sin(s.player.facing) * 165,
            };
        aimAndTossChime(s, target, activeAudio);
      }
    }
    return;
  }

  if (type === 'click') {
    if (s.shotMode) s.shotMode = false;
    const { canvasX, canvasY, worldX, worldY } = payload;

    // Check UI button hits first
    for (let i = activeButtons.length - 1; i >= 0; i--) {
      const b = activeButtons[i];
      if (canvasX >= b.x && canvasX <= b.x + b.w && canvasY >= b.y && canvasY <= b.y + b.h) {
        if (b.id === 'start') {
          loadLevel(s.selectedStage, 'PLAYING');
        } else if (b.id.startsWith('select-')) {
          if (s.selectedStage === b.stage) {
            loadLevel(b.stage, 'PLAYING');
          } else {
            s.selectedStage = b.stage;
          }
        } else if (b.id.startsWith('stage-')) {
          loadLevel(b.stage, 'PLAYING');
        } else if (b.id === 'next-stage') {
          loadLevel(Math.min(5, s.level.id + 1), 'PLAYING');
        } else if (b.id === 'retry') {
          loadLevel(s.level.id, 'PLAYING');
        } else if (b.id === 'menu') {
          s.status = 'TITLE';
        } else if (b.id === 'mute') {
          activeAudio.toggleMute();
        }
        return;
      }
    }

    // In active gameplay, left-click tosses a Brass Chime toward the cursor
    if (s.status === 'PLAYING' && canvasY > HUD_TOP && canvasY < viewport.height - HUD_BOTTOM) {
      aimAndTossChime(s, { x: worldX, y: worldY }, activeAudio);
    }
  }
}

function updateSimulation(state, dt) {
  if (state.shotMode) return;
  state.time += dt;
  updateDynamicLights(state.geometry, dt, state.time);
  updateSoundRipples(state, dt);

  if (state.bannerTimer > 0) {
    state.bannerTimer = Math.max(0, state.bannerTimer - dt);
  }

  if (state.status === 'TITLE') {
    // Live background patrol animation behind title overlay
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

  // Auto-extract if player steps directly into unlocked exit archway center
  if (state.player.hasRelic) {
    const dExit = Math.hypot(state.player.x - state.level.exit.x, state.player.y - state.level.exit.y);
    if (dExit <= state.level.exit.radius * 0.62) {
      state.status = 'COMPLETE';
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

  // Full-bleed architectural stone surround (no stark black letterbox bars)
  ctx.fillStyle = state.level.palette.surround;
  ctx.fillRect(0, 0, cssW, cssH);

  // Subtle exterior stonework framing
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < cssW; gx += 48) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, cssH);
    ctx.stroke();
  }

  // Transform into architectural courtyard world coordinates
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
  renderFootstepRipples(ctx, state, true);
  renderGuardsAndAlertMeters(ctx, state);
  renderPlayerAndThrowArc(ctx, state, activeInput);

  ctx.restore();

  // HUD & modal overlays
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

export function startGameLoop() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  activeInput = createInputState();
  activeAudio = createStealthAudio();

  bindKeyboardAndMouse(canvas, activeInput, () => viewport, handleAction);

  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!applyDeterministicShotState(shot)) {
    loadLevel(1, 'TITLE');
  }

  // Expose lightweight debug/test hooks on window for automated verification
  window.__VERDIGRIS__ = {
    getSnapshot: getGameSnapshot,
    loadLevel,
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

startGameLoop();
