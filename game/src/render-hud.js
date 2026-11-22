// De-cluttered 4-cluster 244px-legible HUD bar with unified 4-segment detection ladder & cooling
// progress bar, per-warden chips, spotter-named Caught modal, and Ghost Rating 5-Stage Select.

import { CAMPAIGN_LEVELS } from './levels.js';
import { computeHeistSummary } from './state.js';

export function renderHudBar(ctx, state, width, height, audioMuted) {
  const buttons = [];
  const hudH = 52;
  const wide = width >= 1180;
  const p = state.player;
  const banner = state.bannerTimer > 0 ? state.bannerText : p.hasRelic ? 'RELIC SECURED · REACH EXIT UNSEEN' : null;

  ctx.save();
  ctx.fillStyle = 'rgba(7,12,19,0.96)'; ctx.fillRect(0, 0, width, hudH);
  ctx.fillStyle = 'rgba(125,249,226,0.48)'; ctx.fillRect(0, hudH - 1.5, width, 1.5);

  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = `900 17px ${UI_FONT}`; ctx.fillStyle = '#7df9e2'; ctx.fillText('VERDIGRIS', 14, 26);

  const shortName = state.level.name.replace(/^The\s+/i, '').toUpperCase();
  const compactName = !wide && shortName.length > 15 ? shortName.replace(/^MOONLIT\s+/i, '') : shortName;
  const stageText = wide ? `· STAGE ${state.level.id}/5 ${shortName}` : `· ${state.level.id}/5 ${compactName}`;
  ctx.font = `800 ${wide ? 13 : 11.5}px ${UI_FONT}`; ctx.fillStyle = '#f5f2e6';
  ctx.fillText(stageText, 114, 26.5);
  const leftEnd = 114 + ctx.measureText(stageText).width + 12;

  let rx = width - 60;
  drawPill(ctx, rx, 12, 48, 28, 'rgba(20,32,42,0.94)', 'rgba(140,185,200,0.55)', 6);
  ctx.font = `800 11px ${UI_FONT}`; ctx.fillStyle = '#dceef4'; ctx.textAlign = 'center';
  ctx.fillText('MENU', rx + 24, 26.5);
  buttons.push({ id: 'menu', x: rx, y: 12, w: 48, h: 28 });

  rx -= 58;
  drawPill(ctx, rx, 12, 52, 28, 'rgba(20,32,42,0.94)', audioMuted ? '#ff6b6b' : 'rgba(125,249,226,0.55)', 6);
  ctx.fillStyle = audioMuted ? '#ff9ea8' : '#9cf8e6';
  ctx.fillText(audioMuted ? 'MUTED' : 'SFX ON', rx + 26, 26.5);
  buttons.push({ id: 'mute', x: rx, y: 12, w: 52, h: 28 });

  const chipFont = wide ? 12 : 11;
  ctx.font = `900 ${chipFont}px ${UI_FONT}`;

  const objText = `${p.hasKey ? 'KEY ✓' : 'KEY'} · ${p.hasRelic ? 'RELIC 1/1' : 'RELIC'} · LOOT ${state.lootCollected}/${state.lootTotal}`;
  const objW = Math.ceil(ctx.measureText(objText).width + 18);
  rx -= 8 + objW;
  drawHighOcrPill(ctx, rx, 10, objW, 32, objText, p.hasRelic ? '#6bffb8' : '#182430', p.hasRelic ? '#091016' : '#ffe082', p.hasRelic ? '#091016' : '#ffe082', chipFont);

  const gadText = `CHIME ${p.chimes} · SMOKE ${p.smokes}`;
  const gadW = Math.ceil(ctx.measureText(gadText).width + 18);
  rx -= 6 + gadW;
  drawHighOcrPill(ctx, rx, 10, gadW, 32, gadText, '#142632', '#a8fff2', '#7df9e2', chipFont);

  const vis = state.playerVisibility;
  const visTag = vis.inSmoke ? 'SMOKE' : vis.label || (vis.hidden ? 'SHADOW' : 'LIT');
  const stText = state.detectionTier === 'LOCKDOWN' ? 'LOCKDOWN!' : `${visTag} · ${p.noiseLevel || 'SILENT'}`;
  const stFill = state.detectionTier === 'LOCKDOWN' || visTag === 'EXPOSED' ? '#ff5a6b' : vis.hidden ? '#7df9e2' : '#ffe082';
  const stW = Math.ceil(ctx.measureText(stText).width + 18);
  rx -= 6 + stW;
  drawHighOcrPill(ctx, rx, 10, stW, 32, stText, stFill, '#091016', '#091016', chipFont);

  const gapAvail = rx - 10 - leftEnd;
  const ladderW = Math.min(232, Math.max(176, gapAvail - 8));
  renderDetectionLadder(ctx, state, leftEnd + Math.max(4, (gapAvail - ladderW) * 0.5), 10, ladderW, 32, !banner);

  if (banner && state.status === 'PLAYING') {
    ctx.font = `900 14.5px ${UI_FONT}`;
    const bw = ctx.measureText(banner).width + 34;
    const kind = state.bannerTimer > 0 ? (state.bannerKind || 'info') : 'exit';
    drawHighOcrPill(ctx, (width - bw) / 2, hudH + 10, bw, 32, banner, kind === 'warn' ? '#ff9e44' : kind === 'exit' ? '#6bffb8' : '#7df9e2', '#091016', '#091016', 14.5);
  }

  const footH = 38;
  ctx.fillStyle = 'rgba(7,12,18,0.96)'; ctx.fillRect(0, height - footH, width, footH);
  ctx.fillStyle = 'rgba(125,249,226,0.34)'; ctx.fillRect(0, height - footH, width, 1.5);
  if (state.status === 'PLAYING') renderWardenWatchChips(ctx, state, height, footH);

  ctx.font = `700 11.5px ${UI_FONT}`; ctx.fillStyle = '#c4dce4'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  const tStr = formatElapsed(state.elapsed || 0);
  ctx.fillText(
    wide ? `WASD · SHIFT Crouch · F Smoke · Click/Q Chime · E Act · TAB Routes · 2xR Retry   |   TIME ${tStr}`
      : `WASD · SHIFT Crouch · F Smoke · Click/Q Chime · E Act · TAB Routes   |   ${tStr}`,
    width - 14, height - footH / 2 + 0.5,
  );
  ctx.restore();
  return buttons;
}

