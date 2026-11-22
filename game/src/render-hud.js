// High-contrast HUD bar, 5-Heist Title & Mission Select overlay, Mission Complete & Caught modals.
// All interactive elements return crisp click hitboxes for seamless mouse & keyboard control.

import { CAMPAIGN_LEVELS } from './levels.js';

function drawPill(ctx, x, y, w, h, fill, stroke, radius = 6) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();
}

export function renderHudBar(ctx, state, width, height, audioMuted) {
  const buttons = [];
  const hudH = 48;

  ctx.save();
  // Top glass-obsidian HUD bar
  ctx.fillStyle = 'rgba(8, 13, 20, 0.93)';
  ctx.fillRect(0, 0, width, hudH);
  ctx.fillStyle = 'rgba(91, 200, 174, 0.45)';
  ctx.fillRect(0, hudH - 1.5, width, 1.5);

  // Left: Brand + Stage Title
  ctx.font = '900 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#6fffe9';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('VERDIGRIS', 16, 24);

  const stageText = `STAGE ${state.level.id}/5 · ${state.level.name.toUpperCase()}`;
  ctx.font = '800 13.5px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#f5f2e6';
  ctx.fillText(stageText, 118, 24);

  // Compute max alert percentage across all guards
  let maxSusp = 0;
  let anyAlert = false;
  let anyRecover = false;
  for (const g of state.guards) {
    if (g.suspicion > maxSusp) maxSusp = g.suspicion;
    if (g.state === 'ALERT' || g.state === 'SEARCHING') anyAlert = true;
    if (g.recovering && g.suspicion > 0.06) anyRecover = true;
  }
  const alertPct = Math.round(maxSusp * 100);

  // Right-side status pills + compact stage switcher
  let rx = width - 14;

  // Menu button
  const menuW = 54;
  rx -= menuW;
  drawPill(ctx, rx, 11, menuW, 26, 'rgba(20, 32, 42, 0.9)', 'rgba(130, 175, 190, 0.45)', 5);
  ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#d7e8ee';
  ctx.textAlign = 'center';
  ctx.fillText('MENU', rx + menuW / 2, 24.5);
  buttons.push({ id: 'menu', x: rx, y: 11, w: menuW, h: 26 });

  // Audio mute button
  rx -= 8;
  const sfxW = 50;
  rx -= sfxW;
  drawPill(ctx, rx, 11, sfxW, 26, 'rgba(20, 32, 42, 0.9)', audioMuted ? 'rgba(255,100,100,0.45)' : 'rgba(91,200,174,0.45)', 5);
  ctx.fillStyle = audioMuted ? '#ff9ea8' : '#96f6e2';
  ctx.fillText(audioMuted ? 'MUTE' : 'SFX', rx + sfxW / 2, 24.5);
  buttons.push({ id: 'mute', x: rx, y: 11, w: sfxW, h: 26 });

  // Stage quick-select 1..5 buttons (shown on wide desktop viewports so 1024px HUD never crowds)
  if (width >= 1120) {
    rx -= 10;
    for (let s = 5; s >= 1; s--) {
      const bw = 24;
      rx -= bw;
      const active = state.level.id === s;
      drawPill(
        ctx,
        rx,
        11,
        bw,
        26,
        active ? 'rgba(91, 200, 174, 0.28)' : 'rgba(17, 25, 34, 0.85)',
        active ? '#6fffe9' : 'rgba(120, 150, 165, 0.3)',
        5,
      );
      ctx.fillStyle = active ? '#bafff5' : '#9cb3be';
      ctx.fillText(String(s), rx + bw / 2, 24.5);
      buttons.push({ id: `stage-${s}`, stage: s, x: rx, y: 11, w: bw, h: 26 });
      rx -= 4;
    }
  }

  // Telemetry pills: ALERT, RELIC, CHIMES, STEALTH STATUS
  const alertColor = anyAlert ? '#ff4a5e' : alertPct > 0 ? '#ff9f43' : '#6fffe9';
  const alertW = 86;
  rx -= 10 + alertW;
  drawPill(ctx, rx, 10, alertW, 28, 'rgba(14, 21, 30, 0.95)', alertColor, 6);
  ctx.font = '800 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = alertColor;
  ctx.fillText(`ALERT ${alertPct}%`, rx + alertW / 2, 24.5);

  const relicSecured = state.player.hasRelic;
  const relicW = 88;
  rx -= 8 + relicW;
  drawPill(ctx, rx, 10, relicW, 28, relicSecured ? 'rgba(14, 62, 48, 0.92)' : 'rgba(14, 21, 30, 0.95)', relicSecured ? '#3ff2b6' : '#f0c563', 6);
  ctx.fillStyle = relicSecured ? '#9effdd' : '#ffe39c';
  ctx.fillText(`RELIC ${relicSecured ? '1/1' : '0/1'}`, rx + relicW / 2, 24.5);

  const chimeW = 86;
  rx -= 8 + chimeW;
  drawPill(ctx, rx, 10, chimeW, 28, 'rgba(14, 21, 30, 0.95)', '#6fffe9', 6);
  ctx.fillStyle = '#aefdf2';
  ctx.fillText(`CHIMES ${state.player.chimes}`, rx + chimeW / 2, 24.5);

  let statusLabel = state.playerVisibility.hidden ? 'HIDDEN' : 'EXPOSED';
  let statusBorder = state.playerVisibility.hidden ? '#6fffe9' : '#ffb347';
  let statusBg = state.playerVisibility.hidden ? 'rgba(12, 46, 52, 0.92)' : 'rgba(56, 36, 14, 0.92)';
  if (anyAlert) {
    statusLabel = 'ALERT!';
    statusBorder = '#ff4a5e';
    statusBg = 'rgba(72, 16, 26, 0.94)';
  } else if (anyRecover) {
    statusLabel = 'RECOVERING';
    statusBorder = '#ffae42';
    statusBg = 'rgba(56, 36, 14, 0.94)';
  }
  const stW = statusLabel.length > 8 ? 106 : 84;
  rx -= 8 + stW;
  drawPill(ctx, rx, 10, stW, 28, statusBg, statusBorder, 6);
  ctx.fillStyle = '#f8f8f2';
  ctx.fillText(statusLabel, rx + stW / 2, 24.5);

  // Event / objective banner directly under HUD bar when active
  const banner = state.bannerTimer > 0
    ? state.bannerText
    : state.player.hasRelic
      ? 'RELIC SECURED · REACH EXIT UNSEEN'
      : null;

  if (banner && state.status === 'PLAYING') {
    ctx.font = '800 12px "Segoe UI", system-ui, sans-serif';
    const bw = ctx.measureText(banner).width + 28;
    const bx = (width - bw) / 2;
    const by = hudH + 10;
    const isRelicBanner = state.player.hasRelic;
    drawPill(
      ctx,
      bx,
      by,
      bw,
      26,
      isRelicBanner ? 'rgba(10, 48, 38, 0.93)' : 'rgba(10, 18, 28, 0.90)',
      isRelicBanner ? '#44f5b8' : '#f2c86b',
      13,
    );
    ctx.fillStyle = isRelicBanner ? '#b2ffe4' : '#ffebb4';
    ctx.fillText(banner, width / 2, by + 13.5);
  }

  // Bottom compact control strip during gameplay
  const footH = 26;
  ctx.fillStyle = 'rgba(7, 12, 18, 0.88)';
  ctx.fillRect(0, height - footH, width, footH);
  ctx.fillStyle = 'rgba(91, 200, 174, 0.25)';
  ctx.fillRect(0, height - footH, width, 1);

  ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#a9c1ca';
  ctx.textAlign = 'center';
  ctx.fillText(
    'WASD / Arrows Move   ·   Shift Crouch Silent   ·   Space Shadow-Step   ·   Click / Q Toss Brass Chime   ·   E Steal / Snuff Lamp   ·   Tab Patrol Routes   ·   R Retry',
    width / 2,
    height - footH / 2 + 0.5,
  );

  ctx.restore();
  return buttons;
}

