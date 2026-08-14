"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NumberBuilderMetrics } from "./Types";
import "./number-builder.css";

type Props = {
  disabled?: boolean;
  remainingSeconds: number;
  practiceOnly?: boolean;
  onComplete: (metrics: NumberBuilderMetrics) => void | Promise<void>;
};

interface Challenge {
  level: number;
  instruction: string;
  objects?: string[];
  targetCount?: number;
  dotsCount?: number;
  numberOptions?: number[];
  correctNumber?: number;
  sequence?: (number | null)[];
  sequenceOptions?: number[];
  correctSequenceNumber?: number;
  buildTarget?: number;
  buildObject?: string;
  groupA?: number;
  groupB?: number;
  mathNum1?: number;
  mathNum2?: number;
  mathOp?: "+" | "-";
  mathVisuals1?: string[];
  mathVisuals2?: string[];
  mathOptions?: number[];
  correctMathResult?: number;
}

const EMOJIS = ["🍎", "🌟", "🎈", "🐱", "🐶", "🧸", "⚽", "🚗", "🍭", "🍩"];

function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

function generateChallenge(level: number, difficulty: number): Challenge {
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  const rangeMax = difficulty === 1 ? 5 : difficulty === 2 ? 10 : 15;

  switch (level) {
    case 1: {
      // Quantity Recognition
      const targetCount = difficulty === 1 ? 3 + Math.floor(Math.random() * 3) : 5 + Math.floor(Math.random() * 4); // 3-5 or 5-8
      const displayTotal = targetCount + 2;
      const objects = Array(displayTotal).fill(emoji);
      return {
        level: 1,
        instruction: `Tap exactly ${targetCount} ${emoji}s`,
        objects,
        targetCount,
      };
    }
    case 2: {
      // Number Matching
      const dotsCount = 3 + Math.floor(Math.random() * (rangeMax - 3)); // 3 to max
      const correctNumber = dotsCount;
      const wrong1 = Math.max(1, correctNumber - 1 - Math.floor(Math.random() * 2));
      const wrong2 = correctNumber + 1 + Math.floor(Math.random() * 2);
      const numberOptions = shuffle([correctNumber, wrong1, wrong2]);
      return {
        level: 2,
        instruction: "Tap the matching number card",
        dotsCount,
        numberOptions,
        correctNumber,
      };
    }
    case 3: {
      // Number Sequencing
      const start = 1 + Math.floor(Math.random() * (rangeMax - 4)); // e.g. start at 1 to 6
      const seq = [start, start + 1, start + 2, start + 3];
      const missingIndex = 1 + Math.floor(Math.random() * 3); // index 1, 2, or 3
      const correctSequenceNumber = seq[missingIndex];
      const sequence = seq.map((val, idx) => (idx === missingIndex ? null : val));
      const wrong1 = correctSequenceNumber - 1 === 0 ? correctSequenceNumber + 2 : correctSequenceNumber - 1;
      const wrong2 = correctSequenceNumber + 1;
      const sequenceOptions = shuffle([correctSequenceNumber, wrong1, wrong2]);
      return {
        level: 3,
        instruction: "Place the missing number in order",
        sequence,
        sequenceOptions,
        correctSequenceNumber,
      };
    }
    case 4: {
      // Quantity Building
      const buildTarget = difficulty === 1 ? 4 + Math.floor(Math.random() * 3) : 7 + Math.floor(Math.random() * 4); // 4-6 or 7-10
      return {
        level: 4,
        instruction: `Put exactly ${buildTarget} toys in the box`,
        buildTarget,
        buildObject: emoji,
      };
    }
    case 5: {
      // Simple Comparison
      const diff = difficulty === 1 ? 2 : 1;
      const groupA = 2 + Math.floor(Math.random() * 5); // 2 to 6
      const groupB = groupA + diff + Math.floor(Math.random() * 2); // strictly greater or smaller
      return {
        level: 5,
        instruction: "Tap the card that has MORE objects",
        groupA,
        groupB,
      };
    }
    case 6:
    default: {
      // Simple Addition/Subtraction
      const isAdd = Math.random() > 0.4;
      if (isAdd) {
        const mathNum1 = 1 + Math.floor(Math.random() * 4); // 1-4
        const mathNum2 = 1 + Math.floor(Math.random() * 4); // 1-4
        const correctMathResult = mathNum1 + mathNum2;
        const wrong1 = Math.max(1, correctMathResult - 1);
        const wrong2 = correctMathResult + 1;
        return {
          level: 6,
          instruction: "How many visual objects altogether?",
          mathNum1,
          mathNum2,
          mathOp: "+",
          mathVisuals1: Array(mathNum1).fill(emoji),
          mathVisuals2: Array(mathNum2).fill(emoji),
          mathOptions: shuffle([correctMathResult, wrong1, wrong2]),
          correctMathResult,
        };
      } else {
        const mathNum1 = 4 + Math.floor(Math.random() * 5); // 4-8
        const mathNum2 = 1 + Math.floor(Math.random() * (mathNum1 - 1)); // strictly less
        const correctMathResult = mathNum1 - mathNum2;
        const wrong1 = correctMathResult + 1;
        const wrong2 = Math.max(0, correctMathResult - 1);
        return {
          level: 6,
          instruction: "How many objects are left?",
          mathNum1,
          mathNum2,
          mathOp: "-",
          mathVisuals1: Array(mathNum1).fill(emoji),
          mathVisuals2: Array(mathNum2).fill(emoji),
          mathOptions: shuffle([correctMathResult, wrong1, wrong2]),
          correctMathResult,
        };
      }
    }
  }
}

