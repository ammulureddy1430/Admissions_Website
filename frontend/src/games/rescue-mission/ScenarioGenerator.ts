import type { RescueScenario, RescueScene, RescueTool } from "./Types";

const BLUEPRINTS: Record<RescueScene, Omit<RescueScenario, "id" | "level" | "tools">> = {
  platform: { scene: "platform", character: "🐱", target: "platform", title: "THE CAT NEEDS RESCUE", instruction: "Choose one rescue tool.", steps: [{ tool: "ladder", target: "platform" }], theme: "park" },
  door: { scene: "door", character: "🧸", target: "door", title: "THE TEDDY NEEDS RESCUE", instruction: "Choose one rescue tool.", steps: [{ tool: "move", target: "box" }], theme: "neighborhood" },
  pit: { scene: "pit", character: "🐰", target: "pit", title: "THE BUNNY NEEDS RESCUE", instruction: "Choose one rescue tool.", steps: [{ tool: "rope", target: "pit" }], theme: "garden" },
  water: { scene: "water", character: "🐶", target: "water", title: "THE PUPPY NEEDS RESCUE", instruction: "Choose one rescue tool.", steps: [{ tool: "bridge", target: "water" }], theme: "park" },
  barrier: { scene: "barrier", character: "🐰", target: "barrier", title: "THE BUNNY NEEDS RESCUE", instruction: "Choose one rescue tool.", steps: [{ tool: "move", target: "box" }, { tool: "ladder", target: "barrier" }], theme: "playground" },
};

const ASSESSMENT_TOOLS: RescueTool[] = ["bridge", "ladder", "move", "rope"];

export class ScenarioGenerator {
  next(level: number, previous?: RescueScene, usedScenes: RescueScene[] = []): RescueScenario {
    const available: RescueScene[] = level >= 5 ? ["platform", "door", "pit", "water", "barrier"] : ["platform", "door", "pit", "water"];
    const assessmentOrder: RescueScene[] = ["water", "platform", "door", "pit"];
    const unused = available.filter(scene => !usedScenes.includes(scene));
    const choices = (unused.length ? unused : available).filter(scene => scene !== previous);
    const plannedScene = assessmentOrder[usedScenes.length];
    const scene = plannedScene && !usedScenes.includes(plannedScene) ? plannedScene : (choices[Math.floor(Math.random() * choices.length)] || "platform");
    const base = BLUEPRINTS[scene];
    const steps = level >= 5 && scene === "barrier" ? base.steps : base.steps.slice(-1);
    return { ...base, id: `${scene}-${Date.now()}-${Math.random()}`, level, steps, tools: [...ASSESSMENT_TOOLS] };
  }
}
