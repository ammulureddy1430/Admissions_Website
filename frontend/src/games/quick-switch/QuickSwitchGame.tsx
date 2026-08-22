"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Play, Timer, Target, Sparkles, AlertTriangle, Shield, CheckCircle } from "lucide-react";
import { SoundSynth } from "./SoundSynth";
import { scoreQuickSwitch } from "./ScoringEngine";
import type { Orb, Particle, ActiveRule, RuleAnalytics, RawQuickSwitchMetrics, QuickSwitchScores } from "./Types";
import "./QuickSwitchGame.css";

const PALETTE = {
  blue: "#3b82f6",
  red: "#ef4444",
  green: "#10b981",
  yellow: "#f59e0b",
  neutral: "#6c7293",
};

const RULES: ActiveRule[] = [
  { id: 1, type: "color", targetColor: "blue", avoidColor: "red", description: "Collect Blue, Avoid Red" },
  { id: 2, type: "color", targetColor: "red", avoidColor: "blue", description: "Collect Red, Avoid Blue" },
  { id: 3, type: "shape", targetShape: "circle", avoidShape: "square", description: "Collect Circles, Avoid Squares" },
  { id: 4, type: "state", targetState: "moving", avoidState: "stationary", description: "Collect Moving, Avoid Stationary" },
];

interface Props {
  disabled?: boolean;
  sound?: boolean;
  durationSeconds?: number;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  attemptSeed?: number;
  onComplete: (metrics: QuickSwitchScores) => void | Promise<void>;
}

