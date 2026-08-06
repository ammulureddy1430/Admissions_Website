export type LandingResult = { success: boolean; perfect: boolean; alignment: number; stability: number };

export class BallStackPhysicsEngine {
  evaluateLanding(ballX: number, supportX: number, radius: number): LandingResult {
    const offset = Math.abs(ballX - supportX);
    const overlap = Math.max(0, radius * 2 - offset);
    const alignment = Math.max(0, Math.min(100, overlap / (radius * 2) * 100));
    return { success: alignment >= 42, perfect: alignment >= 90, alignment, stability: Math.max(0, Math.min(100, (alignment - 32) * 1.47)) };
  }
  horizontalPosition(startedAt: number, now: number, width: number, radius: number, speed: number) {
    const range = Math.max(1, width - radius * 2);
    const distance = ((now - startedAt) / 1000) * speed;
    const cycle = distance % (range * 2);
    return radius + (cycle <= range ? cycle : range * 2 - cycle);
  }
}
