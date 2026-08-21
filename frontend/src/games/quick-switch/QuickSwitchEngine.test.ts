import test from "node:test";
import assert from "node:assert/strict";
import { scoreQuickSwitch } from "./ScoringEngine";
import type { RawQuickSwitchMetrics, Orb, ActiveRule } from "./Types";

// Helper to create empty mock metrics
const mockRawMetrics = (changes: Partial<RawQuickSwitchMetrics> = {}): RawQuickSwitchMetrics => ({
  sessionDuration: 180,
  totalInteractions: 10,
  correctInteractions: 8,
  incorrectInteractions: 2,
  ruleChanges: 4,
  switchingLatency: 1200,
  perseverativeErrors: 1,
  postSwitchErrors: 1,
  postSwitchAccuracy: 80,
  adaptationTime: 1200,
  recoveryTime: 1500,
  responseConsistency: 12,
  ruleMasteryTime: 2500,
  ruleSwitchSuccess: 3,
  ruleSwitchFailure: 0,
  attentionShiftEvents: 4,
  taskSwitchEvents: 2,
  comboCount: 4,
  highestCombo: 6,
  score: 800,
  completionStatus: "COMPLETED",
  ruleSpecificAnalytics: [],
  ...changes,
});

test("Rule selection and target checks", () => {
  const blueCircle: Orb = {
    id: 1,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    color: "blue",
    shape: "circle",
    size: 20,
    speed: 0,
    spawnedAt: 0,
    isStationary: false,
  };

  const redSquare: Orb = {
    id: 2,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    color: "red",
    shape: "square",
    size: 20,
    speed: 0,
    spawnedAt: 0,
    isStationary: false,
  };

  const rule1: ActiveRule = {
    id: 1,
    type: "color",
    targetColor: "blue",
    avoidColor: "red",
    description: "Collect Blue, Avoid Red",
  };

  const rule2: ActiveRule = {
    id: 2,
    type: "color",
    targetColor: "red",
    avoidColor: "blue",
    description: "Collect Red, Avoid Blue",
  };

  const isCollectible = (orb: Orb, rule: ActiveRule) => {
    if (rule.type === "color") return orb.color === rule.targetColor;
    return false;
  };

  assert.equal(isCollectible(blueCircle, rule1), true);
  assert.equal(isCollectible(redSquare, rule1), false);
  assert.equal(isCollectible(blueCircle, rule2), false);
  assert.equal(isCollectible(redSquare, rule2), true);
});

test("Collision boundaries", () => {
  const intersects = (ox: number, oy: number, osize: number, px: number, py: number, pradius: number) => {
    const dx = ox - px;
    const dy = oy - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < pradius + osize * 0.7;
  };

  assert.equal(intersects(100, 100, 20, 100, 110, 24), true);
  assert.equal(intersects(100, 100, 20, 200, 200, 24), false);
});

test("Perseverative error detection", () => {
  const blueCircle: Orb = {
    id: 1,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    color: "blue",
    shape: "circle",
    size: 20,
    speed: 0,
    spawnedAt: 0,
    isStationary: false,
  };

  const rule1: ActiveRule = {
    id: 1,
    type: "color",
    targetColor: "blue",
    avoidColor: "red",
    description: "Collect Blue, Avoid Red",
  };

  const rule2: ActiveRule = {
    id: 2,
    type: "color",
    targetColor: "red",
    avoidColor: "blue",
    description: "Collect Red, Avoid Blue",
  };

  const checkPerseverative = (orb: Orb, current: ActiveRule, prev?: ActiveRule) => {
    if (!prev) return false;
    const wasCollectible = prev.type === "color" && orb.color === prev.targetColor;
    const isNowCollectible = current.type === "color" && orb.color === current.targetColor;
    return wasCollectible && !isNowCollectible;
  };

  // Under rule 2 (red target), blue circle should trigger perseverative error if prev was rule 1
  assert.equal(checkPerseverative(blueCircle, rule2, rule1), true);
  assert.equal(checkPerseverative(blueCircle, rule2, undefined), false);
});

test("Scoring calculates correct values", () => {
  const metrics = mockRawMetrics({
    totalInteractions: 12,
    correctInteractions: 10,
    incorrectInteractions: 2,
    perseverativeErrors: 1,
    switchingLatency: 1000,
    postSwitchAccuracy: 90,
  });

  const scores = scoreQuickSwitch(metrics);

  assert.ok(scores.overallScore > 0);
  assert.ok(scores.cognitiveFlexibilityScore > 0);
  assert.ok(scores.ruleSwitchingScore > 0);
  assert.ok(scores.mentalSetShiftingScore > 0);
  assert.ok(scores.attentionShiftingScore > 0);
  assert.ok(scores.errorRecoveryScore > 0);
});
