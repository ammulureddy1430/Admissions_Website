import type { RescueTool } from "./Types";
export const TOOL_VISUALS: Record<RescueTool, { icon: string; aria: string; label: string }> = {
  ladder: { icon: "🪜", aria: "use ladder", label: "USE LADDER" },
  rope: { icon: "🪢", aria: "use rope", label: "USE ROPE" },
  hose: { icon: "🚿", aria: "use water hose", label: "USE HOSE" },
  bridge: { icon: "🌉", aria: "place bridge", label: "PLACE BRIDGE" },
  move: { icon: "📦", aria: "move the box", label: "MOVE BOX" },
};
export class ToolManager { identity(tool: RescueTool) { return TOOL_VISUALS[tool]; } }
