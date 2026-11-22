// Entity & stealth telemetry rendering: hard-edged 3-state cover-occluded vision cones,
// directional Warden chevrons, high-OCR callout pills, acoustic ripples, and subtle patrol guides.

import { findNearbyInteractable, getChimeLandingPoint } from './player.js';

export function renderGuardVisionCones(ctx, state) {
  for (const guard of state.guards) {
    const poly = guard.visionPolygon;
    if (!poly || poly.length < 3) continue;

    let innerColor = 'rgba(255, 224, 128, 0.40)';
    let midColor = 'rgba(250, 200, 88, 0.21)';
    let outerColor = 'rgba(246, 188, 72, 0.08)';
    let strokeColor = '#ffe48c';
    let scanColor = 'rgba(255, 238, 172, 0.16)';

    if (guard.state === 'ALERT' || guard.state === 'SEARCHING') {
      innerColor = 'rgba(255, 56, 76, 0.60)';
      midColor = 'rgba(255, 44, 68, 0.34)';
      outerColor = 'rgba(255, 44, 68, 0.12)';
      strokeColor = '#ff5268';
      scanColor = 'rgba(255, 160, 174, 0.24)';
    } else if (guard.state === 'SUSPICIOUS' || guard.state === 'INVESTIGATING') {
      innerColor = 'rgba(255, 148, 36, 0.56)';
      midColor = 'rgba(255, 134, 34, 0.31)';
      outerColor = 'rgba(255, 126, 32, 0.11)';
      strokeColor = '#ff9e44';
      scanColor = 'rgba(255, 212, 148, 0.22)';
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x, poly[i].y);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(guard.x, guard.y, 12, guard.x, guard.y, guard.range);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.55, midColor);
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
    ctx.fill();

    // Hard solid outer detection edge (stroked BEFORE inner scanlines replace current path!)
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = guard.state === 'PATROL' ? 2.1 : 2.6;
    ctx.stroke();

    // Subtle radial scanline arcs clipped inside cone to distinguish directional vision from circular lamps
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = scanColor;
    ctx.lineWidth = 1.15;
    for (const frac of [0.42, 0.72]) {
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, guard.range * frac, guard.facing - guard.halfFov, guard.facing + guard.halfFov);
      ctx.stroke();
    }
    ctx.restore();

    // Sightline & last-known-position diamond during suspicion / investigation / alert
    if (guard.lastKnown && guard.state !== 'PATROL') {
      const lk = guard.lastKnown;
      ctx.strokeStyle = guard.state === 'ALERT' ? '#ff6b6b' : guard.state === 'INVESTIGATING' ? '#7df9e2' : '#ff9e44';
      ctx.lineWidth = 1.9;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(lk.x, lk.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.save();
      ctx.translate(lk.x, lk.y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = guard.state === 'ALERT' ? '#ff5468' : guard.state === 'INVESTIGATING' ? '#7df9e2' : '#ff9e44';
      ctx.fillStyle = guard.state === 'ALERT' ? 'rgba(255, 68, 92, 0.30)' : 'rgba(255, 168, 66, 0.28)';
      ctx.lineWidth = 2.2;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
    }

    ctx.restore();
  }
}

