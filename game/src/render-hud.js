// High-OCR stealth HUD bar, per-warden watch chips, Heist Complete & Mission Select unified screen,
// and heist rating/scoring summary for VERDIGRIS.

import { CAMPAIGN_LEVELS } from './levels.js';

export function renderHudBar(ctx, state, width, height, audioMuted) {
  const buttons = [];
  const hudH = 50;
  const wide = width >= 1160;

  ctx.save();
  ctx.fillStyle = 'rgba(7, 12, 19, 0.95)';
  ctx.fillRect(0, 0, width, hudH);
  ctx.fillStyle = 'rgba(125, 249, 226, 0.45)';
  ctx.fillRect(0, hudH - 1.5, width, 1.5);

  // Left: Brand + Stage Title
  ctx.font = '900 17px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#7df9e2';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('VERDIGRIS', 16, 25);

  const shortName = wide ? state.level.name : state.level.name.replace(/^The\s+/i, '');
  const stageText = `STAGE ${state.level.id}/5 · ${shortName.toUpperCase()}`;
  ctx.font = '800 13.5px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#f5f2e6';
  ctx.fillText(stageText, 120, 25);

  // Compute max alert state
  let maxSusp = 0;
  let anyAlert = false;
  let anyRecover = false;
  for (const g of state.guards) {
    if (g.suspicion > maxSusp) maxSusp = g.suspicion;
    if (g.state === 'ALERT' || g.state === 'SEARCHING') anyAlert = true;
    if (g.recovering && g.suspicion > 0.06) anyRecover = true;
  }
  const alertPct = Math.round(maxSusp * 100);

  // Right-aligned telemetry & utility controls
  let rx = width - 12;

  const menuW = 50;
  rx -= menuW;
  drawPill(ctx, rx, 11, menuW, 28, 'rgba(20, 32, 42, 0.92)', 'rgba(140, 185, 200, 0.50)', 6);
  ctx.font = '800 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#dceef4';
  ctx.textAlign = 'center';
  ctx.fillText('MENU', rx + menuW / 2, 25.5);
  buttons.push({ id: 'menu', x: rx, y: 11, w: menuW, h: 28 });

  rx -= 6;
  const sfxW = 44;
  rx -= sfxW;
  drawPill(ctx, rx, 11, sfxW, 28, 'rgba(20, 32, 42, 0.92)', audioMuted ? '#ff6b6b' : 'rgba(125,249,226,0.5)', 6);
  ctx.fillStyle = audioMuted ? '#ff9ea8' : '#9cf8e6';
  ctx.fillText(audioMuted ? 'MUTE' : 'SFX', rx + sfxW / 2, 25.5);
  buttons.push({ id: 'mute', x: rx, y: 11, w: sfxW, h: 28 });

  // RELIC pill
  const relicSecured = state.player.hasRelic;
  const relicW = 86;
  rx -= 8 + relicW;
  drawHighOcrPill(
    ctx,
    rx,
    10,
    relicW,
    30,
    `RELIC ${relicSecured ? '1/1' : '0/1'}`,
    relicSecured ? '#6bffb8' : '#182430',
    relicSecured ? '#091016' : '#ffe082',
    relicSecured ? '#091016' : '#ffe082',
    12,
  );

  // ALERT pill
  const alertBg = anyAlert ? '#ff6b6b' : alertPct > 0 ? '#ff9e44' : '#15222e';
  const alertInk = anyAlert || alertPct > 0 ? '#091016' : '#8ef9e6';
  const alertW = 90;
  rx -= 7 + alertW;
  drawHighOcrPill(ctx, rx, 10, alertW, 30, `ALERT ${alertPct}%`, alertBg, alertInk, alertPct > 0 ? '#091016' : '#6fffe9', 12);

  // NEAR MISS pill (always shown on wide viewports or when > 0)
  if (wide || (state.nearMissCount || 0) > 0) {
    const nm = state.nearMissCount || 0;
    const nmW = 104;
    rx -= 7 + nmW;
    drawHighOcrPill(
      ctx,
      rx,
      10,
      nmW,
      30,
      `NEAR MISS ${nm}`,
      nm > 0 ? '#ffe082' : '#15222e',
      nm > 0 ? '#091016' : '#b7cfd8',
      nm > 0 ? '#091016' : 'rgba(160, 195, 206, 0.4)',
      12,
    );
  }

  // CHIMES pill
  const chimeW = 84;
  rx -= 7 + chimeW;
  drawHighOcrPill(ctx, rx, 10, chimeW, 30, `CHIMES ${state.player.chimes}`, '#15222e', '#9cfef0', '#7df9e2', 12);

  // NOISE pill (SILENT / SOFT / LOUD)
  if (wide) {
    const noise = state.player.noiseLevel || 'SILENT';
    const noiseW = 70;
    rx -= 7 + noiseW;
    const noiseBg = noise === 'LOUD' ? '#ff9e44' : noise === 'SOFT' ? '#ffe082' : '#d8f3ff';
    drawHighOcrPill(ctx, rx, 10, noiseW, 30, noise, noiseBg, '#091016', '#091016', 12);
  }

  // VISIBILITY / STEALTH STATUS pill (High-OCR dark ink on bright luminance fill)
  const visLabel = state.playerVisibility.label || (state.playerVisibility.hidden ? 'SHADOW' : 'LIT');
  let statusText = visLabel === 'SHADOW' ? 'HIDDEN · SHADOW' : visLabel;
  let statusFill = visLabel === 'SHADOW' ? '#7df9e2' : visLabel === 'EXPOSED' ? '#ff6b6b' : '#ffe082';
  if (anyAlert) {
    statusText = 'ALERT!';
    statusFill = '#ff6b6b';
  } else if (anyRecover && !wide) {
    statusText = 'HIDDEN · COOLING';
    statusFill = '#7df9e2';
  }
  ctx.font = '900 12px "Segoe UI", system-ui, sans-serif';
  const stW = Math.max(92, Math.ceil(ctx.measureText(statusText).width + 20));
  rx -= 7 + stW;
  drawHighOcrPill(ctx, rx, 10, stW, 30, statusText, statusFill, '#091016', '#091016', 12);

  // High-OCR Top Event / Near-Miss / Objective Banner
  const banner = state.bannerTimer > 0
    ? state.bannerText
    : state.player.hasRelic
      ? 'RELIC SECURED · REACH EXIT UNSEEN'
      : null;

  if (banner && state.status === 'PLAYING') {
    ctx.font = '900 14.5px "Segoe UI", system-ui, sans-serif';
    const bw = ctx.measureText(banner).width + 34;
    const bx = (width - bw) / 2;
    const by = hudH + 10;
    const kind = state.bannerTimer > 0 ? (state.bannerKind || 'info') : 'exit';
    const fill = kind === 'warn' ? '#ff9e44' : kind === 'exit' ? '#6bffb8' : '#7df9e2';
    drawHighOcrPill(ctx, bx, by, bw, 32, banner, fill, '#091016', '#091016', 14.5);
  }

  // Unified bottom tactical bar: Per-Warden Watch Chips (left) + Controls & Timer (right)
  const footH = 38;
  ctx.fillStyle = 'rgba(7, 12, 18, 0.95)';
  ctx.fillRect(0, height - footH, width, footH);
  ctx.fillStyle = 'rgba(125, 249, 226, 0.34)';
  ctx.fillRect(0, height - footH, width, 1.5);

  if (state.status === 'PLAYING') {
    renderWardenWatchChips(ctx, state, height, footH);
  }

  ctx.font = '700 11.5px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#b9d2da';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const elapsedStr = formatElapsed(state.elapsed || 0);
  const ctrlCopy = wide
    ? `WASD Move · Shift Crouch · Space Dash · Click/Q Chime · E Snuff/Steal · Tab Routes · R Retry   |   TIME ${elapsedStr}`
    : `WASD · Shift Crouch · Click/Q Chime · E Snuff · Tab Routes   |   TIME ${elapsedStr}`;
  ctx.fillText(ctrlCopy, width - 16, height - footH / 2 + 0.5);

  ctx.restore();
  return buttons;
}

