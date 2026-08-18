import assert from "node:assert/strict";
import { RuleEngine } from "./RuleEngine";
import { ObjectEngine } from "./ObjectEngine";
import { SpawnEngine } from "./SpawnEngine";
import { DifficultyEngine } from "./DifficultyEngine";
import { scoreRuleShift, TrialEvent } from "./ScoringEngine";
import { LEVELS } from "./Levels";

// 1. RuleEngine Tests
const ruleEngine = new RuleEngine();
assert.equal(ruleEngine.activeRule.mode, "color");
assert.equal(ruleEngine.activeRule.version, 1);

// Test color mappings
let correctSide = ruleEngine.getCorrectSide("red", "circle");
assert.equal(correctSide, "left");
correctSide = ruleEngine.getCorrectSide("blue", "circle");
assert.equal(correctSide, "right");

// Test shape mapping generation
const shapeRule = ruleEngine.generateNextRule("shape", 4);
assert.equal(shapeRule.mode, "shape");
assert.equal(shapeRule.version, 2);
assert.ok(shapeRule.shapeMapping);
assert.ok(ruleEngine.getCorrectSide("red", "circle") !== null);

// Test combination rule generation
const combRule = ruleEngine.generateNextRule("combination", 7);
assert.equal(combRule.mode, "combination");
assert.ok(combRule.combinationRule);

// 2. ObjectEngine Tests
const objectEngine = new ObjectEngine();
assert.equal(objectEngine.objects.length, 0);

// Spawn target
const obj = objectEngine.spawnObject("red", "circle", false, 1.5);
assert.equal(objectEngine.objects.length, 1);
assert.equal(obj.status, "moving");

// Update position (verify it slides down)
objectEngine.update(16.6); // Simulate 1 frame
assert.ok(obj.y > 0);

// Set active
obj.y = 65;
objectEngine.update(16.6);
assert.equal(obj.status, "active");
assert.equal(objectEngine.getActiveObject()?.id, obj.id);

// Sort active
objectEngine.sortActive("left");
assert.equal(obj.status, "sorted");
assert.equal(obj.decision, "left");

// Update sorted object should decrease opacity
objectEngine.update(16.6);
assert.ok(obj.opacity !== undefined && obj.opacity < 1.0);

// 3. SpawnEngine Tests
const spawnEngine = new SpawnEngine();
assert.equal(spawnEngine.getTrialsSinceLastShift(), 0);

// Should spawn logic
assert.ok(spawnEngine.shouldSpawn(1000, 500, 0));
assert.ok(!spawnEngine.shouldSpawn(1000, 500, 4)); // Queue full

const config = LEVELS[0]; // Learn the Rule
const nextObj = spawnEngine.generateNext(config, ruleEngine.activeRule);
assert.equal(nextObj.isDistractor, false);
assert.equal(spawnEngine.getTrialsSinceLastShift(), 1);

// 4. DifficultyEngine Tests
const difficultyEngine = new DifficultyEngine();
assert.equal(difficultyEngine.getCurrentLevel().level, 1);
assert.equal(difficultyEngine.getCurrentLevel().name, "Learn the Rule");

// Progress trial
let leveledUp = difficultyEngine.registerTrial();
assert.equal(leveledUp, false); // Requires config.trialsPerRule trials (6 for Level 1)

for (let i = 0; i < 4; i++) {
  leveledUp = difficultyEngine.registerTrial();
}
assert.equal(leveledUp, true); // Leveled up to Level 2!
assert.equal(difficultyEngine.getCurrentLevel().level, 2);

// 5. ScoringEngine Tests
const mockEvents: TrialEvent[] = [
  // First rule: color (RED -> LEFT, BLUE -> RIGHT)
  {
    timestamp: 1000,
    level: 2,
    ruleVersion: 1,
    ruleMode: "color",
    color: "red",
    shape: "circle",
    isDistractor: false,
    response: "left",
    responseTime: 500,
    correct: true,
    isRuleChangeTrial: false,
  },
  {
    timestamp: 2000,
    level: 2,
    ruleVersion: 1,
    ruleMode: "color",
    color: "blue",
    shape: "circle",
    isDistractor: false,
    response: "right",
    responseTime: 600,
    correct: true,
    isRuleChangeTrial: false,
  },
  // Rule change version 2: reverse (RED -> RIGHT, BLUE -> LEFT)
  {
    timestamp: 4000,
    level: 3,
    ruleVersion: 2,
    ruleMode: "color",
    color: "red",
    shape: "circle",
    isDistractor: false,
    response: "left", // Perseverative error (pressing previous rule mapping)
    responseTime: 800,
    correct: false,
    isRuleChangeTrial: true,
    previousRuleMapping: {
      mode: "color",
      colorMapping: { red: "left", blue: "right", green: "left", yellow: "right" },
    },
  },
  {
    timestamp: 5000,
    level: 3,
    ruleVersion: 2,
    ruleMode: "color",
    color: "red",
    shape: "circle",
    isDistractor: false,
    response: "right", // Correct adaptation
    responseTime: 700,
    correct: true,
    isRuleChangeTrial: true,
    previousRuleMapping: {
      mode: "color",
      colorMapping: { red: "left", blue: "right", green: "left", yellow: "right" },
    },
  },
  // Distractor trial
  {
    timestamp: 6000,
    level: 6,
    ruleVersion: 2,
    ruleMode: "color",
    color: "yellow",
    shape: "star",
    isDistractor: true,
    response: "left", // Distractor error
    responseTime: 400,
    correct: false,
    isRuleChangeTrial: false,
  },
];

const results = scoreRuleShift(mockEvents, 120, 3);
assert.equal(results.totalTrials, 5);
assert.equal(results.validTrials, 4);
assert.equal(results.correctResponses, 3);
assert.equal(results.incorrectResponses, 1);
assert.equal(results.perseverativeErrors, 1);
assert.equal(results.distractorErrors, 1);
assert.ok(results.cognitiveFlexibilityScore >= 0 && results.cognitiveFlexibilityScore <= 100);
assert.ok(results.inhibitoryControlScore >= 0 && results.inhibitoryControlScore <= 100);
assert.ok(results.overallScore > 0 && results.overallScore <= 100);

console.log("Rule Shift Challenge engine tests passed successfully!");
