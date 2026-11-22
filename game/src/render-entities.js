// Entity & stealth telemetry rendering: hot amber-crimson danger vision cones (zero cone soup),
// alert propagation (! chain) pulses, 3x readable guard silhouettes with tier foot rings & nose
// chevrons, hover chime-target reticle, contextual [E] prompts, and acoustic ripples.

import { getChimeLandingPoint } from './acoustics.js';
import { findNearbyInteractable } from './player.js';
import { drawWorldOcrPill } from './render-lights.js';

export function renderGuardVisionCones(ctx, state) {
  for (const g of state.guards) {
    const poly = g.visionPolygon;
    if (!poly || poly.length < 3) continue;
    const tier = g.tier || 'QUIET';
    const [inner, mid, outer, stroke, scan] = CONE_STYLES[tier] || CONE_STYLES.QUIET;

    ctx.save();
    ctx.beginPath(); ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();

    const grad = ctx.createRadialGradient(g.x, g.y, 12, g.x, g.y, g.range);
    grad.addColorStop(0, inner); grad.addColorStop(0.55, mid); grad.addColorStop(1, outer);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = tier === 'QUIET' ? 2.2 : 2.8; ctx.stroke();

    ctx.save(); ctx.clip(); ctx.strokeStyle = scan; ctx.lineWidth = 1.15;
    for (const f of [0.42, 0.72]) { ctx.beginPath(); ctx.arc(g.x, g.y, g.range * f, g.facing - g.halfFov, g.facing + g.halfFov); ctx.stroke(); }
    ctx.restore();

    if (g.lastKnown && tier !== 'QUIET') {
      const lk = g.lastKnown;
      const mc = tier === 'LOCKDOWN' ? '#ff2a4d' : tier === 'SEARCH' ? '#ff4a2e' : g.investigateKind === 'chime' ? '#7df9e2' : '#ff8c2a';
      ctx.strokeStyle = mc; ctx.lineWidth = 1.9; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(lk.x, lk.y); ctx.stroke(); ctx.setLineDash([]);

      if (g.searchTimer > 0 && (tier === 'SEARCH' || tier === 'LOCKDOWN')) {
        const frac = Math.max(0.08, Math.min(1, g.searchTimer / (g.searchMaxTime || 4.5)));
        ctx.beginPath(); ctx.arc(lk.x, lk.y, 24, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,104,72,0.32)'; ctx.lineWidth = 3.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(lk.x, lk.y, 24, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.strokeStyle = '#ff6838'; ctx.lineWidth = 3.8; ctx.stroke();
      }
      ctx.save(); ctx.translate(lk.x, lk.y); ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = mc; ctx.fillStyle = tier === 'SEARCH' || tier === 'LOCKDOWN' ? 'rgba(255,70,48,0.34)' : 'rgba(255,148,48,0.28)';
      ctx.lineWidth = 2.2; ctx.fillRect(-8, -8, 16, 16); ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
    }
    ctx.restore();
  }
}

