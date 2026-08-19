export type Command = "FORWARD" | "LEFT" | "RIGHT" | "COLLECT" | "ACTIVATE";
export type Direction = 0 | 1 | 2 | 3;
export type Point = { x: number; y: number };
export type Mission = { id: number; level: number; start: Point; direction: Direction; target: Point; object?: Point; station?: Point; obstacles: Point[]; maxCommands: number };
export type RobotMissionMetrics = {
  age_group: "5–7 Years"; missions_started: number; missions_completed: number; commands_selected: number;
  commands_executed: number; successful_missions: number; unsuccessful_missions: number; sequence_length_average: number;
  longest_successful_sequence: number; sequence_accuracy: number; command_efficiency: number; average_sequence_build_time: number;
  average_mission_completion_time: number; highest_difficulty: number; computational_thinking_score: number;
  algorithmic_reasoning_score: number; completion_percentage: number; overall_score: number; started_at: string; completed_at: string;
};
