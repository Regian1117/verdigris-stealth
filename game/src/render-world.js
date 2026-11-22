// Architectural 2.5D world rendering: shadow-vs-light masonry floors, per-stage storytelling props
// (botanical planters, archive book spines, canal lock gates/bollards, ember grates), dynamic lights,
// rotating brass sentries, Keys/Loot/Relics/Exits, and swirling Smoke Veil clouds.

export function renderFloorAndShadowHatch(ctx, state) {
  const { level, geometry, time } = state;
  const pal = level.palette;
  const W = geometry.width;
  const H = geometry.height;

  ctx.fillStyle = pal.floorBase;
  ctx.fillRect(0, 0, W, H);

  const tile = 44;
  ctx.fillStyle = pal.floorAlt;
  for (let x = 24; x < W - 24; x += tile) {
    for (let y = 24; y < H - 24; y += tile) {
      if (((x / tile + y / tile) | 0) % 2 === 0) {
        ctx.fillRect(x, y, Math.min(tile, W - 24 - x), Math.min(tile, H - 24 - y));
      }
    }
  }

  ctx.strokeStyle = pal.floorJoint;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 24; x <= W - 24; x += tile) { ctx.moveTo(x, 24); ctx.lineTo(x, H - 24); }
  for (let y = 24; y <= H - 24; y += tile) { ctx.moveTo(24, y); ctx.lineTo(W - 24, y); }
  ctx.stroke();

  drawAcousticSurfaces(ctx, geometry, level.id);
  drawStageFloorProps(ctx, level.id, time);

  const hatch = getHatchPattern(ctx, pal.hatch);
  if (hatch) {
    ctx.save();
    ctx.fillStyle = hatch;
    ctx.fillRect(24, 24, W - 48, H - 48);
    ctx.restore();
  }
}

export function renderCoverArchitecture(ctx, state) {
  const { level, geometry, time } = state;
  const pal = level.palette;

  for (const obs of geometry.obstacles) {
    if (obs.kind === 'water') drawWaterBasin(ctx, obs, time);
  }
  if (level.id === 4) drawCanalBollards(ctx);

  const solids = geometry.obstacles.filter((o) => o.kind !== 'water').sort((a, b) => (a.y + a.h) - (b.y + b.h));

  for (const obs of solids) {
    const isPerim = obs.kind === 'perimeter';
    const lift = isPerim ? 6 : Math.round((obs.height || 14) * 0.62);
    const southH = isPerim ? 8 : Math.round((obs.height || 14) * 0.72);
    const ty = obs.y - lift;

    ctx.save();
    if (!isPerim) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
      ctx.fillRect(obs.x + 7, obs.y + 8, obs.w, obs.h + 5);
    }

    ctx.fillStyle = isPerim ? pal.wallSouth : pal.coverSouth;
    ctx.fillRect(obs.x, obs.y + obs.h - lift, obs.w, southH + lift);

    if (!isPerim) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.30)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let fx = obs.x + 14; fx < obs.x + obs.w - 8; fx += 16) {
        ctx.moveTo(fx, obs.y + obs.h - lift);
        ctx.lineTo(fx, obs.y + obs.h + southH);
      }
      ctx.stroke();
    }

    ctx.fillStyle = isPerim ? pal.wallTop : pal.coverTop;
    ctx.fillRect(obs.x, ty, obs.w, obs.h);

    if (obs.kind === 'copperPillar' || obs.kind === 'copperWall') {
      drawConservatoryPlanter(ctx, obs, ty);
    } else if (obs.kind === 'bookcase') {
      drawArchiveBookcase(ctx, obs, ty);
    } else if (obs.kind === 'crate') {
      ctx.strokeStyle = '#5c3c1e';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(obs.x + 6, ty + 6, obs.w - 12, obs.h - 12);
      ctx.beginPath();
      ctx.moveTo(obs.x + 7, ty + 7); ctx.lineTo(obs.x + obs.w - 7, ty + obs.h - 7);
      ctx.moveTo(obs.x + obs.w - 7, ty + 7); ctx.lineTo(obs.x + 7, ty + obs.h - 7);
      ctx.stroke();
    } else if (obs.kind === 'bellMold') {
      const cx = obs.x + obs.w * 0.5;
      const cy = ty + obs.h * 0.5;
      const mr = Math.min(obs.w, obs.h) * 0.35;
      drawDot(ctx, cx, cy, mr, '#4e331b', '#fae0b0', 2.6);
      drawDot(ctx, cx, cy, mr * 0.48, '#ff8c3a');
      drawDot(ctx, cx, cy, mr * 0.22, '#ffe59c');
    } else if (!isPerim) {
      ctx.strokeStyle = 'rgba(84, 70, 50, 0.42)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(obs.x + 7, ty + 7, obs.w - 14, obs.h - 14);
    }

    ctx.strokeStyle = isPerim ? pal.wallRim : (pal.coverRim || pal.wallRim);
    ctx.lineWidth = isPerim ? 1.4 : 2.1;
    ctx.beginPath();
    ctx.moveTo(obs.x + 1.5, ty + obs.h - 1.5);
    ctx.lineTo(obs.x + 1.5, ty + 1.5);
    ctx.lineTo(obs.x + obs.w - 1.5, ty + 1.5);
    ctx.stroke();

    ctx.strokeStyle = '#05080c';
    ctx.lineWidth = isPerim ? 1.8 : 2.4;
    ctx.strokeRect(obs.x, ty, obs.w, obs.h);
    ctx.strokeRect(obs.x, obs.y + obs.h - lift, obs.w, southH + lift);
    ctx.restore();
  }
}