export default function QuickSwitchGame({
  disabled = false,
  sound = true,
  durationSeconds = 180,
  remainingSeconds,
  practiceOnly = false,
  attemptSeed = 1,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const synth = useRef<SoundSynth | null>(null);
  const finished = useRef(false);
  const frameId = useRef<number | null>(null);

  // Gameplay coordinates & velocities (using refs for high-frequency updates)
  const player = useRef({ x: 400, y: 300, vx: 0, vy: 0, radius: 24, speed: 7 });
  const orbs = useRef<Orb[]>([]);
  const particles = useRef<Particle[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Game states & timings
  const [started, setStarted] = useState(false);
  const [activeRule, setActiveRule] = useState<ActiveRule>(RULES[0]);
  const activeRuleRef = useRef<ActiveRule>(RULES[0]);
  const previousRuleRef = useRef<ActiveRule | undefined>(undefined);
  const ruleStartTime = useRef(0);
  const lastSpawnTime = useRef(0);
  const gameTime = useRef(0); // in ms
  const lastFrameTime = useRef(0);
  const finishedState = useRef(false);

  // HUD visible states
  const [scoreVal, setScoreVal] = useState(0);
  const [comboVal, setComboVal] = useState(0);
  const [ruleSwitchFlash, setRuleSwitchFlash] = useState(false);
  const [gameResult, setGameResult] = useState<QuickSwitchScores | null>(null);

  // Scoring/Analytics trackers
  const score = useRef(0);
  const combo = useRef(0);
  const highestCombo = useRef(0);
  const totalInteractions = useRef(0);
  const correctInteractions = useRef(0);
  const incorrectInteractions = useRef(0);
  const ruleChanges = useRef(0);
  const perseverativeErrors = useRef(0);
  const attentionShiftEvents = useRef(0);
  const taskSwitchEvents = useRef(0);

  // Latency & switch logs
  const ruleSwitchedAt = useRef(0);
  const correctHitsInRule = useRef(0);
  const firstCorrectResponseTime = useRef<number>(-1);
  const ruleCorrectHits = useRef<{ [ruleId: number]: number }>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const ruleIncorrectHits = useRef<{ [ruleId: number]: number }>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const rulePerseverativeHits = useRef<{ [ruleId: number]: number }>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const ruleTimes = useRef<{ [ruleId: number]: { start: number; end: number } }>({});

  const latencies = useRef<number[]>([]);
  const errorTimes = useRef<number[]>([]);
  const correctTimes = useRef<number[]>([]);
  const postSwitchTotal = useRef(0);
  const postSwitchCorrect = useRef(0);
  const lastInteractionTime = useRef(0);
  const consecutiveCorrect = useRef(0);
  const ruleMasteryTimes = useRef<number[]>([]);

  // Mobile virtual joystick coordinates
  const joystickBase = useRef<{ x: number; y: number } | null>(null);
  const joystickCurrent = useRef<{ x: number; y: number } | null>(null);
  const [showJoystick, setShowJoystick] = useState(false);

  // Initialize sound synth
  useEffect(() => {
    synth.current = new SoundSynth(sound);
  }, [sound]);

  // Handle remaining time updates
  const [timeLeft, setTimeLeft] = useState(remainingSeconds !== undefined ? remainingSeconds : durationSeconds);

  // Sync timeLeft when remainingSeconds changes
  useEffect(() => {
    if (remainingSeconds !== undefined) {
      setTimeLeft(remainingSeconds);
    }
  }, [remainingSeconds]);

  // Countdown timer for when remainingSeconds is not driven by parent (e.g. admin preview)
  useEffect(() => {
    if (!started || disabled || finishedState.current || remainingSeconds !== undefined) return;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [started, disabled, remainingSeconds]);

  const isTimeUp = started && timeLeft <= 0;

  // Determine active rule based on fraction of elapsed time (scaled to game duration)
  const getRuleForTime = (elapsed: number): ActiveRule => {
    const fraction = elapsed / durationSeconds;
    if (fraction < 0.25) return RULES[0];
    if (fraction < 0.5) return RULES[1];
    if (fraction < 0.75) return RULES[2];
    return RULES[3];
  };

  // Check if an object matches the collectible rule
  const isCollectible = (orb: Orb, rule: ActiveRule): boolean => {
    if (rule.type === "color") {
      return orb.color === rule.targetColor;
    }
    if (rule.type === "shape") {
      return orb.shape === rule.targetShape;
    }
    if (rule.type === "state") {
      return rule.targetState === "moving" ? !orb.isStationary : orb.isStationary;
    }
    return false;
  };

  // Check if an object matches the avoid hazard rule
  const isHazard = (orb: Orb, rule: ActiveRule): boolean => {
    if (rule.type === "color") {
      return orb.color === rule.avoidColor;
    }
    if (rule.type === "shape") {
      return orb.shape === rule.avoidShape;
    }
    if (rule.type === "state") {
      return rule.avoidState === "moving" ? !orb.isStationary : orb.isStationary;
    }
    return false;
  };

  // Check for perseverative error
  const isPerseverative = (orb: Orb): boolean => {
    if (!previousRuleRef.current) return false;
    // An error is perseverative if the object was collectible in the previous rule
    // and is not collectible in the current rule
    const wasCollectible = isCollectible(orb, previousRuleRef.current);
    const isNowCollectible = isCollectible(orb, activeRuleRef.current);
    return wasCollectible && !isNowCollectible;
  };

  // Finish game logic
  const handleFinish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    finishedState.current = true;

    if (frameId.current) {
      cancelAnimationFrame(frameId.current);
    }

    // Set end time for last rule
    const currentRuleId = activeRuleRef.current.id;
    if (ruleTimes.current[currentRuleId]) {
      ruleTimes.current[currentRuleId].end = gameTime.current;
    }

    // Calculate latency, recovery time, consistency
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const avgSwitchingLatency = avg(latencies.current);
    const avgAdaptationTime = avgSwitchingLatency;

    // Calculate average recovery time (time from mistake to next correct response)
    const recoveryIntervals: number[] = [];
    for (const errorTime of errorTimes.current) {
      const nextCorrect = correctTimes.current.find((t) => t > errorTime);
      if (nextCorrect) {
        recoveryIntervals.push(nextCorrect - errorTime);
      }
    }
    const avgRecoveryTime = avg(recoveryIntervals);

    // Response consistency (std deviation of correct response intervals)
    let responseConsistency = 100;
    if (correctTimes.current.length > 2) {
      const intervals: number[] = [];
      for (let i = 1; i < correctTimes.current.length; i++) {
        intervals.push(correctTimes.current[i] - correctTimes.current[i - 1]);
      }
      const mean = avg(intervals);
      const variance = intervals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / intervals.length;
      responseConsistency = Math.sqrt(variance);
    }

    // Rule specific analytics array
    const ruleSpecific: RuleAnalytics[] = RULES.map((r) => {
      const timings = ruleTimes.current[r.id] || { start: 0, end: 0 };
      const duration = timings.end - timings.start;
      const c = ruleCorrectHits.current[r.id] || 0;
      const inc = ruleIncorrectHits.current[r.id] || 0;
      const total = c + inc;
      const accuracy = total > 0 ? (c / total) * 100 : 0;
      const p = rulePerseverativeHits.current[r.id] || 0;
      
      // Calculate rule latency
      let lat = 0;
      if (r.id > 1) {
        const correctInRule = correctTimes.current.filter(
          (t) => t >= timings.start && t <= timings.end
        );
        if (correctInRule.length > 0) {
          lat = correctInRule[0] - timings.start;
        }
      }

      // Adaptation score (penalized by perseverative errors and latency)
      const ruleAdaptation = Math.max(0, Math.min(100, 100 - p * 15 - Math.max(0, lat - 2000) / 100));

      return {
        ruleId: r.id,
        ruleStartTime: timings.start / 1000,
        ruleEndTime: timings.end / 1000,
        interactions: total,
        correctInteractions: c,
        incorrectInteractions: inc,
        firstCorrectResponseTime: lat,
        switchingLatency: lat,
        perseverativeErrors: p,
        accuracy,
        adaptationScore: ruleAdaptation,
      };
    });

    const ruleSwitchSuccessCount = ruleSpecific.filter(
      (r) => r.ruleId > 1 && r.correctInteractions > 0 && r.perseverativeErrors === 0
    ).length;

    const ruleSwitchFailureCount = ruleSpecific.filter(
      (r) => r.ruleId > 1 && (r.perseverativeErrors > 2 || (r.interactions > 0 && r.correctInteractions === 0))
    ).length;

    const rawMetrics: RawQuickSwitchMetrics = {
      sessionDuration: gameTime.current / 1000,
      totalInteractions: totalInteractions.current,
      correctInteractions: correctInteractions.current,
      incorrectInteractions: incorrectInteractions.current,
      ruleChanges: ruleChanges.current,
      switchingLatency: avgSwitchingLatency,
      perseverativeErrors: perseverativeErrors.current,
      postSwitchErrors: postSwitchTotal.current - postSwitchCorrect.current,
      postSwitchAccuracy: postSwitchTotal.current > 0 ? (postSwitchCorrect.current / postSwitchTotal.current) * 100 : 100,
      adaptationTime: avgAdaptationTime,
      recoveryTime: avgRecoveryTime,
      responseConsistency,
      ruleMasteryTime: avg(ruleMasteryTimes.current),
      ruleSwitchSuccess: ruleSwitchSuccessCount,
      ruleSwitchFailure: ruleSwitchFailureCount,
      attentionShiftEvents: attentionShiftEvents.current,
      taskSwitchEvents: taskSwitchEvents.current,
      comboCount: combo.current,
      highestCombo: highestCombo.current,
      score: score.current,
      completionStatus: isTimeUp ? "TIMEOUT" : "COMPLETED",
      ruleSpecificAnalytics: ruleSpecific,
    };

    const evaluated = scoreQuickSwitch(rawMetrics);
    setGameResult(evaluated);
    await onComplete(evaluated);
  }, [onComplete, isTimeUp, durationSeconds]);

  // Complete game when time limit is reached
  useEffect(() => {
    if (isTimeUp && started && !finished.current) {
      void handleFinish();
    }
  }, [isTimeUp, started, handleFinish]);

  // Key event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || !started || finished.current) return;
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
        keysPressed.current[key] = true;
        // play low movement chime periodically
        if (Math.random() < 0.05) {
          synth.current?.playMove();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [disabled, started]);

  // Touch handlers for joystick
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || !started || finished.current) return;
    const touch = e.touches[0];
    joystickBase.current = { x: touch.clientX, y: touch.clientY };
    joystickCurrent.current = { x: touch.clientX, y: touch.clientY };
    setShowJoystick(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!showJoystick || !joystickBase.current) return;
    const touch = e.touches[0];
    joystickCurrent.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    joystickBase.current = null;
    joystickCurrent.current = null;
    setShowJoystick(false);
    player.current.vx = 0;
    player.current.vy = 0;
  };

  // Spawn an object inside the game
  const spawnOrb = (canvasWidth: number, canvasHeight: number) => {
    const currentRule = activeRuleRef.current;
    
    // Choose properties based on current rule to ensure solvable ratios
    let color: ColorType = "blue";
    let shape: ShapeType = "circle";
    let isStationary = false;

    // Deterministic random generation using attemptSeed and gameTime
    const rng = () => {
      const x = Math.sin(attemptSeed + gameTime.current) * 10000;
      return x - Math.floor(x);
    };

    const rVal = rng();
    const shapeVal = rng();

    // Rule-based content adjustment to verify learning
    if (currentRule.id === 1 || currentRule.id === 2) {
      color = rVal < 0.5 ? "blue" : "red";
      shape = shapeVal < 0.25 ? "circle" : shapeVal < 0.5 ? "square" : shapeVal < 0.75 ? "triangle" : "diamond";
    } else if (currentRule.id === 3) {
      shape = rVal < 0.5 ? "circle" : "square";
      color = shapeVal < 0.25 ? "blue" : shapeVal < 0.5 ? "red" : shapeVal < 0.75 ? "green" : "yellow";
    } else if (currentRule.id === 4) {
      isStationary = rVal < 0.4; // 40% stationary
      color = shapeVal < 0.25 ? "blue" : shapeVal < 0.5 ? "red" : shapeVal < 0.75 ? "green" : "yellow";
      shape = rng() < 0.5 ? "circle" : "square";
    }

    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;
    const size = 26;
    const speed = isStationary ? 0 : 70 + rng() * 60; // speed in px per sec

    if (isStationary) {
      // Spawn directly inside the arena away from boundaries
      x = 80 + rng() * (canvasWidth - 160);
      y = 80 + rng() * (canvasHeight - 160);
    } else {
      // Spawn at boundaries and head towards center
      const side = Math.floor(rng() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
      if (side === 0) {
        x = rng() * canvasWidth;
        y = -size;
      } else if (side === 1) {
        x = canvasWidth + size;
        y = rng() * canvasHeight;
      } else if (side === 2) {
        x = rng() * canvasWidth;
        y = canvasHeight + size;
      } else {
        x = -size;
        y = rng() * canvasHeight;
      }

      // Calculate vector towards center with noise
      const targetX = canvasWidth / 2 + (rng() - 0.5) * 200;
      const targetY = canvasHeight / 2 + (rng() - 0.5) * 200;
      const dx = targetX - x;
      const dy = targetY - y;
      const len = Math.sqrt(dx * dx + dy * dy);
      vx = (dx / len) * speed;
      vy = (dy / len) * speed;
    }

    orbs.current.push({
      id: Date.now() + Math.random(),
      x,
      y,
      vx,
      vy,
      color,
      shape,
      size,
      speed,
      spawnedAt: gameTime.current,
      isStationary,
    });
  };

  // Trigger explosions when collision occurs
  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      particles.current.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 4,
        alpha: 1,
        life: 0,
        maxLife: 30 + Math.floor(Math.random() * 20),
      });
    }
  };

  // Main game loop logic
  useEffect(() => {
    if (!started || disabled || finishedState.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialization values
    gameTime.current = 0;
    lastFrameTime.current = performance.now();
    lastSpawnTime.current = 0;
    player.current.x = canvas.width / 2;
    player.current.y = canvas.height / 2;
    player.current.vx = 0;
    player.current.vy = 0;
    orbs.current = [];
    particles.current = [];
    ruleTimes.current[1] = { start: 0, end: 0 };

    const updateGame = (timestamp: number) => {
      if (finishedState.current) return;
      const dt = Math.min(0.1, (timestamp - lastFrameTime.current) / 1000);
      lastFrameTime.current = timestamp;
      gameTime.current += dt * 1000;

      const elapsedSec = gameTime.current / 1000;

      // 1. Rule Engine Progression Check
      const nextRule = getRuleForTime(elapsedSec);
      if (nextRule.id !== activeRuleRef.current.id) {
        // Record end of old rule and start of new rule
        const oldRuleId = activeRuleRef.current.id;
        if (ruleTimes.current[oldRuleId]) {
          ruleTimes.current[oldRuleId].end = gameTime.current;
        }

        previousRuleRef.current = activeRuleRef.current;
        activeRuleRef.current = nextRule;
        setActiveRule(nextRule);
        ruleStartTime.current = gameTime.current;
        ruleTimes.current[nextRule.id] = { start: gameTime.current, end: gameTime.current };

        // Increments
        ruleChanges.current += 1;
        correctHitsInRule.current = 0;
        firstCorrectResponseTime.current = -1;
        consecutiveCorrect.current = 0;

        // Visual chimes & flash trigger
        synth.current?.playTransition();
        setRuleSwitchFlash(true);
        window.setTimeout(() => setRuleSwitchFlash(false), 1500);

        // Check task switch vs attention shifts
        if (nextRule.type !== previousRuleRef.current.type) {
          taskSwitchEvents.current += 1;
        }
      }

      // 2. Physics & Controls Updates
      let ax = 0;
      let ay = 0;

      if (showJoystick && joystickBase.current && joystickCurrent.current) {
        // Joystick inputs
        const dx = joystickCurrent.current.x - joystickBase.current.x;
        const dy = joystickCurrent.current.y - joystickBase.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          const maxDist = 50;
          const amt = Math.min(maxDist, dist) / maxDist;
          ax = (dx / dist) * player.current.speed * amt;
          ay = (dy / dist) * player.current.speed * amt;
        }
      } else {
        // Keyboard inputs
        const keys = keysPressed.current;
        if (keys["w"] || keys["arrowup"]) ay -= player.current.speed;
        if (keys["s"] || keys["arrowdown"]) ay += player.current.speed;
        if (keys["a"] || keys["arrowleft"]) ax -= player.current.speed;
        if (keys["d"] || keys["arrowright"]) ax += player.current.speed;
      }

      // Smooth acceleration, deceleration & boundaries
      player.current.vx += ax * 0.35;
      player.current.vy += ay * 0.35;
      player.current.vx *= 0.88;
      player.current.vy *= 0.88;

      player.current.x += player.current.vx;
      player.current.y += player.current.vy;

      player.current.x = Math.max(player.current.radius, Math.min(canvas.width - player.current.radius, player.current.x));
      player.current.y = Math.max(player.current.radius, Math.min(canvas.height - player.current.radius, player.current.y));

      // 3. Object Spawner Trigger
      const spawnInterval = 1000 - Math.min(400, elapsedSec * 2); // gets slightly faster over time
      if (gameTime.current - lastSpawnTime.current > spawnInterval) {
        spawnOrb(canvas.width, canvas.height);
        lastSpawnTime.current = gameTime.current;
      }

      // 4. Update and move Orbs & Particles
      orbs.current.forEach((o) => {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
      });

      particles.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        p.alpha = 1 - p.life / p.maxLife;
      });
      particles.current = particles.current.filter((p) => p.life < p.maxLife);

      // 5. Collisions & Scoring Logic
      const playerX = player.current.x;
      const playerY = player.current.y;
      const playerRadius = player.current.radius;

      orbs.current = orbs.current.filter((o) => {
        // Distance check
        const dx = o.x - playerX;
        const dy = o.y - playerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hasCollided = dist < playerRadius + o.size * 0.7;

        // Boundary checks (remove if moves past screen)
        const isPastScreen = !o.isStationary && (o.x < -100 || o.x > canvas.width + 100 || o.y < -100 || o.y > canvas.height + 100);

        if (hasCollided) {
          totalInteractions.current += 1;
          const currentRuleId = activeRuleRef.current.id;

          const isCorrect = isCollectible(o, activeRuleRef.current);
          const isWrong = isHazard(o, activeRuleRef.current);

          // Track post-switch logs (within first 8 seconds of switch)
          const switchOffset = gameTime.current - ruleStartTime.current;
          const isPostSwitch = ruleChanges.current > 0 && switchOffset < 8000;
          if (isPostSwitch) {
            postSwitchTotal.current += 1;
          }

          if (isCorrect) {
            // Correct hit behavior
            score.current += 100;
            combo.current += 1;
            highestCombo.current = Math.max(highestCombo.current, combo.current);
            correctInteractions.current += 1;
            ruleCorrectHits.current[currentRuleId] += 1;

            if (isPostSwitch) {
              postSwitchCorrect.current += 1;
            }

            // Register switching latency
            if (firstCorrectResponseTime.current === -1 && ruleChanges.current > 0) {
              const latency = switchOffset;
              firstCorrectResponseTime.current = latency;
              latencies.current.push(latency);
            }

            // Register mastery timing (3 consecutive correct)
            consecutiveCorrect.current += 1;
            if (consecutiveCorrect.current === 3) {
              ruleMasteryTimes.current.push(switchOffset);
            }

            // Sound + Explosion particles
            synth.current?.playCollect();
            createExplosion(o.x, o.y, PALETTE[o.color]);
            correctTimes.current.push(gameTime.current);
          } else if (isWrong) {
            // Incorrect hit behavior
            score.current = Math.max(0, score.current - 50);
            combo.current = 0;
            incorrectInteractions.current += 1;
            ruleIncorrectHits.current[currentRuleId] += 1;
            consecutiveCorrect.current = 0;

            // Perseverative error check
            if (isPerseverative(o)) {
              perseverativeErrors.current += 1;
              rulePerseverativeHits.current[currentRuleId] += 1;
            } else {
              // Attention shift events (avoiding previous targets or resolving task transitions)
              attentionShiftEvents.current += 1;
            }

            // Sound + particles
            synth.current?.playImpact();
            createExplosion(o.x, o.y, "#ff0000");
            errorTimes.current.push(gameTime.current);
          } else {
            // Neutral object collision (doesn't change score or stats)
            createExplosion(o.x, o.y, PALETTE.neutral);
          }

          setScoreVal(score.current);
          setComboVal(combo.current);
          lastInteractionTime.current = gameTime.current;
          return false;
        }

        return !isPastScreen;
      });

      // 6. Draw Everything on Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw active rule color accents on border
      ctx.strokeStyle = activeRuleRef.current.targetColor
        ? PALETTE[activeRuleRef.current.targetColor]
        : "#4f46e5";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

      // Draw Grid overlay
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      for (let i = 40; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 40; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw Orbs
      orbs.current.forEach((o) => {
        ctx.save();
        ctx.translate(o.x, o.y);

        // Target highlights for onboarding (first 5 seconds of a rule)
        const isPostSwitchActive = gameTime.current - ruleStartTime.current < 5000;
        if (isPostSwitchActive) {
          const isTarget = isCollectible(o, activeRuleRef.current);
          const isAvoid = isHazard(o, activeRuleRef.current);
          if (isTarget) {
            ctx.shadowColor = PALETTE.green;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = PALETTE.green;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, o.size + 6 + Math.sin(timestamp / 100) * 3, 0, Math.PI * 2);
            ctx.stroke();
          } else if (isAvoid) {
            ctx.shadowColor = PALETTE.red;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = PALETTE.red;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, o.size + 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        ctx.fillStyle = PALETTE[o.color];
        ctx.shadowColor = PALETTE[o.color];
        ctx.shadowBlur = 12;

        ctx.beginPath();
        if (o.shape === "circle") {
          ctx.arc(0, 0, o.size, 0, Math.PI * 2);
        } else if (o.shape === "square") {
          ctx.roundRect(-o.size, -o.size, o.size * 2, o.size * 2, 6);
        } else if (o.shape === "triangle") {
          ctx.moveTo(0, -o.size);
          ctx.lineTo(o.size, o.size);
          ctx.lineTo(-o.size, o.size);
          ctx.closePath();
        } else if (o.shape === "diamond") {
          ctx.moveTo(0, -o.size);
          ctx.lineTo(o.size * 0.9, 0);
          ctx.lineTo(0, o.size);
          ctx.lineTo(-o.size * 0.9, 0);
          ctx.closePath();
        }
        ctx.fill();

        // Inner glowing core
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.arc(-o.size * 0.25, -o.size * 0.25, o.size * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw Particles
      particles.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Player hover vehicle
      ctx.save();
      ctx.translate(player.current.x, player.current.y);

      // Rotate ship towards current velocity vector (momentum steering)
      const speed = Math.sqrt(player.current.vx * player.current.vx + player.current.vy * player.current.vy);
      if (speed > 0.5) {
        ctx.rotate(Math.atan2(player.current.vy, player.current.vx));
      } else {
        ctx.rotate(-Math.PI / 2); // facing upwards default
      }

      // Keep the player visually separate from every collectible color.
      ctx.shadowColor = "#e879f9";
      ctx.shadowBlur = 22;

      // Draw engine fire trail if moving
      if (speed > 1) {
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(-player.current.radius, -8);
        ctx.lineTo(-player.current.radius - 12 - Math.random() * 10, 0);
        ctx.lineTo(-player.current.radius, 8);
        ctx.closePath();
        ctx.fill();
      }

      // Ship body (sleek futuristic flyer)
      ctx.fillStyle = "#a21caf";
      ctx.strokeStyle = "#fae8ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Arrow shape wings
      ctx.moveTo(player.current.radius, 0);
      ctx.lineTo(-player.current.radius + 6, -player.current.radius);
      ctx.lineTo(-player.current.radius + 12, -8);
      ctx.lineTo(-player.current.radius + 12, 8);
      ctx.lineTo(-player.current.radius + 6, player.current.radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing glow stripes
      ctx.strokeStyle = "#f5d0fe";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-player.current.radius + 10, -10);
      ctx.lineTo(player.current.radius - 8, 0);
      ctx.lineTo(-player.current.radius + 10, 10);
      ctx.stroke();

      // Dark glass cockpit
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.ellipse(player.current.radius * 0.2, 0, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Request next frame
      frameId.current = requestAnimationFrame(updateGame);
    };

    frameId.current = requestAnimationFrame(updateGame);

    return () => {
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }
    };
  }, [started, disabled, attemptSeed]);

  // Handle resizing canvas dynamically
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Setting canvas pixel resolution
      canvas.width = 800;
      canvas.height = 600;
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const handleStartGame = () => {
    setStarted(true);
    ruleStartTime.current = performance.now();
    lastSpawnTime.current = performance.now();
  };

  const formatTime = (value: number) => {
    const m = Math.floor(value / 60);
    const s = value % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className={`quick-switch ${ruleSwitchFlash ? "is-shifting" : ""}`}>
      <div className="qs-stars" />

      {/* 1. HUD Panel */}
      <div className="qs-hud">
        <div className="qs-hud-card qs-target">
          <div className="qs-target-preview">
            <svg width="24" height="24" viewBox="-15 -15 30 30" style={{ overflow: "visible" }}>
              <g fill={activeRule.targetColor ? PALETTE[activeRule.targetColor] : "#f8fafc"}>
                {activeRule.type === "state" && (
                  <circle r="12" fill={PALETTE.green} />
                )}
                {activeRule.type === "shape" && activeRule.targetShape === "circle" && (
                  <circle r="12" />
                )}
                {activeRule.type === "shape" && activeRule.targetShape === "square" && (
                  <rect x="-10" y="-10" width="20" height="20" rx="3" />
                )}
                {activeRule.type === "shape" && activeRule.targetShape === "triangle" && (
                  <polygon points="0,-12 11,8 -11,8" />
                )}
                {activeRule.type === "shape" && activeRule.targetShape === "diamond" && (
                  <polygon points="0,-12 11,0 0,12 -11,0" />
                )}
                {activeRule.type === "color" && (
                  <circle r="12" />
                )}
              </g>
            </svg>
          </div>
          <div className="qs-target-text">
            <small>CURRENT TARGET</small>
            <span>
              {activeRule.type === "state"
                ? "MOVING SHAPES"
                : `${activeRule.targetColor || ""} ${activeRule.targetShape || "shapes"}`.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="qs-hud-card">
          <small>SCORE</small>
          <b>{scoreVal}</b>
        </div>

        <div className="qs-hud-card">
          <small>COMBO</small>
          <b>{comboVal}x</b>
        </div>

        <div className={`qs-hud-card qs-time ${timeLeft <= 15 ? "warning" : ""}`}>
          <small>TIME LEFT</small>
          <b>{formatTime(Math.max(0, timeLeft))}</b>
        </div>
      </div>

      {/* 2. Floating Rule Switch Banner */}
      <div className={`qs-rule-banner ${ruleSwitchFlash ? "visible" : ""}`}>
        ⚠️ RULE SHIFT: TARGETS CHANGED!
      </div>

      {/* 3. Arena View */}
      <div
        className="qs-arena-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="qs-canvas"
          aria-label="Quick Switch assessment arena"
        />

        {/* Virtual Joystick rendered when active */}
        {showJoystick && joystickBase.current && joystickCurrent.current && (
          <div
            className="qs-joystick-area"
            style={{
              left: joystickBase.current.x - 60,
              top: joystickBase.current.y - 60,
              position: "fixed",
            }}
          >
            <div
              className="qs-joystick-handle"
              style={{
                transform: `translate(${Math.min(
                  35,
                  Math.max(-35, joystickCurrent.current.x - joystickBase.current.x)
                )}px, ${Math.min(
                  35,
                  Math.max(-35, joystickCurrent.current.y - joystickBase.current.y)
                )}px)`,
              }}
            />
          </div>
        )}
      </div>

      {/* 4. Intro Overlay */}
      {!started && (
        <div className="qs-overlay">
          <div className="qs-card">
            <div className="qs-card-icon">🚀</div>
            <h2>Quick Switch</h2>
            <p>
              Navigate your ship to collect matching glowing targets. Pay close attention to
              changes in the environment—rules will dynamically shift during gameplay!
            </p>

            <div className="qs-instructions">
              <div className="qs-instruction-step">
                <div className="qs-step-icon">
                  <Target size={16} />
                </div>
                <div className="qs-step-content">
                  <b>Adapt to Rule Changes</b>
                  <small>The targets you need to collect and avoid will switch automatically.</small>
                </div>
              </div>

              <div className="qs-instruction-step">
                <div className="qs-step-icon">
                  <Sparkles size={16} />
                </div>
                <div className="qs-step-content">
                  <b>Watch Visual Helpers</b>
                  <small>For the first few seconds of a rule change, targets pulsed in green.</small>
                </div>
              </div>

              <div className="qs-instruction-step">
                <div className="qs-step-icon">
                  <Timer size={16} />
                </div>
                <div className="qs-step-content">
                  <b>Real-Time Controls</b>
                  <small>Use W/A/S/D or Arrow keys to pilot your ship. Drag or touch on mobile.</small>
                </div>
              </div>
            </div>

            <button type="button" className="qs-start-btn" onClick={handleStartGame}>
              <Play size={18} fill="#fff" /> Start Assessment
            </button>
          </div>
        </div>
      )}

      {/* 5. Results Overlay (renders only when finished and results are present) */}
      {gameResult && (
        <div className="qs-overlay">
          <div className="qs-results-card">
            <div className="qs-results-icon">
              <CheckCircle size={54} />
            </div>
            <h2>Assessment Completed</h2>
            <p>Your performance data has been securely recorded.</p>

            <div className="qs-score-grid">
              <div className="qs-score-row">
                <span>Final Score</span>
                <b>{gameResult.score}</b>
              </div>
              <div className="qs-score-row">
                <span>Total Interactions</span>
                <b>{gameResult.totalInteractions}</b>
              </div>
              <div className="qs-score-row">
                <span>Correct Collections</span>
                <b>{gameResult.correctInteractions}</b>
              </div>
              <div className="qs-score-row">
                <span>Inhibitory Shifting Error</span>
                <b>{gameResult.perseverativeErrors}</b>
              </div>
            </div>

            <button type="button" className="qs-done-btn" onClick={() => {}}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
