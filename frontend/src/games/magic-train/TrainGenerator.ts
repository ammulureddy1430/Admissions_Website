import { DifficultyManager } from "./DifficultyManager";
import { SequenceGenerator } from "./SequenceGenerator";
import type { Carriage, TrainRound } from "./Types";

export class TrainGenerator {
  constructor(
    private difficulty: DifficultyManager,
    private sequences = new SequenceGenerator(),
  ) {}
  next(): TrainRound {
    const level = this.difficulty.current();
    const sequence = this.sequences.create(this.difficulty.length(), level);
    const targetVisuals = new Set(sequence.map((item) => this.visualKey(item)));
    const decoys: Carriage[] = [];
    const desiredDecoys = Math.min(2, 1 + Math.floor(level / 3));
    for (
      let attempt = 0;
      attempt < 30 && decoys.length < desiredDecoys;
      attempt += 1
    ) {
      const candidate = this.sequences.create(1, Math.max(1, level))[0];
      const key = this.visualKey(candidate);
      if (
        !targetVisuals.has(key) &&
        !decoys.some((item) => this.visualKey(item) === key)
      )
        decoys.push(candidate);
    }
    const choices = this.shuffle([
      ...sequence.map((item) => ({ ...item })),
      ...decoys,
    ]);
    return {
      difficulty: level,
      sequence,
      choices,
      observationMs: this.difficulty.observationMs(),
    };
  }
  private visualKey(item: Carriage) {
    return `${item.kind}:${item.token}:${item.color}`;
  }
  private shuffle(items: Carriage[]) {
    return [...items].sort(() => Math.random() - 0.5);
  }
}
