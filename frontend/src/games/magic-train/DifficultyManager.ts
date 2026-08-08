export class DifficultyManager {
  private level = 1;
  current() { return this.level; }
  advance() { this.level += 1; return this.level; }
  length() { return Math.min(6, this.level + 1); }
  observationMs() { return Math.max(2600, 5200 - (this.level - 1) * 350); }
}
