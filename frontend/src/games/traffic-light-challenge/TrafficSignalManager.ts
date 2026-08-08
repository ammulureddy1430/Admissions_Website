import type { SignalColor } from "./Types";
export class TrafficSignalManager {
  next(previous: SignalColor, level: number): SignalColor {
    const available: SignalColor[] = level === 1 ? ["green", "red"] : ["green", "yellow", "red"];
    const choices = available.filter((value) => value !== previous);
    return choices[Math.floor(Math.random() * choices.length)];
  }
}