export function renderGuardsAndAlertMeters(ctx, state) {
  for (const guard of state.guards) {
    ctx.save();
    ctx.translate(guard.x, guard.y);

    // Ground contact shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.50)';
    ctx.beginPath();
    ctx.ellipse(2, 6, 16, 11.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotate body to facing direction
    ctx.save();
    ctx.rotate(guard.facing);

    const stride = Math.sin(guard.stridePhase) * 4.5;
    ctx.fillStyle = '#1b1d24';
    ctx.beginPath();
    ctx.ellipse(stride, -7, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(-stride, 7, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // High-contrast Crimson Warden cloak & bold Ivory-Gold shoulders
    ctx.fillStyle = '#e23d44';
    ctx.strokeStyle = '#080c10';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(-1, 0, 12.8, 14.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bright ivory-gold shoulder mantle (pops on both dark slate & Crimson Archive)
    ctx.fillStyle = '#fceac2';
    ctx.strokeStyle = '#141016';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.ellipse(-2, -9.8, 6.8, 4.4, -0.25, 0, Math.PI * 2);
    ctx.ellipse(-2, 9.8, 6.8, 4.4, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Brass hand-lantern held forward-right
    const lx = 13;
    const ly = 8;
    const lanternGlow = ctx.createRadialGradient(lx, ly, 1, lx, ly, 16);
    lanternGlow.addColorStop(0, 'rgba(255, 236, 152, 0.92)');
    lanternGlow.addColorStop(1, 'rgba(255, 180, 62, 0)');
    ctx.fillStyle = lanternGlow;
    ctx.beginPath();
    ctx.arc(lx, ly, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8d4';
    ctx.strokeStyle = '#8b5e1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(lx, ly, 3.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Directional Bicorn cap
    ctx.fillStyle = '#201a26';
    ctx.strokeStyle = '#fae098';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-4, -8.5);
    ctx.lineTo(-7.5, 0);
    ctx.lineTo(-4, 8.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bold high-contrast directional facing chevron (reads immediately even at 244px!)
    ctx.fillStyle = guard.state === 'ALERT' ? '#ff6b6b' : guard.state === 'SUSPICIOUS' || guard.state === 'INVESTIGATING' ? '#ff9e44' : '#fff4c4';
    ctx.strokeStyle = '#080c10';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(13, -5.8);
    ctx.lineTo(15.5, 0);
    ctx.lineTo(13, 5.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // --- Overhead Radial Suspicion Gauge & High-OCR Callout Pills ---
    if (guard.state !== 'PATROL' || guard.suspicion > 0.05) {
      const pct = Math.round(guard.suspicion * 100);
      const isAlert = guard.state === 'ALERT' || guard.state === 'SEARCHING';
      const isChime = guard.state === 'INVESTIGATING';
      const nearTop = guard.y < 145;
      const badgeY = nearTop ? 34 : -34;
      const ringColor = isAlert ? '#ff6b6b' : isChime ? '#7df9e2' : pct >= 50 ? '#ff9e44' : '#ffe082';

      ctx.beginPath();
      ctx.arc(0, badgeY, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#091016';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      const progress = Math.max(0.16, guard.suspicion);
      ctx.beginPath();
      ctx.arc(0, badgeY, 15, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3.6;
      ctx.stroke();

      ctx.font = '900 16px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ringColor;
      ctx.fillText(isAlert ? '!' : '?', 0, badgeY + 0.5);
      ctx.textBaseline = 'alphabetic';

      // High-OCR Dark-Ink-on-Bright-Pill status / voice callout
      let primaryText = '';
      let secondaryText = '';
      let primaryBg = ringColor;

      if (isAlert) {
        primaryText = guard.state === 'SEARCHING' ? 'SEARCHING!' : 'ALERT!';
        primaryBg = '#ff6b6b';
      } else if (isChime) {
        primaryText = guard.callout ? `"${guard.callout}"` : '"HEARD CHIME"';
        primaryBg = '#7df9e2';
      } else if (guard.callout === 'WHAT WAS THAT?') {
        primaryText = '"WHAT WAS THAT?"';
        secondaryText = guard.recovering ? `COOLING ${pct}%` : `SPOTTING ${pct}%`;
        primaryBg = '#ff9e44';
      } else {
        primaryText = guard.callout || (guard.recovering ? `COOLING ${pct}%` : `CHECKING ${pct}%`);
        primaryBg = pct >= 50 ? '#ff9e44' : '#ffe082';
      }

      const calloutY = nearTop ? badgeY + 26 : badgeY - 26;
      drawOcrBadge(ctx, 0, calloutY, primaryText, primaryBg, '#091016', 12);

      if (secondaryText) {
        drawOcrBadge(ctx, 0, nearTop ? -26 : 28, secondaryText, '#ffe082', '#091016', 11);
      }
    }

    ctx.restore();
  }
}

export function renderPlayerAndThrowArc(ctx, state, input) {
  const { player, playerVisibility: vis, time } = state;

  // Live dotted Brass Chime throw arc
  if (state.status === 'PLAYING' && !state.shotMode && player.chimes > 0 && input.mouseInCanvas && !player.activeChime) {
    const land = getChimeLandingPoint(player, input.mouseWorld);
    const dist = Math.hypot(land.x - player.x, land.y - player.y);
    if (dist > 34) {
      ctx.save();
      ctx.strokeStyle = 'rgba(125, 249, 226, 0.58)';
      ctx.lineWidth = 1.7;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = player.x + (land.x - player.x) * t;
        const py = player.y + (land.y - player.y) * t - Math.sin(t * Math.PI) * 28;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(land.x, land.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffe082';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(land.x, land.y, 68, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(125, 249, 226, 0.22)';
      ctx.setLineDash([5, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // Mid-flight Brass Chime projectile
  if (player.activeChime) {
    const c = player.activeChime;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 4, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffe082';
    ctx.strokeStyle = '#7df9e2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y - c.z, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Shadow-step dash afterimages
  for (const ghost of player.afterimages) {
    const alpha = Math.max(0, 0.48 * (1 - ghost.age / 0.28));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#7df9e2';
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Player Infiltrator Silhouette
  ctx.save();
  ctx.translate(player.x, player.y);

  if (vis.hidden) {
    const halo = ctx.createRadialGradient(0, 0, 8, 0, 0, 27);
    halo.addColorStop(0, 'rgba(125, 249, 226, 0.34)');
    halo.addColorStop(1, 'rgba(125, 249, 226, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(125, 249, 226, 0.72)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (player.hasRelic) {
    const pulse = 21 + Math.sin(time * 5) * 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(107, 255, 184, 0.90)';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  ctx.beginPath();
  ctx.ellipse(1.5, 5, 13.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(player.facing);
  const scale = player.crouching ? 0.90 : 1.02;
  ctx.scale(scale, scale);

  ctx.fillStyle = vis.hidden ? '#124852' : '#1e6e7a';
  ctx.strokeStyle = vis.hidden ? '#7df9e2' : '#ffe082';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(14.5, 0);
  ctx.quadraticCurveTo(6, -13.5, -10, -11.5);
  ctx.quadraticCurveTo(-15.5, 0, -10, 11.5);
  ctx.quadraticCurveTo(6, 13.5, 14.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0c272d';
  ctx.beginPath();
  ctx.arc(2, 0, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8efff0';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(2, 0, 6.2, -0.8, 0.8);
  ctx.stroke();
  ctx.restore();

  if (player.dashCooldown > 0.05) {
    const ratio = 1 - player.dashCooldown / 1.65;
    ctx.fillStyle = 'rgba(8, 14, 20, 0.88)';
    ctx.fillRect(-16, 19, 32, 4);
    ctx.fillStyle = '#7df9e2';
    ctx.fillRect(-16, 19, 32 * ratio, 4);
  }

  // High-OCR diegetic player stealth pill (dark ink on bright luminance fill)
  const highCooling = state.guards.some((g) => g.recovering && g.suspicion >= 0.45);
  const anySpotted = state.guards.some((g) => g.seesPlayer && g.suspicion > 0.12);
  let pillText = vis.hidden ? 'HIDDEN · SHADOW' : vis.inSentryBeam ? 'EXPOSED' : 'LIT';
  let pillBg = vis.hidden ? '#7df9e2' : vis.inSentryBeam ? '#ff6b6b' : '#ffe082';

  if (anySpotted) {
    pillText = 'SPOTTED';
    pillBg = '#ff6b6b';
  } else if (highCooling && vis.hidden) {
    pillText = 'HIDDEN · COOLING';
    pillBg = '#7df9e2';
  } else if (player.hasRelic && vis.hidden) {
    pillText = 'HIDDEN · RELIC';
    pillBg = '#6bffb8';
  }

  const pillY = player.y < 86 ? 28 : -32;
  drawOcrBadge(ctx, 0, pillY, pillText, pillBg, '#091016', 11.5);

  ctx.restore();

  // Contextual [E] interaction prompt
  if (state.status === 'PLAYING') {
    const interact = findNearbyInteractable(state);
    if (interact) {
      drawOcrBadge(ctx, interact.x, interact.y - 44, `[E] ${interact.label}`, '#7df9e2', '#091016', 11.5);
    }
  }
}

export function renderFootstepRipples(ctx, state, throughWallsPass) {
  ctx.save();
  for (const r of state.ripples) {
    if (throughWallsPass && !r.throughWalls) continue;
    if (!throughWallsPass && r.throughWalls) continue;

    const progress = Math.min(1, r.age / r.duration);
    const fade = Math.pow(1 - progress, 1.3);
    if (fade <= 0.02) continue;

    const ringCount = r.rings || 1;
    for (let k = 0; k < ringCount; k++) {
      const rad = r.radius - k * (r.kind === 'chime' ? 28 : 16);
      if (rad <= 4) continue;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.strokeStyle = k === 1 && r.accent ? r.accent : r.color;
      ctx.globalAlpha = fade * (r.kind === 'chime' ? 0.90 : 0.65) * (1 - k * 0.2);
      ctx.lineWidth = r.kind === 'chime' ? 3.0 - k * 0.5 : 2.0;
      if (r.kind === 'guard-step') ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (r.kind === 'chime') {
      ctx.globalAlpha = Math.min(1, fade * 1.15);
      ctx.fillStyle = '#7df9e2';
      ctx.beginPath();
      ctx.arc(r.x, r.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffe082';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.globalAlpha = Math.max(0.86, Math.min(1, fade * 1.45));
      drawOcrBadge(ctx, r.x, r.y + 22, r.label || 'CHIME', '#7df9e2', '#091016', 11.5);
    }
  }
  ctx.restore();
}

export function renderPatrolRouteGuides(ctx, state) {
  const showFull = state.showTelemetry;

  ctx.save();
  for (const guard of state.guards) {
    const wps = guard.waypoints;
    if (wps.length < 2) continue;

    if (!showFull) {
      // Tactical default: only subtle short direction hint near each guard (full loops via Tab)
      const nextWp = wps[guard.waypointIdx] || wps[0];
      const dx = nextWp.x - guard.x;
      const dy = nextWp.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 26) {
        const len = Math.min(82, dist - 10);
        const ex = guard.x + (dx / dist) * len;
        const ey = guard.y + (dy / dist) * len;
        const grad = ctx.createLinearGradient(guard.x, guard.y, ex, ey);
        grad.addColorStop(0, 'rgba(255, 228, 148, 0.34)');
        grad.addColorStop(1, 'rgba(255, 228, 148, 0.02)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(guard.x, guard.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      continue;
    }

    // Full tactical patrol loops when toggled via [Tab]
    ctx.strokeStyle = 'rgba(255, 224, 138, 0.72)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.moveTo(wps[0].x, wps[0].y);
    for (let i = 1; i < wps.length; i++) {
      ctx.lineTo(wps[i].x, wps[i].y);
    }
    if (wps.length > 2) ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    const segCount = wps.length > 2 ? wps.length : wps.length - 1;
    for (let i = 0; i < segCount; i++) {
      const a = wps[i];
      const b = wps[(i + 1) % wps.length];
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(ang);
      ctx.strokeStyle = 'rgba(255, 232, 160, 0.92)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4.5, -4);
      ctx.lineTo(3.5, 0);
      ctx.lineTo(-4.5, 4);
      ctx.stroke();
      ctx.restore();
    }

    for (const wp of wps) {
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 226, 146, 0.85)';
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawOcrBadge(ctx, cx, cy, text, bgFill, inkColor, fontSize = 11.5) {
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