export function renderGuardsAndAlertMeters(ctx, state) {
  for (const l of state.alertLinks || []) {
    const fade = Math.max(0, 1 - l.age / l.duration);
    if (fade <= 0.04) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, fade * 1.2);
    ctx.strokeStyle = '#ff5432'; ctx.lineWidth = 3.2; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(l.fromX, l.fromY); ctx.lineTo(l.toX, l.toY); ctx.stroke(); ctx.setLineDash([]);
    const mx = (l.fromX + l.toX) * 0.5; const my = (l.fromY + l.toY) * 0.5;
    ctx.fillStyle = '#ff5432'; ctx.strokeStyle = '#080c10'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = '900 14px "Segoe UI",system-ui,sans-serif'; ctx.fillStyle = '#091016';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', mx, my + 0.5);
    ctx.restore();
  }

  for (const g of state.guards) {
    const tier = g.tier || 'QUIET';
    const isListener = g.archetype === 'listener';
    const ringCol = tier === 'LOCKDOWN' ? '#ff2a4d' : tier === 'SEARCH' ? '#ff4a2e' : tier === 'WARY' ? '#ffaa2b' : '#6bffb8';

    ctx.save(); ctx.translate(g.x, g.y);
    ctx.fillStyle = 'rgba(0,0,0,0.68)'; ctx.beginPath(); ctx.ellipse(2, 6, 18, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.strokeStyle = ringCol; ctx.lineWidth = 2.6; ctx.stroke();

    if (isListener) {
      const p = 0.72 + Math.sin(state.time * 3.4 + g.index) * 0.28;
      ctx.strokeStyle = `rgba(196,232,255,${0.62 * p})`; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.arc(0, 0, 23.5, -0.72, 0.72); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 23.5, Math.PI - 0.72, Math.PI + 0.72); ctx.stroke();
    }

    ctx.save(); ctx.rotate(g.facing);
    const st = Math.sin(g.stridePhase) * 4.5;
    ctx.fillStyle = '#181a22'; ctx.beginPath();
    ctx.ellipse(st, -7, 4.5, 3, 0, 0, Math.PI * 2); ctx.ellipse(-st, 7, 4.5, 3, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = isListener ? '#b83556' : '#e23d44'; ctx.strokeStyle = '#080c10'; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.ellipse(-1, 0, 12.8, 14.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = isListener ? '#dff0ff' : '#fceac2'; ctx.strokeStyle = isListener ? '#23445e' : '#141016'; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.ellipse(-2, -9.8, 6.8, 4.4, -0.25, 0, Math.PI * 2); ctx.ellipse(-2, 9.8, 6.8, 4.4, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#201a26'; ctx.strokeStyle = isListener ? '#cfeaff' : '#fae098'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -8.5); ctx.lineTo(-7.5, 0); ctx.lineTo(-4, 8.5); ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = tier === 'QUIET' ? '#ffffff' : ringCol; ctx.strokeStyle = '#06090e'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(13, -7.2); ctx.lineTo(16.5, 0); ctx.lineTo(13, 7.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    if (tier !== 'QUIET' || g.suspicion > 0.05) {
      const pct = Math.round(g.suspicion * 100);
      const isHigh = tier === 'LOCKDOWN' || tier === 'SEARCH';
      const isChime = g.investigateKind === 'chime';
      const nearTop = g.y < 145;
      const by = nearTop ? 36 : -36;
      const rc = tier === 'LOCKDOWN' ? '#ff2a4d' : tier === 'SEARCH' ? '#ff5432' : isChime ? '#7df9e2' : '#ffaa2b';

      ctx.beginPath(); ctx.arc(0, by, 15, 0, Math.PI * 2); ctx.fillStyle = '#091016'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, by, 15, -Math.PI / 2, -Math.PI / 2 + Math.max(0.16, g.suspicion) * Math.PI * 2);
      ctx.strokeStyle = rc; ctx.lineWidth = 3.6; ctx.stroke();

      ctx.font = '900 16px "Segoe UI",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rc; ctx.fillText(isHigh ? '!' : '?', 0, by + 0.5);

      let txt = g.callout || `WARY ${pct}%`; let sub = ''; let bg = '#ffba49';
      if (tier === 'LOCKDOWN') { txt = 'LOCKDOWN!'; bg = '#ff3b56'; }
      else if (tier === 'SEARCH') { txt = `"${g.callout || 'WHAT WAS THAT?'}"`; sub = `SEARCH ${pct}%`; bg = '#ff5c38'; }
      else if (isChime) { txt = '"HEARD CHIME"'; bg = '#7df9e2'; }

      drawWorldOcrPill(ctx, 0, nearTop ? by + 26 : by - 26, txt, bg, '#091016', 12);
      if (sub) drawWorldOcrPill(ctx, 0, nearTop ? -28 : 28, sub, '#ffe082', '#091016', 11);
    }
    ctx.restore();
  }
}

