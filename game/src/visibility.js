// Exact 2D raycast visibility engine for cover-occluded guard vision cones,
// dynamic point-light shadow polygons, and line-of-sight checks.

const RAY_EPS = 0.00045;
const TWO_PI = Math.PI * 2;

export function normalizeAngle(angle) {
  let a = angle % TWO_PI;
  if (a > Math.PI) a -= TWO_PI;
  if (a < -Math.PI) a += TWO_PI;
  return a;
}

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

function castRay(ox, oy, angle, maxDist, segments) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (let i = 0; i < segments.length; i++) {
    const hit = intersectRaySegment(ox, oy, dx, dy, best, segments[i]);
    if (hit < best) best = hit;
  }
  return {
    x: ox + dx * best,
    y: oy + dy * best,
    dist: best,
    angle,
  };
}

export function hasLineOfSight(ax, ay, bx, by, segments) {
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
  return true;
}

export function computeVisionConePolygon(ox, oy, facing, halfFov, range, geometry) {
  const segments = geometry.occluderSegments;
  const corners = geometry.occluderCorners;
  const rangePad = range + 12;
  const offsets = [];

  const arcSteps = 26;
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

  offsets.sort((a, b) => a - b);

  const pts = [{ x: ox, y: oy }];
  let lastOffset = -999;
  for (let i = 0; i < offsets.length; i++) {
    const off = Math.max(-halfFov, Math.min(halfFov, offsets[i]));
    if (off - lastOffset < 1e-5) continue;
    lastOffset = off;
    const hit = castRay(ox, oy, facing + off, range, segments);
    pts.push({ x: hit.x, y: hit.y, dist: hit.dist, hitCover: hit.dist < range - 1 });
  }
  return pts;
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
    const hit = castRay(ox, oy, a, radius, segments);
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

  const clear = hasLineOfSight(ox, oy, px, py, geometry.occluderSegments);
  return {
    visible: clear,
    dist,
    angleRatio: delta / halfFov,
  };
}
