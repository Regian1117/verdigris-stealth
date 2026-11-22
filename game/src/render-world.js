// Architectural 2.5D world rendering: shadow-vs-light masonry floors, varied stage cover
// silhouettes (stone benches, fern planters, bronze plinths, bookcases, canal gates), Key/Locked
// Relic vault seal, optional treasures, and swirling Smoke Veil clouds.

import { drawWorldOcrPill } from './render-lights.js';

export function renderFloorAndShadowHatch(ctx, state) {
  const { level, geometry, time } = state;
  const pal = level.palette;
  const { width: W, height: H } = geometry;
  const tile = 44;

  ctx.fillStyle = pal.floorBase;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = pal.floorAlt;
  for (let x = 24; x < W - 24; x += tile) {
    for (let y = 24; y < H - 24; y += tile) {
      if (((x / tile + y / tile) | 0) % 2 === 0) ctx.fillRect(x, y, Math.min(tile, W - 24 - x), Math.min(tile, H - 24 - y));
    }
  }
  ctx.strokeStyle = pal.floorJoint; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 24; x <= W - 24; x += tile) { ctx.moveTo(x, 24); ctx.lineTo(x, H - 24); }
  for (let y = 24; y <= H - 24; y += tile) { ctx.moveTo(24, y); ctx.lineTo(W - 24, y); }
  ctx.stroke();

  drawAcousticSurfaces(ctx, geometry, level.id);
  drawStageFloorProps(ctx, level.id, time);

  const hatch = getHatchPattern(ctx, pal.hatch);
  if (hatch) { ctx.save(); ctx.fillStyle = hatch; ctx.fillRect(24, 24, W - 48, H - 48); ctx.restore(); }
}

export function renderCoverArchitecture(ctx, state) {
  const { level, geometry, time } = state;
  const pal = level.palette;

  for (const obs of geometry.obstacles) if (obs.kind === 'water') drawWaterBasin(ctx, obs, time);
  if (level.id === 4) drawCanalBollards(ctx);

  const solids = geometry.obstacles.filter((o) => o.kind !== 'water').sort((a, b) => (a.y + a.h) - (b.y + b.h));
  for (const obs of solids) {
    const isPerim = obs.kind === 'perimeter';
    const lift = isPerim ? 6 : Math.round((obs.height || 14) * 0.62);
    const southH = isPerim ? 8 : Math.round((obs.height || 14) * 0.72);
    const ty = obs.y - lift;

    ctx.save();
    if (!isPerim) {
      ctx.fillStyle = 'rgba(0,0,0,0.64)';
      ctx.fillRect(obs.x + 8, obs.y + 9, obs.w + 2, obs.h + 6);
    }

    ctx.fillStyle = isPerim ? pal.wallSouth : obs.kind === 'bronzePlinth' ? '#384644' : obs.kind === 'stoneBench' ? '#5d574a' : pal.coverSouth;
    ctx.fillRect(obs.x, obs.y + obs.h - lift, obs.w, southH + lift);

    if (!isPerim) {
      ctx.strokeStyle = 'rgba(0,0,0,0.30)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let fx = obs.x + 14; fx < obs.x + obs.w - 8; fx += 16) { ctx.moveTo(fx, obs.y + obs.h - lift); ctx.lineTo(fx, obs.y + obs.h + southH); }
      ctx.stroke();
    }

    ctx.fillStyle = isPerim ? pal.wallTop : obs.kind === 'bronzePlinth' ? '#708c84' : obs.kind === 'stoneBench' ? '#cfc4ae' : pal.coverTop;
    ctx.fillRect(obs.x, ty, obs.w, obs.h);

    if (obs.kind === 'fernPlanter' || obs.kind === 'copperPillar' || obs.kind === 'copperWall') drawConservatoryPlanter(ctx, obs, ty);
    else if (obs.kind === 'stoneBench') drawStoneBench(ctx, obs, ty);
    else if (obs.kind === 'bronzePlinth') drawBronzePlinth(ctx, obs, ty);
    else if (obs.kind === 'bookcase') drawArchiveBookcase(ctx, obs, ty);
    else if (obs.kind === 'crate') {
      ctx.strokeStyle = '#5c3c1e'; ctx.lineWidth = 2.2; ctx.strokeRect(obs.x + 6, ty + 6, obs.w - 12, obs.h - 12);
      ctx.beginPath();
      ctx.moveTo(obs.x + 7, ty + 7); ctx.lineTo(obs.x + obs.w - 7, ty + obs.h - 7);
      ctx.moveTo(obs.x + obs.w - 7, ty + 7); ctx.lineTo(obs.x + 7, ty + obs.h - 7);
      ctx.stroke();
    } else if (obs.kind === 'bellMold') {
      const cx = obs.x + obs.w * 0.5; const cy = ty + obs.h * 0.5; const mr = Math.min(obs.w, obs.h) * 0.35;
      drawDot(ctx, cx, cy, mr, '#4e331b', '#fae0b0', 2.6);
      drawDot(ctx, cx, cy, mr * 0.48, '#ff8c3a');
      drawDot(ctx, cx, cy, mr * 0.22, '#ffe59c');
    } else if (!isPerim) {
      ctx.strokeStyle = 'rgba(84,70,50,0.42)'; ctx.lineWidth = 1.6;
      ctx.strokeRect(obs.x + 7, ty + 7, obs.w - 14, obs.h - 14);
    }

    ctx.strokeStyle = isPerim ? pal.wallRim : (pal.coverRim || pal.wallRim);
    ctx.lineWidth = isPerim ? 1.4 : 2.1; ctx.beginPath();
    ctx.moveTo(obs.x + 1.5, ty + obs.h - 1.5); ctx.lineTo(obs.x + 1.5, ty + 1.5); ctx.lineTo(obs.x + obs.w - 1.5, ty + 1.5);
    ctx.stroke();

    ctx.strokeStyle = '#05080c'; ctx.lineWidth = isPerim ? 1.8 : 2.4;
    ctx.strokeRect(obs.x, ty, obs.w, obs.h);
    ctx.strokeRect(obs.x, obs.y + obs.h - lift, obs.w, southH + lift);
    ctx.restore();
  }
}

