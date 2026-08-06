import type { LightColor } from "../Types";

const FREQUENCIES: Record<LightColor, number> = { red: 261.63, green: 329.63, blue: 392, yellow: 523.25 };

export class SoundManager {
  private context?: AudioContext;
  constructor(private enabled = true) {}
  setEnabled(enabled: boolean) { this.enabled = enabled; }
  play(color: LightColor) {
    if (!this.enabled || typeof window === "undefined") return;
    this.context ||= new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = FREQUENCIES[color];
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, this.context.currentTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.28);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(); oscillator.stop(this.context.currentTime + 0.3);
  }
  dispose() { void this.context?.close(); this.context = undefined; }
}