export function renderTitleMissionSelect(ctx, state, width, height) {
  const buttons = [];
  const summary = state.lastRunSummary;
  const cardW = Math.min(754, width - 64);
  const cardH = Math.min(594, height - 52);
  const cx = (width - cardW) / 2;
  const cy = (height - cardH) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(6,11,18,0.42)'; ctx.fillRect(0, 0, width, height);
  drawPill(ctx, cx, cy, cardW, cardH, 'rgba(9,16,25,0.92)', '#7df9e2', 14);
  ctx.strokeStyle = 'rgba(255,224,130,0.34)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(cx + 8, cy + 8, cardW - 16, cardH - 16, 10); ctx.stroke();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 44px ${SERIF}`; ctx.fillStyle = '#7df9e2'; ctx.fillText('VERDIGRIS', width / 2, cy + 44);

  const listX = cx + 26; const listW = cardW - 52;
  let rowY = cy + 114;

  if (summary) {
    const pillY = cy + 78; const leftW = 190;
    const lootStr = summary.lootTotal ? ` · LOOT ${summary.lootCollected}/${summary.lootTotal}` : '';
    drawHighOcrPill(ctx, listX, pillY, leftW, 38, `${summary.rating} RATING`, summary.rating === 'SHADOW' ? '#ff9e44' : '#6bffb8', '#091016', '#091016', 15.5);
    drawHighOcrPill(ctx, listX + leftW + 10, pillY, listW - leftW - 10, 38, `${summary.alarms} ALARMS · ${summary.nearMisses} NEAR MISSES${lootStr} · SCORE ${summary.score.toLocaleString('en-US')}`, '#ffe082', '#091016', '#091016', 13.5);
    rowY = cy + 132;
  } else {
    ctx.font = `800 14px ${UI_FONT}`; ctx.fillStyle = '#ffe082';
    ctx.fillText('ARCHITECTURAL STEALTH HEIST  ·  5 NOCTURNAL COURTYARDS', width / 2, cy + 84);
  }

  for (const lvl of CAMPAIGN_LEVELS) {
    const selected = state.selectedStage === lvl.id;
    const cleared = Boolean(state.completedStages && state.completedStages.has(lvl.id));
    drawPill(ctx, listX, rowY, listW, 62, selected ? 'rgba(20,62,58,0.94)' : 'rgba(13,21,32,0.88)', selected ? '#7df9e2' : 'rgba(128,166,180,0.42)', 10);

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = lvl.palette.swatch[i]; ctx.fillRect(listX + 16 + i * 13, rowY + 15, 11, 32);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1; ctx.strokeRect(listX + 16 + i * 13, rowY + 15, 11, 32);
    }

    ctx.textAlign = 'left'; ctx.font = `900 19px ${UI_FONT}`; ctx.fillStyle = selected ? '#ffffff' : '#edf4f2';
    ctx.fillText(`0${lvl.id}  ${lvl.name}`, listX + 68, rowY + 32);

    if (cleared) drawHighOcrPill(ctx, listX + listW - 122, rowY + 16, 106, 30, 'GHOST ✓', '#6bffb8', '#091016', '#091016', 13);
    else if (selected) drawHighOcrPill(ctx, listX + listW - 150, rowY + 16, 134, 30, `${lvl.guards.length} WARDENS · NEXT`, '#7df9e2', '#091016', '#091016', 12.5);
    else {
      ctx.textAlign = 'right'; ctx.font = `800 13.5px ${UI_FONT}`; ctx.fillStyle = '#ffe082';
      ctx.fillText(`${lvl.guards.length} WARDENS · ${(lvl.treasures || []).length} LOOT`, listX + listW - 18, rowY + 32);
    }

    buttons.push({ id: `select-${lvl.id}`, stage: lvl.id, x: listX, y: rowY, w: listW, h: 62 });
    rowY += 71;
  }

  ctx.textAlign = 'center'; ctx.font = `700 12.5px ${UI_FONT}`; ctx.fillStyle = '#c8e4ea';
  ctx.fillText('WASD Move · SHIFT Crouch · F/R-Click Smoke Veil · Click/Q Chime · E Key/Relic/Snuff · TAB Routes', width / 2, rowY + 16);

  const btnW = 316; const btnX = (width - btnW) / 2; const btnY = rowY + 36;
  drawHighOcrPill(ctx, btnX, btnY, btnW, 52, `${summary ? 'NEXT HEIST' : 'START HEIST'}  ·  STAGE ${state.selectedStage}`, '#6bffb8', '#091016', '#091016', 18);
  buttons.push({ id: 'start', x: btnX, y: btnY, w: btnW, h: 52 });
  ctx.restore();
  return buttons;
}

