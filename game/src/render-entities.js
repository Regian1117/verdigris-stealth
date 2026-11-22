// Entity & stealth telemetry rendering: 4-tier cover- & smoke-occluded vision cones, floor search
// timer rings, Warden & Acute Listener silhouettes, contextual [E] prompts, and acoustic ripples.

import { getChimeLandingPoint } from './acoustics.js';
import { findNearbyInteractable } from './player.js';

export function renderGuardVisionCones(ctx, state) {
  for (const guard of state.guards) {
    const poly = guard.visionPolygon;
    if (!poly || poly.length < 3) continue;

    const tier = guard.tier || 'QUIET';
    const [inner, mid, outer, stroke, scan] = CONE_STYLES[tier] || CONE_STYLES.QUIET;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();

    const grad = ctx.createRadialGradient(guard.x, guard.y, 12, guard.x, guard.y, guard.range);
    grad.addColorStop(0, inner); grad.addColorStop(0.55, mid); grad.addColorStop(1, outer);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = tier === 'QUIET' ? 2.1 : 2.6; ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.strokeStyle = scan; ctx.lineWidth = 1.15;
    for (const frac of [0.42, 0.72]) {
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, guard.range * frac, guard.facing - guard.halfFov, guard.facing + guard.halfFov);
      ctx.stroke();
    }
    ctx.restore();

    if (guard.lastKnown && tier !== 'QUIET') {
      const lk = guard.lastKnown;
      const isChime = guard.investigateKind === 'chime';
      const markerCol = tier === 'LOCKDOWN' ? '#ff4757' : tier === 'SEARCH' ? '#ff7847' : isChime ? '#7df9e2' : '#ffaa44';

      ctx.strokeStyle = markerCol; ctx.lineWidth = 1.9; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(guard.x, guard.y); ctx.lineTo(lk.x, lk.y); ctx.stroke();
      ctx.setLineDash([]);

      if (guard.searchTimer > 0 && (tier === 'SEARCH' || tier === 'LOCKDOWN')) {
        const frac = Math.max(0.08, Math.min(1, guard.searchTimer / (guard.searchMaxTime || 4.5)));
        ctx.beginPath(); ctx.arc(lk.x, lk.y, 24, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,130,88,0.28)'; ctx.lineWidth = 3.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(lk.x, lk.y, 24, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.strokeStyle = '#ff8b4a'; ctx.lineWidth = 3.8; ctx.stroke();
      }

      ctx.save();
      ctx.translate(lk.x, lk.y); ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = markerCol;
      ctx.fillStyle = tier === 'SEARCH' || tier === 'LOCKDOWN' ? 'rgba(255,86,68,0.32)' : 'rgba(255,168,66,0.26)';
      ctx.lineWidth = 2.2; ctx.fillRect(-8, -8, 16, 16); ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
    }
    ctx.restore();
  }
}

