import { AttentionScoringEngine } from "./AttentionScoringEngine";
import { FlexibilityScoringEngine } from "./FlexibilityScoringEngine";
import type { RawTrafficMetrics, TrafficMetrics } from "./Types";
export class GameEngine {
  finish(raw: RawTrafficMetrics, elapsed: number, planned: number): TrafficMetrics {
    const attention = new AttentionScoringEngine().score(raw); const flexibility = new FlexibilityScoringEngine().score(raw);
    const completion = Math.min(100, Math.round(elapsed / planned * 100));
    const { response_times, correct_responses: _correctResponses, ...base } = raw;
    void _correctResponses;
    return { ...base, adaptation_accuracy: flexibility, attention_consistency: attention, average_response_time: response_times.length ? Math.round(response_times.reduce((a,b)=>a+b,0)/response_times.length) : 0, attention_control_score: attention, cognitive_flexibility_score: flexibility, completion_percentage: completion, overall_score: Math.round((attention + flexibility) / 2), completed_at: new Date().toISOString(), completionStatus: completion >= 100 ? "COMPLETED" : "PARTIAL" };
  }
}