export function renderTitleMissionSelect(ctx, state, width, height) {
  const buttons = [];

  ctx.save();
  // Translucent atmospheric scrim so live patrolling guards & cones shine on both flanks
  ctx.fillStyle = 'rgba(6, 11, 18, 0.44)';
  ctx.fillRect(0, 0, width, height);

  const cardW = Math.min(646, width - 96);
  const cardH = Math.min(560, height - 72);
  const cx = (width - cardW) / 2;
  const cy = (height - cardH) / 2;

  // Architectural glass-obsidian modal card
  ctx.fillStyle = 'rgba(10, 17, 26, 0.88)';
  ctx.strokeStyle = '#5bc8ae';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx, cy, cardW, cardH, 14);
  ctx.fill();
  ctx.stroke();

  // Inner brass hairline border
  ctx.strokeStyle = 'rgba(240, 185, 91, 0.30)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cx + 8, cy + 8, cardW - 16, cardH - 16, 10);
  ctx.stroke();

  // Header & tagline
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 40px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#7bf5db';
  ctx.fillText('VERDIGRIS', width / 2, cy + 48);

  ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#f0c56b';
  ctx.fillText('ARCHITECTURAL STEALTH HEIST  ·  5 NOCTURNAL COURTYARDS', width / 2, cy + 78);

  // Mission Select List (all 5 handcrafted stages)
  const listX = cx + 28;
  const listW = cardW - 56;
  let rowY = cy + 104;
  const rowH = 54;
  const gap = 7;

  for (const lvl of CAMPAIGN_LEVELS) {
    const selected = state.selectedStage === lvl.id;
    drawPill(
      ctx,
      listX,
      rowY,
      listW,
      rowH,
      selected ? 'rgba(22, 58, 56, 0.92)' : 'rgba(14, 22, 32, 0.84)',
      selected ? '#6fffe9' : 'rgba(116, 152, 166, 0.34)',
      9,
    );

    // 3-color palette swatch pill
    const swX = listX + 14;
    const swY = rowY + 17;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = lvl.palette.swatch[i];
      ctx.fillRect(swX + i * 12, swY, 10, 24);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(swX + i * 12, swY, 10, 24);
    }

    // Mission number + name + subtitle
    ctx.textAlign = 'left';
    ctx.font = '800 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = selected ? '#d9fff8' : '#eef3f0';
    ctx.fillText(`0${lvl.id}  ${lvl.name}`, listX + 62, rowY + 21);

    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#9db7c0';
    ctx.fillText(lvl.subtitle, listX + 62, rowY + 41);

    // Right-aligned target relic & guard telemetry
    ctx.textAlign = 'right';
    ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#f2cc72';
    ctx.fillText(`RELIC: ${lvl.relicName.toUpperCase()}`, listX + listW - 16, rowY + 21);
    ctx.fillStyle = '#89c4ba';
    ctx.fillText(`${lvl.guards.length} WARDENS  ·  ${lvl.chimes} CHIMES`, listX + listW - 16, rowY + 41);

    buttons.push({ id: `select-${lvl.id}`, stage: lvl.id, x: listX, y: rowY, w: listW, h: rowH });
    rowY += rowH + gap;
  }

  // Crisp Keyboard + Mouse controls strip
  const ctrlY = rowY + 6;
  drawPill(ctx, listX, ctrlY, listW, 46, 'rgba(9, 15, 22, 0.90)', 'rgba(91, 200, 174, 0.30)', 8);
  ctx.textAlign = 'center';
  ctx.font = '700 12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#dff6f2';
  ctx.fillText('WASD Move   ·   SHIFT Crouch   ·   SPACE Dash   ·   MOUSE CLICK / Q Toss Brass Chime   ·   E Steal & Snuff Lamps', width / 2, ctrlY + 17);
  ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#92b2bd';
  ctx.fillText('Stay inside hatched shadows behind cover · Break sightlines to cool guard suspicion · Press 1–5 to jump stages', width / 2, ctrlY + 34);

  // Bold START HEIST CTA button
  const btnW = 244;
  const btnH = 44;
  const btnX = (width - btnW) / 2;
  const btnY = ctrlY + 58;
  drawPill(ctx, btnX, btnY, btnW, btnH, '#1d8a74', '#7fffe9', 9);
  ctx.font = '900 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#f5fffd';
  ctx.fillText(`START HEIST  (STAGE ${state.selectedStage})`, width / 2, btnY + btnH / 2 + 1);
  buttons.push({ id: 'start', x: btnX, y: btnY, w: btnW, h: btnH });

  ctx.restore();
  return buttons;
}

