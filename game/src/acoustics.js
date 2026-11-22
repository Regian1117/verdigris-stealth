// Spatial acoustics: visible & audible concentric footstep ripples, floor surface noise,
// and brass chime distraction pulses that lure nearby guards to investigate.

export function getSurfaceTypeAt(x, y, geometry) {
  for (const s of geometry.surfaces) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
      return s.type;
    }
  }
  return 'stone';
}

export function emitGuardFootstepRipple(state, guard) {
  const isAlert = guard.state === 'ALERT' || guard.state === 'SEARCHING';
  state.ripples.push({
    x: guard.x,
    y: guard.y,
    radius: 8,
    maxRadius: isAlert ? 92 : 70,
    age: 0,
    duration: isAlert ? 0.82 : 0.92,
    kind: 'guard-step',
    color: isAlert ? '#ff6b6b' : guard.state === 'SUSPICIOUS' || guard.state === 'INVESTIGATING' ? '#ffaa44' : '#f2d388',
    throughWalls: true,
    rings: 2,
  });
}

export function emitPlayerNoiseRipple(state, x, y, surface, crouching) {
  if (crouching || surface === 'rug') return 0;

  let radius = 58;
  let color = '#6fffe9';
  if (surface === 'gravel') {
    radius = 162;
    color = '#ffd478';
  } else if (surface === 'timber') {
    radius = 148;
    color = '#ff9f68';
  }

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

export function emitChimeDistraction(state, x, y) {
  const lureRadius = 310;
  state.ripples.push({
    x,
    y,
    radius: 10,
    maxRadius: lureRadius,
    age: 0,
    duration: 1.45,
    kind: 'chime',
    color: '#6fffe9',
    accent: '#ffd86b',
    throughWalls: true,
    rings: 3,
  });
  return lureRadius;
}

export function propagateSoundToGuards(state, x, y, radius, kind, onGuardInvestigate) {
  if (radius <= 0) return null;

  let chosenGuard = null;
  let bestDist = Infinity;

  for (const guard of state.guards) {
    const dist = Math.hypot(guard.x - x, guard.y - y);
    if (dist > radius) continue;

    if (kind === 'chime') {
      if (guard.state !== 'ALERT' && dist < bestDist) {
        bestDist = dist;
        chosenGuard = guard;
      }
    } else if (kind === 'player-step') {
      if (guard.state !== 'ALERT' && dist < radius) {
        onGuardInvestigate(guard, x, y, 'footstep');
      }
    }
  }

  if (kind === 'chime' && chosenGuard) {
    onGuardInvestigate(chosenGuard, x, y, 'chime');
    return chosenGuard;
  }
  return null;
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
}
