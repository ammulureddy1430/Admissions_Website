export class ColorPathSoundManager {
  private context?: AudioContext; constructor(private enabled: boolean) {}
  setEnabled(value: boolean) { this.enabled = value; }
  speakColor(color: string) {
    if (!this.enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const prompt = new SpeechSynthesisUtterance(`Find ${color}`);
    prompt.lang = "en-US"; prompt.rate = 0.82; prompt.pitch = 1.12; prompt.volume = 0.9;
    const voices = window.speechSynthesis.getVoices();
    prompt.voice = voices.find((voice) => voice.lang.startsWith("en") && /female|samantha|zira|google/i.test(voice.name)) || voices.find((voice) => voice.lang.startsWith("en")) || null;
    window.speechSynthesis.speak(prompt);
  }
  playStep() { if (!this.enabled) return; this.context ??= new AudioContext(); const oscillator = this.context.createOscillator(); const gain = this.context.createGain(); oscillator.frequency.setValueAtTime(440, this.context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(660, this.context.currentTime + .14); gain.gain.setValueAtTime(.08, this.context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + .18); oscillator.connect(gain).connect(this.context.destination); oscillator.start(); oscillator.stop(this.context.currentTime + .18); }
  dispose() { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); void this.context?.close(); }
}
