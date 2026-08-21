export class SoundSynth {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  playCollect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  playImpact() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  playTransition() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const playNote = (freq: number, start: number, duration: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.04, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };
      // Play ascending scale (C5 -> E5 -> G5 -> C6)
      playNote(523.25, now, 0.15);
      playNote(659.25, now + 0.1, 0.15);
      playNote(783.99, now + 0.2, 0.15);
      playNote(1046.5, now + 0.3, 0.3);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  playMove() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {
      // Ignore audio synthesis errors
    }
  }
}
