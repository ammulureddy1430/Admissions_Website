export class ColorPathSoundManager {
  private context?: AudioContext; constructor(private enabled: boolean) {}
  setEnabled(value: boolean) { this.enabled = value; }
  playStep() { if (!this.enabled) return; this.context ??= new AudioContext(); const oscillator = this.context.createOscillator(); const gain = this.context.createGain(); oscillator.frequency.setValueAtTime(440, this.context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(660, this.context.currentTime + .14); gain.gain.setValueAtTime(.08, this.context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + .18); oscillator.connect(gain).connect(this.context.destination); oscillator.start(); oscillator.stop(this.context.currentTime + .18); }
  dispose() { void this.context?.close(); }
}
