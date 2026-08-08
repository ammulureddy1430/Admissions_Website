import { CognitiveFlexibilityScoringEngine } from "./CognitiveFlexibilityScoringEngine";
import { ProblemSolvingScoringEngine } from "./ProblemSolvingScoringEngine";
import type { RescueMissionScores, RescueRawMetrics } from "./Types";
const avg = (values: number[]) => values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : 0;
const pct = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
export class GameEngine {
  finish(raw: RescueRawMetrics): RescueMissionScores {
    const problem_solving_score = new ProblemSolvingScoringEngine().score(raw);
    const cognitive_flexibility_score = new CognitiveFlexibilityScoringEngine().score(raw);
    const { decision_times, solution_times, total_actions: _a, efficient_solutions: _e, scenario_types_completed: _s, ...stored } = raw;
    void _a; void _e; void _s;
    const completion_percentage = pct(Math.max(raw.missions_started / 4, raw.elapsed_seconds / raw.duration_seconds) * 100);
    return { ...stored, average_decision_time: avg(decision_times), average_solution_time: avg(solution_times), problem_solving_score, cognitive_flexibility_score, completion_percentage, overall_score: pct((problem_solving_score + cognitive_flexibility_score) / 2), completionStatus: raw.missions_started >= 4 || raw.elapsed_seconds >= raw.duration_seconds - 1 ? "COMPLETED" : "PARTIAL" };
  }
}
