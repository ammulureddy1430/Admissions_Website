import type { SoundId } from "../Types";

export class SoundManager {
  private context?: AudioContext;
  private enabled = true;
  private activeNodes: AudioNode[] = [];
  private currentPlayTimeout?: number;
  private masterGain?: GainNode;
  private compressor?: DynamicsCompressorNode;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  initContext() {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context ||= new AudioContextClass();
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
    if (!this.masterGain || !this.compressor) {
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 1.45;
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 5;
      this.compressor.attack.value = 0.008;
      this.compressor.release.value = 0.22;
      this.masterGain.connect(this.compressor).connect(this.context.destination);
    }
  }

  private output(ctx: AudioContext): AudioNode {
    this.initContext();
    return this.masterGain || ctx.destination;
  }

  play(soundId: SoundId, onEnd?: () => void): number {
    this.stopAll();
    if (!this.enabled) {
      onEnd?.();
      return 0;
    }

    this.initContext();
    const ctx = this.context;
    if (!ctx) {
      onEnd?.();
      return 0;
    }

    let duration = 1.8;

    switch (soundId) {
      case "dog":
        duration = this.synthesizeDog(ctx);
        break;
      case "cat":
        duration = this.synthesizeCat(ctx);
        break;
      case "bird":
        duration = this.synthesizeBird(ctx);
        break;
      case "cow":
        duration = this.synthesizeCow(ctx);
        break;
      case "car_horn":
        duration = this.synthesizeCarHorn(ctx);
        break;
      case "bell":
        duration = this.synthesizeBell(ctx);
        break;
      case "drum":
        duration = this.synthesizeDrum(ctx);
        break;
      case "train":
        duration = this.synthesizeTrain(ctx);
        break;
      default:
        duration = 1.0;
        break;
    }

    if (onEnd) {
      this.currentPlayTimeout = window.setTimeout(onEnd, duration * 1000);
    }
    return duration;
  }

  // Helpers to generate white noise buffer
  private createNoiseBuffer(ctx: AudioContext, duration: number) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Tuned Dog Bark: realistic throat woof-woof
  private synthesizeDog(ctx: AudioContext): number {
    const duration = 1.2;
    this.createBark(ctx, ctx.currentTime, 0.18, 160, 85);
    this.createBark(ctx, ctx.currentTime + 0.35, 0.22, 140, 75);
    return duration;
  }

  private createBark(ctx: AudioContext, startTime: number, barkLen: number, startFreq: number, endFreq: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + barkLen - 0.05);

    // Bandpass throat resonance filter
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(450, startTime);
    filter.Q.setValueAtTime(3.5, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + barkLen);

