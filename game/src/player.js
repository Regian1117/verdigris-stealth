// Infiltrator state, smooth cover-sliding movement, shadow-step dash,
// brass chime parabolic throw, and relic/lamp/exit interaction.

import { emitChimeDistraction, emitPlayerNoiseRipple, getSurfaceTypeAt, propagateSoundToGuards } from './acoustics.js';
import { toggleWallLamp } from './lighting.js';
import { investigateSoundOrigin } from './guards.js';

const MAX_CHIME_RANGE = 275;

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

export function createPlayerState(levelDef) {
  return {
    x: levelDef.playerSpawn.x,
    y: levelDef.playerSpawn.y,
    radius: 13,
    facing: levelDef.playerSpawn.facing || 0,
    crouching: false,
    hasRelic: false,
    chimes: levelDef.chimes ?? 3,
    maxChimes: levelDef.chimes ?? 3,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirY: 0,
    afterimages: [],
    stridePhase: 0,
    stepAccum: 0,
    surface: 'stone',
    activeChime: null,
  };
}

export function getChimeLandingPoint(player, aimWorld) {
  const dx = aimWorld.x - player.x;
  const dy = aimWorld.y - player.y;
  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(dist, MAX_CHIME_RANGE);
  if (dist < 1) {
    return {
      x: player.x + Math.cos(player.facing) * 140,
      y: player.y + Math.sin(player.facing) * 140,
    };
  }
  return {
    x: Math.max(36, Math.min(1084, player.x + (dx / dist) * clamped)),
    y: Math.max(36, Math.min(624, player.y + (dy / dist) * clamped)),
  };
}

export function updatePlayerMovement(state, input, dt, audio) {
  const player = state.player;
  const geometry = state.geometry;

  player.crouching = Boolean(input.keys.ShiftLeft || input.keys.ShiftRight);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);

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

  // Shadow-step silent dash on Space
  if (input.consumePressed('Space') && player.dashCooldown <= 0) {
    const dirX = moving ? mx : Math.cos(player.facing);
    const dirY = moving ? my : Math.sin(player.facing);
    player.dashDirX = dirX;
    player.dashDirY = dirY;
    player.dashTimer = 0.16;
    player.dashCooldown = 1.65;
  }

  let speed = player.crouching ? 88 : 168;
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

  // Update shadow-step afterimages
  for (let i = player.afterimages.length - 1; i >= 0; i--) {
    player.afterimages[i].age += dt;
    if (player.afterimages[i].age > 0.28) player.afterimages.splice(i, 1);
  }

  player.surface = getSurfaceTypeAt(player.x, player.y, geometry);

  // Player surface footstep acoustics
  const movedDist = Math.hypot(stepX, stepY);
  if (movedDist > 0.2 && player.dashTimer <= 0) {
    player.stridePhase += dt * (player.crouching ? 6 : 11);
    player.stepAccum += movedDist;
    const cadence = player.crouching ? 56 : 44;
    if (player.stepAccum >= cadence) {
      player.stepAccum %= cadence;
      const noiseRadius = emitPlayerNoiseRipple(state, player.x, player.y, player.surface, player.crouching);
      if (audio) audio.playPlayerSurfaceStep(player.surface, player.crouching);
      if (noiseRadius > 0) {
        propagateSoundToGuards(state, player.x, player.y, noiseRadius, 'player-step', investigateSoundOrigin);
      }
    }
  }

  // Update in-flight brass chime projectile
  if (player.activeChime) {
    const c = player.activeChime;
    c.age += dt;
    const t = Math.min(1, c.age / c.duration);
    c.x = c.startX + (c.targetX - c.startX) * t;
    c.y = c.startY + (c.targetY - c.startY) * t;
    c.z = Math.sin(t * Math.PI) * 46;
    if (t >= 1) {
      const lureRadius = emitChimeDistraction(state, c.targetX, c.targetY);
      propagateSoundToGuards(state, c.targetX, c.targetY, lureRadius, 'chime', investigateSoundOrigin);
      if (audio) audio.playBrassChime();
      player.activeChime = null;
    }
  }
}

export function aimAndTossChime(state, targetWorld, audio) {
  const player = state.player;
  if (player.chimes <= 0 || player.activeChime) return false;
  const land = getChimeLandingPoint(player, targetWorld);
  player.chimes -= 1;
  player.facing = Math.atan2(land.y - player.y, land.x - player.x);
  player.activeChime = {
    startX: player.x,
    startY: player.y,
    targetX: land.x,
    targetY: land.y,
    x: player.x,
    y: player.y,
    z: 0,
    age: 0,
    duration: 0.32,
  };
  if (audio) audio.playPlayerSurfaceStep('stone', true);
  return true;
}

export function findNearbyInteractable(state) {
  const player = state.player;
  const level = state.level;

  if (!player.hasRelic) {
    const dRelic = Math.hypot(player.x - level.relic.x, player.y - level.relic.y);
    if (dRelic <= 52) {
      return { kind: 'relic', x: level.relic.x, y: level.relic.y, label: `STEAL ${level.relicName.toUpperCase()}` };
    }
  }

  if (player.hasRelic) {
    const dExit = Math.hypot(player.x - level.exit.x, player.y - level.exit.y);
    if (dExit <= level.exit.radius + 24) {
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
    return { kind: 'lamp', light: bestLamp, x: bestLamp.x, y: bestLamp.y, label: 'SNUFF LAMP' };
  }

  return null;
}

export function interactWithNearbyObject(state, audio) {
  const target = findNearbyInteractable(state);
  if (!target) return false;

  if (target.kind === 'relic') {
    state.player.hasRelic = true;
    state.bannerText = `${state.level.relicName.toUpperCase()} SECURED · REACH EXIT UNSEEN`;
    state.bannerTimer = 3.6;
    if (audio) audio.playExtractionChord(false);
    return true;
  }

  if (target.kind === 'exit') {
    state.status = 'COMPLETE';
    if (audio) audio.playExtractionChord(true);
    return true;
  }

  if (target.kind === 'lamp') {
    if (toggleWallLamp(target.light)) {
      state.lampsSnuffed += 1;
      state.bannerText = 'WALL LAMP SNUFFED · SHADOW CORRIDOR OPENED';
      state.bannerTimer = 2.4;
      if (audio) audio.playLampSnuff();
      return true;
    }
  }

  return false;
}
