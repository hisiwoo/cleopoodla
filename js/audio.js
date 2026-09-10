/* ═══════════════════════════════════════════════════════════
   CLEOPOODLA AUDIO ENGINE
   Everything here is synthesized live in the browser with the
   Web Audio API — no mp3s, no CDN, works offline forever.
   Music: a looping desert-house groove in D Phrygian dominant
   (D Eb F# G A Bb C) — the "Egyptian" scale.
   ═══════════════════════════════════════════════════════════ */
const CleoAudio = (() => {
  let ctx, master, musicBus, sfxBus, conv;
  let started = false, musicOn = true, sfxOn = true;
  let timer = null, step = 0, nextTime = 0;
  const BPM = 104;
  const SPB = 60 / BPM / 4;          // 16th note
  const LOOKAHEAD = 0.1;

  // D Phrygian dominant
  const f = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const ROOT = 50;                    // D3
  const SCALE = [0, 1, 4, 5, 7, 8, 10];

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);

    // a cheap tomb reverb: exponentially decaying noise impulse
    conv = ctx.createConvolver();
    const len = ctx.sampleRate * 1.9;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.7);
    }
    conv.buffer = buf;
    const wet = ctx.createGain(); wet.gain.value = 0.26;
    conv.connect(wet); wet.connect(master);

    musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master); musicBus.connect(conv);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master); sfxBus.connect(conv);
  }

  /* ─── primitives ─── */
  function env(node, t, a, d, s, r, peak = 1, sus = 0.5) {
    const g = node.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + a);
    g.exponentialRampToValueAtTime(Math.max(peak * sus, 0.0001), t + a + d);
    g.setValueAtTime(Math.max(peak * sus, 0.0001), t + a + d + s);
    g.exponentialRampToValueAtTime(0.0001, t + a + d + s + r);
  }

  function noiseBuf(sec) {
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function tone(dest, freq, t, dur, type = 'sine', vol = 0.3, glide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    o.connect(g); g.connect(dest);
    env(g, t, 0.004, dur * 0.3, dur * 0.3, dur * 0.4, vol, 0.6);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  /* ─── percussion ─── */
  function kick(t, v = 1) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(v * 0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.34);
  }

  function darbuka(t, v = 0.5, hi = false) {   // doumbek-ish tek/dum
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.12);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = hi ? 2600 : 320; bp.Q.value = hi ? 1.6 : 3.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (hi ? 0.055 : 0.16));
    s.connect(bp); bp.connect(g); g.connect(musicBus); s.start(t);
    if (!hi) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(210, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.1);
      og.gain.setValueAtTime(v * 0.5, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(og); og.connect(musicBus); o.start(t); o.stop(t + 0.16);
    }
  }

  function hat(t, v = 0.18, open = false) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(open ? 0.3 : 0.05);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.24 : 0.035));
    s.connect(hp); hp.connect(g); g.connect(musicBus); s.start(t);
  }

  function clap(t, v = 0.4) {
    for (let i = 0; i < 3; i++) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.1);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.1;
      const g = ctx.createGain();
      const tt = t + i * 0.012;
      g.gain.setValueAtTime(v * (i === 2 ? 1 : 0.5), tt);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + (i === 2 ? 0.16 : 0.03));
      s.connect(bp); bp.connect(g); g.connect(musicBus); s.start(tt);
    }
  }

  /* ─── melodic voices ─── */
  function bass(t, midi, dur) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(240, t + dur);
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.value = f(midi); o2.frequency.value = f(midi - 12);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musicBus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.30, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }

  function pluck(t, midi, dur, vol = 0.17) {   // oud / qanun-ish
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(5200, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + dur);
    o.type = 'triangle'; o.frequency.value = f(midi);
    const dt = ctx.createOscillator(); dt.type = 'sawtooth'; dt.frequency.value = f(midi) * 1.005;
    const dg = ctx.createGain(); dg.gain.value = 0.25; dt.connect(dg); dg.connect(lp);
    o.connect(lp); lp.connect(g); g.connect(musicBus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); dt.start(t); o.stop(t + dur + 0.02); dt.stop(t + dur + 0.02);
  }

  function pad(t, midi, dur) {
    [0, 7, 12].forEach((iv, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1100;
      o.type = 'sawtooth'; o.frequency.value = f(midi + iv) * (1 + (i - 1) * 0.002);
      o.connect(lp); lp.connect(g); g.connect(musicBus);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035, t + dur * 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }

  /* ─── the sequencer ─── */
  const LEAD = [   // 32-step riff, scale degrees (null = rest)
    0, null, 2, 3, null, 2, 1, null, 0, null, 6, null, 5, null, 4, null,
    3, null, 4, 5, null, 4, 3, null, 2, null, 1, 0, null, 1, null, null
  ];
  const BASSLINE = [0, null, null, 0, null, null, 3, null, null, null, 5, null, 4, null, null, null];

  function schedule() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const t = nextTime, s = step % 64, bar = Math.floor(step / 16) % 8;

      // drums
      if (s % 16 === 0 || s % 16 === 6 || s % 16 === 10) kick(t, s % 16 === 0 ? 1 : 0.75);
      if (s % 8 === 4) clap(t, 0.36);
      hat(t, s % 4 === 2 ? 0.13 : 0.07, s % 16 === 14);
      if (s % 4 === 0) darbuka(t, 0.42);
      if (s % 4 === 3 || s % 8 === 5) darbuka(t, 0.3, true);
      if (s === 63) { darbuka(t, .5, true); darbuka(t + SPB / 2, .55, true); }

      // bass
      const bn = BASSLINE[s % 16];
      if (bn !== null && bar > 0) bass(t, ROOT + SCALE[bn], SPB * 2.6);

      // lead
      const ln = LEAD[s % 32];
      if (ln !== null && bar >= 2) {
        const oct = bar >= 6 ? 24 : 12;
        pluck(t, ROOT + oct + SCALE[ln % 7] + (ln >= 7 ? 12 : 0), SPB * 3.2, bar >= 4 ? 0.19 : 0.12);
      }

      // pad on the downbeat of each bar
      if (s % 16 === 0) pad(t, ROOT + 12 + (bar % 4 === 3 ? 3 : 0), SPB * 16);

      nextTime += SPB;
      step++;
    }
    timer = setTimeout(schedule, 25);
  }

  /* ═══ PUBLIC ═══ */
  function start() {
    init();
    if (ctx.state === 'suspended') ctx.resume();
    if (started) return;
    started = true;
    step = 0; nextTime = ctx.currentTime + 0.08;
    schedule();
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(musicOn ? 0.55 : 0, ctx.currentTime + 2.2);
  }

  function toggleMusic() {
    init(); musicOn = !musicOn;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(musicOn ? 0.55 : 0.0001, ctx.currentTime + 0.35);
    return musicOn;
  }
  function toggleSfx() { init(); sfxOn = !sfxOn; sfxBus.gain.value = sfxOn ? 0.9 : 0; return sfxOn; }
  function duck(ms = 700) {
    if (!ctx || !musicOn) return;
    const n = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(n);
    musicBus.gain.setValueAtTime(musicBus.gain.value, n);
    musicBus.gain.linearRampToValueAtTime(0.16, n + 0.05);
    musicBus.gain.linearRampToValueAtTime(0.55, n + ms / 1000);
  }

  /* ═══ SFX ═══ */
  const SFX = {
    click(t) {
      tone(sfxBus, 900, t, 0.05, 'square', 0.12, 1500);
    },
    hover(t) {
      tone(sfxBus, 1400, t, 0.04, 'sine', 0.06, 2000);
    },
    ding(t) {   // coin
      tone(sfxBus, f(83), t, 0.09, 'square', 0.16);
      tone(sfxBus, f(90), t + 0.08, 0.4, 'square', 0.16);
    },
    thud(t) {   // stone block landing
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 0.25);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.42);
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.3);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0.3, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      s.connect(lp); lp.connect(ng); ng.connect(sfxBus); s.start(t);
    },
    woof(t) {   // a synthesized bark: noise + formant sweep
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.34);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.2;
      bp.frequency.setValueAtTime(420, t);
      bp.frequency.exponentialRampToValueAtTime(1250, t + 0.05);
      bp.frequency.exponentialRampToValueAtTime(300, t + 0.28);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.8, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      s.connect(bp); bp.connect(g); g.connect(sfxBus); s.start(t);
      // voiced growl underneath
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.04);
      o.frequency.exponentialRampToValueAtTime(160, t + 0.26);
      const olp = ctx.createBiquadFilter(); olp.type = 'lowpass'; olp.frequency.value = 1800;
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.34, t + 0.02);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(olp); olp.connect(og); og.connect(sfxBus); o.start(t); o.stop(t + 0.3);
    },
    gong(t) {
      [1, 1.48, 2.02, 2.71, 3.4].forEach((r, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 92 * r;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22 / (i + 1), t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2 - i * 0.35);
        o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 3.4);
      });
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.5);
      const bpf = ctx.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 2400;
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0.25, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      s.connect(bpf); bpf.connect(ng); ng.connect(sfxBus); s.start(t);
    },
    riser(t, dur = 1.6) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf(dur + 0.2);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5;
      bp.frequency.setValueAtTime(200, t);
      bp.frequency.exponentialRampToValueAtTime(9000, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + dur * 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
      s.connect(bp); bp.connect(g); g.connect(sfxBus); s.start(t);
    },
    fanfare(t) {   // the PUMP moment
      const notes = [0, 4, 7, 12, 7, 12, 16, 19];
      notes.forEach((n, i) => {
        const tt = t + i * 0.085;
        tone(sfxBus, f(62 + n), tt, 0.3, 'square', 0.14);
        tone(sfxBus, f(50 + n), tt, 0.3, 'sawtooth', 0.07);
      });
      SFX.gong(t);
    },
    zap(t) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(2600, t);
      o.frequency.exponentialRampToValueAtTime(180, t + 0.3);
      g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.34);
    }
  };

  function play(name) {
    if (!ctx || !sfxOn || !SFX[name]) return;
    if (ctx.state === 'suspended') ctx.resume();
    try { SFX[name](ctx.currentTime + 0.001); } catch (e) { /* never let audio break the page */ }
  }

  return { start, play, toggleMusic, toggleSfx, duck,
           get on() { return musicOn; }, get sfx() { return sfxOn; }, get ready() { return started; } };
})();
