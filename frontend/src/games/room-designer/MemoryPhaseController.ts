import { wait } from "./AnimationController";
export class MemoryPhaseController {
  async observe(durationMs: number, cancelled: () => boolean) {
    await wait(durationMs);
    return !cancelled();
  }
  async clear(cancelled: () => boolean) {
    await wait(650);
    return !cancelled();
  }
}
