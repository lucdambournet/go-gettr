declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function playTone(frequency: number, duration = 0.08, type: OscillatorType = "sine", volume = 0.08): void {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch {}
}

export const soundNav = () => playTone(660, 0.06, "sine", 0.06);
export const soundMenuOpen = () => playTone(520, 0.1, "sine", 0.07);
export const soundMenuClose = () => playTone(440, 0.1, "sine", 0.07);
export const soundClick = () => playTone(600, 0.05, "sine", 0.05);
export const soundComplete = () => { playTone(880, 0.07, "sine", 0.08); setTimeout(() => playTone(1100, 0.1, "sine", 0.07), 70); };
export const soundUncomplete = () => playTone(440, 0.1, "triangle", 0.06);
export const soundCheckIn = () => { playTone(660, 0.07); setTimeout(() => playTone(880, 0.07), 80); setTimeout(() => playTone(1100, 0.12), 160); };
export const soundCashOut = () => { playTone(523, 0.07); setTimeout(() => playTone(659, 0.07), 80); setTimeout(() => playTone(784, 0.12), 160); };
export const soundPaid = () => { playTone(784, 0.07); setTimeout(() => playTone(1047, 0.14), 90); };
