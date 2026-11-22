// Dynamic raycast lighting & luminous doorway aperture renderer: cool moonlight/champagne floor
// pools (zero cone soup), hot amber-crimson rotating sentry beams, and emerald light-spill exits.

export function renderDynamicLightPools(ctx, state) {
  const { geometry, time } = state;

  // Cool pale champagne-ivory / moonlight sheen floor pools so danger cones pop with zero soup
  for (const light of geometry.lights) {
    if (!light.lit || !light.polygon || light.polygon.length < 3) continue;
    const rad = light.currentRadius || light.radius;

    ctx.save();
    tracePoly(ctx, light.polygon);
    ctx.clip();

    const moonPool = ctx.createRadialGradient(light.x, light.y, 10, light.x, light.y, rad);
    moonPool.addColorStop(0, 'rgba(237,229,200,0.44)');
    moonPool.addColorStop(0.45, 'rgba(216,232,240,0.24)');
    moonPool.addColorStop(0.82, 'rgba(216,232,240,0.09)');
    moonPool.addColorStop(1, 'rgba(216,232,240,0)');
    ctx.fillStyle = moonPool;
    ctx.fillRect(light.x - rad, light.y - rad, rad * 2, rad * 2);

    const rimTint = ctx.createRadialGradient(light.x, light.y, 3, light.x, light.y, rad * 0.42);
    rimTint.addColorStop(0, 'rgba(248,244,228,0.42)');
    rimTint.addColorStop(1, 'rgba(216,232,240,0)');
    drawDot(ctx, light.x, light.y, rad * 0.42, rimTint);
    ctx.restore();
  }

  for (const sentry of geometry.sentries || []) {
    ctx.save();
    ctx.strokeStyle = sentry.active ? 'rgba(255,142,58,0.42)' : 'rgba(130,155,168,0.24)';
    ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(sentry.x, sentry.y); ctx.lineTo(sentry.switchX, sentry.switchY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (sentry.active && sentry.polygon && sentry.polygon.length >= 3) {
      ctx.save();
      tracePoly(ctx, sentry.polygon);
      const grad = ctx.createRadialGradient(sentry.x, sentry.y, 10, sentry.x, sentry.y, sentry.range);
      grad.addColorStop(0, 'rgba(255,108,34,0.68)');
      grad.addColorStop(0.48, 'rgba(255,74,28,0.38)');
      grad.addColorStop(1, 'rgba(240,48,24,0.12)');
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = '#ff6a24'; ctx.lineWidth = 2.5; ctx.stroke();

      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,204,158,0.32)'; ctx.lineWidth = 1.15;
      for (let r = 68; r < sentry.range; r += 68) {
        ctx.beginPath(); ctx.arc(sentry.x, sentry.y, r, sentry.angle - sentry.halfFov, sentry.angle + sentry.halfFov); ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,216,178,0.68)'; ctx.lineWidth = 1.3; ctx.setLineDash([6, 6]);
      const axisLen = Math.min(sentry.range * 0.72, 180);
      ctx.beginPath(); ctx.moveTo(sentry.x, sentry.y);
      ctx.lineTo(sentry.x + Math.cos(sentry.angle) * axisLen, sentry.y + Math.sin(sentry.angle) * axisLen);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(sentry.x, sentry.y); ctx.rotate(sentry.angle);
    ctx.fillStyle = sentry.active ? '#d86c2c' : '#4a555e';
    ctx.strokeStyle = '#080c10'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-10, -10, 20, 20, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = sentry.active ? '#ffd6a4' : '#262f36';
    ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(15, 0); ctx.lineTo(10, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    if (!sentry.active) drawWorldOcrPill(ctx, sentry.x - 36, sentry.y, 'SENTRY OFF', '#d8f3ff', '#091016', 10);
  }

  for (const light of geometry.lights) {
    ctx.save();
    const isBrazier = light.kind === 'brazier';
    const r = isBrazier ? 13 : 8;
    drawDot(ctx, light.x, light.y, r + 3, '#141c24', light.lit ? '#d8e8f0' : '#657b88', 1.9);

    if (light.lit) {
      const flicker = 1 + Math.sin(time * 9 + light.flickerPhase) * 0.08;
      const coreGrad = ctx.createRadialGradient(light.x, light.y, 1, light.x, light.y, r * 2.4 * flicker);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.45, '#ede5c8');
      coreGrad.addColorStop(1, 'rgba(216,232,240,0)');
      drawDot(ctx, light.x, light.y, r * 2.4 * flicker, coreGrad);
      drawDot(ctx, light.x, light.y, isBrazier ? 5.5 : 4, '#f8fcff');

      if (light.snuffable) {
        ctx.setLineDash([3, 4]);
        drawDot(ctx, light.x, light.y, r + 7, null, 'rgba(216,232,240,0.68)', 1.3);
        ctx.setLineDash([]);
      }
    } else {
      drawDot(ctx, light.x, light.y, 4.5, '#263038');
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

export function renderExitAperture(ctx, state) {
  const { level, player, time } = state;
  const exit = level.exit;
  const unlocked = player.hasRelic;
  const pulse = 0.88 + Math.sin(time * 4.4) * 0.12;

  ctx.save();
  ctx.translate(exit.x, exit.y);

  // Luminous emerald floor light spill radiating into the courtyard
  const spillR = exit.radius * (unlocked ? 3.1 : 2.15) * pulse;
  const spill = ctx.createRadialGradient(0, 0, 6, 0, 0, spillR);
  spill.addColorStop(0, unlocked ? 'rgba(92,255,184,0.92)' : 'rgba(72,226,174,0.46)');
  spill.addColorStop(0.45, unlocked ? 'rgba(38,236,162,0.42)' : 'rgba(42,188,146,0.18)');
  spill.addColorStop(1, 'rgba(38,236,162,0)');
  drawDot(ctx, 0, 0, spillR, spill);

  // Architectural doorway frame & glowing threshold bar
  ctx.fillStyle = unlocked ? '#0c4e3b' : '#0f2b2a';
  ctx.strokeStyle = unlocked ? '#8effc8' : '#58bda0';
  ctx.lineWidth = unlocked ? 3.2 : 2.2;
  ctx.beginPath(); ctx.roundRect(-exit.radius - 4, -exit.radius * 0.82, (exit.radius + 4) * 2, exit.radius * 1.64, 10);
  ctx.fill(); ctx.stroke();

  // Inner luminous doorway light aperture
  const innerGrad = ctx.createLinearGradient(0, -exit.radius * 0.72, 0, exit.radius * 0.72);
  innerGrad.addColorStop(0, unlocked ? 'rgba(182,255,222,0.88)' : 'rgba(104,226,188,0.34)');
  innerGrad.addColorStop(1, unlocked ? 'rgba(30,196,138,0.52)' : 'rgba(20,76,66,0.22)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath(); ctx.roundRect(-exit.radius + 6, -exit.radius * 0.62, (exit.radius - 6) * 2, exit.radius * 1.24, 6);
  ctx.fill();

  // Left & right carved doorway jamb pillars
  ctx.fillStyle = unlocked ? '#7effc4' : '#6cb9a4';
  ctx.strokeStyle = '#071014'; ctx.lineWidth = 1.8;
  ctx.fillRect(-exit.radius - 7, -14, 9, 28); ctx.strokeRect(-exit.radius - 7, -14, 9, 28);
  ctx.fillRect(exit.radius - 2, -14, 9, 28); ctx.strokeRect(exit.radius - 2, -14, 9, 28);

  // Crisp double-chevron escape mark
  ctx.strokeStyle = unlocked ? '#ffffff' : '#b2f2de';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(-9, 7); ctx.lineTo(0, -3); ctx.lineTo(9, 7);
  ctx.moveTo(-6, -3); ctx.lineTo(0, -10); ctx.lineTo(6, -3);
  ctx.stroke();

  drawWorldOcrPill(
    ctx,
    0,
    -exit.radius - 12,
    unlocked ? 'EXIT · OPEN' : 'EXIT',
    unlocked ? '#6bffb8' : '#b8f5e0',
    '#091016',
    unlocked ? 13.5 : 12,
  );
  ctx.restore();
}

export function drawWorldOcrPill(ctx, cx, cy, text, bgFill, inkColor, fontSize = 11.5) {
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

function drawDot(ctx, x, y, r, fill, stroke = null, lw = 1.5) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function tracePoly(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}
