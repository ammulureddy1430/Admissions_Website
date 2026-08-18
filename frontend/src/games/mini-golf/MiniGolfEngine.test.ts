import assert from "node:assert/strict";
import { COURSES } from "./Levels";
import { shotVelocity, stepBall } from "./PhysicsEngine";
import { scoreGolf } from "./ScoringEngine";
import type { Ball } from "./Types";
assert.equal(COURSES.length, 2);
assert.ok(COURSES.every((c) => c.start && c.hole && c.difficulty > 0));
const s = shotVelocity(10, 10, 0, 10);
assert.ok(s.vx > 0);
assert.equal(s.vy, 0);
const b: Ball = { x: 10, y: 10, vx: 40, vy: 0, r: 1.5, moving: true };
stepBall(b, COURSES[0], 0.1, 160, 90);
assert.ok(b.x > 10 && b.vx < 40);
const wall: Ball = { x: 1, y: 50, vx: -30, vy: 0, r: 1.5, moving: true };
stepBall(wall, COURSES[0], 0.1, 160, 90);
assert.ok(wall.vx > 0);
const hole: Ball = {
  x: COURSES[0].hole.x,
  y: COURSES[0].hole.y,
  vx: 1,
  vy: 1,
  r: 1.5,
  moving: true,
};
assert.equal(stepBall(hole, COURSES[0], 0.016, 160, 90).hole, true);
const m = scoreGolf(
  {
    coursesStarted: 3,
    coursesCompleted: 2,
    shotsTaken: 5,
    successfulShots: 2,
    wallCollisionCount: 1,
    obstacleCollisionCount: 0,
    adaptiveAdjustments: 2,
    successfulAdaptiveAdjustments: 1,
    overshootCount: 1,
    undershootCount: 1,
    powerDeviation: 10,
  },
  [1000, 1200],
  [2, 3],
  120,
);
assert.ok(m.overallScore > 0 && m.overallScore <= 100);
console.log("Mini Golf engine tests passed");
