// Infiltrator controller: Smoke Veil gadget deployment, cover-sliding movement, Shadow-Step dash,
// smoke-muffled footsteps, and contextual [E] interactions for Keys, Loot, Relics, Lamps, and Exits.

import {
  emitPlayerNoiseRipple,
  getSurfaceTypeAt,
  propagateSoundToGuards,
  updateActiveChime,
} from './acoustics.js';
import { toggleWallLamp } from './lighting.js';
import { investigateSoundOrigin } from './patrol.js';
import { collectObjectiveItem } from './state.js';
import { computeVisionConePolygon } from './visibility.js';

export function deploySmokeVeil(state, audio) {
  const player = state.player;
  if (player.smokes <= 0) {
    state.bannerText = 'NO SMOKE VEILS REMAINING';
    state.bannerKind = 'warn';
    state.bannerTimer = 1.8;
    return false;
  }
  player.smokes -= 1;
  state.smokesUsed = (state.smokesUsed || 0) + 1;

  const cx = Math.max(44, Math.min(state.geometry.width - 44, player.x + Math.cos(player.facing) * 20));
  const cy = Math.max(44, Math.min(state.geometry.height - 44, player.y + Math.sin(player.facing) * 20));

  state.geometry.smokeClouds.push({
    x: cx,
    y: cy,
    radius: 74,
    currentRadius: 46,
    age: 0,
    duration: 6.5,
  });

  // Immediately clip all guard & sentry vision cones against the new Smoke Veil cloud
  for (const g of state.guards) {
    g.visionPolygon = computeVisionConePolygon(g.x, g.y, g.facing, g.halfFov, g.range, state.geometry);
  }
  for (const sn of state.geometry.sentries || []) {
    if (sn.active) {
      sn.polygon = computeVisionConePolygon(sn.x, sn.y, sn.angle, sn.halfFov, sn.range, state.geometry);
    }
  }

  state.bannerText = 'SMOKE VEIL DEPLOYED · VISION BLOCKED';
  state.bannerKind = 'info';
  state.bannerTimer = 2.4;
  if (audio) audio.playSmokeDeploy();
  return true;
}

export function updatePlayerMovement(state, input, dt, audio) {
  const player = state.player;
  const geometry = state.geometry;

  player.crouching = Boolean(input.keys.ShiftLeft || input.keys.ShiftRight);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  if (player.noiseTimer > 0) {
    player.noiseTimer = Math.max(0, player.noiseTimer - dt);
    if (player.noiseTimer === 0) player.noiseLevel = 'SILENT';
  }

  let mx = 0;
  let my = 0;
  if (input.keys.KeyW || input.keys.ArrowUp) my -= 1;
  if (input.keys.KeyS || input.keys.ArrowDown) my += 1;
  if (input.keys.KeyA || input.keys.ArrowLeft) mx -= 1;
  if (input.keys.KeyD || input.keys.ArrowRight) mx += 1;

  const moving = mx !== 0 || my !== 0;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    player.facing = Math.atan2(my, mx);
  }

  if (input.consumePressed('Space') && player.dashCooldown <= 0) {
    player.dashDirX = moving ? mx : Math.cos(player.facing);
    player.dashDirY = moving ? my : Math.sin(player.facing);
    player.dashTimer = 0.16;
    player.dashCooldown = 1.65;
  }

  const speed = player.crouching ? 88 : 168;
  let stepX = mx * speed * dt;
  let stepY = my * speed * dt;

  if (player.dashTimer > 0) {
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    stepX = player.dashDirX * 420 * dt;
    stepY = player.dashDirY * 420 * dt;
    player.afterimages.push({ x: player.x, y: player.y, age: 0, facing: player.facing });
  }

  player.x += stepX;
  player.y += stepY;
  resolvePlayerObstacles(player, geometry.obstacles);

  for (let i = player.afterimages.length - 1; i >= 0; i--) {
    player.afterimages[i].age += dt;
    if (player.afterimages[i].age > 0.28) player.afterimages.splice(i, 1);
  }

  player.surface = getSurfaceTypeAt(player.x, player.y, geometry);

  const movedDist = Math.hypot(stepX, stepY);
  if (movedDist > 0.2 && player.dashTimer <= 0) {
    player.stridePhase += dt * (player.crouching ? 6 : 11);
    player.stepAccum += movedDist;
    const cadence = player.crouching ? 56 : 44;
    if (player.stepAccum >= cadence) {
      player.stepAccum %= cadence;
      const noiseRadius = emitPlayerNoiseRipple(
        state,
        player.x,
        player.y,
        player.surface,
        player.crouching,
        player.inSmoke,
      );
      if (noiseRadius > 0) {
        player.noiseLevel = !player.inSmoke && (player.surface === 'gravel' || player.surface === 'timber')
          ? 'LOUD'
          : 'SOFT';
        player.noiseTimer = 0.85;
      } else {
        player.noiseLevel = 'SILENT';
      }
      if (audio) audio.playPlayerSurfaceStep(player.surface, player.crouching);
      if (noiseRadius > 0) {
        propagateSoundToGuards(state, player.x, player.y, noiseRadius, 'player-step', investigateSoundOrigin);
      }
    }
  }

  updateActiveChime(state, dt, audio, investigateSoundOrigin);
}