export function renderMissionCompleteModal(ctx, state, width, height) {
  const buttons = [];
  const summary = computeHeistSummary(state);
  const w = 536; const h = 348; const x = (width - w) / 2; const y = (height - h) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(5,12,16,0.74)'; ctx.fillRect(0, 0, width, height);
  drawPill(ctx, x, y, w, h, 'rgba(9,22,26,0.96)', '#6bffb8', 14);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  ctx.font = `900 30px ${SERIF}`; ctx.fillStyle = '#6bffb8'; ctx.fillText('HEIST COMPLETE', width / 2, y + 46);
  ctx.font = `800 14px ${UI_FONT}`; ctx.fillStyle = '#ffe082';
  ctx.fillText(`${state.level.name.toUpperCase()}  ·  ${state.level.relicName.toUpperCase()}`, width / 2, y + 80);

  drawHighOcrPill(ctx, width / 2 - 228, y + 106, 178, 34, `${summary.rating} RATING`, summary.rating === 'SHADOW' ? '#ffe082' : '#6bffb8', '#091016', '#091016', 14);
  drawHighOcrPill(ctx, width / 2 - 38, y + 106, 266, 34, `SCORE ${summary.score.toLocaleString('en-US')}`, '#ffe082', '#091016', '#091016', 14);

  ctx.font = `700 13.5px ${UI_FONT}`; ctx.fillStyle = '#d7ecef';
  ctx.fillText(`ALARMS ${summary.alarms}  ·  NEAR MISSES ${summary.nearMisses}  ·  LOOT ${summary.lootCollected}/${summary.lootTotal}  ·  TIME ${formatElapsed(summary.elapsed)}`, width / 2, y + 172);
  ctx.fillStyle = '#a4c8d0';
  ctx.fillText(`CHIMES ${summary.chimesUsed}  ·  SMOKE VEILS ${summary.smokesUsed}  ·  LAMPS SNUFFED ${summary.lampsSnuffed}`, width / 2, y + 202);

  const hasNext = state.level.id < CAMPAIGN_LEVELS.length;
  const bw = 210; const by = y + 256;
  drawHighOcrPill(ctx, width / 2 - bw - 10, by, bw, 46, hasNext ? 'NEXT HEIST [ENTER]' : 'REPLAY CAMPAIGN', '#6bffb8', '#091016', '#091016', 15);
  buttons.push({ id: hasNext ? 'next-stage' : 'stage-1', x: width / 2 - bw - 10, y: by, w: bw, h: 46 });
  drawPill(ctx, width / 2 + 10, by, bw, 46, 'rgba(20,34,42,0.94)', '#7df9e2', 8);
  ctx.font = `800 14px ${UI_FONT}`; ctx.fillStyle = '#e5f8f5'; ctx.fillText('MISSION SELECT', width / 2 + 10 + bw / 2, by + 24);
  buttons.push({ id: 'menu', x: width / 2 + 10, y: by, w: bw, h: 46 });
  ctx.restore();
  return buttons;
}

