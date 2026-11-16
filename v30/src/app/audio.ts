/** Tiny synthesised feedback sounds (Web Audio). No audio files, nothing to license or download. */
let ctx: AudioContext | null = null;
const tone = (freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.06) => {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0, ctx.currentTime + at);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
  o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + dur + 0.02);
};
export function playSfx(name: 'coin' | 'good' | 'bad' | 'click' | 'fanfare' | 'service' | 'goal') {
  try {
    ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => { /* user gesture needed in this browser */ });
    if (name === 'coin') { tone(988, 0, 0.09, 'triangle'); tone(1319, 0.07, 0.16, 'triangle'); }
    else if (name === 'good') { tone(660, 0, 0.1); tone(880, 0.09, 0.18); }
    else if (name === 'bad') { tone(220, 0, 0.22, 'sawtooth', 0.04); tone(180, 0.12, 0.25, 'sawtooth', 0.04); }
    else if (name === 'click') tone(520, 0, 0.05, 'square', 0.03);
    // A soft two-note service bell. Three ascending, shorter notes are reserved
    // for a first-time mission completion. Neither sound implies a cash payout.
    else if (name === 'service') {
      tone(784, 0, 0.16, 'sine', 0.035);
      tone(1047, 0.11, 0.21, 'sine', 0.028);
    }
    else if (name === 'goal') {
      tone(523, 0, 0.13, 'triangle', 0.04);
      tone(659, 0.12, 0.13, 'triangle', 0.045);
      tone(988, 0.24, 0.31, 'sine', 0.05);
    }
    else [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.07));
  } catch { /* audio is optional */ }
}
