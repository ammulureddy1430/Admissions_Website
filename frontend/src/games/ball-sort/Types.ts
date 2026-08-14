export type BallColor = "red" | "blue" | "green" | "yellow";

export interface Tube {
  id: number;
  balls: BallColor[];
  capacity: number;
}

export interface RawBallSortMetrics {
  levels_started: number;
  levels_completed: number;
  total_moves: number;
  correct_moves: number;
  incorrect_moves: number;
  completion_time: number;
  highest_level: number;
  sorting_accuracy: number;
  efficiency: number;
  completionStatus: "COMPLETED" | "TIMEOUT" | "ABANDONED";
}

export interface BallSortScores {
  levels_started: number;
  levels_completed: number;
  total_moves: number;
  correct_moves: number;
  incorrect_moves: number;
  completion_time: number;
  highest_level: number;
  sorting_accuracy: number;
  efficiency: number;
  overallScore: number;
  completionStatus: string;
}
