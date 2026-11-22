// 100% offline procedural Web Audio API engine for VERDIGRIS: lazy gesture unlock, spatial guard
// footsteps, surface steps, suspicion swells, brass chimes, Smoke Veil airburst, and lamp snuff.

export function createStealthAudio() {
  let ctx = null;
  let muted = false;

  function ensureContext() {
    if (muted) return null;
    if (!ctx && typeof window !== 'undefined') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) try { ctx = new AC(); } catch { return null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function makeNoise(c, dur) {
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function tone(c, type, f0, f1, dur, vol, t0 = c.currentTime, pan = null, lp = null) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.9);
    g.gain.setValueAtTime(Math.max(0.001, vol), t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    let node = osc;
    if (lp) {
      const flt = c.createBiquadFilter();
      flt.type = 'lowpass'; flt.frequency.setValueAtTime(lp, t0);
      node.connect(flt); node = flt;
    }
    node.connect(g);
    if (pan !== null && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.setValueAtTime(pan, t0);
      g.connect(p); p.connect(c.destination);
    } else g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function noise(c, fType, f0, f1, dur, vol) {
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = makeNoise(c, dur);
    const flt = c.createBiquadFilter();
    flt.type = fType; flt.frequency.setValueAtTime(f0, now);
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, now + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(Math.max(0.001, vol), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(flt); flt.connect(g); g.connect(c.destination);
    src.start(now);
  }

  function playSpatialGuardFootstep(gx, gy, px, py) {
    const c = ensureContext();
    if (!c) return;
    const dist = Math.hypot(gx - px, gy - py);
    if (dist > 520) return;
    const vol = Math.max(0.015, (1 - dist / 520) * 0.14);
    const pan = Math.max(-0.85, Math.min(0.85, (gx - px) / 380));
    tone(c, 'triangle', 118, 48, 0.1, vol, c.currentTime, pan);
  }

  function playPlayerSurfaceStep(surface, crouching) {
    const c = ensureContext();
    if (!c || surface === 'rug') return;
    const vol = crouching ? 0.025 : surface === 'stone' ? 0.05 : 0.11;
    if (surface === 'gravel') { noise(c, 'bandpass', 1900, 0, 0.08, vol); return; }
    tone(c, surface === 'timber' ? 'sawtooth' : 'sine', surface === 'timber' ? 165 : 135, surface === 'timber' ? 72 : 64, 0.08, vol);
  }

  function playSuspicionSting(isAlert) {
    const c = ensureContext();
    if (!c) return;
    tone(c, 'sawtooth', isAlert ? 440 : 285, isAlert ? 720 : 345, isAlert ? 0.42 : 0.28, isAlert ? 0.14 : 0.08, c.currentTime, null, isAlert ? 1900 : 950);
  }

  function playBrassChime() {
    const c = ensureContext();
    if (!c) return;
    [880, 1324, 2418].forEach((f, i) => tone(c, 'sine', f, f, 0.72 - i * 0.14, 0.09 / (i + 1)));
  }

  function playSmokeDeploy() {
    const c = ensureContext();
    if (c) noise(c, 'bandpass', 1400, 340, 0.46, 0.14);
  }

  function playLampSnuff() {
    const c = ensureContext();
    if (c) noise(c, 'lowpass', 1200, 240, 0.22, 0.11);
  }

  function playLootChime() {
    const c = ensureContext();
    if (!c) return;
    [587.3, 880].forEach((f, i) => tone(c, 'triangle', f, f, 0.34, 0.08, c.currentTime + i * 0.06));
  }

  function playExtractionChord(isExit) {
    const c = ensureContext();
    if (!c) return;
    const notes = isExit ? [329.6, 415.3, 493.9, 659.3] : [392.0, 493.9, 587.3];
    notes.forEach((f, i) => tone(c, 'triangle', f, f, 0.65, 0.08, c.currentTime + i * 0.055));
  }

  return {
    get muted() { return muted; },
    unlock() { ensureContext(); },
    toggleMute() { muted = !muted; if (!muted) ensureContext(); return muted; },
    playSpatialGuardFootstep,
    playPlayerSurfaceStep,
    playSuspicionSting,
    playBrassChime,
    playSmokeDeploy,
    playLampSnuff,
    playLootChime,
    playExtractionChord,
  };
}
