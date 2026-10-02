/** Tiny synthesized sound effects and an original pentatonic loop. No audio files. */
type Sfx = 'coin' | 'bell' | 'pop' | 'ding' | 'oops' | 'sparkle' | 'level' | 'pour' | 'click' | 'chop' | 'sad';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicTimer = 0;
let enabled = { sound: true, music: true };

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(master);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.25, slide = 0, out: AudioNode | null = master) {
  const c = ac();
  if (!c || !out) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, c.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(out);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.02);
}

function noise(start: number, dur: number, vol = 0.15, hp = 1200) {
  const c = ac();
  if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(c.currentTime + start);
}

export function play(s: Sfx) {
  if (!enabled.sound) return;
  switch (s) {
    case 'coin':
      tone(988, 0, 0.08, 'square', 0.18);
      tone(1319, 0.07, 0.18, 'square', 0.18);
      break;
    case 'bell':
      tone(1568, 0, 0.5, 'triangle', 0.2);
      tone(2093, 0.08, 0.5, 'triangle', 0.12);
      break;
    case 'pop':
      tone(520, 0, 0.07, 'sine', 0.25, 260);
      break;
    case 'click':
      tone(700, 0, 0.03, 'square', 0.08);
      break;
    case 'chop':
      noise(0, 0.06, 0.18, 2500);
      break;
    case 'pour':
      noise(0, 0.35, 0.08, 600);
      break;
    case 'ding':
      tone(1760, 0, 0.6, 'triangle', 0.22);
      break;
    case 'oops':
      tone(330, 0, 0.12, 'square', 0.12, -80);
      break;
    case 'sad':
      tone(392, 0, 0.18, 'triangle', 0.1, -60);
      tone(330, 0.15, 0.25, 'triangle', 0.1, -40);
      break;
    case 'sparkle':
      [1568, 1976, 2349, 3136].forEach((f, i) => tone(f, i * 0.05, 0.12, 'triangle', 0.08));
      break;
    case 'level':
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.16, 'square', 0.12));
      break;
  }
}

// Gentle loop on the Vietnamese-style pentatonic scale (C D F G A), written for this game.
const SCALE = [261.6, 293.7, 349.2, 392, 440, 523.3, 587.3, 698.5];
const MELODY = [4, 3, 2, 3, 4, 5, 4, -1, 3, 2, 0, 1, 2, -1, 2, 3, 4, 6, 5, 4, 3, -1, 2, 1, 0, -1, -1, -1];
const BASS = [0, -1, 3, -1, 2, -1, 0, -1];

export function startMusic() {
  if (!enabled.music || musicTimer || !ac()) return;
  let step = 0;
  const beat = 0.32;
  musicTimer = window.setInterval(() => {
    if (!enabled.music) return;
    const m = MELODY[step % MELODY.length];
    if (m >= 0) tone(SCALE[m] * 2, 0, beat * 1.6, 'triangle', 0.5, 0, musicGain);
    const b = BASS[step % BASS.length];
    if (b >= 0) tone(SCALE[b] / 2, 0, beat * 2, 'sine', 0.6, 0, musicGain);
    step++;
  }, beat * 1000);
}

export function stopMusic() {
  window.clearInterval(musicTimer);
  musicTimer = 0;
}

export function setAudio(opts: { sound: boolean; music: boolean }) {
  enabled = opts;
  if (!opts.music) stopMusic();
}
