import type { SoundItem, SoundId } from "./Types";

export const SOUND_ITEMS: SoundItem[] = [
  { id: "dog", label: "Dog", emoji: "🐶", category: "animal", animationType: "bounce" },
  { id: "cat", label: "Cat", emoji: "🐱", category: "animal", animationType: "pulse" },
  { id: "bird", label: "Bird", emoji: "🐦", category: "animal", animationType: "float" },
  { id: "cow", label: "Cow", emoji: "🐮", category: "animal", animationType: "bounce" },
  { id: "rain", label: "Rain", emoji: "🌧️", category: "environment", animationType: "float" },
  { id: "ocean", label: "Ocean Waves", emoji: "🌊", category: "environment", animationType: "pulse" },
  { id: "wind", label: "Wind", emoji: "💨", category: "environment", animationType: "float" },
  { id: "thunder", label: "Thunder", emoji: "⚡", category: "environment", animationType: "shake" },
  { id: "car_horn", label: "Car Horn", emoji: "🚗", category: "mechanical", animationType: "shake" },
  { id: "train", label: "Train", emoji: "🚂", category: "mechanical", animationType: "bounce" },
  { id: "bell", label: "Bell", emoji: "🔔", category: "instrument", animationType: "pulse" },
  { id: "drum", label: "Drum", emoji: "🥁", category: "instrument", animationType: "shake" },
  { id: "clock", label: "Clock", emoji: "⏰", category: "soft", animationType: "spin" },
  { id: "whisper", label: "Whisper", emoji: "🤫", category: "soft", animationType: "pulse" },
  { id: "pages", label: "Turning Pages", emoji: "📖", category: "soft", animationType: "float" },
  { id: "footsteps", label: "Footsteps", emoji: "👣", category: "soft", animationType: "bounce" },
];

export const GAME_DURATION_SECONDS = 120; // 2 minutes

export class SoundDetectiveEngine {
  private round = 0;
  private currentTarget: SoundItem | null = null;
  private currentOptions: SoundItem[] = [];
  private playedTargets = new Set<SoundId>();

  nextRound(): {
    round: number;
    target: SoundItem;
    options: SoundItem[];
    difficulty: number;
  } {
    this.round += 1;
    let difficulty = 1; // Always Level 1 (easiest level with mixed categories)

    // 1. Determine target category and candidate items (only easy recognizable items)
    const easyIds = ["dog", "cat", "bird", "cow", "car_horn", "train", "bell", "drum"];
    const targetCandidates = SOUND_ITEMS.filter((item) => easyIds.includes(item.id));

    // Exclude already played targets to avoid repetitions
    let freshCandidates = targetCandidates.filter((item) => !this.playedTargets.has(item.id));
    if (freshCandidates.length === 0) {
      this.playedTargets.clear();
      freshCandidates = [...targetCandidates];
    }

    // Select random target
    const target = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
    this.currentTarget = target;
    this.playedTargets.add(target.id);

    // 2. Select 3 distractors from different categories
    const otherCategories = SOUND_ITEMS.filter((item) => item.category !== target.category);
    
    // Select 3 distractors, each from a unique category if possible
    const uniqueDistractors: SoundItem[] = [];
    const categoriesSeen = new Set<string>();

    const shuffledOthers = [...otherCategories].sort(() => Math.random() - 0.5);
    for (const item of shuffledOthers) {
      if (!categoriesSeen.has(item.category) && uniqueDistractors.length < 3) {
        uniqueDistractors.push(item);
        categoriesSeen.add(item.category);
      }
    }

    // Fallback if not enough unique categories
    while (uniqueDistractors.length < 3) {
      const item = shuffledOthers.find((x) => !uniqueDistractors.includes(x));
      if (item) uniqueDistractors.push(item);
      else break;
    }
    const distractorCandidates = uniqueDistractors;

    // Shuffle and pick 3 distractors
    const selectedDistractors = [...distractorCandidates]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // Combine and shuffle options
    this.currentOptions = [target, ...selectedDistractors].sort(() => Math.random() - 0.5);

    return {
      round: this.round,
      target: this.currentTarget,
      options: [...this.currentOptions],
      difficulty,
    };
  }

  isCorrect(selectedId: SoundId): boolean {
    return this.currentTarget?.id === selectedId;
  }

  getRoundNumber(): number {
    return this.round;
  }
}