export function renderCaughtModal(ctx, state, width, height) {
  const buttons = [];
  const summary = computeHeistSummary(state);
  const w = 540; const h = 304; const x = (width - w) / 2; const y = (height - h) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(18,6,10,0.74)'; ctx.fillRect(0, 0, width, height);
  drawPill(ctx, x, y, w, h, 'rgba(24,10,15,0.96)', '#ff6b6b', 14);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  ctx.font = `900 30px ${SERIF}`; ctx.fillStyle = '#ff6b6b'; ctx.fillText('SPOTTED IN LOCKDOWN', width / 2, y + 46);
  const spotter = `SEEN BY ${state.caughtBy || 'W1'} (${state.caughtTier || 'LOCKDOWN'}) — PRESS R TWICE OR CLICK RETRY`;
  drawHighOcrPill(ctx, x + 22, y + 74, w - 44, 30, spotter, '#ff6b6b', '#091016', '#091016', 11.5);

  ctx.font = `700 13.5px ${UI_FONT}`; ctx.fillStyle = '#f2d8dd';
  ctx.fillText(`TIME ${formatElapsed(summary.elapsed)}  ·  NEAR MISSES ${summary.nearMisses}  ·  LOOT ${summary.lootCollected}/${summary.lootTotal}`, width / 2, y + 128);
  ctx.font = `600 12.5px ${UI_FONT}`; ctx.fillStyle = '#c8aeb4';
  ctx.fillText('Deploy Smoke Veil [F] to slice vision cones, snuff sconces [E], or bait wardens with Chimes.', width / 2, y + 158);

  const bw = 196; const by = y + 206;
  drawHighOcrPill(ctx, width / 2 - bw - 10, by, bw, 44, 'RETRY STAGE [2×R]', '#ff6b6b', '#091016', '#091016', 14.5);
  buttons.push({ id: 'retry', x: width / 2 - bw - 10, y: by, w: bw, h: 44 });
  drawPill(ctx, width / 2 + 10, by, bw, 44, 'rgba(28,22,30,0.94)', 'rgba(220,180,190,0.55)', 8);
  ctx.font = `800 14px ${UI_FONT}`; ctx.fillStyle = '#f0dfe4'; ctx.fillText('MISSION SELECT', width / 2 + bw / 2 + 10, by + 23);
  buttons.push({ id: 'menu', x: width / 2 + 10, y: by, w: bw, h: 44 });
  ctx.restore();
  return buttons;
}

const UI_FONT = '"Segoe UI",system-ui,sans-serif';
const SERIF = 'Georgia,"Times New Roman",serif';

