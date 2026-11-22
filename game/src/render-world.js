// Architectural 2.5D world rendering: masonry floors, acoustic surfaces, shadow blind-zone hatching,
// warm carved sandstone/mahogany cover blocks, raycast dynamic light pools, sweeping brass sentries, and exit gates.

export function renderFloorAndShadowHatch(ctx, state) {
  const { level, geometry } = state;
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
  for (let x = 24; x <= W - 24; x += tile) {
    ctx.moveTo(x, 24);
    ctx.lineTo(x, H - 24);
  }
  for (let y = 24; y <= H - 24; y += tile) {
    ctx.moveTo(24, y);
    ctx.lineTo(W - 24, y);
  }
  ctx.stroke();

  drawAcousticSurfaces(ctx, geometry);

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

  const solids = geometry.obstacles
    .filter((o) => o.kind !== 'water')
    .sort((a, b) => (a.y + a.h) - (b.y + b.h));

  for (const obs of solids) {
    const isPerim = obs.kind === 'perimeter';
    const lift = isPerim ? 6 : Math.round((obs.height || 14) * 0.62);
    const southH = isPerim ? 8 : Math.round((obs.height || 14) * 0.72);
    const topFill = isPerim ? pal.wallTop : pal.coverTop;
    const southFill = isPerim ? pal.wallSouth : pal.coverSouth;
    const rimColor = isPerim ? pal.wallRim : (pal.coverRim || pal.wallRim);

    ctx.save();

    // Directional ambient ground shadow
    if (!isPerim) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
      ctx.fillRect(obs.x + 7, obs.y + 8, obs.w, obs.h + 5);
    }

    // Extruded south vertical face
    ctx.fillStyle = southFill;
    ctx.fillRect(obs.x, obs.y + obs.h - lift, obs.w, southH + lift);

    if (!isPerim) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.30)';
      ctx.lineWidth = 1.2;
      for (let fx = obs.x + 14; fx < obs.x + obs.w - 8; fx += 16) {
        ctx.beginPath();
        ctx.moveTo(fx, obs.y + obs.h - lift);
        ctx.lineTo(fx, obs.y + obs.h + southH);
        ctx.stroke();
      }
    }

    // Raised carved top face
    const ty = obs.y - lift;
    ctx.fillStyle = topFill;
    ctx.fillRect(obs.x, ty, obs.w, obs.h);

    // Subtle mortar / stonework seams so cover reads as solid architecture
    if (!isPerim) {
      ctx.strokeStyle = 'rgba(32, 22, 14, 0.24)';
      ctx.lineWidth = 1;
      if (obs.w >= 72) {
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.w * 0.5, ty + 4);
        ctx.lineTo(obs.x + obs.w * 0.5, ty + obs.h - 4);
        ctx.stroke();
      }
      if (obs.h >= 72) {
        ctx.beginPath();
        ctx.moveTo(obs.x + 4, ty + obs.h * 0.5);
        ctx.lineTo(obs.x + obs.w - 4, ty + obs.h * 0.5);
        ctx.stroke();
      }
    }

    // Material-specific architectural detailing
    if (obs.kind === 'copperPillar' || obs.kind === 'copperWall') {
      // Carved sandstone-bronze plinth with oxidized verdigris patina inlay trim
      ctx.strokeStyle = '#5c462e';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x + 6, ty + 6, obs.w - 12, obs.h - 12);
      ctx.fillStyle = '#48b89f';
      ctx.strokeStyle = '#1b5046';
      ctx.lineWidth = 1.2;
      ctx.fillRect(obs.x + 11, ty + 11, obs.w - 22, obs.h - 22);
      ctx.strokeRect(obs.x + 11, ty + 11, obs.w - 22, obs.h - 22);
      // Warm sandstone-ivory inset keystone & bronze rivets
      ctx.fillStyle = '#e8d7b5';
      ctx.fillRect(obs.x + 16, ty + 16, obs.w - 32, obs.h - 32);
      ctx.fillStyle = '#8b683b';
      ctx.fillRect(obs.x + 8, ty + 8, 4, 4);
      ctx.fillRect(obs.x + obs.w - 12, ty + 8, 4, 4);
      ctx.fillRect(obs.x + 8, ty + obs.h - 12, 4, 4);
      ctx.fillRect(obs.x + obs.w - 12, ty + obs.h - 12, 4, 4);
    } else if (obs.kind === 'bookcase') {
      // Lifted warm mahogany cornice + gilded ivory-gold book spines for high 244px legibility
      ctx.fillStyle = '#822e38';
      ctx.fillRect(obs.x + 6, ty + 6, obs.w - 12, obs.h - 12);
      ctx.strokeStyle = '#f8d284';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x + 6, ty + 6, obs.w - 12, obs.h - 12);
      ctx.fillStyle = '#f5d287';
      if (obs.w > obs.h) {
        ctx.fillRect(obs.x + 12, ty + obs.h * 0.42, obs.w - 24, 6);
        ctx.fillStyle = 'rgba(255, 240, 200, 0.55)';
        ctx.fillRect(obs.x + 12, ty + obs.h * 0.42, obs.w - 24, 2);
      } else {
        ctx.fillRect(obs.x + obs.w * 0.42, ty + 12, 6, obs.h - 24);
        ctx.fillStyle = 'rgba(255, 240, 200, 0.55)';
        ctx.fillRect(obs.x + obs.w * 0.42, ty + 12, 2, obs.h - 24);
      }
    } else if (obs.kind === 'crate') {
      ctx.strokeStyle = '#5c3c1e';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(obs.x + 6, ty + 6, obs.w - 12, obs.h - 12);
      ctx.beginPath();
      ctx.moveTo(obs.x + 7, ty + 7);
      ctx.lineTo(obs.x + obs.w - 7, ty + obs.h - 7);
      ctx.moveTo(obs.x + obs.w - 7, ty + 7);
      ctx.lineTo(obs.x + 7, ty + obs.h - 7);
      ctx.stroke();
    } else if (obs.kind === 'bellMold') {
      const cx = obs.x + obs.w * 0.5;
      const cy = ty + obs.h * 0.5;
      const mr = Math.min(obs.w, obs.h) * 0.34;
      ctx.beginPath();
      ctx.arc(cx, cy, mr, 0, Math.PI * 2);
      ctx.fillStyle = '#5e4124';
      ctx.fill();
      ctx.strokeStyle = '#fae0b0';
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, mr * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = '#f0a756';
      ctx.fill();
    } else if (!isPerim) {
      ctx.strokeStyle = 'rgba(84, 70, 50, 0.42)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(obs.x + 7, ty + 7, obs.w - 14, obs.h - 14);
    }

    // Bright carved top-left bevel highlight
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = isPerim ? 1.4 : 2.1;
    ctx.beginPath();
    ctx.moveTo(obs.x + 1.5, ty + obs.h - 1.5);
    ctx.lineTo(obs.x + 1.5, ty + 1.5);
    ctx.lineTo(obs.x + obs.w - 1.5, ty + 1.5);
    ctx.stroke();

    // Bold dark architectural silhouette
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

  // Layer 1: Soft circular ambient light pools (distinct from hard-edged directional vision cones)
  for (const light of geometry.lights) {
    if (!light.lit || !light.polygon || light.polygon.length < 3) continue;
    const rad = light.currentRadius || light.radius;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(light.polygon[0].x, light.polygon[0].y);
    for (let i = 1; i < light.polygon.length; i++) {
      ctx.lineTo(light.polygon[i].x, light.polygon[i].y);
    }
    ctx.closePath();
    ctx.clip();

    const floorReveal = ctx.createRadialGradient(light.x, light.y, 12, light.x, light.y, rad);
    floorReveal.addColorStop(0, pal.litFloor);
    floorReveal.addColorStop(0.68, pal.litFloor);
    floorReveal.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floorReveal;
    ctx.fillRect(light.x - rad, light.y - rad, rad * 2, rad * 2);

    const glow = ctx.createRadialGradient(light.x, light.y, 4, light.x, light.y, rad);
    glow.addColorStop(0, `${pal.lightCore}7a`);
    glow.addColorStop(0.4, `${pal.lightMid}3c`);
    glow.addColorStop(0.82, `${pal.lightMid}14`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(light.x, light.y, rad, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Layer 2: Rotating Brass Wall Sentry Lantern beams
  for (const sentry of geometry.sentries || []) {
    // Subtle brass conduit linking sentry to its shutoff sconce/switch
    ctx.save();
    ctx.strokeStyle = sentry.active ? 'rgba(246, 198, 102, 0.34)' : 'rgba(130, 155, 168, 0.24)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(sentry.x, sentry.y);
    ctx.lineTo(sentry.switchX, sentry.switchY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (sentry.active && sentry.polygon && sentry.polygon.length >= 3) {
      const poly = sentry.polygon;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();

      const grad = ctx.createRadialGradient(sentry.x, sentry.y, 10, sentry.x, sentry.y, sentry.range);
      grad.addColorStop(0, 'rgba(255, 224, 118, 0.62)');
      grad.addColorStop(0.48, 'rgba(255, 178, 56, 0.34)');
      grad.addColorStop(1, 'rgba(255, 152, 36, 0.08)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Hard amber outer beam border (stroked BEFORE inner scanlines replace path!)
      ctx.strokeStyle = '#ffbe47';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Subtle sweep arc scanlines clipped inside beam
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 240, 178, 0.28)';
      ctx.lineWidth = 1.1;
      for (let r = 68; r < sentry.range; r += 68) {
        ctx.beginPath();
        ctx.arc(sentry.x, sentry.y, r, sentry.angle - sentry.halfFov, sentry.angle + sentry.halfFov);
        ctx.stroke();
      }
      ctx.restore();

      // Center optical lens axis ray
      ctx.strokeStyle = 'rgba(255, 246, 200, 0.62)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(sentry.x, sentry.y);
      ctx.lineTo(sentry.x + Math.cos(sentry.angle) * Math.min(sentry.range * 0.72, 180), sentry.y + Math.sin(sentry.angle) * Math.min(sentry.range * 0.72, 180));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Wall-mounted brass sentry turret housing
    ctx.save();
    ctx.translate(sentry.x, sentry.y);
    ctx.rotate(sentry.angle);
    ctx.fillStyle = sentry.active ? '#c9933b' : '#4a555e';
    ctx.strokeStyle = '#080c10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, 20, 4);
    ctx.fill();
    ctx.stroke();

    // Rotating optical lens hood
    ctx.fillStyle = sentry.active ? '#fff3b8' : '#262f36';
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(15, 0);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (!sentry.active) {
      drawWorldOcrPill(ctx, sentry.x - 36, sentry.y, 'SENTRY OFF', '#d8f3ff', '#091016', 10);
    }
  }

  // Layer 3: Lamp fixtures & High-OCR SNUFFED badges
  for (const light of geometry.lights) {
    ctx.save();
    const isBrazier = light.kind === 'brazier';
    const r = isBrazier ? 13 : 8;

    ctx.beginPath();
    ctx.arc(light.x, light.y, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#18141c';
    ctx.fill();
    ctx.strokeStyle = light.lit ? '#f2c86b' : '#738996';
    ctx.lineWidth = 1.9;
    ctx.stroke();

    if (light.lit) {
      const flicker = 1 + Math.sin(time * 9 + light.flickerPhase) * 0.1;
      const coreGrad = ctx.createRadialGradient(light.x, light.y, 1, light.x, light.y, r * 2.3 * flicker);
      coreGrad.addColorStop(0, '#fff9df');
      coreGrad.addColorStop(0.45, pal.lightCore);
      coreGrad.addColorStop(1, 'rgba(255, 190, 80, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(light.x, light.y, r * 2.3 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(light.x, light.y, isBrazier ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fffbe8';
      ctx.fill();

      if (light.snuffable) {
        ctx.beginPath();
        ctx.arc(light.x, light.y, r + 7, 0, Math.PI * 2);
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = 'rgba(255, 228, 138, 0.62)';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      ctx.beginPath();
      ctx.arc(light.x, light.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#2a333c';
      ctx.fill();

      const smokeAlpha = Math.max(0.42, light.snuffSmoke * 0.88);
      for (let i = 0; i < 4; i++) {
        const phase = (time * 0.8 + i * 0.25) % 1;
        const sx = light.x + Math.sin(time * 2.4 + i * 1.9) * (4 + phase * 7);
        const sy = light.y - 7 - phase * 26;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.8 + phase * 5.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(204, 234, 246, ${(1 - phase) * smokeAlpha})`;
        ctx.fill();
      }

      drawWorldOcrPill(ctx, light.x, light.y + 24, 'SNUFFED', '#d8f3ff', '#091016', 12.5);
    }
    ctx.restore();
  }
}

export function renderRelicAndExitGate(ctx, state) {
  const { level, player, time } = state;
  const relic = level.relic;
  const exit = level.exit;

  // --- RELIC PEDESTAL ---
  ctx.save();
  ctx.translate(relic.x, relic.y);

  ctx.fillStyle = '#18222c';
  ctx.strokeStyle = player.hasRelic ? '#475966' : '#ffe082';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const rx = Math.cos(a) * 23;
    const ry = Math.sin(a) * 23;
    if (i === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (!player.hasRelic) {
    const pulse = 0.85 + Math.sin(time * 4.2) * 0.15;
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 44 * pulse);
    halo.addColorStop(0, 'rgba(255, 232, 148, 0.78)');
    halo.addColorStop(0.55, 'rgba(125, 249, 226, 0.28)');
    halo.addColorStop(1, 'rgba(125, 249, 226, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 44 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(time * 0.85);
    ctx.strokeStyle = '#7df9e2';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffe082';
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 6, 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff9e0';
    ctx.beginPath();
    ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawWorldOcrPill(ctx, 0, -35, 'RELIC', '#ffe082', '#091016', 11.5);
  } else {
    ctx.fillStyle = 'rgba(130, 155, 168, 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // --- EMERALD EXTRACTION ARCHWAY ---
  ctx.save();
  ctx.translate(exit.x, exit.y);
  const unlocked = player.hasRelic;
  const pulse = 0.88 + Math.sin(time * 4.5) * 0.12;

  if (unlocked) {
    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, exit.radius * 2.35 * pulse);
    glow.addColorStop(0, 'rgba(107, 255, 184, 0.90)');
    glow.addColorStop(0.45, 'rgba(46, 230, 166, 0.38)');
    glow.addColorStop(1, 'rgba(46, 230, 166, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, exit.radius * 2.35 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = unlocked ? '#6bffb8' : '#538a7c';
  ctx.strokeStyle = '#071014';
  ctx.lineWidth = 1.8;
  ctx.fillRect(-exit.radius - 5, -10, 8, 20);
  ctx.strokeRect(-exit.radius - 5, -10, 8, 20);
  ctx.fillRect(exit.radius - 3, -10, 8, 20);
  ctx.strokeRect(exit.radius - 3, -10, 8, 20);

  ctx.beginPath();
  ctx.arc(0, 0, exit.radius, 0, Math.PI * 2);
  ctx.fillStyle = unlocked ? 'rgba(14, 92, 68, 0.86)' : 'rgba(14, 34, 38, 0.76)';
  ctx.fill();
  ctx.strokeStyle = unlocked ? '#6bffb8' : '#73bfa9';
  ctx.lineWidth = unlocked ? 3.5 : 2.3;
  ctx.setLineDash(unlocked ? [] : [6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = unlocked ? '#dcfff0' : '#8fd1bf';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.lineTo(0, -6);
  ctx.lineTo(8, 4);
  ctx.stroke();

  const exitText = unlocked ? 'EXIT · OPEN' : 'EXIT';
  drawWorldOcrPill(
    ctx,
    0,
    -exit.radius - 15,
    exitText,
    unlocked ? '#6bffb8' : '#cdeae1',
    '#091016',
    unlocked ? 13.5 : 11.5,
  );

  ctx.restore();
}

let cachedHatchColor = null;
let cachedHatchPattern = null;

function drawWorldOcrPill(ctx, cx, cy, text, bgFill, inkColor, fontSize = 11.5) {
  ctx.save();
  ctx.font = `900 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width + 14;
  const th = fontSize + 8;
  ctx.fillStyle = bgFill;
  ctx.strokeStyle = '#070c12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx - tw / 2, cy - th / 2, tw, th, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = inkColor;
  ctx.fillText(text, cx, cy + 0.5);
  ctx.restore();
}

function getHatchPattern(ctx, color) {
  if (cachedHatchPattern && cachedHatchColor === color) return cachedHatchPattern;
  const tile = document.createElement('canvas');
  tile.width = 14;
  tile.height = 14;
  const tctx = tile.getContext('2d');
  tctx.strokeStyle = color;
  tctx.lineWidth = 1.45;
  tctx.beginPath();
  tctx.moveTo(-2, 12);
  tctx.lineTo(12, -2);
  tctx.moveTo(4, 18);
  tctx.lineTo(18, 4);
  tctx.stroke();
  cachedHatchColor = color;
  cachedHatchPattern = ctx.createPattern(tile, 'repeat');
  return cachedHatchPattern;
}

function drawAcousticSurfaces(ctx, geometry) {
  for (const s of geometry.surfaces) {
    ctx.save();
    if (s.type === 'rug') {
      ctx.fillStyle = s.color || '#2c1e38';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = s.trim || '#d1a858';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x + 10, s.y + 10, s.w - 20, s.h - 20);
    } else if (s.type === 'gravel') {
      ctx.fillStyle = 'rgba(198, 210, 206, 0.14)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(214, 228, 224, 0.24)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
      ctx.fillStyle = 'rgba(235, 240, 232, 0.28)';
      for (let gx = s.x + 8; gx < s.x + s.w - 6; gx += 14) {
        for (let gy = s.y + 7; gy < s.y + s.h - 5; gy += 12) {
          const jx = ((gx * 37 + gy * 17) % 7) - 3;
          const jy = ((gx * 13 + gy * 29) % 5) - 2;
          ctx.fillRect(gx + jx, gy + jy, 2.2, 2.2);
        }
      }
    } else if (s.type === 'timber') {
      ctx.fillStyle = 'rgba(154, 96, 58, 0.30)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(24, 12, 8, 0.45)';
      ctx.lineWidth = 1.2;
      for (let py = s.y + 14; py < s.y + s.h; py += 14) {
        ctx.beginPath();
        ctx.moveTo(s.x, py);
        ctx.lineTo(s.x + s.w, py);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(232, 178, 124, 0.28)';
      ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    }
    ctx.restore();
  }
}

function drawWaterBasin(ctx, obs, time) {
  ctx.save();
  ctx.fillStyle = '#072438';
  ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

  const topGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + 18);
  topGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(obs.x, obs.y, obs.w, 18);

  ctx.strokeStyle = 'rgba(104, 232, 255, 0.28)';
  ctx.lineWidth = 1.5;
  for (let wy = obs.y + 18; wy < obs.y + obs.h - 10; wy += 20) {
    const waveShift = Math.sin(time * 1.6 + wy * 0.08) * 8;
    ctx.beginPath();
    ctx.moveTo(obs.x + 14 + waveShift, wy);
    ctx.lineTo(obs.x + obs.w * 0.45 + waveShift, wy);
    ctx.moveTo(obs.x + obs.w * 0.58 - waveShift * 0.7, wy + 7);
    ctx.lineTo(obs.x + obs.w - 16 - waveShift * 0.7, wy + 7);
    ctx.stroke();
  }

  ctx.strokeStyle = '#7ba7c2';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(obs.x + 1, obs.y + 1, obs.w - 2, obs.h - 2);
  ctx.restore();
}
