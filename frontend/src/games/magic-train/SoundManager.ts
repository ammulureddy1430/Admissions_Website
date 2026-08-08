export class SoundManager {
  private context?: AudioContext; constructor(private enabled = true) {}
  setEnabled(value: boolean) { this.enabled = value; }
  private tone(frequency: number, duration: number, volume = .035) {
    if (!this.enabled || typeof window === "undefined") return;
    this.context ??= new AudioContext(); const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.frequency.value = frequency; oscillator.type = "sine"; gain.gain.setValueAtTime(volume, this.context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination); oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }
  connect() { this.tone(330, .14); window.setTimeout(() => this.tone(440, .12), 80); }
  whistle() { this.tone(620, .28, .025); window.setTimeout(() => this.tone(780, .35, .02), 150); }
  dispose() { void this.context?.close(); }
}