export function renderGuardsAndAlertMeters(ctx, state) {
  for (const guard of state.guards) {
    const tier = guard.tier || 'QUIET';
    const isListener = guard.archetype === 'listener';

    ctx.save();
    ctx.translate(guard.x, guard.y);

    if (isListener) {
      const pulse = 0.72 + Math.sin(state.time * 3.4 + guard.index) * 0.28;
      ctx.strokeStyle = `rgba(196,232,255,${0.56 * pulse})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, 21, -0.75, 0.75); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 21, Math.PI - 0.75, Math.PI + 0.75); ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.50)';
    ctx.beginPath(); ctx.ellipse(2, 6, 16, 11.5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.rotate(guard.facing);
    const stride = Math.sin(guard.stridePhase) * 4.5;
    ctx.fillStyle = '#1b1d24';
    ctx.beginPath();
    ctx.ellipse(stride, -7, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(-stride, 7, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isListener ? '#b83556' : '#e23d44';
    ctx.strokeStyle = '#080c10'; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.ellipse(-1, 0, 12.8, 14.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = isListener ? '#dff0ff' : '#fceac2';
    ctx.strokeStyle = isListener ? '#23445e' : '#141016'; ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.ellipse(-2, -9.8, 6.8, 4.4, -0.25, 0, Math.PI * 2);
    ctx.ellipse(-2, 9.8, 6.8, 4.4, 0.25, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    const lanternGlow = ctx.createRadialGradient(13, 8, 1, 13, 8, 16);
    lanternGlow.addColorStop(0, 'rgba(255,236,152,0.92)');
    lanternGlow.addColorStop(1, 'rgba(255,180,62,0)');
    ctx.fillStyle = lanternGlow;
    ctx.beginPath(); ctx.arc(13, 8, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8d4'; ctx.strokeStyle = '#8b5e1a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(13, 8, 3.9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#201a26'; ctx.strokeStyle = isListener ? '#cfeaff' : '#fae098'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -8.5); ctx.lineTo(-7.5, 0); ctx.lineTo(-4, 8.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = tier === 'LOCKDOWN' ? '#ff4757' : tier === 'SEARCH' ? '#ff7847' : tier === 'WARY' ? '#ffaa44' : '#fff4c4';
    ctx.strokeStyle = '#080c10'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(13, -5.8); ctx.lineTo(15.5, 0); ctx.lineTo(13, 5.8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    if (tier !== 'QUIET' || guard.suspicion > 0.05) {
      const pct = Math.round(guard.suspicion * 100);
      const isHigh = tier === 'LOCKDOWN' || tier === 'SEARCH';
      const isChime = guard.investigateKind === 'chime';
      const nearTop = guard.y < 145;
      const badgeY = nearTop ? 34 : -34;
      const ringCol = tier === 'LOCKDOWN' ? '#ff4757' : tier === 'SEARCH' ? '#ff7847' : isChime ? '#7df9e2' : '#ffaa44';

      ctx.beginPath(); ctx.arc(0, badgeY, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#091016'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2.6; ctx.stroke();

      ctx.beginPath(); ctx.arc(0, badgeY, 15, -Math.PI / 2, -Math.PI / 2 + Math.max(0.16, guard.suspicion) * Math.PI * 2);
      ctx.strokeStyle = ringCol; ctx.lineWidth = 3.6; ctx.stroke();

      ctx.font = '900 16px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ringCol;
      ctx.fillText(isHigh ? '!' : '?', 0, badgeY + 0.5);
      ctx.textBaseline = 'alphabetic';

      let primaryText = guard.callout || `WARY ${pct}%`;
      let secondaryText = '';
      let primaryBg = '#ffba49';
      if (tier === 'LOCKDOWN') { primaryText = 'LOCKDOWN!'; primaryBg = '#ff4757'; }
      else if (tier === 'SEARCH') { primaryText = `"${guard.callout || 'WHAT WAS THAT?'}"`; secondaryText = `SEARCH ${pct}%`; primaryBg = '#ff7847'; }
      else if (isChime) { primaryText = '"HEARD CHIME"'; primaryBg = '#7df9e2'; }

      drawOcrBadge(ctx, 0, nearTop ? badgeY + 26 : badgeY - 26, primaryText, primaryBg, '#091016', 12);
      if (secondaryText) drawOcrBadge(ctx, 0, nearTop ? -26 : 28, secondaryText, '#ffe082', '#091016', 11);
    }
    ctx.restore();
  }
}

export function renderPlayerAndThrowArc(ctx, state, input, hudBounds) {
  const { player, playerVisibility: vis, time } = state;
  const cursorInPlayfield = input.mouseInCanvas
    && (!hudBounds || (input.mouseCanvas.y > hudBounds.top && input.mouseCanvas.y < hudBounds.bottom));

  if (state.status === 'PLAYING' && !state.shotMode && player.chimes > 0 && cursorInPlayfield && !player.activeChime) {
    const land = getChimeLandingPoint(player, input.mouseWorld);
    if (Math.hypot(land.x - player.x, land.y - player.y) > 34) {
      ctx.save();
      ctx.strokeStyle = 'rgba(125,249,226,0.58)'; ctx.lineWidth = 1.7; ctx.setLineDash([4, 6]);
      ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        ctx[i ? 'lineTo' : 'moveTo'](
          player.x + (land.x - player.x) * t,
          player.y + (land.y - player.y) * t - Math.sin(t * Math.PI) * 28,
        );
      }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(land.x, land.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.restore();
    }
  }

  if (player.activeChime) {
    const c = player.activeChime;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath(); ctx.ellipse(c.x, c.y + 4, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe082'; ctx.strokeStyle = '#7df9e2'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c.x, c.y - c.z, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  for (const ghost of player.afterimages) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.48 * (1 - ghost.age / 0.28));
    ctx.fillStyle = '#7df9e2';
    ctx.beginPath(); ctx.arc(ghost.x, ghost.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(player.x, player.y);

  if (vis.hidden) {
    const halo = ctx.createRadialGradient(0, 0, 8, 0, 0, 27);
    halo.addColorStop(0, 'rgba(125,249,226,0.36)'); halo.addColorStop(1, 'rgba(125,249,226,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(125,249,226,0.76)'; ctx.lineWidth = 1.8; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
  }

  if (player.hasRelic) {
    ctx.beginPath(); ctx.arc(0, 0, 21 + Math.sin(time * 5) * 2.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(107,255,184,0.90)'; ctx.lineWidth = 2.4; ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath(); ctx.ellipse(1.5, 5, 13.5, 9.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.rotate(player.facing);
  const sc = player.crouching ? 0.90 : 1.02;
  ctx.scale(sc, sc);
  ctx.fillStyle = vis.hidden ? '#124852' : '#1e6e7a';
  ctx.strokeStyle = vis.hidden ? '#7df9e2' : '#ffe082'; ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(14.5, 0);
  ctx.quadraticCurveTo(6, -13.5, -10, -11.5);
  ctx.quadraticCurveTo(-15.5, 0, -10, 11.5);
  ctx.quadraticCurveTo(6, 13.5, 14.5, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#0c272d'; ctx.beginPath(); ctx.arc(2, 0, 6.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8efff0'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(2, 0, 6.2, -0.8, 0.8); ctx.stroke();
  ctx.restore();

  if (player.dashCooldown > 0.05) {
    ctx.fillStyle = 'rgba(8,14,20,0.88)'; ctx.fillRect(-16, 19, 32, 4);
    ctx.fillStyle = '#7df9e2'; ctx.fillRect(-16, 19, 32 * (1 - player.dashCooldown / 1.65), 4);
  }

  if (state.status !== 'TITLE') {
    const highCooling = state.guards.some((g) => g.recovering && g.suspicion >= 0.45);
    const anySpotted = state.guards.some((g) => g.seesPlayer && g.suspicion > 0.12);
    let pillText = vis.inSmoke ? 'HIDDEN · SMOKE' : vis.hidden ? 'HIDDEN · SHADOW' : vis.inSentryBeam ? 'EXPOSED' : 'LIT';
    let pillBg = vis.hidden ? '#7df9e2' : vis.inSentryBeam ? '#ff6b6b' : '#ffe082';
    if (anySpotted) { pillText = 'SPOTTED'; pillBg = '#ff6b6b'; }
    else if (highCooling && vis.hidden) { pillText = 'HIDDEN · COOLING'; pillBg = '#7df9e2'; }
    else if (player.hasRelic && vis.hidden) { pillText = 'HIDDEN · RELIC'; pillBg = '#6bffb8'; }
    drawOcrBadge(ctx, 0, player.y < 86 ? 28 : -32, pillText, pillBg, '#091016', 11.5);
  }
  ctx.restore();

  if (state.status === 'PLAYING' && !state.shotMode) {
    const interact = findNearbyInteractable(state);
    if (interact) {
      drawOcrBadge(ctx, interact.x, Math.max(46, interact.y - 44), `[E] ${interact.label}`, interact.label.startsWith('LOCKED') ? '#ffaa44' : '#7df9e2', '#091016', 12);
    }
  }
}

export function renderFootstepRipples(ctx, state, throughWallsPass) {
  ctx.save();
  for (const r of state.ripples) {
    if (throughWallsPass !== Boolean(r.throughWalls)) continue;
    const fade = Math.pow(1 - Math.min(1, r.age / r.duration), 1.3);
    if (fade <= 0.02) continue;

    for (let k = 0; k < (r.rings || 1); k++) {
      const rad = r.radius - k * (r.kind === 'chime' ? 28 : 16);
      if (rad <= 4) continue;
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.strokeStyle = k === 1 && r.accent ? r.accent : r.color;
      ctx.globalAlpha = fade * (r.kind === 'chime' ? 0.90 : 0.65) * (1 - k * 0.2);
      ctx.lineWidth = r.kind === 'chime' ? 3.0 - k * 0.5 : 2.0;
      if (r.kind === 'guard-step') ctx.setLineDash([6, 4]);
      ctx.stroke(); ctx.setLineDash([]);
    }

    if (r.kind === 'chime') {
      ctx.globalAlpha = Math.min(1, fade * 1.15);
      ctx.fillStyle = '#7df9e2'; ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(r.x, r.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
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
      const nextWp = wps[guard.waypointIdx] || wps[0];
      const dx = nextWp.x - guard.x; const dy = nextWp.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 26) {
        const len = Math.min(82, dist - 10);
        const ex = guard.x + (dx / dist) * len; const ey = guard.y + (dy / dist) * len;
        const grad = ctx.createLinearGradient(guard.x, guard.y, ex, ey);
        grad.addColorStop(0, 'rgba(255,228,148,0.34)'); grad.addColorStop(1, 'rgba(255,228,148,0.02)');
        ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(guard.x, guard.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      }
      continue;
    }

    ctx.strokeStyle = 'rgba(255,224,138,0.72)'; ctx.lineWidth = 2; ctx.setLineDash([6, 7]);
    ctx.beginPath(); ctx.moveTo(wps[0].x, wps[0].y);
    for (let i = 1; i < wps.length; i++) ctx.lineTo(wps[i].x, wps[i].y);
    if (wps.length > 2) ctx.closePath();
    ctx.stroke(); ctx.setLineDash([]);

    const segs = wps.length > 2 ? wps.length : wps.length - 1;
    for (let i = 0; i < segs; i++) {
      const a = wps[i]; const b = wps[(i + 1) % wps.length];
      ctx.save();
      ctx.translate((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
      ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
      ctx.strokeStyle = 'rgba(255,232,160,0.92)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-4.5, -4); ctx.lineTo(3.5, 0); ctx.lineTo(-4.5, 4); ctx.stroke();
      ctx.restore();
    }
    for (const wp of wps) {
      ctx.beginPath(); ctx.arc(wp.x, wp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,226,146,0.85)'; ctx.fill();
    }
  }
  ctx.restore();
}

const CONE_STYLES = {
  QUIET: ['rgba(255,224,128,0.40)', 'rgba(250,200,88,0.21)', 'rgba(246,188,72,0.08)', '#ffe48c', 'rgba(255,238,172,0.16)'],
  WARY: ['rgba(255,158,38,0.56)', 'rgba(255,142,34,0.30)', 'rgba(255,130,32,0.11)', '#ffaa44', 'rgba(255,214,148,0.22)'],
  SEARCH: ['rgba(255,102,46,0.60)', 'rgba(255,84,42,0.34)', 'rgba(255,72,42,0.12)', '#ff6b42', 'rgba(255,190,152,0.24)'],
  LOCKDOWN: ['rgba(255,48,72,0.64)', 'rgba(255,40,64,0.36)', 'rgba(255,40,64,0.14)', '#ff4757', 'rgba(255,160,174,0.26)'],
};

function drawOcrBadge(ctx, cx, cy, text, bgFill, inkColor, fontSize = 11.5) {
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