    // Connect noise for breathing element
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, barkLen);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + barkLen - 0.05);

    osc.connect(filter).connect(gain).connect(this.output(ctx));
    noise.connect(filter).connect(noiseGain).connect(this.output(ctx));

    osc.start(startTime);
    osc.stop(startTime + barkLen);
    noise.start(startTime);
    noise.stop(startTime + barkLen);

    this.activeNodes.push(osc, gain, filter, noise, noiseGain);
  }

  // Tuned Cat Meow: vocal triangle wave with nasal format sweeping
  private synthesizeCat(ctx: AudioContext): number {
    const duration = 1.6;
    const startTime = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    // Vocal pitch contour: M-e-o-w
    osc.frequency.setValueAtTime(380, startTime);
    osc.frequency.linearRampToValueAtTime(520, startTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(310, startTime + 1.2);

    // Formant simulation via bandpass sweep
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, startTime);
    filter.frequency.linearRampToValueAtTime(1600, startTime + 0.3);
    filter.frequency.linearRampToValueAtTime(700, startTime + 1.2);
    filter.Q.setValueAtTime(2.2, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.24, startTime + 0.2);
    gain.gain.linearRampToValueAtTime(0.18, startTime + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter).connect(gain).connect(this.output(ctx));
    osc.start(startTime);
    osc.stop(startTime + duration);

    this.activeNodes.push(osc, gain, filter);
    return duration;
  }

  // Tuned Bird Chirp: bright tweet-tweet-tweet
  private synthesizeBird(ctx: AudioContext): number {
    const duration = 1.4;
    const startTime = ctx.currentTime;

    // 3 chirps
    for (let i = 0; i < 3; i++) {
      const chirpTime = startTime + i * 0.4;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(2800, chirpTime);
      osc.frequency.exponentialRampToValueAtTime(4800, chirpTime + 0.1);

      gain.gain.setValueAtTime(0.001, chirpTime);
      gain.gain.linearRampToValueAtTime(0.16, chirpTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, chirpTime + 0.12);

      osc.connect(gain).connect(this.output(ctx));
      osc.start(chirpTime);
      osc.stop(chirpTime + 0.15);

      this.activeNodes.push(osc, gain);
    }
    return duration;
  }

  // Tuned Cow Moo: realistic slow rise nasal "Mooo"
  private synthesizeCow(ctx: AudioContext): number {
    const duration = 1.8;
    const startTime = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc1Gain = ctx.createGain();
    const osc2Gain = ctx.createGain();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Triangle gives main vocal body
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(85, startTime);
    osc1.frequency.linearRampToValueAtTime(65, startTime + duration);
    osc1Gain.gain.setValueAtTime(0.7, startTime);

    // Sawtooth adds vocal raspiness/reeds
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(86, startTime);
    osc2.frequency.linearRampToValueAtTime(66, startTime + duration);
    osc2Gain.gain.setValueAtTime(0.3, startTime);

    // Bandpass filter centered around vocal resonance
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(150, startTime);
    filter.frequency.linearRampToValueAtTime(260, startTime + 0.4);
    filter.frequency.exponentialRampToValueAtTime(160, startTime + duration);
    filter.Q.setValueAtTime(3.0, startTime);

    // Volume envelope: slow attack simulating Mmm -> oooo
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.4);
    gain.gain.setValueAtTime(0.35, startTime + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc1.connect(osc1Gain).connect(filter);
    osc2.connect(osc2Gain).connect(filter);
    filter.connect(gain).connect(this.output(ctx));

    osc1.start(startTime);
    osc1.stop(startTime + duration);
    osc2.start(startTime);
    osc2.stop(startTime + duration);

    this.activeNodes.push(osc1, osc2, osc1Gain, osc2Gain, filter, gain);
    return duration;
  }

  // Tuned Car Horn: bright honk-honk
  private synthesizeCarHorn(ctx: AudioContext): number {
    const duration = 1.0;
    const startTime = ctx.currentTime;
    this.createHornBlast(ctx, startTime, 0.22);
    this.createHornBlast(ctx, startTime + 0.32, 0.28);
    return duration;
  }

  private createHornBlast(ctx: AudioContext, startTime: number, blastDuration: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(440, startTime); // Standard A4 horn

    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(444, startTime); // detune for buzz

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.22, startTime + 0.01);
    gain.gain.setValueAtTime(0.22, startTime + blastDuration - 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + blastDuration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.output(ctx));

    osc1.start(startTime);
    osc1.stop(startTime + blastDuration);
    osc2.start(startTime);
    osc2.stop(startTime + blastDuration);

    this.activeNodes.push(osc1, osc2, gain);
  }

  // Tuned Bell Chime: rich multi-harmonic ring
  private synthesizeBell(ctx: AudioContext): number {
    const duration = 2.0;
    const startTime = ctx.currentTime;
    const freqs = [880, 1100, 1320, 1760]; // chime major triad/overtones
    const gains = [0.2, 0.08, 0.05, 0.02];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(gains[idx], startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain).connect(this.output(ctx));
      osc.start(startTime);
      osc.stop(startTime + duration);

      this.activeNodes.push(osc, gain);
    });

    return duration;
  }

  // Tuned Drum Beat: boom-boom-clap
  private synthesizeDrum(ctx: AudioContext): number {
    const duration = 1.3;
    const startTime = ctx.currentTime;

    // Drum kicks
    this.createDrumHit(ctx, startTime, 140, 0.18);
    this.createDrumHit(ctx, startTime + 0.35, 140, 0.18);

    // Snare clap beat on 3
    const snareTime = startTime + 0.7;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.2);
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = "highpass";
    filter.frequency.setValueAtTime(1000, snareTime);

    gain.gain.setValueAtTime(0.001, snareTime);
    gain.gain.linearRampToValueAtTime(0.18, snareTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, snareTime + 0.18);

    noise.connect(filter).connect(gain).connect(this.output(ctx));
    noise.start(snareTime);
    noise.stop(snareTime + 0.2);

    this.activeNodes.push(noise, filter, gain);
    return duration;
  }

  private createDrumHit(ctx: AudioContext, startTime: number, startFreq: number, hitDuration: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(45, startTime + 0.1);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + hitDuration);

    osc.connect(gain).connect(this.output(ctx));
    osc.start(startTime);
    osc.stop(startTime + hitDuration);

    this.activeNodes.push(osc, gain);
  }

  // Tuned Train Whistle: Choo-choo whistle with rhythmic chugs
  private synthesizeTrain(ctx: AudioContext): number {
    const duration = 2.0;
    const startTime = ctx.currentTime;

    // Detuned horn sines for classic whistle sound: D5 & E5
    this.createTrainWhistle(ctx, startTime, 0.55);
    this.createTrainWhistle(ctx, startTime + 0.65, 0.7);

    // Chug-chug background steam
    for (let i = 0; i < 5; i++) {
      const puffTime = startTime + 0.15 + i * 0.35;
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 0.12);
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(350, puffTime);
      filter.Q.setValueAtTime(1.2, puffTime);

      gain.gain.setValueAtTime(0.001, puffTime);
      gain.gain.linearRampToValueAtTime(0.08, puffTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, puffTime + 0.1);

      noise.connect(filter).connect(gain).connect(this.output(ctx));
      noise.start(puffTime);
      noise.stop(puffTime + 0.12);

      this.activeNodes.push(noise, filter, gain);
    }

    return duration;
  }

  private createTrainWhistle(ctx: AudioContext, startTime: number, whistleDuration: number) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587, startTime); // D5
    osc1.frequency.linearRampToValueAtTime(600, startTime + whistleDuration);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659, startTime); // E5
    osc2.frequency.linearRampToValueAtTime(672, startTime + whistleDuration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
    gain.gain.setValueAtTime(0.12, startTime + whistleDuration - 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + whistleDuration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.output(ctx));

    osc1.start(startTime);
    osc1.stop(startTime + whistleDuration);
    osc2.start(startTime);
    osc2.stop(startTime + whistleDuration);

    this.activeNodes.push(osc1, osc2, gain);
  }

  private stopAll() {
    if (this.currentPlayTimeout) {
      window.clearTimeout(this.currentPlayTimeout);
      this.currentPlayTimeout = undefined;
    }
    this.activeNodes.forEach((node) => {
      try {
        if ("stop" in node) (node as AudioScheduledSourceNode).stop();
      } catch {
        // already stopped
      }
      try {
        node.disconnect();
      } catch {
        // already disconnected
      }
    });
    this.activeNodes = [];
  }

  dispose() {
    this.stopAll();
    void this.context?.close();
    this.context = undefined;
    this.masterGain = undefined;
    this.compressor = undefined;
  }
}
