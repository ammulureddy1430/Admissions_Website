export type GamePhase = "tutorial" | "observing" | "building" | "departing" | "complete";
export type CarriageKind = "color" | "shape" | "animal" | "symbol";
export type Carriage = { id: string; token: string; color: string; kind: CarriageKind };
export type TrainRound = { difficulty: number; sequence: Carriage[]; choices: Carriage[]; observationMs: number };
export type MagicTrainRawMetrics = {
  student_id?: string; assessment_id?: string; game_id?: string; age_group: "4–5 Years";
  total_trains: number; completed_trains: number; total_carriages: number; correct_carriages: number;
  incorrect_selections: number; response_times: number[]; completion_times: number[];
  highest_sequence_length: number; highest_difficulty: number; started_at: string; completed_at: string;
};
export type MagicTrainScores = Omit<MagicTrainRawMetrics, "response_times" | "completion_times"> & {
  average_response_time: number; average_completion_time: number; pattern_accuracy: number;
  sequencing_accuracy: number; pattern_recognition_score: number; sequencing_score: number;
  completion_percentage: number; overall_score: number; completionStatus: "COMPLETED" | "PARTIAL";
};
