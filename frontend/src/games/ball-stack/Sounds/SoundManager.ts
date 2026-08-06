export class BallStackSoundManager {
  private context: AudioContext | null = null;
  constructor(private enabled = true) {}
  setEnabled(enabled: boolean) { this.enabled = enabled; }
  playLand(perfect: boolean) { this.tone(perfect ? 660 : 480, .09); }
  playFall() { this.tone(180, .16); }
  private tone(frequency: number, duration: number) {
    if (!this.enabled || typeof window === "undefined") return;
    this.context ||= new AudioContext();
    const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.frequency.value = frequency; oscillator.type = "sine"; gain.gain.setValueAtTime(.08, this.context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination); oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }
  dispose() { void this.context?.close(); this.context = null; }
}
