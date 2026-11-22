// Entity & stealth telemetry rendering: learnable patrol route tracks, cover-occluded 3-state vision cones,
// concentric footstep/chime acoustic ripples, high-contrast Wardens, alert gauges, and the Player Infiltrator.

import { findNearbyInteractable, getChimeLandingPoint } from './player.js';

export function renderPatrolRouteGuides(ctx, state) {
  const strong = state.showTelemetry;
  const alpha = strong ? 0.78 : 0.34;

  ctx.save();
  for (const guard of state.guards) {
    const wps = guard.waypoints;
    if (wps.length < 2) continue;

    ctx.strokeStyle = `rgba(246, 214, 134, ${alpha})`;
    ctx.lineWidth = strong ? 2 : 1.4;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(wps[0].x, wps[0].y);
    for (let i = 1; i < wps.length; i++) {
      ctx.lineTo(wps[i].x, wps[i].y);
    }
    if (wps.length > 2) ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Directional chevron arrows along patrol segments
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
      ctx.strokeStyle = `rgba(255, 224, 146, ${strong ? 0.92 : 0.52})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-4.5, -4);
      ctx.lineTo(3.5, 0);
      ctx.lineTo(-4.5, 4);
      ctx.stroke();
      ctx.restore();
    }

    // Waypoint nodes
    for (const wp of wps) {
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, strong ? 4.2 : 2.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 222, 138, ${strong ? 0.85 : 0.42})`;
      ctx.fill();
    }
  }
  ctx.restore();
}