export function interactWithNearbyObject(state, audio) {
  const target = findNearbyInteractable(state);
  if (!target) return false;

  if (target.kind === 'key') {
    if (collectObjectiveItem(state, 'key')) {
      if (audio) audio.playLootChime();
      return true;
    }
    return false;
  }

  if (target.kind === 'loot') {
    if (collectObjectiveItem(state, 'loot', target.item)) {
      if (audio) audio.playLootChime();
      return true;
    }
    return false;
  }

  if (target.kind === 'relic') {
    if (collectObjectiveItem(state, 'relic')) {
      if (audio) audio.playExtractionChord(false);
      return true;
    }
    return false;
  }

  if (target.kind === 'exit') {
    state.status = 'COMPLETE';
    if (audio) audio.playExtractionChord(true);
    return true;
  }

  if (target.kind === 'lamp') {
    const linkedSentry = (state.geometry.sentries || []).some(
      (s) => s.active && s.linkedLightId === target.light.id,
    );
    if (toggleWallLamp(target.light, state.geometry)) {
      state.lampsSnuffed += 1;
      if (linkedSentry) {
        state.sentriesDisabled = (state.sentriesDisabled || 0) + 1;
        state.bannerText = 'SCONCE SNUFFED · SENTRY LANTERN DISABLED';
      } else {
        state.bannerText = 'WALL LAMP SNUFFED · SHADOW CORRIDOR OPENED';
      }
      state.bannerKind = 'info';
      state.bannerTimer = 2.6;
      if (audio) audio.playLampSnuff();
      return true;
    }
  }

  if (target.kind === 'sentry' && target.sentry.active) {
    target.sentry.active = false;
    target.sentry.snuffSmoke = 1.0;
    target.sentry.polygon = null;
    state.sentriesDisabled = (state.sentriesDisabled || 0) + 1;
    state.lampsSnuffed += 1;
    state.bannerText = 'SENTRY LANTERN DISABLED · PASSAGE CLEARED';
    state.bannerKind = 'info';
    state.bannerTimer = 2.6;
    if (audio) audio.playLampSnuff();
    return true;
  }

  return false;
}

export function createPlayerState(levelDef) {
  return {
    x: levelDef.playerSpawn.x,
    y: levelDef.playerSpawn.y,
    radius: 13,
    facing: levelDef.playerSpawn.facing || 0,
    crouching: false,
    inSmoke: false,
    hasKey: !levelDef.keyItem,
    hasRelic: false,
    chimes: levelDef.chimes ?? 3,
    maxChimes: levelDef.chimes ?? 3,
    smokes: levelDef.smokes ?? 2,
    maxSmokes: levelDef.smokes ?? 2,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirY: 0,
    afterimages: [],
    stridePhase: 0,
    stepAccum: 0,
    surface: 'stone',
    noiseLevel: 'SILENT',
    noiseTimer: 0,
    activeChime: null,
  };
}

export function findNearbyInteractable(state) {
  const player = state.player;
  const level = state.level;

  if (level.keyItem && !player.hasKey) {
    const dKey = Math.hypot(player.x - level.keyItem.x, player.y - level.keyItem.y);
    if (dKey <= 54) {
      return { kind: 'key', x: level.keyItem.x, y: level.keyItem.y, label: 'TAKE KEY' };
    }
  }

  for (const item of state.treasures || []) {
    if (item.collected) continue;
    if (Math.hypot(player.x - item.x, player.y - item.y) <= 50) {
      return { kind: 'loot', item, x: item.x, y: item.y, label: 'TAKE LOOT' };
    }
  }

  if (!player.hasRelic) {
    const dRelic = Math.hypot(player.x - level.relic.x, player.y - level.relic.y);
    if (dRelic <= 56) {
      const label = level.keyItem && !player.hasKey ? 'LOCKED · NEED KEY' : 'STEAL RELIC';
      return { kind: 'relic', x: level.relic.x, y: level.relic.y, label };
    }
  }

  if (player.hasRelic) {
    const dExit = Math.hypot(player.x - level.exit.x, player.y - level.exit.y);
    if (dExit <= level.exit.radius + 26) {
      return { kind: 'exit', x: level.exit.x, y: level.exit.y, label: 'EXTRACT UNSEEN' };
    }
  }

  let bestLamp = null;
  let bestDist = 66;
  for (const light of state.geometry.lights) {
    if (!light.snuffable || !light.lit) continue;
    const d = Math.hypot(player.x - light.x, player.y - light.y);
    if (d < bestDist) {
      bestDist = d;
      bestLamp = light;
    }
  }
  if (bestLamp) {
    const hasSentry = (state.geometry.sentries || []).some((s) => s.active && s.linkedLightId === bestLamp.id);
    return {
      kind: 'lamp',
      light: bestLamp,
      x: bestLamp.x,
      y: bestLamp.y,
      label: hasSentry ? 'SNUFF SCONCE' : 'SNUFF LAMP',
    };
  }

  for (const sentry of state.geometry.sentries || []) {
    if (!sentry.active) continue;
    const d = Math.hypot(player.x - sentry.switchX, player.y - sentry.switchY);
    if (d < 64) {
      return { kind: 'sentry', sentry, x: sentry.switchX, y: sentry.switchY, label: 'DISABLE SENTRY' };
    }
  }

  return null;
}

function resolvePlayerObstacles(player, obstacles) {
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const cx = Math.max(obs.x, Math.min(player.x, obs.x + obs.w));
    const cy = Math.max(obs.y, Math.min(player.y, obs.y + obs.h));
    const dx = player.x - cx;
    const dy = player.y - cy;
    const d2 = dx * dx + dy * dy;
    const r = player.radius;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.001;
      const push = r - d;
      player.x += (dx / d) * push;
      player.y += (dy / d) * push;
    }
  }
}