export function renderMissionCompleteModal(ctx, state, width, height) {
  const buttons = [];
  const summary = computeHeistSummary(state);

  ctx.save();
  ctx.fillStyle = 'rgba(5, 12, 16, 0.72)';
  ctx.fillRect(0, 0, width, height);

  const w = 520;
  const h = 340;
  const x = (width - w) / 2;
  const y = (height - h) / 2;

  drawPill(ctx, x, y, w, h, 'rgba(9, 22, 26, 0.96)', '#6bffb8', 14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '900 30px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#6bffb8';
  ctx.fillText('HEIST COMPLETE', width / 2, y + 46);

  ctx.font = '800 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffe082';
  ctx.fillText(`${state.level.name.toUpperCase()}  ·  ${state.level.relicName.toUpperCase()}`, width / 2, y + 80);

  // High-OCR Rating + Score badge row
  const ratingFill = summary.rating === 'SHADOW' ? '#ffe082' : '#6bffb8';
  drawHighOcrPill(ctx, width / 2 - 220, y + 106, 174, 34, `${summary.rating} RATING`, ratingFill, '#091016', '#091016', 14);
  drawHighOcrPill(ctx, width / 2 - 34, y + 106, 254, 34, `SCORE ${summary.score.toLocaleString('en-US')}`, '#ffe082', '#091016', '#091016', 14);

  // Detailed stealth telemetry row
  ctx.font = '700 13.5px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#d7ecef';
  ctx.fillText(
    `ALARMS ${summary.alarms}   ·   NEAR MISSES ${summary.nearMisses}   ·   TIME ${formatElapsed(summary.elapsed)}`,
    width / 2,
    y + 170,
  );
  ctx.fillStyle = '#a4c8d0';
  ctx.fillText(
    `CHIMES USED ${summary.chimesUsed}   ·   LAMPS / SENTRIES SNUFFED ${summary.lampsSnuffed}`,
    width / 2,
    y + 198,
  );

  const hasNext = state.level.id < CAMPAIGN_LEVELS.length;
  const bw = 204;
  const bh = 46;
  const primaryX = width / 2 - bw - 10;
  const secondaryX = width / 2 + 10;
  const by = y + 252;

  drawHighOcrPill(ctx, primaryX, by, bw, bh, hasNext ? 'NEXT HEIST [ENTER]' : 'REPLAY CAMPAIGN', '#6bffb8', '#091016', '#091016', 15);
  buttons.push({ id: hasNext ? 'next-stage' : 'stage-1', x: primaryX, y: by, w: bw, h: bh });

  drawPill(ctx, secondaryX, by, bw, bh, 'rgba(20, 34, 42, 0.94)', '#7df9e2', 8);
  ctx.font = '800 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e5f8f5';
  ctx.fillText('MISSION SELECT', secondaryX + bw / 2, by + bh / 2 + 1);
  buttons.push({ id: 'menu', x: secondaryX, y: by, w: bw, h: bh });

  ctx.restore();
  return buttons;
}

export function renderTitleMissionSelect(ctx, state, width, height) {
  const buttons = [];
  const summary = state.lastRunSummary;

  ctx.save();
  ctx.fillStyle = 'rgba(6, 11, 18, 0.42)';
  ctx.fillRect(0, 0, width, height);

  const cardW = Math.min(724, width - 76);
  const cardH = Math.min(586, height - 56);
  const cx = (width - cardW) / 2;
  const cy = (height - cardH) / 2;

  ctx.fillStyle = 'rgba(9, 16, 25, 0.90)';
  ctx.strokeStyle = '#7df9e2';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(cx, cy, cardW, cardH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 224, 130, 0.34)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(cx + 8, cy + 8, cardW - 16, cardH - 16, 10);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 44px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#7df9e2';
  ctx.fillText('VERDIGRIS', width / 2, cy + 44);

  const listX = cx + 28;
  const listW = cardW - 56;
  let rowY = cy + 128;

  if (summary) {
    // High-OCR Heist Complete + Ghost Rating summary header (reads effortlessly at 244px!)
    const pillY = cy + 78;
    const leftW = 212;
    const rightW = listW - leftW - 10;
    const ratingFill = summary.rating === 'SHADOW' ? '#ff9e44' : '#6bffb8';
    drawHighOcrPill(ctx, listX, pillY, leftW, 38, `${summary.rating} RATING`, ratingFill, '#091016', '#091016', 16);
    drawHighOcrPill(
      ctx,
      listX + leftW + 10,
      pillY,
      rightW,
      38,
      `${summary.alarms} ALARMS · ${summary.nearMisses} NEAR MISSES · SCORE ${summary.score.toLocaleString('en-US')}`,
      '#ffe082',
      '#091016',
      '#091016',
      14.5,
    );
    rowY = cy + 132;
  } else {
    ctx.font = '800 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffe082';
    ctx.fillText('ARCHITECTURAL STEALTH HEIST  ·  5 NOCTURNAL COURTYARDS', width / 2, cy + 84);
    rowY = cy + 114;
  }

  // Breathable, LARGE single-line 5-Stage Mission Select rows (no tiny subtitle clutter!)
  const rowH = 62;
  const gap = 9;

  for (const lvl of CAMPAIGN_LEVELS) {
    const selected = state.selectedStage === lvl.id;
    const cleared = Boolean(state.completedStages && state.completedStages.has(lvl.id));

    drawPill(
      ctx,
      listX,
      rowY,
      listW,
      rowH,
      selected ? 'rgba(20, 62, 58, 0.94)' : 'rgba(13, 21, 32, 0.88)',
      selected ? '#7df9e2' : 'rgba(128, 166, 180, 0.42)',
      10,
    );

    // Bold 3-color palette swatch
    const swX = listX + 16;
    const swY = rowY + 15;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = lvl.palette.swatch[i];
      ctx.fillRect(swX + i * 13, swY, 11, 32);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(swX + i * 13, swY, 11, 32);
    }

    // Large crisp stage title
    ctx.textAlign = 'left';
    ctx.font = '900 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = selected ? '#ffffff' : '#edf4f2';
    ctx.fillText(`0${lvl.id}  ${lvl.name}`, listX + 68, rowY + rowH / 2 + 1);

    // Right-side status / warden badge
    if (cleared) {
      drawHighOcrPill(ctx, listX + listW - 122, rowY + 16, 106, 30, 'GHOST ✓', '#6bffb8', '#091016', '#091016', 13);
    } else if (selected) {
      drawHighOcrPill(ctx, listX + listW - 146, rowY + 16, 130, 30, `${lvl.guards.length} WARDENS · NEXT`, '#7df9e2', '#091016', '#091016', 12.5);
    } else {
      ctx.textAlign = 'right';
      ctx.font = '800 14px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#ffe082';
      ctx.fillText(`${lvl.guards.length} WARDENS  ·  ${lvl.chimes} CHIMES`, listX + listW - 18, rowY + rowH / 2 + 1);
    }

    buttons.push({ id: `select-${lvl.id}`, stage: lvl.id, x: listX, y: rowY, w: listW, h: rowH });
    rowY += rowH + gap;
  }

  // Crisp single-line controls legend
  const ctrlY = rowY + 4;
  ctx.textAlign = 'center';
  ctx.font = '700 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#c8e4ea';
  ctx.fillText('WASD Move · SHIFT Crouch · SPACE Dash · CLICK/Q Brass Chime · E Steal & Snuff · TAB Routes', width / 2, ctrlY + 12);

  // Huge bold High-OCR CTA Button
  const btnW = 310;
  const btnH = 52;
  const btnX = (width - btnW) / 2;
  const btnY = ctrlY + 32;
  const ctaText = summary ? `NEXT HEIST  ·  STAGE ${state.selectedStage}` : `START HEIST  ·  STAGE ${state.selectedStage}`;
  drawHighOcrPill(ctx, btnX, btnY, btnW, btnH, ctaText, '#6bffb8', '#091016', '#091016', 18);
  buttons.push({ id: 'start', x: btnX, y: btnY, w: btnW, h: btnH });

  ctx.restore();
  return buttons;
}

