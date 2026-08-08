export class DifficultyManager {
  private level = 1;
  current() {
    return this.level;
  }
  advance() {
    this.level = Math.min(5, this.level + 1);
    return this.level;
  }
  objectCount() {
    return this.level + 1;
  }
  observationMs() {
    return Math.max(3500, 6500 - (this.level - 1) * 650);
  }
}
