export type SoundId =
  | "dog"
  | "cat"
  | "bird"
  | "cow"
  | "rain"
  | "ocean"
  | "car_horn"
  | "bell"
  | "drum"
  | "train"
  | "clock"
  | "whisper"
  | "pages"
  | "wind"
  | "thunder"
  | "footsteps";

export interface SoundItem {
  id: SoundId;
  label: string;
  emoji: string;
  category: "animal" | "environment" | "mechanical" | "instrument" | "soft";
  animationType: "pulse" | "spin" | "bounce" | "shake" | "float";
}

export type GamePhase = "ready" | "listen" | "choices" | "complete";

export interface RawGameMetrics {
  roundsPlayed: number;
  correctResponses: number;
  incorrectResponses: number;
  reactionTimes: number[]; // response time in ms for each correct round
  highestDifficulty: number; // 1 to 5
  elapsedSeconds: number;
  endReason: "TIME_LIMIT_REACHED" | "COMPLETED";
}

export interface SoundDetectiveScores extends RawGameMetrics {
  averageResponseTime: number; // in ms
  listeningScore: number; // 0 to 100
  auditoryRecognitionScore: number; // 0 to 100
  completionPercentage: number; // 0 to 100
  overallScore: number; // 0 to 100
  completionStatus: string;
}
