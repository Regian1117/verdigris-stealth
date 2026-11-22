// Exact 2D raycast visibility engine for cover- and Smoke-Veil-occluded guard vision cones,
// rotating brass sentry beams, dynamic light shadow polygons, and line-of-sight checks.

export function computeVisionConePolygon(ox, oy, facing, halfFov, range, geometry) {
  const segments = geometry.occluderSegments;
  const corners = geometry.occluderCorners;
  const smokeClouds = geometry.smokeClouds || [];
  const rangePad = range + 12;
  const offsets = [];

  const arcSteps = 28;
  for (let i = 0; i <= arcSteps; i++) {
    offsets.push(-halfFov + (i / arcSteps) * (halfFov * 2));
  }

  for (let i = 0; i < corners.length; i++) {
    const c = corners[i];
    const dx = c.x - ox;
    const dy = c.y - oy;
    if (dx * dx + dy * dy > rangePad * rangePad) continue;
    const delta = normalizeAngle(Math.atan2(dy, dx) - facing);
    if (delta > -halfFov && delta < halfFov) {
      offsets.push(delta - RAY_EPS, delta, delta + RAY_EPS);
    }
  }

  // Add dense tangent & silhouette sample rays for active Smoke Veil circles so cones slice cleanly
  for (let i = 0; i < smokeClouds.length; i++) {
    const sc = smokeClouds[i];
    const r = sc.currentRadius || sc.radius;
    const dx = sc.x - ox;
    const dy = sc.y - oy;
    const dist = Math.hypot(dx, dy);
    if (dist - r > rangePad) continue;
    const centerDelta = normalizeAngle(Math.atan2(dy, dx) - facing);
    const spread = dist <= r + 1 ? halfFov : Math.asin(Math.min(0.995, r / dist));
    const samples = 14;
    for (let k = 0; k <= samples; k++) {
      const off = centerDelta - spread + (k / samples) * spread * 2;
      if (off > -halfFov && off < halfFov) offsets.push(off);
    }
    for (const edge of [centerDelta - spread, centerDelta + spread]) {
      if (edge > -halfFov && edge < halfFov) {
        offsets.push(edge - RAY_EPS, edge, edge + RAY_EPS);
      }
    }
  }

  offsets.sort((a, b) => a - b);

  const pts = [{ x: ox, y: oy }];
  let lastOffset = -999;
  for (let i = 0; i < offsets.length; i++) {
    const off = Math.max(-halfFov, Math.min(halfFov, offsets[i]));
    if (off - lastOffset < 1e-5) continue;
    lastOffset = off;
    const hit = castRay(ox, oy, facing + off, range, segments, smokeClouds);
    pts.push({ x: hit.x, y: hit.y, dist: hit.dist, hitCover: hit.dist < range - 1 });
  }
  return pts;
}

export function hasLineOfSight(ax, ay, bx, by, segments, smokeClouds = null) {
  const vx = bx - ax;
  const vy = by - ay;
  const dist = Math.hypot(vx, vy);
  if (dist < 1e-4) return true;
  const dx = vx / dist;
  const dy = vy / dist;
  const limit = dist - 0.5;
  for (let i = 0; i < segments.length; i++) {
    const hit = intersectRaySegment(ax, ay, dx, dy, limit, segments[i]);
    if (hit < limit) return false;
  }
  if (smokeClouds && smokeClouds.length > 0) {
    for (let i = 0; i < smokeClouds.length; i++) {
      const sc = smokeClouds[i];
      const hit = intersectRayCircle(ax, ay, dx, dy, limit, sc.x, sc.y, sc.currentRadius || sc.radius);
      if (hit < limit) return false;
    }
  }
  return true;
}

