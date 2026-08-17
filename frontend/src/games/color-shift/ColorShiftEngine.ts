import { levelFor } from "./Levels";
import { spawnObject } from "./ObjectSpawner";
import { matchesRule, nextRule, switchDelay } from "./RuleEngine";
import { scoreColorShift } from "./ScoringEngine";
import type { ActiveRule, ColorShiftMetrics, GameObject, ShiftEvent } from "./Types";
export class ColorShiftEngine {
  objects: GameObject[] = []; events: ShiftEvent[] = []; playerX = 0; rule: ActiveRule;
  objectsSpawned = 0; ruleSwitches = 0; highestDifficulty = 1; transitionUntil = 0;
  private startedAt = performance.now(); private lastSpawn = 0; private nextSwitch = 15000 + Math.random() * 5000; private id = 0; private previousRule?: ActiveRule;
  constructor() { this.rule = nextRule(levelFor(0, 1)); }
  movePlayer(x: number, width: number) { this.playerX = Math.max(34, Math.min(width - 34, x)); }
  update(now: number, dt: number, width: number, height: number) {
    const elapsed = (now - this.startedAt) / 1000, accuracy = this.events.filter(e => e.kind === "target").length / Math.max(1, this.events.length);
    const level = levelFor(elapsed, accuracy); this.highestDifficulty = Math.max(this.highestDifficulty, level.difficulty);
    if (now - this.startedAt >= this.nextSwitch) { this.previousRule = this.rule; this.rule = nextRule(level, this.rule); this.ruleSwitches++; this.transitionUntil = now + 1200; this.nextSwitch += switchDelay(level.difficulty); }
    if (now - this.lastSpawn >= level.spawnMs && this.objects.length < level.maxObjects && now > this.transitionUntil) { this.objects.push(spawnObject(++this.id, width, this.rule, level, now)); this.objectsSpawned++; this.lastSpawn = now; }
    this.objects.forEach(o => { o.x += o.velocityX * dt; if (o.x < o.size / 2 || o.x > width - o.size / 2) o.velocityX *= -1; o.y += o.velocityY * dt; });
    const playerY = height - 62;
    this.objects = this.objects.filter(o => { const hit = Math.abs(o.x - this.playerX) < o.size * .58 + 34 && Math.abs(o.y - playerY) < o.size * .52 + 25; const missed = o.y > height + o.size;
      if (hit || missed) { const currentTarget = matchesRule(o.color, o.shape, this.rule); const oldResponse = Boolean(this.previousRule && matchesRule(o.color, o.shape, this.previousRule) && !currentTarget);
        // Correctly ignoring a non-target is not a decision error and must not
        // increase the mistake counter or reduce the assessment score.
        if (hit || currentTarget) this.events.push({ kind: hit ? (currentTarget ? "target" : "distractor") : "miss", at: now - this.startedAt, afterSwitch: this.ruleSwitches > 0 && now - (this.transitionUntil - 1200) < 6500, oldRuleResponse: hit && oldResponse, responseTime: now - o.spawnedAt });
        return false; } return true; });
  }
  finish(status = "COMPLETED"): ColorShiftMetrics { return scoreColorShift(this.events, (performance.now() - this.startedAt) / 1000, this.objectsSpawned, this.ruleSwitches, this.highestDifficulty, status); }
}