export default function NumberBuilderGame({
  disabled = false,
  remainingSeconds,
  practiceOnly = false,
  onComplete,
}: Props) {
  const [level, setLevel] = useState(1);
  const [difficulty, setDifficulty] = useState(1); // 1 = Easy (1-5), 2 = Medium (1-10), 3 = Advanced (1-15)
  const [challenge, setChallenge] = useState<Challenge>(() => generateChallenge(1, 1));
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set()); // level 1 selected items
  const [toyboxItems, setToyboxItems] = useState<string[]>([]); // level 4 built items
  const [sequenceFilled, setSequenceFilled] = useState<number | null>(null); // level 3 completed val

  // Tracking metrics
  const roundsPresented = useRef(0);
  const roundsCompleted = useRef(0);
  const correctInteractions = useRef(0);
  const incorrectInteractions = useRef(0);
  const totalScore = useRef(0);
  const levelCorrectCount = useRef<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
  const levelAttemptCount = useRef<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
  const responseTimes = useRef<number[]>([]);
  const lastInteractionTime = useRef(Date.now());
  const maxDifficultyReached = useRef(1);
  const maxNumberRangeReached = useRef(5);

  const startedAt = useRef(new Date().toISOString());
  const gameEnded = useRef(false);

  const finishGame = useCallback(
    async (status: "COMPLETED" | "PARTIAL" = "COMPLETED") => {
      if (gameEnded.current) return;
      gameEnded.current = true;

      const totalAttempts = correctInteractions.current + incorrectInteractions.current;
      const accuracy = totalAttempts > 0 ? (correctInteractions.current / totalAttempts) * 100 : 0;
      const avgResponse = responseTimes.current.length
        ? responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length
        : 0;

      // Map level specific correct/attempted counts to skills
      const getSkillScore = (lvl: number, weight = 100) => {
        const attempts = levelAttemptCount.current[lvl] || 0;
        const correct = levelCorrectCount.current[lvl] || 0;
        if (attempts === 0) return 80; // default baseline if not reached yet
        return (correct / attempts) * weight;
      };

      const countingScore = getSkillScore(1, 100);
      const numberSenseScore = getSkillScore(2, 100);
      const sequencingScore = getSkillScore(3, 100);
      const quantityComparisonScore = getSkillScore(5, 100);
      
      // Early Numeracy: general indicator of basic numerics and operations
      const earlyNumeracyScore = Math.round(
        (getSkillScore(1) + getSkillScore(2) + getSkillScore(4) + getSkillScore(6)) / 4
      );

      // Attention score: high accuracy & consistency
      const attentionScore = Math.round(Math.max(0, Math.min(100, accuracy - incorrectInteractions.current * 1.5)));

      // Processing Speed score: reaction time decay curve
      const processingSpeedScore = Math.round(Math.max(0, Math.min(100, 100 - Math.max(0, avgResponse - 2.5) * 8)));

      const accuracyScore = Math.round(accuracy);

      const skillsAverage =
        (earlyNumeracyScore +
          numberSenseScore +
          countingScore +
          sequencingScore +
          quantityComparisonScore +
          attentionScore +
          processingSpeedScore +
          accuracyScore) /
        8;

      const finalOverallScore = Math.round(skillsAverage);

      const metrics: NumberBuilderMetrics = {
        age_group: "5–7 Years",
        rounds_presented: roundsPresented.current,
        rounds_completed: roundsCompleted.current,
        correct_interactions: correctInteractions.current,
        incorrect_interactions: incorrectInteractions.current,
        total_score: totalScore.current,
        accuracy: Math.round(accuracy * 10) / 10,
        average_response_time: Math.round(avgResponse * 100) / 100,
        highest_difficulty: maxDifficultyReached.current,
        number_range_reached: maxNumberRangeReached.current,

        early_numeracy_score: earlyNumeracyScore,
        number_sense_score: Math.round(numberSenseScore),
        counting_score: Math.round(countingScore),
        sequencing_score: Math.round(sequencingScore),
        quantity_comparison_score: Math.round(quantityComparisonScore),
        attention_score: attentionScore,
        processing_speed_score: processingSpeedScore,
        accuracy_score: accuracyScore,
        overall_score: finalOverallScore,

        started_at: startedAt.current,
        completed_at: new Date().toISOString(),
        completionStatus: status,
      };

      await onComplete(metrics);
    },
    [onComplete]
  );

  useEffect(() => {
    if (!practiceOnly && remainingSeconds <= 0) {
      void finishGame("PARTIAL");
    }
  }, [remainingSeconds, finishGame, practiceOnly]);

  const advanceLevel = () => {
    roundsCompleted.current += 1;
    levelCorrectCount.current[level] = (levelCorrectCount.current[level] || 0) + 1;
    levelAttemptCount.current[level] = (levelAttemptCount.current[level] || 0) + 1;

    // Track response time
    const timeTaken = (Date.now() - lastInteractionTime.current) / 1000;
    responseTimes.current.push(timeTaken);

    // Adjust difficulty dynamically based on success
    let nextDifficulty = difficulty;
    if (correctInteractions.current > 0 && correctInteractions.current % 3 === 0) {
      nextDifficulty = Math.min(3, difficulty + 1);
      setDifficulty(nextDifficulty);
      maxDifficultyReached.current = Math.max(maxDifficultyReached.current, nextDifficulty);
      maxNumberRangeReached.current = nextDifficulty === 2 ? 10 : nextDifficulty === 3 ? 15 : 5;
    }

    // Reset challenge states
    setSelectedIndices(new Set());
    setToyboxItems([]);
    setSequenceFilled(null);

    // Move to next level (1 to 6 loop)
    const nextLevel = level === 6 ? 1 : level + 1;
    setLevel(nextLevel);

    roundsPresented.current += 1;
    setChallenge(generateChallenge(nextLevel, nextDifficulty));
    lastInteractionTime.current = Date.now();
  };

  const handleIncorrectInteraction = () => {
    incorrectInteractions.current += 1;
    levelAttemptCount.current[level] = (levelAttemptCount.current[level] || 0) + 1;
  };

  // Level 1: Tapping visual objects to count
  const handleObjectTap = (index: number) => {
    if (disabled || gameEnded.current) return;

    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      const currentCount = next.size;
      const target = challenge.targetCount || 0;

      if (currentCount === target) {
        correctInteractions.current += 1;
        totalScore.current += 10;
        // Proceed after small delay so child sees the match
        setTimeout(() => advanceLevel(), 400);
      } else if (currentCount > target) {
        handleIncorrectInteraction();
      }

      return next;
    });
  };

  // Level 2: Matching count of dots to number card
  const handleNumberCardTap = (num: number) => {
    if (disabled || gameEnded.current) return;

    if (num === challenge.correctNumber) {
      correctInteractions.current += 1;
      totalScore.current += 10;
      advanceLevel();
    } else {
      handleIncorrectInteraction();
    }
  };

  // Level 3: Sequencing number cards
  const handleSequenceOptionTap = (num: number) => {
    if (disabled || gameEnded.current) return;

    if (num === challenge.correctSequenceNumber) {
      setSequenceFilled(num);
      correctInteractions.current += 1;
      totalScore.current += 10;
      setTimeout(() => advanceLevel(), 500);
    } else {
      handleIncorrectInteraction();
    }
  };

  // Level 4: Add/Remove items to build target quantity
  const handleAddToToybox = () => {
    if (disabled || gameEnded.current) return;

    setToyboxItems((prev) => {
      const next = [...prev, challenge.buildObject || "🧸"];
      const currentCount = next.length;
      const target = challenge.buildTarget || 0;

      if (currentCount === target) {
        correctInteractions.current += 1;
        totalScore.current += 10;
        setTimeout(() => advanceLevel(), 400);
      } else if (currentCount > target) {
        handleIncorrectInteraction();
      }

      return next;
    });
  };

  const handleRemoveFromToybox = (idx: number) => {
    if (disabled || gameEnded.current) return;

    setToyboxItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Level 5: Tapping group with more objects
  const handleCompareCardTap = (selectedGroup: "A" | "B") => {
    if (disabled || gameEnded.current) return;

    const countA = challenge.groupA || 0;
    const countB = challenge.groupB || 0;
    const correctGroup = countA > countB ? "A" : "B";

    if (selectedGroup === correctGroup) {
      correctInteractions.current += 1;
      totalScore.current += 10;
      advanceLevel();
    } else {
      handleIncorrectInteraction();
    }
  };

  // Level 6: Math operations visual
  const handleMathOptionTap = (num: number) => {
    if (disabled || gameEnded.current) return;

    if (num === challenge.correctMathResult) {
      correctInteractions.current += 1;
      totalScore.current += 10;
      advanceLevel();
    } else {
      handleIncorrectInteraction();
    }
  };

  return (
    <div className="number-builder-game">
      <header className="nb-header">
        <div className="nb-title-group">
          <small>NUMERACY CHALLENGE</small>
          <h2>Number Builder</h2>
        </div>
        <div className="nb-progress-hud">
          Level {level}
        </div>
      </header>

      <div className="nb-instruction-bar">
        <h3 className="nb-instruction-text">{challenge.instruction}</h3>
      </div>

      <div className="nb-playground">
        <div className="nb-stage-card">
          
          {/* LEVEL 1: Quantity Recognition */}
          {level === 1 && challenge.objects && (
            <div className="nb-objects-grid">
              {challenge.objects.map((obj, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleObjectTap(idx)}
                  className={`nb-object-item ${selectedIndices.has(idx) ? "selected" : ""}`}
                  disabled={disabled}
                  aria-label="Tap to count"
                >
                  {obj}
                </button>
              ))}
            </div>
          )}

          {/* LEVEL 2: Number Matching */}
          {level === 2 && challenge.dotsCount && challenge.numberOptions && (
            <div className="flex flex-col items-center gap-6">
              <div className="nb-compare-dots">
                {Array(challenge.dotsCount)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="nb-compare-dot" />
                  ))}
              </div>
              <div className="nb-number-cards-container">
                {challenge.numberOptions.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumberCardTap(num)}
                    className="nb-number-card"
                    disabled={disabled}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LEVEL 3: Number Sequencing */}
          {level === 3 && challenge.sequence && challenge.sequenceOptions && (
            <div className="flex flex-col items-center gap-6">
              <div className="nb-sequence-row">
                {challenge.sequence.map((val, idx) => {
                  if (val === null) {
                    return (
                      <div
                        key={idx}
                        className={`nb-sequence-node missing-spot ${
                          sequenceFilled !== null ? "filled" : ""
                        }`}
                      >
                        {sequenceFilled !== null ? sequenceFilled : "?"}
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="nb-sequence-node">
                      {val}
                    </div>
                  );
                })}
              </div>
              <div className="nb-number-cards-container">
                {challenge.sequenceOptions.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSequenceOptionTap(num)}
                    className="nb-number-card"
                    disabled={disabled || sequenceFilled !== null}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LEVEL 4: Quantity Building */}
          {level === 4 && challenge.buildTarget && (
            <div className="nb-dropzone-container">
              <div className="nb-toybox">
                {toyboxItems.length === 0 ? (
                  <div className="nb-toybox-placeholder">
                    <span>📥</span>
                    Tap the toy below to fill the box
                  </div>
                ) : (
                  toyboxItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRemoveFromToybox(idx)}
                      className="nb-toybox-item bg-transparent border-0"
                      disabled={disabled}
                      title="Tap to remove"
                    >
                      {item}
                    </button>
                  ))
                )}
              </div>
              <div className="nb-drawer">
                <button
                  type="button"
                  onClick={handleAddToToybox}
                  className="nb-drawer-item"
                  disabled={disabled}
                  title="Add toy"
                >
                  {challenge.buildObject}
                </button>
              </div>
            </div>
          )}

          {/* LEVEL 5: Comparison */}
          {level === 5 && challenge.groupA !== undefined && challenge.groupB !== undefined && (
            <div className="nb-compare-row">
              <button
                type="button"
                onClick={() => handleCompareCardTap("A")}
                className="nb-compare-card"
                disabled={disabled}
                aria-label="Group A"
              >
                <div className="nb-compare-dots">
                  {Array(challenge.groupA)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="nb-compare-dot" />
                    ))}
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCompareCardTap("B")}
                className="nb-compare-card"
                disabled={disabled}
                aria-label="Group B"
              >
                <div className="nb-compare-dots">
                  {Array(challenge.groupB)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="nb-compare-dot" />
                    ))}
                </div>
              </button>
            </div>
          )}

          {/* LEVEL 6: Visual Math operations */}
          {level === 6 && challenge.mathNum1 !== undefined && challenge.mathNum2 !== undefined && challenge.mathOptions && (
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-white/10">
                <div className="flex gap-1 max-w-[120px] flex-wrap justify-center">
                  {challenge.mathVisuals1?.map((emoji, i) => (
                    <span key={i} className="text-2xl">{emoji}</span>
                  ))}
                </div>
                <span className="text-2xl font-black text-pink-500">{challenge.mathOp}</span>
                <div className="flex gap-1 max-w-[120px] flex-wrap justify-center">
                  {challenge.mathVisuals2?.map((emoji, i) => (
                    <span key={i} className="text-2xl">{emoji}</span>
                  ))}
                </div>
                <span className="text-2xl font-black text-pink-500">=</span>
                <span className="text-3xl font-black text-white/50">?</span>
              </div>
              <div className="nb-number-cards-container">
                {challenge.mathOptions.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleMathOptionTap(num)}
                    className="nb-number-card"
                    disabled={disabled}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