export function renderRelicAndExitGate(ctx, state) {
  const { level, player, time } = state;

  if (level.keyItem && !player.hasKey) {
    const k = level.keyItem;
    ctx.save(); ctx.translate(k.x, k.y);
    const pr = 30 * (0.86 + Math.sin(time * 4.4) * 0.14);
    const halo = ctx.createRadialGradient(0, 0, 3, 0, 0, pr);
    halo.addColorStop(0, 'rgba(255,218,108,0.78)'); halo.addColorStop(1, 'rgba(255,218,108,0)');
    drawDot(ctx, 0, 0, pr, halo);
    drawDot(ctx, 0, 0, 15, '#141e28', '#ffd166', 2.2);
    ctx.strokeStyle = '#fff0b3'; ctx.lineWidth = 2.6; ctx.beginPath();
    ctx.arc(-4.5, 0, 4.5, 0, Math.PI * 2); ctx.moveTo(0, 0); ctx.lineTo(10, 0);
    ctx.moveTo(7, 0); ctx.lineTo(7, 4.5); ctx.moveTo(10, 0); ctx.lineTo(10, 4.5); ctx.stroke();
    if (state.status !== 'TITLE') drawWorldOcrPill(ctx, 0, -27, 'KEY', '#ffd166', '#091016', 11.5);
    ctx.restore();
  }

  for (const t of state.treasures || []) {
    if (t.collected) continue;
    ctx.save(); ctx.translate(t.x, t.y);
    const pr = 22 * (0.85 + Math.sin(time * 3.8 + t.x * 0.03) * 0.15);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, pr);
    glow.addColorStop(0, 'rgba(125,249,226,0.58)'); glow.addColorStop(1, 'rgba(125,249,226,0)');
    drawDot(ctx, 0, 0, pr, glow);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffe082'; ctx.strokeStyle = '#071016'; ctx.lineWidth = 2;
    ctx.fillRect(-7.5, -7.5, 15, 15); ctx.strokeRect(-7.5, -7.5, 15, 15);
    ctx.fillStyle = '#7df9e2'; ctx.fillRect(-3.8, -3.8, 7.6, 7.6);
    ctx.restore();
  }

  const relic = level.relic;
  const vaultLocked = Boolean(level.keyItem && !player.hasKey);
  ctx.save(); ctx.translate(relic.x, relic.y);
  ctx.fillStyle = '#141e28'; ctx.strokeStyle = player.hasRelic ? '#475966' : vaultLocked ? '#ff9e38' : '#ffe082';
  ctx.lineWidth = 2.6; ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 24, Math.sin(a) * 24);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();

  if (!player.hasRelic) {
    const pr = 44 * (0.85 + Math.sin(time * 4.2) * 0.15);
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, pr);
    halo.addColorStop(0, vaultLocked ? 'rgba(255,176,72,0.56)' : 'rgba(255,232,148,0.82)');
    halo.addColorStop(0.55, 'rgba(125,249,226,0.24)'); halo.addColorStop(1, 'rgba(125,249,226,0)');
    drawDot(ctx, 0, 0, pr, halo);

    ctx.save(); ctx.rotate(time * 0.85);
    drawDot(ctx, 0, 0, 12, null, '#7df9e2', 2.2);
    ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0.5, 0, Math.PI * 2); ctx.stroke();
    drawDot(ctx, 0, 0, 4.8, '#fff9e0');
    ctx.restore();

    if (vaultLocked) {
      drawDot(ctx, 0, 0, 28, null, '#ffb347', 2.6);
      ctx.setLineDash([5, 4]); drawDot(ctx, 0, 0, 33, null, 'rgba(255,196,86,0.82)', 1.8); ctx.setLineDash([]);
      ctx.fillStyle = '#0c141c'; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-8, -3, 16, 13, 3); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -3, 5, Math.PI, 0); ctx.stroke();
      drawDot(ctx, 0, 3, 2.2, '#ffd166');
    }
    if (state.status !== 'TITLE') {
      drawWorldOcrPill(ctx, 0, -38, vaultLocked ? 'LOCKED' : 'RELIC', vaultLocked ? '#ffaa44' : '#ffe082', '#091016', 11.5);
    }
  } else drawDot(ctx, 0, 0, 6, 'rgba(130,155,168,0.45)');
  ctx.restore();
}

