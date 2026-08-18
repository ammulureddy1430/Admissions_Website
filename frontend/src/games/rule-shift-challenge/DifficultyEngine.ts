import { LEVELS } from './Levels';
import { LevelConfig } from './Types';

export class DifficultyEngine {
  public currentLevelIndex = 0;
  private trialsInCurrentLevel = 0;

  constructor() {}

  /**
   * Resets the engine state.
   */
  public reset() {
    this.currentLevelIndex = 0;
    this.trialsInCurrentLevel = 0;
  }

  /**
   * Returns current level config.
   */
  public getCurrentLevel(): LevelConfig {
    return LEVELS[this.currentLevelIndex];
  }

  /**
   * Check if we should advance to the next level.
   * Progression happens after a specific number of trials per level.
   */
  public registerTrial(): boolean {
    this.trialsInCurrentLevel++;
    
    const config = this.getCurrentLevel();
    const threshold = config.trialsPerRule * (config.hasShifts ? 2 : 1);

    if (this.trialsInCurrentLevel >= threshold) {
      if (this.currentLevelIndex < LEVELS.length - 1) {
        this.currentLevelIndex++;
        this.trialsInCurrentLevel = 0;
        return true; // Leveled up!
      }
    }
    return false;
  }

  /**
   * Manual override of level index (for testing or custom flows).
   */
  public setLevel(level: number) {
    const idx = LEVELS.findIndex((l) => l.level === level);
    if (idx !== -1) {
      this.currentLevelIndex = idx;
      this.trialsInCurrentLevel = 0;
    }
  }
}
