export type SignalColor = "green" | "yellow" | "red";
export type VehicleAction = "move" | "slow" | "stop";
export type RuleSet = "normal" | "reversed" | "yellow-stop";

export type TrafficMetrics = {
  student_id?: string;
  assessment_id?: string;
  game_id?: string;
  age_group: "4–5 Years";
  duration_seconds: number;
  signals_presented: number;
  signals_responded_to: number;
  missed_signals: number;
  unnecessary_actions: number;
  rule_changes: number;
  rule_change_responses: number;
  successful_adaptations: number;
  adaptation_accuracy: number;
  attention_consistency: number;
  average_response_time: number;
  highest_difficulty: number;
  attention_control_score: number;
  cognitive_flexibility_score: number;
  completion_percentage: number;
  overall_score: number;
  started_at: string;
  completed_at: string;
  completionStatus: "COMPLETED" | "PARTIAL";
};

export type RawTrafficMetrics = Omit<TrafficMetrics, "adaptation_accuracy" | "attention_consistency" | "average_response_time" | "attention_control_score" | "cognitive_flexibility_score" | "completion_percentage" | "overall_score" | "completed_at" | "completionStatus"> & {
  response_times: number[];
  correct_responses: number;
};
