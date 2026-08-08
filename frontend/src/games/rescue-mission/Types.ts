export type RescueTool = "ladder" | "rope" | "hose" | "bridge" | "move";
export type RescueScene = "platform" | "door" | "pit" | "water" | "barrier";
export type RescuePhase = "ready" | "playing" | "acting" | "celebrating" | "complete";

export type RescueStep = { tool: RescueTool; target: string };
export type RescueScenario = {
  id: string;
  scene: RescueScene;
  level: number;
  character: string;
  target: string;
  title: string;
  instruction: string;
  tools: RescueTool[];
  steps: RescueStep[];
  theme: "park" | "garden" | "playground" | "neighborhood";
};

export type RescueRawMetrics = {
  student_id?: string;
  assessment_id?: string;
  game_id?: string;
  age_group: "4–5 Years";
  missions_started: number;
  missions_completed: number;
  successful_rescues: number;
  unsuccessful_actions: number;
  total_actions: number;
  efficient_solutions: number;
  strategy_changes: number;
  successful_strategy_changes: number;
  scenario_types_completed: string[];
  decision_times: number[];
  solution_times: number[];
  highest_difficulty: number;
  elapsed_seconds: number;
  duration_seconds: number;
  started_at: string;
  completed_at: string;
};

export type RescueMissionScores = Omit<RescueRawMetrics, "decision_times" | "solution_times" | "total_actions" | "efficient_solutions" | "scenario_types_completed"> & {
  average_decision_time: number;
  average_solution_time: number;
  problem_solving_score: number;
  cognitive_flexibility_score: number;
  completion_percentage: number;
  overall_score: number;
  completionStatus: "COMPLETED" | "PARTIAL";
};
