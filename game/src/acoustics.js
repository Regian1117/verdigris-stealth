// Full acoustic stealth & Brass Chime lifecycle: parabolic chime throw, Smoke-Masked Chime combo,
// acoustic ripple pulses, surface-aware footsteps, and Acute Listener hearing propagation.

import { isPointInSmokeCloud } from './visibility.js';

export function aimAndTossChime(state, targetWorld, audio) {
  const player = state.player;
  if (player.chimes <= 0 || player.activeChime) return false;
  const land = getChimeLandingPoint(player, targetWorld);
  player.chimes -= 1;
  state.chimesUsed = (state.chimesUsed || 0) + 1;
  player.facing = Math.atan2(land.y - player.y, land.x - player.x);
  player.noiseLevel = 'SOFT';
  player.noiseTimer = 0.55;
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

export function emitChimeDistraction(state, x, y, smokeMasked = false) {
  const masked = smokeMasked || isPointInSmokeCloud(x, y, state.geometry?.smokeClouds);
  const lureRadius = masked ? 275 : 315;
  state.ripples.push({
    x,
    y,
    radius: 10,
    maxRadius: lureRadius,
    age: 0,
    duration: 1.45,
    kind: 'chime',
    masked,
    label: masked ? 'SMOKE-MASKED CHIME' : 'CHIME',
    color: masked ? '#9cfcf0' : '#7df9e2',
    accent: masked ? '#d2fff8' : '#ffe082',
    throughWalls: true,
    rings: 3,
  });
  return { lureRadius, masked };
}

export function emitGuardFootstepRipple(state, guard) {
  const tier = guard.tier || 'QUIET';
  const isHot = tier === 'LOCKDOWN' || tier === 'SEARCH';
  state.ripples.push({
    x: guard.x,
    y: guard.y,
    radius: 8,
    maxRadius: isHot ? 92 : 70,
    age: 0,
    duration: isHot ? 0.82 : 0.92,
    kind: 'guard-step',
    color: tier === 'LOCKDOWN' ? '#ff5468' : isHot || tier === 'WARY' ? '#ff9e44' : guard.archetype === 'listener' ? '#cfe6ff' : '#f2d388',
    throughWalls: true,
    rings: 2,
  });
}

export function emitPlayerNoiseRipple(state, x, y, surface, crouching, inSmoke = false) {
  if (crouching || surface === 'rug') return 0;

  let radius = 58;
  let color = '#7df9e2';
  if (surface === 'gravel') {
    radius = 162;
    color = '#ffe082';
  } else if (surface === 'timber') {
    radius = 148;
    color = '#ff9e44';
  }
  if (inSmoke) radius = Math.round(radius * 0.5);

  state.ripples.push({
    x,
    y,
    radius: 8,
    maxRadius: radius,
    age: 0,
    duration: surface === 'stone' ? 0.55 : 0.88,
    kind: 'player-step',
    surface,
    color,
    throughWalls: false,
    rings: surface === 'stone' ? 1 : 2,
  });

  return radius;
}

export function propagateSoundToGuards(state, x, y, radius, kind, onGuardInvestigate) {
  if (radius <= 0) return null;

  let chosenGuard = null;
  let bestDist = Infinity;

  for (const guard of state.guards) {
    const hearMult = guard.hearingMultiplier || 1;
    const effectiveRadius = radius * hearMult;
    const dist = Math.hypot(guard.x - x, guard.y - y);
    if (dist > effectiveRadius) continue;

    if (kind === 'chime' || kind === 'smoke-chime') {
      if (guard.tier !== 'LOCKDOWN' && dist < bestDist) {
        bestDist = dist;
        chosenGuard = guard;
      }
    } else if (kind === 'player-step') {
      if (guard.tier !== 'LOCKDOWN') {
        onGuardInvestigate(guard, x, y, 'footstep');
      }
    }
  }

  if ((kind === 'chime' || kind === 'smoke-chime') && chosenGuard) {
    onGuardInvestigate(chosenGuard, x, y, kind);
    return chosenGuard;
  }
  return null;
}

export function updateActiveChime(state, dt, audio, onGuardInvestigate) {
  const c = state.player.activeChime;
  if (!c) return;
  c.age += dt;
  const t = Math.min(1, c.age / c.duration);
  c.x = c.startX + (c.targetX - c.startX) * t;
  c.y = c.startY + (c.targetY - c.startY) * t;
  c.z = Math.sin(t * Math.PI) * 46;
  if (t >= 1) {
    const { lureRadius, masked } = emitChimeDistraction(state, c.targetX, c.targetY);
    propagateSoundToGuards(state, c.targetX, c.targetY, lureRadius, masked ? 'smoke-chime' : 'chime', onGuardInvestigate);
    if (masked) {
      state.bannerText = 'SMOKE-MASKED CHIME · LURE HIDDEN';
      state.bannerKind = 'info';
      state.bannerTimer = 2.4;
    }
    if (audio) audio.playBrassChime();
    state.player.activeChime = null;
  }
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

export function getSurfaceTypeAt(x, y, geometry) {
  for (const s of geometry.surfaces) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
      return s.type;
    }
  }
  return 'stone';
}

export function updateSoundRipples(state, dt) {
  for (let i = state.ripples.length - 1; i >= 0; i--) {
    const r = state.ripples[i];
    r.age += dt;
    const progress = Math.min(1, r.age / r.duration);
    r.radius = 8 + (r.maxRadius - 8) * (1 - Math.pow(1 - progress, 2.2));
    if (r.age >= r.duration) {
      state.ripples.splice(i, 1);
    }
  }
  if (state.alertLinks) {
    for (let i = state.alertLinks.length - 1; i >= 0; i--) {
      state.alertLinks[i].age += dt;
      if (state.alertLinks[i].age >= state.alertLinks[i].duration) {
        state.alertLinks.splice(i, 1);
      }
    }
  }
}

const MAX_CHIME_RANGE = 275;
