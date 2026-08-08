import type { RescueRawMetrics } from "./Types";
const clamp = (value: number) => Math.max(0, Math.min(100, value));
export class ProblemSolvingScoringEngine {
  score(m: RescueRawMetrics) {
    const completion = m.missions_started ? m.missions_completed / m.missions_started : 0;
    const efficiency = m.total_actions ? m.successful_rescues / m.total_actions : 0;
    const firstApproach = m.missions_completed ? m.efficient_solutions / m.missions_completed : 0;
    const difficulty = m.highest_difficulty / 6;
    return Math.round(clamp((completion * .34 + efficiency * .26 + firstApproach * .22 + difficulty * .18) * 100) * 10) / 10;
  }
}
