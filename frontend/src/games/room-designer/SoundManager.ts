export class SoundManager {
  private context?: AudioContext;
  constructor(private enabled = true) {}
  setEnabled(value: boolean) {
    this.enabled = value;
  }
  private tone(frequency: number, duration = 0.16, volume = 0.025) {
    if (!this.enabled || typeof window === "undefined") return;
    this.context ??= new AudioContext();
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.context.currentTime + duration,
    );
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }
  move() {
    this.tone(290, 0.1, 0.012);
  }
  place() {
    this.tone(430);
    window.setTimeout(() => this.tone(560, 0.12, 0.018), 70);
  }
  complete() {
    this.tone(520, 0.2);
    window.setTimeout(() => this.tone(680, 0.24), 120);
  }
  dispose() {
    void this.context?.close();
  }
}