export function renderMissionCompleteModal(ctx, state, width, height) {
  const buttons = [];
  ctx.save();
  ctx.fillStyle = 'rgba(5, 12, 16, 0.68)';
  ctx.fillRect(0, 0, width, height);

  const w = 440;
  const h = 286;
  const x = (width - w) / 2;
  const y = (height - h) / 2;

  drawPill(ctx, x, y, w, h, 'rgba(9, 24, 26, 0.96)', '#44f5b8', 14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '900 28px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#7dffcf';
  ctx.fillText('EXTRACTION COMPLETE', width / 2, y + 48);

  ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#f2cc72';
  ctx.fillText(`${state.level.name.toUpperCase()}  ·  ${state.level.relicName.toUpperCase()} SECURED`, width / 2, y + 80);

  const rating = state.alertsTriggered === 0 ? 'GHOST RATING · UNDETECTED' : 'CLEAN EXTRACTION';
  ctx.font = '800 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#a8ffe5';
  ctx.fillText(rating, width / 2, y + 118);

  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#c5dde0';
  ctx.fillText(
    `Time: ${state.elapsed.toFixed(1)}s   ·   Lamps Snuffed: ${state.lampsSnuffed}   ·   Alerts: ${state.alertsTriggered}`,
    width / 2,
    y + 150,
  );

  const hasNext = state.level.id < CAMPAIGN_LEVELS.length;
  const bw = 176;
  const bh = 42;
  const primaryX = width / 2 - bw - 8;
  const secondaryX = width / 2 + 8;
  const by = y + 206;

  drawPill(ctx, primaryX, by, bw, bh, '#1d8a74', '#7fffe9', 8);
  ctx.font = '800 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#f5fffd';
  ctx.fillText(hasNext ? 'NEXT HEIST [ENTER]' : 'REPLAY CAMPAIGN', primaryX + bw / 2, by + bh / 2 + 1);
  buttons.push({ id: hasNext ? 'next-stage' : 'stage-1', x: primaryX, y: by, w: bw, h: bh });

  drawPill(ctx, secondaryX, by, bw, bh, 'rgba(20, 34, 42, 0.92)', 'rgba(130, 175, 190, 0.5)', 8);
  ctx.fillStyle = '#d7e9ee';
  ctx.fillText('MISSION SELECT', secondaryX + bw / 2, by + bh / 2 + 1);
  buttons.push({ id: 'menu', x: secondaryX, y: by, w: bw, h: bh });

  ctx.restore();
  return buttons;
}

export function renderCaughtModal(ctx, state, width, height) {
  const buttons = [];
  ctx.save();
  ctx.fillStyle = 'rgba(18, 6, 10, 0.68)';
  ctx.fillRect(0, 0, width, height);

  const w = 420;
  const h = 248;
  const x = (width - w) / 2;
  const y = (height - h) / 2;

  drawPill(ctx, x, y, w, h, 'rgba(24, 10, 15, 0.96)', '#ff4c60', 14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '900 30px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#ff6b7c';
  ctx.fillText('SPOTTED BY WARDEN', width / 2, y + 52);

  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e7cdd2';
  ctx.fillText('Use hatched shadows, snuff wall lamps [E], or lure guards with a Brass Chime.', width / 2, y + 102);

  const bw = 172;
  const bh = 42;
  const by = y + 162;

  drawPill(ctx, width / 2 - bw - 8, by, bw, bh, '#b82a3b', '#ff8e9b', 8);
  ctx.font = '800 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#fff5f6';
  ctx.fillText('QUICK RETRY [R]', width / 2 - bw / 2 - 8, by + bh / 2 + 1);
  buttons.push({ id: 'retry', x: width / 2 - bw - 8, y: by, w: bw, h: bh });

  drawPill(ctx, width / 2 + 8, by, bw, bh, 'rgba(28, 22, 30, 0.92)', 'rgba(180, 145, 155, 0.45)', 8);
  ctx.fillStyle = '#e5d4d8';
  ctx.fillText('MISSION SELECT', width / 2 + bw / 2 + 8, by + bh / 2 + 1);
  buttons.push({ id: 'menu', x: width / 2 + 8, y: by, w: bw, h: bh });

  ctx.restore();
  return buttons;
}