export function renderDynamicLightPools(ctx, state) {
  const { level, geometry, time } = state;
  const pal = level.palette;

  for (const light of geometry.lights) {
    if (!light.lit || !light.polygon || light.polygon.length < 3) continue;
    const rad = light.currentRadius || light.radius;

    ctx.save();
    tracePoly(ctx, light.polygon);
    ctx.clip();

    const floorReveal = ctx.createRadialGradient(light.x, light.y, 12, light.x, light.y, rad);
    floorReveal.addColorStop(0, pal.litFloor);
    floorReveal.addColorStop(0.72, pal.litFloor);
    floorReveal.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floorReveal;
    ctx.fillRect(light.x - rad, light.y - rad, rad * 2, rad * 2);

    const glow = ctx.createRadialGradient(light.x, light.y, 4, light.x, light.y, rad);
    glow.addColorStop(0, `${pal.lightCore}8e`);
    glow.addColorStop(0.42, `${pal.lightMid}48`);
    glow.addColorStop(0.84, `${pal.lightMid}18`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    drawDot(ctx, light.x, light.y, rad, glow);
    ctx.restore();
  }

  for (const sentry of geometry.sentries || []) {
    ctx.save();
    ctx.strokeStyle = sentry.active ? 'rgba(246,198,102,0.34)' : 'rgba(130,155,168,0.24)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(sentry.x, sentry.y);
    ctx.lineTo(sentry.switchX, sentry.switchY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (sentry.active && sentry.polygon && sentry.polygon.length >= 3) {
      ctx.save();
      tracePoly(ctx, sentry.polygon);
      const grad = ctx.createRadialGradient(sentry.x, sentry.y, 10, sentry.x, sentry.y, sentry.range);
      grad.addColorStop(0, 'rgba(255,224,118,0.64)');
      grad.addColorStop(0.48, 'rgba(255,178,56,0.35)');
      grad.addColorStop(1, 'rgba(255,152,36,0.08)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#ffbe47';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,240,178,0.28)';
      ctx.lineWidth = 1.1;
      for (let r = 68; r < sentry.range; r += 68) {
        ctx.beginPath();
        ctx.arc(sentry.x, sentry.y, r, sentry.angle - sentry.halfFov, sentry.angle + sentry.halfFov);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,246,200,0.62)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([6, 6]);
      const axisLen = Math.min(sentry.range * 0.72, 180);
      ctx.beginPath();
      ctx.moveTo(sentry.x, sentry.y);
      ctx.lineTo(sentry.x + Math.cos(sentry.angle) * axisLen, sentry.y + Math.sin(sentry.angle) * axisLen);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(sentry.x, sentry.y);
    ctx.rotate(sentry.angle);
    ctx.fillStyle = sentry.active ? '#c9933b' : '#4a555e';
    ctx.strokeStyle = '#080c10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, 20, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = sentry.active ? '#fff3b8' : '#262f36';
    ctx.beginPath();
    ctx.moveTo(10, -6); ctx.lineTo(15, 0); ctx.lineTo(10, 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    if (!sentry.active) drawWorldOcrPill(ctx, sentry.x - 36, sentry.y, 'SENTRY OFF', '#d8f3ff', '#091016', 10);
  }

  for (const light of geometry.lights) {
    ctx.save();
    const isBrazier = light.kind === 'brazier';
    const r = isBrazier ? 13 : 8;
    drawDot(ctx, light.x, light.y, r + 3, '#18141c', light.lit ? '#f2c86b' : '#738996', 1.9);

    if (light.lit) {
      const flicker = 1 + Math.sin(time * 9 + light.flickerPhase) * 0.1;
      const coreGrad = ctx.createRadialGradient(light.x, light.y, 1, light.x, light.y, r * 2.3 * flicker);
      coreGrad.addColorStop(0, '#fff9df');
      coreGrad.addColorStop(0.45, pal.lightCore);
      coreGrad.addColorStop(1, 'rgba(255,190,80,0)');
      drawDot(ctx, light.x, light.y, r * 2.3 * flicker, coreGrad);
      drawDot(ctx, light.x, light.y, isBrazier ? 6 : 4, '#fffbe8');

      if (light.snuffable) {
        ctx.setLineDash([3, 4]);
        drawDot(ctx, light.x, light.y, r + 7, null, 'rgba(255,228,138,0.62)', 1.3);
        ctx.setLineDash([]);
      }
    } else {
      drawDot(ctx, light.x, light.y, 4.5, '#2a333c');
      const smokeAlpha = Math.max(0.42, light.snuffSmoke * 0.88);
      for (let i = 0; i < 4; i++) {
        const phase = (time * 0.8 + i * 0.25) % 1;
        const sx = light.x + Math.sin(time * 2.4 + i * 1.9) * (4 + phase * 7);
        drawDot(ctx, sx, light.y - 7 - phase * 26, 3.8 + phase * 5.4, `rgba(204,234,246,${(1 - phase) * smokeAlpha})`);
      }
      drawWorldOcrPill(ctx, light.x, light.y + 24, 'SNUFFED', '#d8f3ff', '#091016', 12.5);
    }
    ctx.restore();
  }
}

export function renderRelicAndExitGate(ctx, state) {
  const { level, player, time } = state;

  if (level.keyItem && !player.hasKey) {
    const k = level.keyItem;
    ctx.save();
    ctx.translate(k.x, k.y);
    const pr = 30 * (0.86 + Math.sin(time * 4.4) * 0.14);
    const halo = ctx.createRadialGradient(0, 0, 3, 0, 0, pr);
    halo.addColorStop(0, 'rgba(255,218,108,0.78)');
    halo.addColorStop(1, 'rgba(255,218,108,0)');
    drawDot(ctx, 0, 0, pr, halo);
    drawDot(ctx, 0, 0, 15, '#141e28', '#ffd166', 2.2);

    ctx.strokeStyle = '#fff0b3';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(-4.5, 0, 4.5, 0, Math.PI * 2);
    ctx.moveTo(0, 0); ctx.lineTo(10, 0);
    ctx.moveTo(7, 0); ctx.lineTo(7, 4.5);
    ctx.moveTo(10, 0); ctx.lineTo(10, 4.5);
    ctx.stroke();

    if (state.status !== 'TITLE') drawWorldOcrPill(ctx, 0, -27, 'KEY', '#ffd166', '#091016', 11);
    ctx.restore();
  }

  for (const t of state.treasures || []) {
    if (t.collected) continue;
    ctx.save();
    ctx.translate(t.x, t.y);
    const pr = 24 * (0.85 + Math.sin(time * 3.8 + t.x * 0.03) * 0.15);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, pr);
    glow.addColorStop(0, 'rgba(125,249,226,0.56)');
    glow.addColorStop(1, 'rgba(125,249,226,0)');
    drawDot(ctx, 0, 0, pr, glow);

    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffe082'; ctx.strokeStyle = '#071016'; ctx.lineWidth = 2;
    ctx.fillRect(-7.5, -7.5, 15, 15); ctx.strokeRect(-7.5, -7.5, 15, 15);
    ctx.fillStyle = '#7df9e2'; ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.rotate(-Math.PI / 4);

    if (state.status !== 'TITLE') drawWorldOcrPill(ctx, 0, -24, 'LOOT', '#b8fff0', '#091016', 10);
    ctx.restore();
  }

  const relic = level.relic;
  const vaultLocked = Boolean(level.keyItem && !player.hasKey);
  ctx.save();
  ctx.translate(relic.x, relic.y);
  ctx.fillStyle = '#18222c';
  ctx.strokeStyle = player.hasRelic ? '#475966' : vaultLocked ? '#ffaa44' : '#ffe082';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 23, Math.sin(a) * 23);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();

  if (!player.hasRelic) {
    const pr = 44 * (0.85 + Math.sin(time * 4.2) * 0.15);
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, pr);
    halo.addColorStop(0, 'rgba(255,232,148,0.78)');
    halo.addColorStop(0.55, 'rgba(125,249,226,0.28)');
    halo.addColorStop(1, 'rgba(125,249,226,0)');
    drawDot(ctx, 0, 0, pr, halo);

    ctx.save();
    ctx.rotate(time * 0.85);
    drawDot(ctx, 0, 0, 12, null, '#7df9e2', 2.2);
    ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0.5, 0, Math.PI * 2); ctx.stroke();
    drawDot(ctx, 0, 0, 4.8, '#fff9e0');
    ctx.restore();

    if (vaultLocked) {
      ctx.setLineDash([4, 4]);
      drawDot(ctx, 0, 0, 27, null, 'rgba(255,196,86,0.78)', 1.8);
      ctx.setLineDash([]);
    }
    if (state.status !== 'TITLE') drawWorldOcrPill(ctx, 0, -36, 'RELIC', '#ffe082', '#091016', 11.5);
  } else {
    drawDot(ctx, 0, 0, 6, 'rgba(130,155,168,0.45)');
  }
  ctx.restore();

  const exit = level.exit;
  ctx.save();
  ctx.translate(exit.x, exit.y);
  const unlocked = player.hasRelic;
  if (unlocked) {
    const gr = exit.radius * 2.35 * (0.88 + Math.sin(time * 4.5) * 0.12);
    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, gr);
    glow.addColorStop(0, 'rgba(107,255,184,0.90)');
    glow.addColorStop(0.45, 'rgba(46,230,166,0.38)');
    glow.addColorStop(1, 'rgba(46,230,166,0)');
    drawDot(ctx, 0, 0, gr, glow);
  }

  ctx.fillStyle = unlocked ? '#6bffb8' : '#538a7c';
  ctx.strokeStyle = '#071014'; ctx.lineWidth = 1.8;
  ctx.fillRect(-exit.radius - 5, -10, 8, 20); ctx.strokeRect(-exit.radius - 5, -10, 8, 20);
  ctx.fillRect(exit.radius - 3, -10, 8, 20); ctx.strokeRect(exit.radius - 3, -10, 8, 20);

  ctx.setLineDash(unlocked ? [] : [6, 5]);
  drawDot(ctx, 0, 0, exit.radius, unlocked ? 'rgba(14,92,68,0.86)' : 'rgba(14,34,38,0.76)', unlocked ? '#6bffb8' : '#73bfa9', unlocked ? 3.5 : 2.3);
  ctx.setLineDash([]);

  ctx.strokeStyle = unlocked ? '#dcfff0' : '#8fd1bf';
  ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(0, -6); ctx.lineTo(8, 4); ctx.stroke();

  drawWorldOcrPill(ctx, 0, -exit.radius - 15, unlocked ? 'EXIT · OPEN' : 'EXIT', unlocked ? '#6bffb8' : '#cdeae1', '#091016', unlocked ? 13.5 : 11.5);
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
    ctx.save();
    ctx.translate(sc.x, sc.y);

    const baseGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, r);
    baseGrad.addColorStop(0, `rgba(182,238,232,${0.74 * alpha})`);
    baseGrad.addColorStop(0.58, `rgba(116,198,194,${0.60 * alpha})`);
    baseGrad.addColorStop(1, `rgba(74,146,152,${0.22 * alpha})`);
    drawDot(ctx, 0, 0, r, baseGrad);

    for (let i = 0; i < 7; i++) {
      const a = time * 0.45 + (i / 7) * Math.PI * 2;
      const dist = r * (0.28 + (i % 3) * 0.14);
      const px = Math.cos(a) * dist;
      const py = Math.sin(a) * dist;
      const pr = r * (0.34 + (i % 2) * 0.08);
      const puff = ctx.createRadialGradient(px, py, 2, px, py, pr);
      puff.addColorStop(0, 'rgba(226,250,248,0.42)');
      puff.addColorStop(1, 'rgba(130,210,206,0)');
      drawDot(ctx, px, py, pr, puff);
    }

    ctx.setLineDash([7, 5]);
    drawDot(ctx, 0, 0, r, null, 'rgba(196,252,244,0.85)', 2.2);
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(0, 0, r - 5, -Math.PI / 2, -Math.PI / 2 + remain * Math.PI * 2);
    ctx.strokeStyle = '#7df9e2'; ctx.lineWidth = 2.8; ctx.stroke();

    drawWorldOcrPill(ctx, 0, 0, 'SMOKE VEIL', '#d6fff8', '#091016', 11.5);
    ctx.restore();
  }
}

