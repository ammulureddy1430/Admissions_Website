import { LEVELS } from "./Levels";
import { ClimberEngine } from "./ClimberEngine";
import { scoreClimbingChallenge } from "./ScoringEngine";

function runTests() {
  console.log("Starting Climbing Challenge Engine tests...");

  // 1. Verify Levels generation
  console.assert(LEVELS.length === 2, "Expected 2 levels");
  console.assert(LEVELS[0].holds.length > 5, "Expected beginner wall holds");
  console.assert(LEVELS[1].holds.length > 5, "Expected route choice wall holds");
  console.log("✓ Levels hold counts verified");

  // 2. Test Climber Kinematics Engine
  const engine = new ClimberEngine(400, 1000);
  console.assert(engine.state.x === 400, "Torso center should start at 400");
  console.assert(engine.state.y === 1000, "Torso center should start at 1000");

  const joints = engine.getJoints();
  console.assert(joints.head.x === 400, "Head x should align with torso center x");
  console.assert(joints.head.y < joints.torsoCenter.y, "Head y should be above torso");
  console.assert(joints.lHand.y < joints.head.y, "Left hand should be above head initially");
  console.log("✓ Climber joints IK verification passed");

  // 3. Test Reach validations
  // Close hold: should succeed
  const closeHold = { id: "close", x: 410, y: 880, size: 20, type: "medium" as const, available: true };
  const reachable = engine.tryReach(closeHold, "leftHand");
  console.assert(reachable === true, "Hold at 410,880 should be reachable from 400,1000");
  console.assert(engine.state.leftHand.holdId === "close", "Limb should latch to hold");

  // Far hold: should fail
  const farHold = { id: "far", x: 400, y: 700, size: 20, type: "medium" as const, available: true };
  const reachableFar = engine.tryReach(farHold, "rightHand");
  console.assert(reachableFar === false, "Hold at 700y should be too far from 1000y torso center");
  console.log("✓ Reach check validations passed");

  // 4. Test Scoring calculations
  const mockMetrics = {
    sessionDuration: 120,
    climbsStarted: 2,
    climbsCompleted: 1,
    holdsReached: 12,
    holdsMissed: 1,
    reachAttempts: 15,
    successfulReaches: 12,
    failedReaches: 3,
    movementAttempts: 15,
    successfulMovements: 12,
    movementCorrections: 1,
    unnecessaryMovements: 1,
    routeChoices: 1,
    routeChanges: 0,
    multiStepSequences: 4,
    sequenceSuccesses: 3,
    sequenceErrors: 1,
    bodyRepositioningEvents: 3,
    successfulRepositioning: 3,
    balanceEvents: 1,
    recoveryEvents: 1,
    reachAccuracy: 95,
    movementAccuracy: 92,
    adaptiveEvents: 2,
    successfulAdaptations: 2,
    failedAdaptations: 0,
    averageDecisionTime: 1.1,
    climbingSpeed: 6,
    highestDifficulty: 2,
  };

  const scores = scoreClimbingChallenge(mockMetrics);
  console.assert(scores.overallScore !== undefined && scores.overallScore > 0, "Overall score should be calculated");
  console.assert(scores.motorPlanningScore !== undefined && scores.motorPlanningScore > 50, "Motor planning score should be high");
  console.assert(scores.spatialMotorCoordinationScore !== undefined && scores.spatialMotorCoordinationScore > 50, "Coordination score should be high");
  console.log("✓ Scoring engine metrics math verified");

  console.log("Climbing Challenge engine tests passed successfully!");
}

runTests();
