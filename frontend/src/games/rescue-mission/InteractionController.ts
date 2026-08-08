import type { RescueTool } from "./Types";
export class InteractionController {
  strategyChanged(previous: RescueTool | null, current: RescueTool, afterUnsuccessfulAction: boolean) {
    return afterUnsuccessfulAction && previous !== null && previous !== current;
  }
}
