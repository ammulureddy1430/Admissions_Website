export class DifficultyManager {
  level(elapsed: number) { return Math.min(6, Math.floor(elapsed / 20) + 1); }
  interval(level: number) { return Math.max(2500, 5400 - level * 480) + Math.random() * 900; }
}
