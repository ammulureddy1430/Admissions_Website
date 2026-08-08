export class DifficultyManager {
  level(elapsedSeconds: number, missionsCompleted: number) {
    return Math.min(6, Math.max(1, Math.max(Math.floor(elapsedSeconds / 20) + 1, Math.floor(missionsCompleted / 2) + 1)));
  }
  optionCount(level: number) { return level === 1 ? 2 : 3; }
}
