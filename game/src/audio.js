// 100% offline procedural Web Audio API sound engine for VERDIGRIS: spatial guard footsteps,
// surface steps, suspicion swells, brass chime harmonics, Smoke Veil airburst, lamp snuff, and loot chimes.

export function createStealthAudio() {
  let ctx = null;
  let muted = false;

  function ensureContext() {
    if (muted) return null;
    if (!ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try { ctx = new AudioCtx(); } catch { return null; }
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function createNoiseBuffer(audioCtx, durationSec) {
    const length = Math.max(1, Math.floor(audioCtx.sampleRate * durationSec));
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function playSpatialGuardFootstep(gx, gy, px, py) {
    const c = ensureContext();
    if (!c) return;
    const dist = Math.hypot(gx - px, gy - py);
    if (dist > 520) return;

    const now = c.currentTime;
    const gainVal = Math.max(0.015, (1 - dist / 520) * 0.14);
    const panVal = Math.max(-0.85, Math.min(0.85, (gx - px) / 380));

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(118, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    if (c.createStereoPanner) {
      const panner = c.createStereoPanner();
      panner.pan.setValueAtTime(panVal, now);
      gain.connect(panner);
      panner.connect(c.destination);
    } else {
      gain.connect(c.destination);
    }
    osc.start(now);
    osc.stop(now + 0.11);
  }

  function playPlayerSurfaceStep(surface, crouching) {
    const c = ensureContext();
    if (!c || surface === 'rug') return;
    const now = c.currentTime;
    const vol = crouching ? 0.025 : surface === 'stone' ? 0.05 : 0.11;

    if (surface === 'gravel') {
      const src = c.createBufferSource();
      src.buffer = createNoiseBuffer(c, 0.08);
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1900, now);
      const gain = c.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start(now);
      return;
    }

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = surface === 'timber' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(surface === 'timber' ? 165 : 135, now);
    osc.frequency.exponentialRampToValueAtTime(surface === 'timber' ? 72 : 64, now + 0.075);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  function playSuspicionSting(isAlert) {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const filter = c.createBiquadFilter();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isAlert ? 440 : 285, now);
    osc.frequency.exponentialRampToValueAtTime(isAlert ? 720 : 345, now + (isAlert ? 0.24 : 0.18));
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isAlert ? 1900 : 950, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(isAlert ? 0.14 : 0.08, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isAlert ? 0.42 : 0.28));
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  function playBrassChime() {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    for (const [i, freq] of [880, 1324, 2418].entries()) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.09 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.72 - i * 0.14);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + 0.76);
    }
  }

  function playSmokeDeploy() {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = createNoiseBuffer(c, 0.46);
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.46);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(now);
  }

  function playLampSnuff() {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = createNoiseBuffer(c, 0.22);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.22);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start(now);
  }

  function playLootChime() {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    for (const [i, freq] of [587.3, 880].entries()) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      const t0 = now + i * 0.06;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.08, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.34);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    }
  }

  function playExtractionChord(isExit) {
    const c = ensureContext();
    if (!c) return;
    const now = c.currentTime;
    const notes = isExit ? [329.6, 415.3, 493.9, 659.3] : [392.0, 493.9, 587.3];
    for (let i = 0; i < notes.length; i++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      const t0 = now + i * 0.055;
      osc.frequency.setValueAtTime(notes[i], t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.08, t0 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.65);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 0.68);
    }
  }

  return {
    get muted() { return muted; },
    toggleMute() { muted = !muted; return muted; },
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