export function renderPlayerAndThrowArc(ctx, state, input, hudBounds) {
  const { player, playerVisibility: vis, time } = state;
  const inPlay = input.mouseInCanvas && (!hudBounds || (input.mouseCanvas.y > hudBounds.top && input.mouseCanvas.y < hudBounds.bottom));

  if (state.status === 'PLAYING' && !state.shotMode && inPlay && !player.activeChime) {
    const land = player.chimes > 0 ? getChimeLandingPoint(player, input.mouseWorld) : input.mouseWorld;
    ctx.save();
    if (player.chimes > 0 && Math.hypot(land.x - player.x, land.y - player.y) > 34) {
      ctx.strokeStyle = 'rgba(125,249,226,0.58)'; ctx.lineWidth = 1.7; ctx.setLineDash([4, 6]); ctx.beginPath();
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        ctx[i ? 'lineTo' : 'moveTo'](player.x + (land.x - player.x) * t, player.y + (land.y - player.y) * t - Math.sin(t * Math.PI) * 28);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.translate(land.x, land.y);
    ctx.strokeStyle = player.chimes > 0 ? '#ffe082' : 'rgba(180,210,220,0.45)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(-7, 0); ctx.moveTo(7, 0); ctx.lineTo(16, 0);
    ctx.moveTo(0, -16); ctx.lineTo(0, -7); ctx.moveTo(0, 7); ctx.lineTo(0, 16); ctx.stroke();
    ctx.fillStyle = '#7df9e2'; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (player.activeChime) {
    const c = player.activeChime;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 4, 6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe082'; ctx.strokeStyle = '#7df9e2'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c.x, c.y - c.z, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  for (const gh of player.afterimages) {
    ctx.save(); ctx.globalAlpha = Math.max(0, 0.48 * (1 - gh.age / 0.28)); ctx.fillStyle = '#7df9e2';
    ctx.beginPath(); ctx.arc(gh.x, gh.y, 11, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  ctx.save(); ctx.translate(player.x, player.y);
  if (vis.hidden) {
    const halo = ctx.createRadialGradient(0, 0, 8, 0, 0, 27);
    halo.addColorStop(0, 'rgba(125,249,226,0.36)'); halo.addColorStop(1, 'rgba(125,249,226,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(125,249,226,0.78)'; ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
  }
  if (player.hasRelic) {
    ctx.beginPath(); ctx.arc(0, 0, 21 + Math.sin(time * 5) * 2.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(107,255,184,0.92)'; ctx.lineWidth = 2.4; ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.54)'; ctx.beginPath(); ctx.ellipse(1.5, 5, 13.5, 9.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.rotate(player.facing);
  const sc = player.crouching ? 0.90 : 1.02; ctx.scale(sc, sc);
  ctx.fillStyle = vis.hidden ? '#124852' : '#1e6e7a'; ctx.strokeStyle = vis.hidden ? '#7df9e2' : '#ffe082'; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(14.5, 0); ctx.quadraticCurveTo(6, -13.5, -10, -11.5);
  ctx.quadraticCurveTo(-15.5, 0, -10, 11.5); ctx.quadraticCurveTo(6, 13.5, 14.5, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#0c272d'; ctx.beginPath(); ctx.arc(2, 0, 6.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8efff0'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(2, 0, 6.2, -0.8, 0.8); ctx.stroke();
  ctx.restore();

  if (player.dashCooldown > 0.05) {
    ctx.fillStyle = 'rgba(8,14,20,0.88)'; ctx.fillRect(-16, 19, 32, 4);
    ctx.fillStyle = '#7df9e2'; ctx.fillRect(-16, 19, 32 * (1 - player.dashCooldown / 1.65), 4);
  }
  if (state.status !== 'TITLE') {
    const highCool = state.guards.some((g) => g.recovering && g.suspicion >= 0.45);
    const anySpot = state.guards.some((g) => g.seesPlayer && g.suspicion > 0.12);
    let txt = vis.inSmoke ? 'HIDDEN · SMOKE' : vis.hidden ? 'HIDDEN' : vis.inSentryBeam ? 'EXPOSED' : 'LIT';
    let bg = vis.hidden ? '#7df9e2' : vis.inSentryBeam ? '#ff6b6b' : '#ffe082';
    if (anySpot) { txt = 'SPOTTED'; bg = '#ff6b6b'; }
    else if (highCool && vis.hidden) { txt = 'HIDDEN · COOLING'; bg = '#7df9e2'; }
    else if (player.hasRelic && vis.hidden) { txt = 'HIDDEN · RELIC'; bg = '#6bffb8'; }
    drawWorldOcrPill(ctx, 0, player.y < 86 ? 28 : -32, txt, bg, '#091016', 11.5);
  }
  ctx.restore();

  if (state.status === 'PLAYING' && !state.shotMode) {
    const ia = findNearbyInteractable(state);
    if (ia) drawWorldOcrPill(ctx, ia.x, Math.max(46, ia.y - 44), `[E] ${ia.label}`, ia.label.startsWith('LOCKED') ? '#ffaa44' : '#7df9e2', '#091016', 12);
  }
}

export function renderFootstepRipples(ctx, state, throughWallsPass) {
  ctx.save();
  for (const r of state.ripples) {
    if (throughWallsPass !== Boolean(r.throughWalls)) continue;
    const fade = Math.pow(1 - Math.min(1, r.age / r.duration), 1.3);
    if (fade <= 0.02) continue;

    for (let k = 0; k < (r.rings || 1); k++) {
      const rad = r.radius - k * (r.kind === 'chime' ? 28 : r.kind === 'alert-pulse' ? 32 : 16);
      if (rad <= 4) continue;
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.strokeStyle = k === 1 && r.accent ? r.accent : r.color;
      ctx.globalAlpha = fade * (r.kind === 'chime' || r.kind === 'alert-pulse' ? 0.90 : 0.65) * (1 - k * 0.2);
      ctx.lineWidth = r.kind === 'chime' || r.kind === 'alert-pulse' ? 3.2 - k * 0.5 : 2.0;
      if (r.kind === 'guard-step') ctx.setLineDash([6, 4]);
      if (r.kind === 'alert-pulse') ctx.setLineDash([10, 6]);
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (r.kind === 'chime') {
      if (r.masked) {
        const wisp = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, 42);
        wisp.addColorStop(0, 'rgba(182,248,242,0.44)'); wisp.addColorStop(1, 'rgba(116,198,194,0)');
        ctx.globalAlpha = Math.min(1, fade * 1.1); ctx.fillStyle = wisp; ctx.beginPath(); ctx.arc(r.x, r.y, 42, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = Math.min(1, fade * 1.15);
      ctx.fillStyle = '#7df9e2'; ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(r.x, r.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = Math.max(0.88, Math.min(1, fade * 1.45));
      drawWorldOcrPill(ctx, r.x, r.y + 22, r.label || 'CHIME', r.masked ? '#c8fff6' : '#7df9e2', '#091016', 11);
    }
  }
  ctx.restore();
}

export function renderPatrolRouteGuides(ctx, state) {
  ctx.save();
  for (const g of state.guards) {
    const wps = g.waypoints;
    if (wps.length < 2) continue;
    if (!state.showTelemetry) {
      const wp = wps[g.waypointIdx] || wps[0];
      const dx = wp.x - g.x; const dy = wp.y - g.y; const dist = Math.hypot(dx, dy);
      if (dist > 26) {
        const len = Math.min(82, dist - 10);
        const ex = g.x + (dx / dist) * len; const ey = g.y + (dy / dist) * len;
        const grad = ctx.createLinearGradient(g.x, g.y, ex, ey);
        grad.addColorStop(0, 'rgba(255,190,118,0.36)'); grad.addColorStop(1, 'rgba(255,190,118,0.02)');
        ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      }
      continue;
    }
    ctx.strokeStyle = 'rgba(255,214,132,0.74)'; ctx.lineWidth = 2; ctx.setLineDash([6, 7]);
    ctx.beginPath(); ctx.moveTo(wps[0].x, wps[0].y);
    for (let i = 1; i < wps.length; i++) ctx.lineTo(wps[i].x, wps[i].y);
    if (wps.length > 2) ctx.closePath();
    ctx.stroke(); ctx.setLineDash([]);
    const segs = wps.length > 2 ? wps.length : wps.length - 1;
    for (let i = 0; i < segs; i++) {
      const a = wps[i]; const b = wps[(i + 1) % wps.length];
      ctx.save(); ctx.translate((a.x + b.x) * 0.5, (a.y + b.y) * 0.5); ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
      ctx.strokeStyle = 'rgba(255,232,160,0.92)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-4.5, -4); ctx.lineTo(3.5, 0); ctx.lineTo(-4.5, 4); ctx.stroke();
      ctx.restore();
    }
    for (const wp of wps) { ctx.beginPath(); ctx.arc(wp.x, wp.y, 4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,226,146,0.85)'; ctx.fill(); }
  }
  ctx.restore();
}

const CONE_STYLES = {
  QUIET: ['rgba(255,152,32,0.44)', 'rgba(255,124,24,0.22)', 'rgba(242,96,18,0.09)', '#ff9c28', 'rgba(255,216,158,0.20)'],
  WARY: ['rgba(255,114,22,0.58)', 'rgba(255,88,20,0.32)', 'rgba(238,68,18,0.12)', '#ff6e1a', 'rgba(255,200,148,0.24)'],
  SEARCH: ['rgba(255,64,34,0.64)', 'rgba(242,46,30,0.36)', 'rgba(220,34,26,0.14)', '#ff3c24', 'rgba(255,176,150,0.26)'],
  LOCKDOWN: ['rgba(255,26,64,0.70)', 'rgba(235,18,54,0.40)', 'rgba(210,14,48,0.16)', '#ff1e4a', 'rgba(255,154,174,0.28)'],
};