export function renderSmokeVeils(ctx, state) {
  const clouds = state.geometry.smokeClouds || [];
  if (clouds.length === 0) return;
  const time = state.time;

  for (const sc of clouds) {
    const r = sc.currentRadius || sc.radius;
    const remain = Math.max(0, 1 - sc.age / sc.duration);
    const alpha = Math.min(1, remain * 2.2);
    ctx.save(); ctx.translate(sc.x, sc.y);

    const baseGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, r);
    baseGrad.addColorStop(0, `rgba(182,238,232,${0.76 * alpha})`);
    baseGrad.addColorStop(0.58, `rgba(116,198,194,${0.62 * alpha})`);
    baseGrad.addColorStop(1, `rgba(74,146,152,${0.22 * alpha})`);
    drawDot(ctx, 0, 0, r, baseGrad);

    for (let i = 0; i < 6; i++) {
      const a = time * 0.45 + (i / 6) * Math.PI * 2;
      const d = r * (0.28 + (i % 3) * 0.14);
      const px = Math.cos(a) * d; const py = Math.sin(a) * d; const pr = r * (0.34 + (i % 2) * 0.08);
      const puff = ctx.createRadialGradient(px, py, 2, px, py, pr);
      puff.addColorStop(0, 'rgba(226,250,248,0.42)'); puff.addColorStop(1, 'rgba(130,210,206,0)');
      drawDot(ctx, px, py, pr, puff);
    }

    ctx.setLineDash([7, 5]); drawDot(ctx, 0, 0, r, null, 'rgba(196,252,244,0.88)', 2.2); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(0, 0, r - 5, -Math.PI / 2, -Math.PI / 2 + remain * Math.PI * 2);
    ctx.strokeStyle = '#7df9e2'; ctx.lineWidth = 2.8; ctx.stroke();
    if (!sc.suppressLabel) drawWorldOcrPill(ctx, 0, 0, 'SMOKE VEIL', '#d6fff8', '#091016', 11.5);
    ctx.restore();
  }
}