export function renderGuardVisionCones(ctx, state) {
  for (const guard of state.guards) {
    const poly = guard.visionPolygon;
    if (!poly || poly.length < 3) continue;

    let innerColor = 'rgba(252, 206, 86, 0.42)';
    let midColor = 'rgba(248, 184, 60, 0.22)';
    let outerColor = 'rgba(246, 178, 56, 0.06)';
    let strokeColor = 'rgba(255, 218, 112, 0.84)';

    if (guard.state === 'ALERT' || guard.state === 'SEARCHING') {
      innerColor = 'rgba(255, 62, 82, 0.54)';
      midColor = 'rgba(255, 48, 72, 0.29)';
      outerColor = 'rgba(255, 48, 72, 0.09)';
      strokeColor = 'rgba(255, 102, 120, 0.96)';
    } else if (guard.state === 'SUSPICIOUS' || guard.state === 'INVESTIGATING') {
      innerColor = 'rgba(255, 146, 44, 0.50)';
      midColor = 'rgba(255, 132, 38, 0.27)';
      outerColor = 'rgba(255, 128, 36, 0.09)';
      strokeColor = 'rgba(255, 176, 84, 0.94)';
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

    // Crisp outer rim + ray boundaries
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.75;
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sightline & last-known-position diamond during suspicion / investigation / alert
    if (guard.lastKnown && guard.state !== 'PATROL') {
      const lk = guard.lastKnown;
      ctx.strokeStyle = guard.state === 'ALERT' ? 'rgba(255, 96, 114, 0.85)' : 'rgba(255, 178, 86, 0.82)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(lk.x, lk.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Last known tactical diamond
      ctx.save();
      ctx.translate(lk.x, lk.y);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = guard.state === 'ALERT' ? '#ff5468' : '#ffad42';
      ctx.fillStyle = guard.state === 'ALERT' ? 'rgba(255, 68, 92, 0.22)' : 'rgba(255, 173, 66, 0.22)';
      ctx.lineWidth = 2;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
    }

    ctx.restore();
  }
}

export function renderFootstepRipples(ctx, state, throughWallsPass) {
  ctx.save();
  for (const r of state.ripples) {
    if (throughWallsPass && !r.throughWalls) continue;
    if (!throughWallsPass && r.throughWalls) continue;

    const progress = Math.min(1, r.age / r.duration);
    const fade = Math.pow(1 - progress, 1.35);
    if (fade <= 0.02) continue;

    const ringCount = r.rings || 1;
    for (let k = 0; k < ringCount; k++) {
      const rad = r.radius - k * (r.kind === 'chime' ? 28 : 16);
      if (rad <= 4) continue;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.strokeStyle = k === 1 && r.accent ? r.accent : r.color;
      ctx.globalAlpha = fade * (r.kind === 'chime' ? 0.86 : 0.62) * (1 - k * 0.22);
      ctx.lineWidth = r.kind === 'chime' ? 2.8 - k * 0.5 : 1.9;
      if (r.kind === 'guard-step') ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (r.kind === 'chime') {
      ctx.globalAlpha = Math.min(1, fade * 1.1);
      ctx.fillStyle = '#6fffe9';
      ctx.beginPath();
      ctx.arc(r.x, r.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd976';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.font = '800 10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      const cw = 46;
      ctx.fillStyle = 'rgba(7, 16, 22, 0.90)';
      ctx.strokeStyle = '#6fffe9';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(r.x - cw / 2, r.y + 12, cw, 15, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b4fff5';
      ctx.fillText('CHIME', r.x, r.y + 23);
    }
  }
  ctx.restore();
}

export function renderGuardsAndAlertMeters(ctx, state) {
  for (const guard of state.guards) {
    ctx.save();
    ctx.translate(guard.x, guard.y);

    // Ground contact shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(2, 6, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotate body to facing direction
    ctx.save();
    ctx.rotate(guard.facing);

    // Animated marching boots
    const stride = Math.sin(guard.stridePhase) * 4.5;
    ctx.fillStyle = '#1b1d24';
    ctx.beginPath();
    ctx.ellipse(stride, -7, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(-stride, 7, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // High-contrast Crimson Warden cloak & bold Ivory-Gold shoulders
    ctx.fillStyle = '#d9383a';
    ctx.strokeStyle = '#090d12';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(-1, 0, 12.5, 14.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ivory-gold pauldrons / shoulder mantle (pops on both dark shadow and warm light!)
    ctx.fillStyle = '#f6e2b3';
    ctx.strokeStyle = '#161316';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(-2, -9.5, 6.5, 4.2, -0.25, 0, Math.PI * 2);
    ctx.ellipse(-2, 9.5, 6.5, 4.2, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Brass hand-lantern held forward-right
    const lx = 13;
    const ly = 8;
    const lanternGlow = ctx.createRadialGradient(lx, ly, 1, lx, ly, 16);
    lanternGlow.addColorStop(0, 'rgba(255, 232, 142, 0.9)');
    lanternGlow.addColorStop(1, 'rgba(255, 180, 62, 0)');
    ctx.fillStyle = lanternGlow;
    ctx.beginPath();
    ctx.arc(lx, ly, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff5c8';
    ctx.strokeStyle = '#8b5e1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(lx, ly, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Directional Bicorn cap + gold visor arrow
    ctx.fillStyle = '#231d28';
    ctx.strokeStyle = '#f7d88b';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(10.5, 0);
    ctx.lineTo(-4, -8.5);
    ctx.lineTo(-7.5, 0);
    ctx.lineTo(-4, 8.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // --- Overhead 3-State Radial Suspicion / Alert Badge ---
    if (guard.state !== 'PATROL' || guard.suspicion > 0.05) {
      const pct = Math.round(guard.suspicion * 100);
      const isAlert = guard.state === 'ALERT' || guard.state === 'SEARCHING';
      const badgeY = -34;
      const ringColor = isAlert ? '#ff4258' : guard.state === 'INVESTIGATING' ? '#6fffe9' : '#ff9d36';

      ctx.beginPath();
      ctx.arc(0, badgeY, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10, 14, 20, 0.94)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Radial progress arc
      const progress = Math.max(0.15, guard.suspicion);
      ctx.beginPath();
      ctx.arc(0, badgeY, 14, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3.2;
      ctx.stroke();

      // Bold ? or ! icon
      ctx.font = '900 14px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ringColor;
      ctx.fillText(isAlert ? '!' : '?', 0, badgeY + 0.5);

      // Compact telemetry label above badge
      const subLabel = isAlert
        ? (guard.state === 'SEARCHING' ? 'SEARCHING' : 'ALERT!')
        : guard.state === 'INVESTIGATING'
          ? 'INVESTIGATE'
          : guard.recovering
            ? `COOLING ${pct}%`
            : `${pct}%`;

      ctx.font = '800 10px "Segoe UI", system-ui, sans-serif';
      const tw = ctx.measureText(subLabel).width + 10;
      ctx.fillStyle = 'rgba(9, 13, 19, 0.90)';
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.roundRect(-tw / 2, badgeY - 32, tw, 15, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff5e4';
      ctx.fillText(subLabel, 0, badgeY - 24);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();
  }
}

export function renderPlayerAndThrowArc(ctx, state, input) {
  const { player, playerVisibility: vis, time } = state;

  // --- Live dotted Brass Chime throw arc (in active play when mouse is in canvas) ---
  if (state.status === 'PLAYING' && !state.shotMode && player.chimes > 0 && input.mouseInCanvas && !player.activeChime) {
    const land = getChimeLandingPoint(player, input.mouseWorld);
    const dist = Math.hypot(land.x - player.x, land.y - player.y);
    if (dist > 34) {
      ctx.save();
      ctx.strokeStyle = 'rgba(111, 255, 233, 0.55)';
      ctx.lineWidth = 1.6;
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

      // Subtle landing reticle + lure preview ring
      ctx.beginPath();
      ctx.arc(land.x, land.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd976';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(land.x, land.y, 68, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(111, 255, 233, 0.20)';
      ctx.setLineDash([5, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // --- Mid-flight Brass Chime projectile ---
  if (player.activeChime) {
    const c = player.activeChime;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 4, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd976';
    ctx.strokeStyle = '#6fffe9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y - c.z, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // --- Shadow-step dash afterimages ---
  for (const ghost of player.afterimages) {
    const alpha = Math.max(0, 0.45 * (1 - ghost.age / 0.28));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#6fffe9';
    ctx.beginPath();
    ctx.arc(ghost.x, ghost.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --- Player Infiltrator Silhouette ---
  ctx.save();
  ctx.translate(player.x, player.y);

  // Concealed shadow-cloaked ring OR Relic golden aura
  if (vis.hidden) {
    const halo = ctx.createRadialGradient(0, 0, 8, 0, 0, 26);
    halo.addColorStop(0, 'rgba(111, 255, 233, 0.28)');
    halo.addColorStop(1, 'rgba(111, 255, 233, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(111, 255, 233, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (player.hasRelic) {
    const pulse = 20 + Math.sin(time * 5) * 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 224, 120, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
  ctx.beginPath();
  ctx.ellipse(1.5, 5, 13, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hooded Verdigris cloak
  ctx.save();
  ctx.rotate(player.facing);
  const scale = player.crouching ? 0.88 : 1.0;
  ctx.scale(scale, scale);

  ctx.fillStyle = vis.hidden ? '#133f47' : '#1b5f69';
  ctx.strokeStyle = vis.hidden ? '#6fffe9' : '#b2fff4';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.quadraticCurveTo(6, -13, -10, -11);
  ctx.quadraticCurveTo(-15, 0, -10, 11);
  ctx.quadraticCurveTo(6, 13, 14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hood peak + crisp cyan-mint scarf highlight
  ctx.fillStyle = '#0c272d';
  ctx.beginPath();
  ctx.arc(2, 0, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7affec';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(2, 0, 6.2, -0.8, 0.8);
  ctx.stroke();
  ctx.restore();

  // Shadow-step dash cooldown mini-bar (shown only while recharging)
  if (player.dashCooldown > 0.05) {
    const ratio = 1 - player.dashCooldown / 1.65;
    ctx.fillStyle = 'rgba(8, 14, 20, 0.85)';
    ctx.fillRect(-16, 19, 32, 4);
    ctx.fillStyle = '#6fffe9';
    ctx.fillRect(-16, 19, 32 * ratio, 4);
  }

  // Diegetic HIDDEN / RECOVERING / EXPOSED pill badge
  const anyCooling = state.guards.some((g) => g.recovering && g.suspicion > 0.08);
  const anySpotted = state.guards.some((g) => g.seesPlayer && g.suspicion > 0.12);
  let pillText = vis.hidden ? 'HIDDEN' : 'EXPOSED';
  let pillBorder = vis.hidden ? '#6fffe9' : '#ffb347';
  let pillTextColor = vis.hidden ? '#8efff0' : '#ffd58c';

  if (anySpotted) {
    pillText = 'SPOTTED';
    pillBorder = '#ff4b60';
    pillTextColor = '#ff98a4';
  } else if (anyCooling && vis.hidden) {
    pillText = 'HIDDEN · COOLING';
    pillBorder = '#6fffe9';
    pillTextColor = '#9bfff1';
  } else if (player.hasRelic && vis.hidden) {
    pillText = 'HIDDEN · RELIC';
    pillBorder = '#ffd976';
    pillTextColor = '#ffebb0';
  }

  ctx.font = '800 10px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  const pw = ctx.measureText(pillText).width + 12;
  const pillY = player.y < 76 ? 21 : -37;
  ctx.fillStyle = 'rgba(7, 14, 20, 0.92)';
  ctx.strokeStyle = pillBorder;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-pw / 2, pillY, pw, 16, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = pillTextColor;
  ctx.fillText(pillText, 0, pillY + 11.5);

  ctx.restore();

  // --- Contextual [E] interaction prompt above nearby lamp / relic / exit ---
  if (state.status === 'PLAYING') {
    const interact = findNearbyInteractable(state);
    if (interact) {
      ctx.save();
      const text = `[E] ${interact.label}`;
      ctx.font = '800 11px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      const w = ctx.measureText(text).width + 16;
      const px = interact.x;
      const py = interact.y - 44;
      ctx.fillStyle = 'rgba(8, 16, 22, 0.94)';
      ctx.strokeStyle = '#6fffe9';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(px - w / 2, py - 11, w, 21, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8fffb';
      ctx.fillText(text, px, py + 3);
      ctx.restore();
    }
  }
}
