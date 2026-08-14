export type NumberBuilderMetrics = {
  age_group: string;
  rounds_presented: number;
  rounds_completed: number;
  correct_interactions: number;
  incorrect_interactions: number;
  total_score: number;
  accuracy: number;
  average_response_time: number;
  highest_difficulty: number;
  number_range_reached: number;
  
  // Skills breakdown
  early_numeracy_score: number;
  number_sense_score: number;
  counting_score: number;
  sequencing_score: number;
  quantity_comparison_score: number;
  attention_score: number;
  processing_speed_score: number;
  accuracy_score: number;
  overall_score: number;
  
  started_at: string;
  completed_at: string;
  completionStatus: "COMPLETED" | "PARTIAL";
};