export function computeLightShadowPolygon(ox, oy, radius, geometry) {
  const segments = geometry.occluderSegments;
  const corners = geometry.occluderCorners;
  const radPad = radius + 14;
  const angles = [];

  const ringSteps = 44;
  for (let i = 0; i < ringSteps; i++) {
    angles.push(-Math.PI + (i / ringSteps) * TWO_PI);
  }

  for (let i = 0; i < corners.length; i++) {
    const c = corners[i];
    const dx = c.x - ox;
    const dy = c.y - oy;
    if (dx * dx + dy * dy > radPad * radPad) continue;
    const a = Math.atan2(dy, dx);
    angles.push(normalizeAngle(a - RAY_EPS), a, normalizeAngle(a + RAY_EPS));
  }

  angles.sort((a, b) => a - b);

  const pts = [];
  let lastA = -999;
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    if (a - lastA < 1e-5) continue;
    lastA = a;
    const hit = castRay(ox, oy, a, radius, segments, null);
    pts.push({ x: hit.x, y: hit.y });
  }
  return pts;
}

export function isPointInVisionCone(px, py, ox, oy, facing, halfFov, range, geometry) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return { visible: false, dist, angleRatio: 1 };
  if (dist < 14) return { visible: true, dist, angleRatio: 0 };

  const delta = Math.abs(normalizeAngle(Math.atan2(dy, dx) - facing));
  if (delta > halfFov) return { visible: false, dist, angleRatio: delta / halfFov };

  const smokeClouds = geometry.smokeClouds || [];
  if (isPointInSmokeCloud(px, py, smokeClouds)) {
    return { visible: false, dist, angleRatio: delta / halfFov };
  }

  const clear = hasLineOfSight(ox, oy, px, py, geometry.occluderSegments, smokeClouds);
  return {
    visible: clear,
    dist,
    angleRatio: delta / halfFov,
  };
}

export function isPointInSmokeCloud(px, py, smokeClouds) {
  if (!smokeClouds || smokeClouds.length === 0) return false;
  for (let i = 0; i < smokeClouds.length; i++) {
    const sc = smokeClouds[i];
    const r = sc.currentRadius || sc.radius;
    const dx = px - sc.x;
    const dy = py - sc.y;
    if (dx * dx + dy * dy <= r * r) return true;
  }
  return false;
}

export function normalizeAngle(angle) {
  let a = angle % TWO_PI;
  if (a > Math.PI) a -= TWO_PI;
  if (a < -Math.PI) a += TWO_PI;
  return a;
}

const RAY_EPS = 0.00045;
const TWO_PI = Math.PI * 2;

function intersectRaySegment(ox, oy, dx, dy, maxDist, seg) {
  const sx = seg.bx - seg.ax;
  const sy = seg.by - seg.ay;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-9) return maxDist;

  const qpx = seg.ax - ox;
  const qpy = seg.ay - oy;
  const t = (qpx * sy - qpy * sx) / denom;
  if (t < 0 || t >= maxDist) return maxDist;

  const u = (qpx * dy - qpy * dx) / denom;
  if (u < -1e-6 || u > 1 + 1e-6) return maxDist;
  return t;
}

function intersectRayCircle(ox, oy, dx, dy, maxDist, cx, cy, r) {
  const fx = ox - cx;
  const fy = oy - cy;
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return Math.min(maxDist, 18);
  const b = fx * dx + fy * dy;
  if (b > 0) return maxDist;
  const disc = b * b - c;
  if (disc < 0) return maxDist;
  const t = -b - Math.sqrt(disc);
  return t >= 0 && t < maxDist ? t : maxDist;
}

function castRay(ox, oy, angle, maxDist, segments, smokeClouds) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (let i = 0; i < segments.length; i++) {
    const hit = intersectRaySegment(ox, oy, dx, dy, best, segments[i]);
    if (hit < best) best = hit;
  }
  if (smokeClouds && smokeClouds.length > 0) {
    for (let i = 0; i < smokeClouds.length; i++) {
      const sc = smokeClouds[i];
      const hit = intersectRayCircle(ox, oy, dx, dy, best, sc.x, sc.y, sc.currentRadius || sc.radius);
      if (hit < best) best = hit;
    }
  }
  return {
    x: ox + dx * best,
    y: oy + dy * best,
    dist: best,
    angle,
  };
}