let cachedHatchColor = null;
let cachedHatchPattern = null;

function drawDot(ctx, x, y, r, fill, stroke = null, lw = 1.5) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function getHatchPattern(ctx, color) {
  if (cachedHatchPattern && cachedHatchColor === color) return cachedHatchPattern;
  const tile = document.createElement('canvas'); tile.width = 14; tile.height = 14;
  const t = tile.getContext('2d'); t.strokeStyle = color; t.lineWidth = 1.45;
  t.beginPath(); t.moveTo(-2, 12); t.lineTo(12, -2); t.moveTo(4, 18); t.lineTo(18, 4); t.stroke();
  cachedHatchColor = color; cachedHatchPattern = ctx.createPattern(tile, 'repeat');
  return cachedHatchPattern;
}

function drawAcousticSurfaces(ctx, geometry, stageId) {
  for (const s of geometry.surfaces) {
    ctx.save();
    if (s.type === 'rug') {
      ctx.fillStyle = s.color || '#2c1e38'; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = s.trim || '#d1a858'; ctx.lineWidth = 2.2; ctx.strokeRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1; ctx.strokeRect(s.x + 11, s.y + 11, s.w - 22, s.h - 22);
      if (stageId === 3) {
        ctx.strokeStyle = '#f2cc76'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let fy = s.y + 8; fy < s.y + s.h - 6; fy += 9) {
          ctx.moveTo(s.x - 5, fy); ctx.lineTo(s.x, fy); ctx.moveTo(s.x + s.w, fy); ctx.lineTo(s.x + s.w + 5, fy);
        }
        ctx.stroke();
      }
    } else if (s.type === 'gravel') {
      ctx.fillStyle = 'rgba(198,210,206,0.14)'; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(214,228,224,0.24)'; ctx.lineWidth = 1.2; ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
      ctx.fillStyle = 'rgba(235,240,232,0.28)';
      for (let gx = s.x + 8; gx < s.x + s.w - 6; gx += 14) {
        for (let gy = s.y + 7; gy < s.y + s.h - 5; gy += 12) {
          ctx.fillRect(gx + ((gx * 37 + gy * 17) % 7) - 3, gy + ((gx * 13 + gy * 29) % 5) - 2, 2.2, 2.2);
        }
      }
    } else if (s.type === 'timber') {
      ctx.fillStyle = 'rgba(154,96,58,0.30)'; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(24,12,8,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let py = s.y + 14; py < s.y + s.h; py += 14) { ctx.moveTo(s.x, py); ctx.lineTo(s.x + s.w, py); }
      ctx.stroke(); ctx.strokeStyle = 'rgba(232,178,124,0.28)'; ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    }
    ctx.restore();
  }
}

