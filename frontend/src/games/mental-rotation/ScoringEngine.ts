import { shortestRequiredRotation } from "./MentalRotationEngine";
import type {
  MentalRotationMetrics,
  RotationAttempt,
  RotationChallenge,
} from "./Types";

const cap = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

export function scoreMentalRotation(
  challenges: RotationChallenge[],
  attempts: RotationAttempt[],
  completionStatus: string,
): MentalRotationMetrics {
  const matches = attempts.filter((attempt) => attempt.matched);
  const requiredRotation = attempts.reduce((sum, attempt) => {
    const challenge = challenges.find(
      (item) => item.id === attempt.challengeId,
    );
    return (
      sum +
      (challenge
        ? shortestRequiredRotation(
            challenge.startRotation,
            challenge.targetRotation,
          )
        : 0)
    );
  }, 0);
  const rotationAmount = attempts.reduce(
    (sum, attempt) => sum + attempt.rotationAmount,
    0,
  );
  const rotationActions = attempts.reduce(
    (sum, attempt) => sum + attempt.rotationActions,
    0,
  );
  const extraRotations = attempts.reduce(
    (sum, attempt) => sum + attempt.extraRotations,
    0,
  );
  const averageCompletionTime = average(
    matches.map((attempt) => attempt.completionTime),
  );
  const accuracy = attempts.length ? matches.length / attempts.length : 0;
  const rotationEfficiency = cap(
    requiredRotation
      ? (requiredRotation / Math.max(requiredRotation, rotationAmount)) * 100
      : 100,
  );
  const interactionEfficiency = cap(
    100 -
      extraRotations * 5 -
      Math.max(0, rotationActions - matches.length * 2) * 1.5,
  );
  const times = matches.map((attempt) => attempt.completionTime);
  const consistency = cap(
    times.length < 2
      ? times.length
        ? 100
        : 0
      : 100 - (Math.max(...times) - Math.min(...times)) / 80,
  );
  const difficulty = Math.max(0, ...matches.map((attempt) => attempt.level));
  const difficultyProgress = (difficulty / 5) * 100;
  const spatialVisualizationScore = cap(
    accuracy * 55 + rotationEfficiency * 0.3 + difficultyProgress * 0.15,
  );
  const mentalRotationScore = cap(accuracy * 60 + rotationEfficiency * 0.4);
  const spatialReasoningScore = cap(
    accuracy * 50 + difficultyProgress * 0.3 + consistency * 0.2,
  );
  const visualDiscriminationScore = cap(
    accuracy * 70 + difficultyProgress * 0.3,
  );
  const visualMotorCoordinationScore = cap(
    rotationEfficiency * 0.55 + interactionEfficiency * 0.45,
  );
  const cognitiveFlexibilityScore = cap(
    difficultyProgress * 0.6 + consistency * 0.4,
  );
  const attentionScore = cap(accuracy * 60 + consistency * 0.4);
  const overallScore = cap(
    average([
      spatialVisualizationScore,
      mentalRotationScore,
      spatialReasoningScore,
      visualDiscriminationScore,
      visualMotorCoordinationScore,
      cognitiveFlexibilityScore,
      attentionScore,
    ]),
  );
  return {
    totalChallenges: challenges.length,
    completedChallenges: matches.length,
    orientationMatches: matches.length,
    orientationMismatches: Math.max(0, attempts.length - matches.length),
    rotationAmount: Math.round(rotationAmount),
    rotationActions,
    extraRotations,
    averageCompletionTime: Math.round(averageCompletionTime),
    rotationEfficiency,
    highestDifficulty: difficulty,
    consistency,
    interactionEfficiency,
    spatialVisualizationScore,
    mentalRotationScore,
    spatialReasoningScore,
    visualDiscriminationScore,
    visualMotorCoordinationScore,
    cognitiveFlexibilityScore,
    attentionScore,
    overallScore,
    completionStatus,
    attempts,
  };
}