export function renderCaughtModal(ctx, state, width, height) {
  const buttons = [];
  const summary = computeHeistSummary(state);

  ctx.save();
  ctx.fillStyle = 'rgba(18, 6, 10, 0.72)';
  ctx.fillRect(0, 0, width, height);

  const w = 470;
  const h = 290;
  const x = (width - w) / 2;
  const y = (height - h) / 2;

  drawPill(ctx, x, y, w, h, 'rgba(24, 10, 15, 0.96)', '#ff6b6b', 14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = '900 30px Georgia, "Times New Roman", serif';
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('SPOTTED BY WARDEN', width / 2, y + 50);

  ctx.font = '700 13.5px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#f2d8dd';
  ctx.fillText(
    `TIME ${formatElapsed(summary.elapsed)}   ·   NEAR MISSES ${summary.nearMisses}   ·   LAMPS SNUFFED ${summary.lampsSnuffed}`,
    width / 2,
    y + 96,
  );

  ctx.font = '600 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#c8aeb4';
  ctx.fillText('Duck behind cover to cool suspicion, snuff sconces [E], or lure guards with a Chime.', width / 2, y + 132);

  const bw = 186;
  const bh = 44;
  const by = y + 194;

  drawHighOcrPill(ctx, width / 2 - bw - 10, by, bw, bh, 'QUICK RETRY [R]', '#ff6b6b', '#091016', '#091016', 14.5);
  buttons.push({ id: 'retry', x: width / 2 - bw - 10, y: by, w: bw, h: bh });

  drawPill(ctx, width / 2 + 10, by, bw, bh, 'rgba(28, 22, 30, 0.94)', 'rgba(220, 180, 190, 0.55)', 8);
  ctx.font = '800 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#f0dfe4';
  ctx.fillText('MISSION SELECT', width / 2 + bw / 2 + 10, by + bh / 2 + 1);
  buttons.push({ id: 'menu', x: width / 2 + 10, y: by, w: bw, h: bh });

  ctx.restore();
  return buttons;
}

export function computeHeistSummary(state) {
  const alarms = state.alertsTriggered || 0;
  const nearMisses = state.nearMissCount || 0;
  const lampsSnuffed = state.lampsSnuffed || 0;
  const chimesUsed = state.chimesUsed || 0;
  const elapsed = state.elapsed || 0;

  let rating = 'SHADOW';
  if (alarms === 0 && elapsed <= 45 && nearMisses === 0) {
    rating = 'PHANTOM';
  } else if (alarms === 0) {
    rating = 'GHOST';
  }

  const score = Math.max(
    400,
    1500
      + (alarms === 0 ? 600 : 0)
      + Math.max(0, Math.round((90 - elapsed) * 6))
      + nearMisses * 100
      + lampsSnuffed * 75
      + (state.player ? state.player.chimes * 50 : 0)
      - alarms * 250,
  );

  return {
    stageId: state.level.id,
    stageName: state.level.name,
    rating,
    score,
    alarms,
    nearMisses,
    lampsSnuffed,
    chimesUsed,
    elapsed,
  };
}

function renderWardenWatchChips(ctx, state, height, footH) {
  const chips = [];
  let patrolStart = null;
  let patrolEnd = null;

  function flushPatrolRange() {
    if (patrolStart === null) return;
    const label = patrolStart === patrolEnd ? `W${patrolStart} PATROL` : `W${patrolStart}-W${patrolEnd} PATROL`;
    chips.push({ text: label, fill: '#dcecf2', ink: '#091016' });
    patrolStart = null;
    patrolEnd = null;
  }

  for (let i = 0; i < state.guards.length; i++) {
    const g = state.guards[i];
    const num = i + 1;
    const pct = Math.round(g.suspicion * 100);
    if (g.state === 'PATROL' && pct < 5) {
      if (patrolStart === null) patrolStart = num;
      patrolEnd = num;
    } else {
      flushPatrolRange();
      if (g.state === 'ALERT' || g.state === 'SEARCHING') {
        chips.push({ text: `W${num} ALERT!`, fill: '#ff6b6b', ink: '#091016' });
      } else if (g.state === 'INVESTIGATING') {
        chips.push({ text: `W${num} CHIME ?`, fill: '#7df9e2', ink: '#091016' });
      } else if (pct >= 50) {
        chips.push({ text: `W${num} COOL ${pct}%`, fill: '#ff9e44', ink: '#091016' });
      } else {
        chips.push({ text: `W${num} CHECK ${pct}%`, fill: '#ffe082', ink: '#091016' });
      }
    }
  }
  flushPatrolRange();

  let x = 14;
  const h = 26;
  const y = height - footH + (footH - h) / 2;

  drawPill(ctx, x, y, 74, h, 'rgba(13, 24, 34, 0.96)', 'rgba(125, 249, 226, 0.62)', 6);
  ctx.font = '900 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#9cf8e6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WARDENS', x + 37, y + h / 2 + 0.5);
  x += 80;

  for (const chip of chips) {
    ctx.font = '900 11.5px "Segoe UI", system-ui, sans-serif';
    const w = Math.ceil(ctx.measureText(chip.text).width + 16);
    drawHighOcrPill(ctx, x, y, w, h, chip.text, chip.fill, chip.ink, '#091016', 11.5);
    x += w + 6;
  }
}

function formatElapsed(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

function drawPill(ctx, x, y, w, h, fill, stroke, radius = 6) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();
}

function drawHighOcrPill(ctx, x, y, w, h, text, fill, ink, stroke, fontSize = 12) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 7);
  ctx.fill();
  ctx.stroke();
  ctx.font = `900 ${fontSize}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
}
