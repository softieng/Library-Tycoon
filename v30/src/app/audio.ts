/** Tiny synthesised feedback sounds (Web Audio). No audio files, nothing to license or download. */
let ctx: AudioContext | null = null;
const tone = (freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.06) => {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0, ctx.currentTime + at);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
  o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + dur + 0.02);
};
export function playSfx(name: 'coin' | 'good' | 'bad' | 'click' | 'fanfare') {
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    if (name === 'coin') { tone(988, 0, 0.09, 'triangle'); tone(1319, 0.07, 0.16, 'triangle'); }
    else if (name === 'good') { tone(660, 0, 0.1); tone(880, 0.09, 0.18); }
    else if (name === 'bad') { tone(220, 0, 0.22, 'sawtooth', 0.04); tone(180, 0.12, 0.25, 'sawtooth', 0.04); }
    else if (name === 'click') tone(520, 0, 0.05, 'square', 0.03);
    else [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.07));
  } catch { /* audio is optional */ }
}
