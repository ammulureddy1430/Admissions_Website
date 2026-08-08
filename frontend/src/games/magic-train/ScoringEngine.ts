import type { MagicTrainRawMetrics, MagicTrainScores } from "./Types";
const pct = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
export function scoreMagicTrain(raw: MagicTrainRawMetrics): MagicTrainScores {
  const attempts = raw.correct_carriages + raw.incorrect_selections;
  const pattern_accuracy = pct(attempts ? raw.correct_carriages / attempts * 100 : 0);
  const sequencing_accuracy = pct(raw.total_trains ? raw.completed_trains / raw.total_trains * 100 : 0);
  const completion_percentage = pct(raw.total_carriages ? raw.correct_carriages / raw.total_carriages * 100 : 0);
  const challenge = pct(raw.highest_sequence_length / 6 * 100);
  const pattern_recognition_score = pct(pattern_accuracy * .75 + challenge * .25);
  const sequencing_score = pct(sequencing_accuracy * .6 + completion_percentage * .25 + challenge * .15);
  const { response_times, completion_times, ...stored } = raw;
  return { ...stored, average_response_time: average(response_times), average_completion_time: average(completion_times), pattern_accuracy, sequencing_accuracy, pattern_recognition_score, sequencing_score, completion_percentage, overall_score: pct((pattern_recognition_score + sequencing_score) / 2), completionStatus: raw.completed_at ? "COMPLETED" : "PARTIAL" };
}