let cachedHatchColor = null;
let cachedHatchPattern = null;

function drawDot(ctx, x, y, r, fill, stroke = null, lw = 1.5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function tracePoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function drawWorldOcrPill(ctx, cx, cy, text, bgFill, inkColor, fontSize = 11.5) {
  ctx.save();
  ctx.font = `900 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width + 14;
  const th = fontSize + 8;
  ctx.fillStyle = bgFill; ctx.strokeStyle = '#070c12'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(cx - tw / 2, cy - th / 2, tw, th, 5);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = inkColor; ctx.fillText(text, cx, cy + 0.5);
  ctx.restore();
}

function getHatchPattern(ctx, color) {
  if (cachedHatchPattern && cachedHatchColor === color) return cachedHatchPattern;
  const tile = document.createElement('canvas');
  tile.width = 14; tile.height = 14;
  const t = tile.getContext('2d');
  t.strokeStyle = color; t.lineWidth = 1.45;
  t.beginPath(); t.moveTo(-2, 12); t.lineTo(12, -2); t.moveTo(4, 18); t.lineTo(18, 4); t.stroke();
  cachedHatchColor = color;
  cachedHatchPattern = ctx.createPattern(tile, 'repeat');
  return cachedHatchPattern;
}

function drawAcousticSurfaces(ctx, geometry, stageId) {
  for (const s of geometry.surfaces) {
    ctx.save();
    if (s.type === 'rug') {
      ctx.fillStyle = s.color || '#2c1e38'; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = s.trim || '#d1a858'; ctx.lineWidth = 2.2;
      ctx.strokeRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1;
      ctx.strokeRect(s.x + 11, s.y + 11, s.w - 22, s.h - 22);
      if (stageId === 3) {
        ctx.strokeStyle = '#f2cc76'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let fy = s.y + 8; fy < s.y + s.h - 6; fy += 9) {
          ctx.moveTo(s.x - 5, fy); ctx.lineTo(s.x, fy);
          ctx.moveTo(s.x + s.w, fy); ctx.lineTo(s.x + s.w + 5, fy);
        }
        ctx.stroke();
      }
    } else if (s.type === 'gravel') {
      ctx.fillStyle = 'rgba(198,210,206,0.14)'; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(214,228,224,0.24)'; ctx.lineWidth = 1.2;
      ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
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
      ctx.stroke();
      ctx.strokeStyle = 'rgba(232,178,124,0.28)';
      ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    }
    ctx.restore();
  }
}

function drawStageFloorProps(ctx, stageId, time) {
  ctx.save();
  if (stageId === 2) {
    for (const [bx, by] of [[46, 46], [1030, 576], [46, 576]]) {
      ctx.fillStyle = '#153a32'; ctx.strokeStyle = '#c4a672'; ctx.lineWidth = 2;
      ctx.fillRect(bx, by, 44, 44); ctx.strokeRect(bx, by, 44, 44);
      drawLeafRosette(ctx, bx + 22, by + 22, 13);
    }
  } else if (stageId === 5) {
    const pulse = 0.55 + Math.sin(time * 3.6) * 0.2;
    for (const gx of [446, 642]) {
      ctx.fillStyle = `rgba(255,108,42,${0.42 * pulse})`; ctx.fillRect(gx, 294, 54, 72);
      ctx.strokeStyle = '#33241c'; ctx.lineWidth = 3; ctx.strokeRect(gx, 294, 54, 72);
      ctx.beginPath();
      for (let x = gx + 9; x < gx + 54; x += 9) { ctx.moveTo(x, 294); ctx.lineTo(x, 366); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawConservatoryPlanter(ctx, obs, ty) {
  ctx.strokeStyle = '#5c462e'; ctx.lineWidth = 2;
  ctx.strokeRect(obs.x + 5, ty + 5, obs.w - 10, obs.h - 10);
  ctx.fillStyle = '#1d4c43'; ctx.fillRect(obs.x + 10, ty + 10, obs.w - 20, obs.h - 20);
  ctx.strokeStyle = '#6ad4b8'; ctx.lineWidth = 1.4;
  ctx.strokeRect(obs.x + 10, ty + 10, obs.w - 20, obs.h - 20);

  const cx = obs.x + obs.w * 0.5;
  if (obs.h > obs.w + 18) {
    drawLeafRosette(ctx, cx, ty + obs.h * 0.30, 15);
    drawLeafRosette(ctx, cx, ty + obs.h * 0.70, 15);
  } else {
    drawLeafRosette(ctx, cx, ty + obs.h * 0.5, 17);
  }
  ctx.fillStyle = '#f2d394';
  for (const [rx, ry] of [[7, 7], [obs.w - 11, 7], [7, obs.h - 11], [obs.w - 11, obs.h - 11]]) {
    ctx.fillRect(obs.x + rx, ty + ry, 4, 4);
  }
}

function drawLeafRosette(ctx, cx, cy, rad) {
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i / 6) * Math.PI * 2 + 0.3);
    ctx.fillStyle = i % 2 === 0 ? '#3fb58b' : '#6be0b6';
    ctx.beginPath(); ctx.ellipse(rad * 0.52, 0, rad * 0.52, rad * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  drawDot(ctx, 0, 0, 3.2, '#f0d794');
  ctx.restore();
}

function drawArchiveBookcase(ctx, obs, ty) {
  ctx.fillStyle = '#5e1f29'; ctx.fillRect(obs.x + 5, ty + 5, obs.w - 10, obs.h - 10);
  ctx.strokeStyle = '#f8d284'; ctx.lineWidth = 2; ctx.strokeRect(obs.x + 5, ty + 5, obs.w - 10, obs.h - 10);
  const colors = ['#c93b46', '#e6b865', '#347d6b', '#d97f54', '#f2dfc2'];
  if (obs.w > obs.h) {
    for (let bx = obs.x + 10, i = 0; bx < obs.x + obs.w - 16; bx += 9, i++) {
      ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(bx, ty + 11, 7, obs.h - 22);
      ctx.fillStyle = 'rgba(255,240,198,0.55)'; ctx.fillRect(bx + 1, ty + obs.h * 0.45, 5, 2);
    }
  } else {
    for (let by = ty + 10, i = 0; by < ty + obs.h - 16; by += 9, i++) {
      ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(obs.x + 11, by, obs.w - 22, 7);
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
  const topGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + 18);
  topGrad.addColorStop(0, 'rgba(0,0,0,0.55)'); topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad; ctx.fillRect(obs.x, obs.y, obs.w, 18);

  ctx.strokeStyle = 'rgba(104,232,255,0.34)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let wy = obs.y + 18; wy < obs.y + obs.h - 10; wy += 20) {
    const ws = Math.sin(time * 1.6 + wy * 0.08) * 8;
    ctx.moveTo(obs.x + 14 + ws, wy); ctx.lineTo(obs.x + obs.w * 0.45 + ws, wy);
    ctx.moveTo(obs.x + obs.w * 0.58 - ws * 0.7, wy + 7); ctx.lineTo(obs.x + obs.w - 16 - ws * 0.7, wy + 7);
  }
  ctx.stroke();

  const midX = obs.x + obs.w * 0.5;
  const gy = obs.y + obs.h * 0.5;
  ctx.strokeStyle = '#99b8cc'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(obs.x + 3, gy - 12); ctx.lineTo(midX, gy + 6); ctx.lineTo(obs.x + obs.w - 3, gy - 12); ctx.stroke();
  ctx.strokeStyle = '#d8f3ff'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(obs.x + 5, gy - 13); ctx.lineTo(midX, gy + 4); ctx.lineTo(obs.x + obs.w - 5, gy - 13); ctx.stroke();
  ctx.strokeStyle = '#7ba7c2'; ctx.lineWidth = 2.5;
  ctx.strokeRect(obs.x + 1, obs.y + 1, obs.w - 2, obs.h - 2);
  ctx.restore();
}
