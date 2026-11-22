// Architectural 2.5D world rendering: masonry floors, acoustic surfaces, shadow blind-zone hatching,
// raycast dynamic light pools, extruded 2.5D cover obstacles, relic pedestals, and emerald exit gates.

let cachedHatchColor = null;
let cachedHatchPattern = null;

function getHatchPattern(ctx, color) {
  if (cachedHatchPattern && cachedHatchColor === color) return cachedHatchPattern;
  const tile = document.createElement('canvas');
  tile.width = 14;
  tile.height = 14;
  const tctx = tile.getContext('2d');
  tctx.strokeStyle = color;
  tctx.lineWidth = 1.4;
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
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x + 10, s.y + 10, s.w - 20, s.h - 20);
    } else if (s.type === 'gravel') {
      ctx.fillStyle = 'rgba(195, 206, 204, 0.13)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(210, 224, 220, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
      ctx.fillStyle = 'rgba(235, 240, 232, 0.26)';
      for (let gx = s.x + 8; gx < s.x + s.w - 6; gx += 14) {
        for (let gy = s.y + 7; gy < s.y + s.h - 5; gy += 12) {
          const jx = ((gx * 37 + gy * 17) % 7) - 3;
          const jy = ((gx * 13 + gy * 29) % 5) - 2;
          ctx.fillRect(gx + jx, gy + jy, 2.2, 2.2);
        }
      }
    } else if (s.type === 'timber') {
      ctx.fillStyle = 'rgba(138, 86, 52, 0.28)';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = 'rgba(24, 12, 8, 0.45)';
      ctx.lineWidth = 1.2;
      for (let py = s.y + 14; py < s.y + s.h; py += 14) {
        ctx.beginPath();
        ctx.moveTo(s.x, py);
        ctx.lineTo(s.x + s.w, py);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(222, 168, 114, 0.25)';
      ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    }
    ctx.restore();
  }
}

export function renderFloorAndShadowHatch(ctx, state) {
  const { level, geometry } = state;
  const pal = level.palette;
  const W = geometry.width;
  const H = geometry.height;

  // Base masonry courtyard floor
  ctx.fillStyle = pal.floorBase;
  ctx.fillRect(0, 0, W, H);

  // Subtle deterministic architectural floor tile checker + grout joints
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

  // Acoustic surface strips (velvet rugs, gravel paths, creaky timber)
  drawAcousticSurfaces(ctx, geometry);

  // Unmistakable shadow blind-zone diagonal hatching over unlit floors
  const hatch = getHatchPattern(ctx, pal.hatch);
  if (hatch) {
    ctx.save();
    ctx.fillStyle = hatch;
    ctx.fillRect(24, 24, W - 48, H - 48);
    ctx.restore();
  }
}

