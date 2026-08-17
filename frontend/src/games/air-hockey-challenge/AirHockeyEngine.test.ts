import test from "node:test";
import assert from "node:assert/strict";
import { PuckEngine } from "./PuckEngine";
import { PaddleEngine } from "./PaddleEngine";
import { OpponentEngine } from "./OpponentEngine";
import { paddleHit, wallBounce, goalSide } from "./CollisionEngine";
import { LEVELS, levelAt } from "./Levels";
import { scoreAirHockey } from "./ScoringEngine";
test("puck moves continuously", () => {
  const e = new PuckEngine();
  e.reset(600, 800, LEVELS[0], 1);
  const y = e.puck.y;
  e.update(0.1, 600);
  assert.ok(e.puck.y > y);
});
test("puck speed normalizes", () => {
  const e = new PuckEngine();
  e.reset(600, 800, LEVELS[0]);
  e.normalize(300);
  assert.ok(Math.abs(Math.hypot(e.puck.vx, e.puck.vy) - 300) < 0.01);
});
test("side wall collision reflects puck", () => {
  const e = new PuckEngine();
  e.puck.x = 10;
  e.puck.vx = -100;
  assert.equal(wallBounce(e.puck, 600), true);
  assert.ok(e.puck.vx > 0);
});
test("paddle collision separates and reflects", () => {
  const e = new PuckEngine();
  e.puck.x = 300;
  e.puck.y = 600;
  e.puck.vy = 200;
  const d = new PaddleEngine();
  d.reset(600, 700);
  d.state.x = 300;
  d.state.y = 620;
  assert.equal(paddleHit(e.puck, d.state), true);
  assert.ok(e.puck.vy < 0);
});
test("goal detection only accepts center opening", () => {
  const e = new PuckEngine();
  e.puck.x = 300;
  e.puck.y = 820;
  assert.equal(goalSide(e.puck, 600, 800), "child");
  e.puck.x = 80;
  assert.equal(goalSide(e.puck, 600, 800), null);
});
test("player paddle stays in child half", () => {
  const p = new PaddleEngine();
  p.reset(600, 800);
  p.target(-20, 0, 600, 800);
  p.update(1, 600, 800);
  assert.ok(p.state.x >= p.state.radius && p.state.y >= 400 + p.state.radius);
});
test("opponent reacts imperfectly within its half", () => {
  const o = new OpponentEngine(),
    p = new PuckEngine();
  o.reset(600, 800);
  p.reset(600, 800, LEVELS[0], -1);
  o.update(0.1, 1000, p.puck, LEVELS[0], 600, 800);
  assert.ok(o.state.y < 400);
  assert.ok(o.state.x >= o.state.radius);
});
test("difficulty progresses fairly", () => {
  assert.equal(levelAt(0).stage, 1);
  assert.equal(levelAt(119000).stage, 7);
  assert.ok(LEVELS.every((l) => l.puckSpeed <= 320));
});
test("scoring produces bounded analytics", () => {
  const m = scoreAirHockey(
    [{ kind: "return", at: 1000, responseTime: 700, distance: 8, stage: 1 }],
    {
      sessionDuration: 120,
      ralliesStarted: 1,
      ralliesCompleted: 0,
      goalsConceded: 0,
      opponentGoals: 0,
      paddleMovementDistance: 200,
      paddleDirectionChanges: 1,
      unnecessaryMovements: 0,
      prematureMovements: 0,
      correctiveMovements: 0,
      adaptationEvents: 0,
      adaptationTime: 0,
      difficultyReached: 1,
      completionStatus: "COMPLETED",
    },
  );
  assert.equal(m.successfulInterceptions, 1);
  assert.ok(m.overallScore >= 0 && m.overallScore <= 100);
});