function drawStageFloorProps(ctx, stageId, time) {
  ctx.save();
  if (stageId === 2) {
    ctx.strokeStyle = 'rgba(216,192,142,0.18)'; ctx.lineWidth = 2; ctx.strokeRect(56, 56, 1008, 548);
    ctx.strokeStyle = 'rgba(104,206,178,0.16)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(560, 330, 128, 0, Math.PI * 2); ctx.stroke();
    for (const [mx, my, mr] of [[152, 168, 22], [352, 488, 26], [768, 174, 24], [912, 548, 28], [468, 194, 18]]) {
      const m = ctx.createRadialGradient(mx, my, 2, mx, my, mr);
      m.addColorStop(0, 'rgba(64,174,132,0.28)'); m.addColorStop(1, 'rgba(34,112,86,0)');
      drawDot(ctx, mx, my, mr, m);
    }
    for (const [bx, by] of [[46, 46], [1030, 576], [46, 576]]) {
      ctx.fillStyle = '#153a32'; ctx.strokeStyle = '#c4a672'; ctx.lineWidth = 2;
      ctx.fillRect(bx, by, 44, 44); ctx.strokeRect(bx, by, 44, 44);
      drawLeafRosette(ctx, bx + 22, by + 22, 13);
    }
  } else if (stageId === 5) {
    const pulse = 0.55 + Math.sin(time * 3.6) * 0.2;
    for (const gx of [446, 642]) {
      ctx.fillStyle = `rgba(255,108,42,${0.42 * pulse})`; ctx.fillRect(gx, 294, 54, 72);
      ctx.strokeStyle = '#33241c'; ctx.lineWidth = 3; ctx.strokeRect(gx, 294, 54, 72); ctx.beginPath();
      for (let x = gx + 9; x < gx + 54; x += 9) { ctx.moveTo(x, 294); ctx.lineTo(x, 366); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawStoneBench(ctx, obs, ty) {
  ctx.fillStyle = '#9b917c'; ctx.fillRect(obs.x + 12, ty + 8, obs.w - 24, obs.h - 16);
  ctx.strokeStyle = '#4e483c'; ctx.lineWidth = 1.8; ctx.strokeRect(obs.x + 12, ty + 8, obs.w - 24, obs.h - 16);
  ctx.fillStyle = '#e8dfc9'; ctx.strokeStyle = '#5a5141'; ctx.lineWidth = 1.4;
  for (const sx of [obs.x + 3, obs.x + obs.w - 14]) { ctx.fillRect(sx, ty + 4, 11, obs.h - 8); ctx.strokeRect(sx, ty + 4, 11, obs.h - 8); }
  drawDot(ctx, obs.x + 18, ty + 11, 5.5, 'rgba(68,184,136,0.68)');
  drawDot(ctx, obs.x + 24, ty + 14, 3.8, 'rgba(104,218,168,0.64)');
}

function drawBronzePlinth(ctx, obs, ty) {
  const cx = obs.x + obs.w * 0.5; const cy = ty + obs.h * 0.5; const r = Math.min(obs.w, obs.h) * 0.37;
  ctx.fillStyle = '#253c3b'; ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5));
  }
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#d4b472'; ctx.lineWidth = 2; ctx.stroke();
  drawDot(ctx, cx, cy, r * 0.64, '#3c6e66', '#98e8d4', 1.8);
  drawDot(ctx, cx, cy, r * 0.24, '#f0d28c');
}

function drawConservatoryPlanter(ctx, obs, ty) {
  ctx.strokeStyle = '#5c462e'; ctx.lineWidth = 2; ctx.strokeRect(obs.x + 5, ty + 5, obs.w - 10, obs.h - 10);
  ctx.fillStyle = '#184239'; ctx.fillRect(obs.x + 10, ty + 10, obs.w - 20, obs.h - 20);
  ctx.strokeStyle = '#6ad4b8'; ctx.lineWidth = 1.4; ctx.strokeRect(obs.x + 10, ty + 10, obs.w - 20, obs.h - 20);
  const cx = obs.x + obs.w * 0.5;
  if (obs.h > obs.w + 18) { drawLeafRosette(ctx, cx, ty + obs.h * 0.28, 16); drawLeafRosette(ctx, cx, ty + obs.h * 0.72, 16); }
  else drawLeafRosette(ctx, cx, ty + obs.h * 0.5, 17);
  ctx.fillStyle = '#f2d394';
  for (const [rx, ry] of [[7, 7], [obs.w - 11, 7], [7, obs.h - 11], [obs.w - 11, obs.h - 11]]) ctx.fillRect(obs.x + rx, ty + ry, 4, 4);
}

function drawLeafRosette(ctx, cx, cy, rad) {
  ctx.save(); ctx.translate(cx, cy);
  for (let i = 0; i < 6; i++) {
    ctx.save(); ctx.rotate((i / 6) * Math.PI * 2 + 0.3);
    ctx.fillStyle = i % 2 === 0 ? '#3fb58b' : '#6be0b6';
    ctx.beginPath(); ctx.ellipse(rad * 0.52, 0, rad * 0.52, rad * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  drawDot(ctx, 0, 0, 3.2, '#f0d794'); ctx.restore();
}

function drawArchiveBookcase(ctx, obs, ty) {
  ctx.fillStyle = '#5e1f29'; ctx.fillRect(obs.x + 5, ty + 5, obs.w - 10, obs.h - 10);
  ctx.strokeStyle = '#f8d284'; ctx.lineWidth = 2; ctx.strokeRect(obs.x + 5, ty + 5, obs.w - 10, obs.h - 10);
  const cols = ['#c93b46', '#e6b865', '#347d6b', '#d97f54', '#f2dfc2'];
  if (obs.w > obs.h) {
    for (let bx = obs.x + 10, i = 0; bx < obs.x + obs.w - 16; bx += 9, i++) {
      ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(bx, ty + 11, 7, obs.h - 22);
      ctx.fillStyle = 'rgba(255,240,198,0.55)'; ctx.fillRect(bx + 1, ty + obs.h * 0.45, 5, 2);
    }
  } else {
    for (let by = ty + 10, i = 0; by < ty + obs.h - 16; by += 9, i++) {
      ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(obs.x + 11, by, obs.w - 22, 7);
      ctx.fillStyle = 'rgba(255,240,198,0.55)'; ctx.fillRect(obs.x + obs.w * 0.45, by + 1, 2, 5);
    }
  }
}

function drawCanalBollards(ctx) {
  ctx.save();
  for (const by of [134, 266, 410, 540]) {
    for (const bx of [442, 630]) {
      drawDot(ctx, bx + 2, by + 3, 8, 'rgba(0,0,0,0.48)');
      drawDot(ctx, bx, by, 7, '#475c6c', '#d4e8f5', 1.6);
      drawDot(ctx, bx, by, 3, '#e6c281');
    }
  }
  ctx.restore();
}

function drawWaterBasin(ctx, obs, time) {
  ctx.save();
  ctx.fillStyle = '#072438'; ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  const topG = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + 18);
  topG.addColorStop(0, 'rgba(0,0,0,0.55)'); topG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topG; ctx.fillRect(obs.x, obs.y, obs.w, 18);

  ctx.strokeStyle = 'rgba(104,232,255,0.34)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let wy = obs.y + 18; wy < obs.y + obs.h - 10; wy += 20) {
    const ws = Math.sin(time * 1.6 + wy * 0.08) * 8;
    ctx.moveTo(obs.x + 14 + ws, wy); ctx.lineTo(obs.x + obs.w * 0.45 + ws, wy);
    ctx.moveTo(obs.x + obs.w * 0.58 - ws * 0.7, wy + 7); ctx.lineTo(obs.x + obs.w - 16 - ws * 0.7, wy + 7);
  }
  ctx.stroke();

  const mx = obs.x + obs.w * 0.5; const gy = obs.y + obs.h * 0.5;
  ctx.strokeStyle = '#99b8cc'; ctx.lineWidth = 5; ctx.beginPath();
  ctx.moveTo(obs.x + 3, gy - 12); ctx.lineTo(mx, gy + 6); ctx.lineTo(obs.x + obs.w - 3, gy - 12); ctx.stroke();
  ctx.strokeStyle = '#d8f3ff'; ctx.lineWidth = 1.4; ctx.beginPath();
  ctx.moveTo(obs.x + 5, gy - 13); ctx.lineTo(mx, gy + 4); ctx.lineTo(obs.x + obs.w - 5, gy - 13); ctx.stroke();
  ctx.strokeStyle = '#7ba7c2'; ctx.lineWidth = 2.5; ctx.strokeRect(obs.x + 1, obs.y + 1, obs.w - 2, obs.h - 2);
  ctx.restore();
}