export function renderDynamicLightPools(ctx, state) {
  const { level, geometry, time } = state;
  const pal = level.palette;

  // Layer 1: Raycast-clipped illuminated floor reveal + warm light gradients
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

    // Clear shadow hatch under active light so safe vs exposed zones pop cleanly
    const floorReveal = ctx.createRadialGradient(light.x, light.y, 12, light.x, light.y, rad);
    floorReveal.addColorStop(0, pal.litFloor);
    floorReveal.addColorStop(0.72, pal.litFloor);
    floorReveal.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floorReveal;
    ctx.fillRect(light.x - rad, light.y - rad, rad * 2, rad * 2);

    // Warm atmospheric lantern / brazier glow pool
    const glow = ctx.createRadialGradient(light.x, light.y, 4, light.x, light.y, rad);
    glow.addColorStop(0, `${pal.lightCore}78`);
    glow.addColorStop(0.36, `${pal.lightMid}44`);
    glow.addColorStop(0.78, `${pal.lightMid}18`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(light.x, light.y, rad, 0, Math.PI * 2);
    ctx.fill();

    // Subtle crisp penumbra ring showing light boundary
    ctx.strokeStyle = `${pal.lightCore}38`;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    ctx.restore();
  }

  // Layer 2: Lamp fixtures (lit sconces, braziers, and snuffed dark sconces with smoke)
  for (const light of geometry.lights) {
    ctx.save();
    const isBrazier = light.kind === 'brazier';
    const r = isBrazier ? 13 : 8;

    // Fixture mount ring
    ctx.beginPath();
    ctx.arc(light.x, light.y, r + 3, 0, Math.PI * 2);
    ctx.fillStyle = '#18141c';
    ctx.fill();
    ctx.strokeStyle = light.lit ? '#e8bd6a' : '#566470';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    if (light.lit) {
      const flicker = 1 + Math.sin(time * 9 + light.flickerPhase) * 0.1;
      const coreGrad = ctx.createRadialGradient(light.x, light.y, 1, light.x, light.y, r * 2.2 * flicker);
      coreGrad.addColorStop(0, '#fff7d6');
      coreGrad.addColorStop(0.45, pal.lightCore);
      coreGrad.addColorStop(1, 'rgba(255, 190, 80, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(light.x, light.y, r * 2.2 * flicker, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(light.x, light.y, isBrazier ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff9e6';
      ctx.fill();

      if (light.snuffable) {
        ctx.beginPath();
        ctx.arc(light.x, light.y, r + 7, 0, Math.PI * 2);
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = 'rgba(255, 224, 130, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      // Snuffed lamp: dark charcoal core + subtle rising smoke wisps
      ctx.beginPath();
      ctx.arc(light.x, light.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#2d353e';
      ctx.fill();

      const smokeAlpha = Math.max(0.38, light.snuffSmoke * 0.85);
      for (let i = 0; i < 4; i++) {
        const phase = (time * 0.8 + i * 0.25) % 1;
        const sx = light.x + Math.sin(time * 2.4 + i * 1.9) * (4 + phase * 7);
        const sy = light.y - 7 - phase * 26;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.6 + phase * 5.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(182, 218, 232, ${(1 - phase) * smokeAlpha})`;
        ctx.fill();
      }

      // Crisp diegetic SNUFFED tag so carved shadow corridors read at a glance
      ctx.font = '800 9px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      const sw = 52;
      ctx.fillStyle = 'rgba(8, 16, 24, 0.88)';
      ctx.strokeStyle = 'rgba(130, 185, 206, 0.72)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.roundRect(light.x - sw / 2, light.y + 13, sw, 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b9dce8';
      ctx.fillText('SNUFFED', light.x, light.y + 23);
    }
    ctx.restore();
  }
}

function drawWaterBasin(ctx, obs, time) {
  ctx.save();
  ctx.fillStyle = '#072235';
  ctx.fillRect(obs.x, obs.y, obs.w, obs.h);

  // Subtle recessed canal edge shadows
  const topGrad = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + 18);
  topGrad.addColorStop(0, 'rgba(0,0,0,0.55)');
  topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(obs.x, obs.y, obs.w, 18);

  // Animated moonlight caustics
  ctx.strokeStyle = 'rgba(91, 228, 255, 0.24)';
  ctx.lineWidth = 1.4;
  for (let wy = obs.y + 18; wy < obs.y + obs.h - 10; wy += 20) {
    const waveShift = Math.sin(time * 1.6 + wy * 0.08) * 8;
    ctx.beginPath();
    ctx.moveTo(obs.x + 14 + waveShift, wy);
    ctx.lineTo(obs.x + obs.w * 0.45 + waveShift, wy);
    ctx.moveTo(obs.x + obs.w * 0.58 - waveShift * 0.7, wy + 7);
    ctx.lineTo(obs.x + obs.w - 16 - waveShift * 0.7, wy + 7);
    ctx.stroke();
  }

  // Stone quay lip
  ctx.strokeStyle = '#6f97b0';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(obs.x + 1, obs.y + 1, obs.w - 2, obs.h - 2);
  ctx.restore();
}

export function renderCoverArchitecture(ctx, state) {
  const { level, geometry, time } = state;
  const pal = level.palette;

  // Draw water hazards first so stone quays and bridges sit crisply beside them
  for (const obs of geometry.obstacles) {
    if (obs.kind === 'water') drawWaterBasin(ctx, obs, time);
  }

  // Sort solid 2.5D obstacles top-to-bottom so south faces layer cleanly
  const solids = geometry.obstacles
    .filter((o) => o.kind !== 'water')
    .sort((a, b) => (a.y + a.h) - (b.y + b.h));

  for (const obs of solids) {
    const isPerim = obs.kind === 'perimeter';
    const lift = isPerim ? 6 : Math.round((obs.height || 14) * 0.62);
    const southH = isPerim ? 8 : Math.round((obs.height || 14) * 0.72);
    const topFill = isPerim ? pal.wallTop : pal.coverTop;
    const southFill = isPerim ? pal.wallSouth : pal.coverSouth;

    ctx.save();

    // 1. Directional ambient ground shadow
    if (!isPerim) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
      ctx.fillRect(obs.x + 7, obs.y + 8, obs.w, obs.h + 4);
    }

    // 2. Extruded south vertical face
    ctx.fillStyle = southFill;
    ctx.fillRect(obs.x, obs.y + obs.h - lift, obs.w, southH + lift);

    // Subtle vertical architectural fluting on south face
    if (!isPerim) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;
      for (let fx = obs.x + 14; fx < obs.x + obs.w - 8; fx += 16) {
        ctx.beginPath();
        ctx.moveTo(fx, obs.y + obs.h - lift);
        ctx.lineTo(fx, obs.y + obs.h + southH);
        ctx.stroke();
      }
    }

    // 3. Raised crisp top cap face
    const ty = obs.y - lift;
    ctx.fillStyle = topFill;
    ctx.fillRect(obs.x, ty, obs.w, obs.h);

    // Material-specific architectural detailing on the top face
    if (obs.kind === 'copperPillar' || obs.kind === 'copperWall') {
      ctx.strokeStyle = '#1b5a4d';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x + 7, ty + 7, obs.w - 14, obs.h - 14);
      ctx.fillStyle = '#a4f5e0';
      ctx.fillRect(obs.x + 10, ty + 10, 4, 4);
      ctx.fillRect(obs.x + obs.w - 14, ty + 10, 4, 4);
      ctx.fillRect(obs.x + 10, ty + obs.h - 14, 4, 4);
      ctx.fillRect(obs.x + obs.w - 14, ty + obs.h - 14, 4, 4);
    } else if (obs.kind === 'bookcase') {
      // Gold-leaf book spines & carved walnut cornice
      ctx.fillStyle = '#6c2431';
      ctx.fillRect(obs.x + 6, ty + 6, obs.w - 12, obs.h - 12);
      ctx.strokeStyle = '#e8bd6a';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(obs.x + 6, ty + 6, obs.w - 12, obs.h - 12);
      ctx.fillStyle = 'rgba(246, 212, 134, 0.35)';
      if (obs.w > obs.h) {
        ctx.fillRect(obs.x + 12, ty + obs.h * 0.44, obs.w - 24, 5);
      } else {
        ctx.fillRect(obs.x + obs.w * 0.44, ty + 12, 5, obs.h - 24);
      }
    } else if (obs.kind === 'crate') {
      ctx.strokeStyle = '#5c3c1e';
      ctx.lineWidth = 2;
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
      ctx.strokeStyle = '#f5ce91';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, mr * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = '#e59a4a';
      ctx.fill();
    } else if (!isPerim) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(obs.x + 6, ty + 6, obs.w - 12, obs.h - 12);
    }

    // 4. Crisp top-left specular bevel + bold dark outer silhouette
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(obs.x + 1, ty + obs.h - 1);
    ctx.lineTo(obs.x + 1, ty + 1);
    ctx.lineTo(obs.x + obs.w - 1, ty + 1);
    ctx.stroke();

    ctx.strokeStyle = '#060a0e';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(obs.x, ty, obs.w, obs.h);
    ctx.strokeRect(obs.x, obs.y + obs.h - lift, obs.w, southH + lift);

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

  // Octagonal stone plinth
  ctx.fillStyle = '#18222c';
  ctx.strokeStyle = player.hasRelic ? '#475966' : '#f5cf74';
  ctx.lineWidth = 2.2;
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
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 42 * pulse);
    halo.addColorStop(0, 'rgba(255, 232, 148, 0.72)');
    halo.addColorStop(0.55, 'rgba(111, 255, 233, 0.25)');
    halo.addColorStop(1, 'rgba(111, 255, 233, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 42 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Rotating astrolabe / artifact rings
    ctx.save();
    ctx.rotate(time * 0.85);
    ctx.strokeStyle = '#6fffe9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffd976';
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 6, 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Compact legible relic tag
    ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = 'RELIC';
    const tw = ctx.measureText(label).width + 12;
    ctx.fillStyle = 'rgba(8, 15, 22, 0.88)';
    ctx.strokeStyle = '#ffd976';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -41, tw, 16, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe9a6';
    ctx.fillText(label, 0, -29.5);
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
    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, exit.radius * 2.25 * pulse);
    glow.addColorStop(0, 'rgba(56, 245, 178, 0.85)');
    glow.addColorStop(0.45, 'rgba(46, 230, 166, 0.34)');
    glow.addColorStop(1, 'rgba(46, 230, 166, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, exit.radius * 2.25 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // Architectural archway gateposts flanking the extraction pad
  ctx.fillStyle = unlocked ? '#2ee6a6' : '#4a7a6e';
  ctx.strokeStyle = '#071014';
  ctx.lineWidth = 1.6;
  ctx.fillRect(-exit.radius - 5, -10, 8, 20);
  ctx.strokeRect(-exit.radius - 5, -10, 8, 20);
  ctx.fillRect(exit.radius - 3, -10, 8, 20);
  ctx.strokeRect(exit.radius - 3, -10, 8, 20);

  // Extraction pad ring
  ctx.beginPath();
  ctx.arc(0, 0, exit.radius, 0, Math.PI * 2);
  ctx.fillStyle = unlocked ? 'rgba(14, 82, 62, 0.82)' : 'rgba(14, 34, 38, 0.74)';
  ctx.fill();
  ctx.strokeStyle = unlocked ? '#4effc4' : '#65ad9b';
  ctx.lineWidth = unlocked ? 3.2 : 2.2;
  ctx.setLineDash(unlocked ? [] : [6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner directional chevron
  ctx.strokeStyle = unlocked ? '#baffea' : '#73a698';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.lineTo(0, -6);
  ctx.lineTo(8, 4);
  ctx.stroke();

  // Crisp EXIT label pill
  const exitText = unlocked ? 'EXIT · OPEN' : 'EXIT';
  ctx.font = '800 10px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  const ew = ctx.measureText(exitText).width + 14;
  ctx.fillStyle = unlocked ? 'rgba(9, 46, 36, 0.94)' : 'rgba(10, 18, 24, 0.86)';
  ctx.strokeStyle = unlocked ? '#49f6bc' : '#538a7c';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-ew / 2, -exit.radius - 18, ew, 17, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = unlocked ? '#a9ffe2' : '#96c7ba';
  ctx.fillText(exitText, 0, -exit.radius - 6.5);

  ctx.restore();
}
