import type { RescueScenario, RescueTool } from "./Types";
export class ScenarioManager {
  expected(scenario: RescueScenario, step: number) { return scenario.steps[step]?.tool; }
  solves(scenario: RescueScenario, step: number, tool: RescueTool) { return this.expected(scenario, step) === tool; }
  isComplete(scenario: RescueScenario, step: number) { return step >= scenario.steps.length; }
}