function renderDetectionLadder(ctx, state, x, y, w, h, showCoolBadge) {
  const segs = [['QUIET', '#7df9e2'], ['WARY', '#ffd166'], ['SEARCH', '#ff6438'], ['LOCK', '#ff2a4d']];
  const tierIdx = state.detectionTierIndex || 0;
  const maxSusp = Math.max(0, Math.min(1, state.maxSuspicion || 0));
  const segW = (w - 15) / 4;
  const barH = 4;

  drawPill(ctx, x, y, w, h, '#0b141e', 'rgba(140,190,206,0.48)', 7);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${w >= 210 ? 10.5 : 9.5}px ${UI_FONT}`;

  for (let i = 0; i < 4; i++) {
    const sx = x + 3 + i * (segW + 3);
    const active = i <= tierIdx;
    ctx.fillStyle = active ? segs[i][1] : '#12202c';
    ctx.beginPath(); ctx.roundRect(sx, y + 3, segW, h - 10, 4); ctx.fill();
    if (i === tierIdx) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.fillStyle = active ? '#071016' : '#6f8a99';
    ctx.fillText(segs[i][0], sx + segW / 2, y + (h - barH) / 2);
  }

  ctx.fillStyle = '#0e1b26';
  ctx.fillRect(x + 4, y + h - barH - 2, w - 8, barH);
  if (maxSusp > 0.01) {
    ctx.fillStyle = state.isCooling ? '#7df9e2' : segs[tierIdx][1];
    ctx.fillRect(x + 4, y + h - barH - 2, Math.max(4, (w - 8) * maxSusp), barH);
  }
  if (showCoolBadge && state.isCooling && maxSusp > 0.05) {
    drawHighOcrPill(ctx, x + w - 74, y + h + 4, 74, 17, 'COOLING ▼', '#7df9e2', '#091016', '#091016', 9.5);
  }
}

function renderWardenWatchChips(ctx, state, height, footH) {
  const chips = [];
  let qStart = null; let qEnd = null;
  const flush = () => {
    if (qStart === null) return;
    chips.push({ text: qStart === qEnd ? `W${qStart} QUIET` : `W${qStart}-W${qEnd} QUIET`, fill: '#dcecf2' });
    qStart = qEnd = null;
  };
  for (let i = 0; i < state.guards.length; i++) {
    const g = state.guards[i]; const n = i + 1; const t = g.tier || 'QUIET'; const pct = Math.round(g.suspicion * 100);
    if (t === 'QUIET' && pct < 5) { if (qStart === null) qStart = n; qEnd = n; }
    else {
      flush();
      if (t === 'LOCKDOWN') chips.push({ text: `W${n} LOCKDOWN!`, fill: '#ff4757' });
      else if (t === 'SEARCH') chips.push({ text: `W${n} SEARCH ${pct}%`, fill: '#ff6438' });
      else if (g.investigateKind === 'chime') chips.push({ text: `W${n} CHIME ?`, fill: '#7df9e2' });
      else chips.push({ text: `W${n} WARY ${pct}%`, fill: '#ffd166' });
    }
  }
  flush();

  let x = 14; const y = height - footH + (footH - 26) / 2;
  drawPill(ctx, x, y, 72, 26, 'rgba(13,24,34,0.96)', 'rgba(125,249,226,0.62)', 6);
  ctx.font = `900 11px ${UI_FONT}`; ctx.fillStyle = '#9cf8e6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('WARDENS', x + 36, y + 13.5);
  x += 78;
  for (const c of chips) {
    ctx.font = `900 11.5px ${UI_FONT}`;
    const w = Math.ceil(ctx.measureText(c.text).width + 16);
    drawHighOcrPill(ctx, x, y, w, 26, c.text, c.fill, '#091016', '#091016', 11.5);
    x += w + 6;
  }
}

function formatElapsed(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function drawPill(ctx, x, y, w, h, fill, stroke, radius = 6) {
  ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); ctx.stroke();
}

function drawHighOcrPill(ctx, x, y, w, h, text, fill, ink, stroke, fontSize = 12) {
  ctx.save();
  ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); ctx.fill(); ctx.stroke();
  ctx.font = `900 ${fontSize}px ${UI_FONT}`; ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 0.5);
  ctx.restore();
}
