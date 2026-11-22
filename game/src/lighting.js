// Dynamic raycast light pools, rotating brass sentry lanterns, Smoke Veil concealment,
// shadow profile calculation, and interactive wall lamp snuffing with linked sentry shutoff.

import {
  computeLightShadowPolygon,
  computeVisionConePolygon,
  hasLineOfSight,
  isPointInSmokeCloud,
  isPointInVisionCone,
} from './visibility.js';

export function updateDynamicLights(geometry, dt, time) {
  // Advance active Smoke Veil clouds before computing sentry cones so beams clip cleanly
  const clouds = geometry.smokeClouds || [];
  for (let i = clouds.length - 1; i >= 0; i--) {
    const sc = clouds[i];
    sc.age += dt;
    const expand = Math.min(1, sc.age / 0.28);
    const fadeOut = sc.age > sc.duration - 0.85 ? Math.max(0.25, (sc.duration - sc.age) / 0.85) : 1;
    sc.currentRadius = sc.radius * (0.45 + 0.55 * expand) * fadeOut;
    if (sc.age >= sc.duration) clouds.splice(i, 1);
  }

  for (const light of geometry.lights) {
    if (!light.polygon) {
      light.polygon = computeLightShadowPolygon(light.x, light.y, light.radius, geometry);
    }
    if (light.lit) {
      const pulse = Math.sin(time * 3.2 + light.flickerPhase) * 0.03
        + Math.sin(time * 7.1 + light.flickerPhase * 1.7) * 0.015;
      light.currentRadius = light.radius * (1 + pulse);
    } else {
      light.currentRadius = 0;
      if (light.snuffSmoke > 0) {
        light.snuffSmoke = Math.max(0, light.snuffSmoke - dt * 0.45);
      }
    }
  }

  for (const sentry of geometry.sentries || []) {
    if (sentry.active) {
      sentry.angle = sentry.baseAngle + Math.sin(time * sentry.sweepSpeed + sentry.phase) * sentry.sweepArc;
      sentry.polygon = computeVisionConePolygon(
        sentry.x, sentry.y, sentry.angle, sentry.halfFov, sentry.range, geometry,
      );
    } else {
      sentry.polygon = null;
      if (sentry.snuffSmoke > 0) {
        sentry.snuffSmoke = Math.max(0, sentry.snuffSmoke - dt * 0.45);
      }
    }
  }
}

export function toggleWallLamp(light, geometry) {
  if (!light || !light.snuffable || !light.lit) return false;
  light.lit = false;
  light.snuffSmoke = 1.0;

  if (geometry && geometry.sentries) {
    for (const sentry of geometry.sentries) {
      if (sentry.active && sentry.linkedLightId === light.id) {
        sentry.active = false;
        sentry.snuffSmoke = 1.0;
        sentry.polygon = null;
      }
    }
  }
  return true;
}

export function computePlayerVisibility(player, geometry) {
  const inSmoke = isPointInSmokeCloud(player.x, player.y, geometry.smokeClouds);
  const lightLevel = inSmoke ? 0.04 : getIlluminationAtPoint(player.x, player.y, geometry);
  const inSentryBeam = !inSmoke && isPointInSentryBeam(player.x, player.y, geometry);
  const inShadow = inSmoke || (!inSentryBeam && lightLevel < 0.24);

  let nearCover = false;
  for (const obs of geometry.sightObstacles) {
    if (obs.kind === 'perimeter') continue;
    const cx = Math.max(obs.x, Math.min(player.x, obs.x + obs.w));
    const cy = Math.max(obs.y, Math.min(player.y, obs.y + obs.h));
    if (Math.hypot(player.x - cx, player.y - cy) < player.radius + 20) {
      nearCover = true;
      break;
    }
  }

  let profile = 0.22 + lightLevel * 0.85;
  if (inSentryBeam) profile = 1.25;
  if (player.crouching) profile *= 0.62;
  if (nearCover && inShadow) profile *= 0.68;
  if (inSmoke) profile *= 0.45;
  if (player.dashTimer > 0) profile *= 0.5;

  const visibilityFactor = Math.max(0.12, Math.min(1.25, profile));
  const hidden = inSmoke || (inShadow && (player.crouching || nearCover || lightLevel < 0.08));
  const label = inSmoke ? 'SMOKE' : inSentryBeam ? 'EXPOSED' : hidden ? 'SHADOW' : 'LIT';
  player.inSmoke = inSmoke;

  return {
    lightLevel,
    inShadow,
    inSmoke,
    inSentryBeam,
    nearCover,
    hidden,
    visibilityFactor,
    label,
  };
}

export function getIlluminationAtPoint(px, py, geometry) {
  let maxIllum = 0;
  for (const light of geometry.lights) {
    if (!light.lit) continue;
    const dx = px - light.x;
    const dy = py - light.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= light.radius) continue;
    if (!hasLineOfSight(light.x, light.y, px, py, geometry.occluderSegments)) continue;
    const falloff = 1 - dist / light.radius;
    const strength = Math.pow(falloff, 0.72);
    if (strength > maxIllum) maxIllum = strength;
  }
  if (isPointInSentryBeam(px, py, geometry)) {
    maxIllum = Math.max(maxIllum, 0.94);
  }
  return maxIllum;
}

export function isPointInSentryBeam(px, py, geometry) {
  for (const sentry of geometry.sentries || []) {
    if (!sentry.active) continue;
    const check = isPointInVisionCone(
      px, py, sentry.x, sentry.y, sentry.angle, sentry.halfFov, sentry.range, geometry,
    );
    if (check.visible) return true;
  }
  return false;
}

export function isPointInSafeShadow(px, py, geometry) {
  return isPointInSmokeCloud(px, py, geometry.smokeClouds) || getIlluminationAtPoint(px, py, geometry) < 0.24;
}
