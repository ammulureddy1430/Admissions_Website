export class SoundManager {
  private context?: AudioContext;
  constructor(private enabled = true) {}
  setEnabled(enabled: boolean) { this.enabled = enabled; }
  tone(frequency: number, duration = .08) {
    if (!this.enabled || typeof window === "undefined") return;
    this.context ??= new AudioContext(); const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.type = "sine"; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.028, this.context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration); oscillator.connect(gain).connect(this.context.destination); oscillator.start(); oscillator.stop(this.context.currentTime + duration);
  }
  move(){this.tone(260,.06)} interact(){this.tone(390,.09)} celebrate(){this.tone(660,.08);window.setTimeout(()=>this.tone(820,.12),90)}
  speak(message: string) { if (!this.enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const voice = new SpeechSynthesisUtterance(message); voice.rate = .88; voice.pitch = 1.12; voice.volume = .85; window.speechSynthesis.speak(voice); }
}
