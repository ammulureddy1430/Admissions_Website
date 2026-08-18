import { ObjectColor, ObjectShape, LevelConfig, ActiveRule } from './Types';

export class SpawnEngine {
  private lastSpawnTime = 0;
  private trialsSinceLastShift = 0;

  constructor() {}

  /**
   * Resets the spawner metrics.
   */
  public reset() {
    this.lastSpawnTime = 0;
    this.trialsSinceLastShift = 0;
  }

  /**
   * Checks if it's time to spawn a new object.
   */
  public shouldSpawn(now: number, interval: number, pendingCount: number): boolean {
    // Keep max 4 objects in queue (1 active, 3 pending)
    if (pendingCount >= 4) return false;
    return now - this.lastSpawnTime >= interval;
  }

  /**
   * Generates properties for the next object.
   */
  public generateNext(
    levelConfig: LevelConfig,
    activeRule: ActiveRule
  ): { color: ObjectColor; shape: ObjectShape; isDistractor: boolean } {
    this.lastSpawnTime = Date.now();
    this.trialsSinceLastShift++;

    // 1. Handle Distractors (Level 6 & 7 only, based on configured frequency)
    if (levelConfig.hasDistractors && Math.random() < levelConfig.distractorFrequency) {
      // Choose distractor properties. Let's use colors or shapes outside the normal targets.
      // E.g., grey circles or purple stars.
      // We will flag it as a distractor.
      return {
        color: 'yellow', // Distractors will have yellow or green which are ignored if not in the target
        shape: 'star',
        isDistractor: true,
      };
    }

    // 2. Select from allowed colors and shapes based on level config
    const colors = levelConfig.allowedColors;
    const shapes = levelConfig.allowedShapes;

    // Grab random color and shape from allowed lists
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    return {
      color,
      shape,
      isDistractor: false,
    };
  }

  /**
   * Tracks trials since last shift.
   */
  public getTrialsSinceLastShift(): number {
    return this.trialsSinceLastShift;
  }

  /**
   * Resets the shift trials counter.
   */
  public resetShiftTrials() {
    this.trialsSinceLastShift = 0;
  }
}
