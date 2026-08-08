export class SoundManager {
  private context?: AudioContext;
  constructor(private enabled = true) {}
  setEnabled(value: boolean) { this.enabled = value; }
  tone(frequency = 320, duration = .08) {
    if (!this.enabled || typeof window === "undefined") return;
    this.context ??= new AudioContext(); const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.035, this.context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination); oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }
}
