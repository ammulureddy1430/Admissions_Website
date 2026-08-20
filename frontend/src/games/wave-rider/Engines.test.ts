import { strict as assert } from "node:assert";
import test from "node:test";
import {
  applyCollision,
  collectibleCollision,
  createRider,
  createWave,
  difficultyFor,
  generateCollectible,
  generateObstacle,
  obstacleCollision,
  recoverRider,
  startJump,
  stepBalance,
  stepCollectible,
  stepJump,
  stepObstacle,
  stepWave,
  waveHeight,
  waveSlope,
} from "./Engines";
import { scoreWaveRider } from "./ScoringEngine";
test("wave surface has changing height and slope", () => {
  const w = createWave(1);
  assert.notEqual(waveHeight(w, 0), waveHeight(w, 100));
  assert.notEqual(waveSlope(w, 0), waveSlope(w, 100));
});
test("wave advances continuously", () => {
  const w = createWave(),
    p = w.phase;
  stepWave(w, 0.1, 5);
  assert.ok(w.phase > p);
});
test("difficulty progresses through environmental stages", () => {
  assert.equal(difficultyFor(0), 1);
  assert.equal(difficultyFor(170), 7);
});
test("wave force rotates an uncontrolled board", () => {
  const w = createWave(),
    r = createRider();
  for (let i = 0; i < 40; i++) stepBalance(r, w, 0, 0.02, i * 0.02);
  assert.notEqual(r.rotation, 0);
});
test("player input produces gradual acceleration", () => {
  const w = createWave(),
    r = createRider();
  stepBalance(r, w, 1, 0.02, 0);
  assert.ok(r.velocity > 0);
  assert.ok(r.balanceOffset < 10);
});
test("opposite correction changes angular velocity", () => {
  const w = createWave(),
    r = createRider();
  r.angularVelocity = 1;
  for (let i = 0; i < 20; i++) stepBalance(r, w, -1, 0.03, i * 0.03);
  assert.ok(r.angularVelocity < 1);
});
test("critical tilt causes a recoverable fall", () => {
  const w = createWave(),
    r = createRider();
  r.rotation = 1.3;
  assert.ok(stepBalance(r, w, 0, 0.02, 0).fallen);
  recoverRider(r);
  assert.equal(r.falling, false);
  assert.equal(r.rotation, 0);
});
test("obstacle generation is deterministic", () =>
  assert.deepEqual(generateObstacle(3, 2, 4), generateObstacle(3, 2, 4)));
test("obstacles scroll toward the rider", () => {
  const o = generateObstacle(1, 1, 2),
    x = o.x;
  stepObstacle(o, 0.2);
  assert.ok(o.x < x);
});
test("collision uses actual positions", () => {
  const r = createRider(),
    o = generateObstacle(1, 1, 2);
  o.x = r.x;
  o.offsetY = -18;
  assert.equal(obstacleCollision(r, o, 365), true);
});
test("jump launches, clears an obstacle, and lands", () => {
  const r = createRider(),
    o = generateObstacle(1, 1, 2);
  o.x = r.x;
  o.offsetY = -18;
  assert.equal(startJump(r), true);
  for (let i = 0; i < 10; i++) stepJump(r, 0.02);
  assert.ok(r.jumpHeight > 40);
  assert.equal(obstacleCollision(r, o, 365), false);
  for (let i = 0; i < 60; i++) stepJump(r, 0.02);
  assert.equal(r.grounded, true);
  assert.equal(r.jumpHeight, 0);
});
test("airborne rider collects a floating star", () => {
  const r = createRider();
  const c = generateCollectible(2, 1, 2);
  c.x = r.x;
  r.jumpHeight = c.height - 28;
  r.grounded = false;
  assert.equal(collectibleCollision(r, c, 365), true);
  const x = c.x;
  stepCollectible(c, 0.2);
  assert.ok(c.x < x);
});
test("collision applies instability instead of elimination", () => {
  const r = createRider(),
    o = generateObstacle(1, 1, 2);
  applyCollision(r, o);
  assert.equal(o.active, false);
  assert.ok(Math.abs(r.angularVelocity) > 0);
  assert.equal(r.falling, false);
});
test("score rewards balance control rather than distance", () => {
  const good = scoreWaveRider({
    sessionDuration: 100,
    stableDuration: 85,
    averageBalanceOffset: 5,
    movementConsistency: 90,
    adaptationTime: 2,
    recoveryCount: 2,
    fallCount: 2,
    obstacleCollisions: 0,
    overcorrectionCount: 1,
    obstaclesAvoided: 8,
    obstaclesEncountered: 9,
    distanceTravelled: 1000,
  });
  const far = scoreWaveRider({
    sessionDuration: 100,
    stableDuration: 20,
    averageBalanceOffset: 30,
    movementConsistency: 20,
    adaptationTime: 10,
    recoveryCount: 0,
    fallCount: 5,
    obstacleCollisions: 5,
    overcorrectionCount: 12,
    obstaclesAvoided: 1,
    obstaclesEncountered: 9,
    distanceTravelled: 5000,
  });
  assert.ok(Number(good.overallScore) > Number(far.overallScore));
});
