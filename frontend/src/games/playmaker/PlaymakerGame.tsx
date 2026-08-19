"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { LEVELS } from "./Levels";
import { PlayerEngine } from "./PlayerEngine";
import { BallEngine } from "./BallEngine";
import { TeamEngine } from "./TeamEngine";
import { DefenderEngine } from "./DefenderEngine";
import { scorePlaymaker } from "./ScoringEngine";
import { PlaymakerMetrics, TeammateState, DefenderState } from "./Types";
import "./PlaymakerGame.css";

type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (m: PlaymakerMetrics) => void | Promise<void>;
  onBack?: () => void;
};

export default function PlaymakerGame({
  disabled = false,
  remainingSeconds,
  practiceOnly = false,
  onComplete,
  onBack,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const completeRef = useRef(onComplete);
  const doneRef = useRef(false);
  const endingRef = useRef(false);
  const finishAtRef = useRef(0);
  const startRef = useRef(0);
  const lastTimeRef = useRef(0);

  // Game Engines
  const levelIndexRef = useRef(0);
  const playerEngine = useRef(new PlayerEngine(400, 450));
  const ballEngine = useRef(new BallEngine(400, 450));
  const teamEngine = useRef(new TeamEngine());
  const defenderEngine = useRef(new DefenderEngine());

  // Analytics Metrics Refs
  const playsStarted = useRef(0);
  const playsCompleted = useRef(0);
  const passesAttempted = useRef(0);
  const passesCompleted = useRef(0);
  const passesIntercepted = useRef(0);
  const passesOutOfBounds = useRef(0);
  const passTargetSelections = useRef(0);
  const appropriateTargetSelections = useRef(0);
  const poorTargetSelections = useRef(0);
  const leadPassAttempts = useRef(0);
  const leadPassSuccesses = useRef(0);
  const receiverMovementTracked = useRef(0);
  
  // Accumulated lists/scores
  const receiverPredictionAccs = useRef<number[]>([]);
  const defenderPredictionAccs = useRef<number[]>([]);
  const passingLaneRecognitions = useRef(0);
  const passingLaneErrors = useRef(0);
  const earlyPasses = useRef(0);
  const latePasses = useRef(0);
  const wellTimedPasses = useRef(0);
  const decisionEvents = useRef(0);
  const decisionTimes = useRef<number[]>([]);
  const riskPasses = useRef(0);
  const safePasses = useRef(0);
  const riskOutcomes = useRef<number[]>([]);
  
  const strategyChanges = useRef(0);
  const successfulStrategyChanges = useRef(0);
  const failedStrategyChanges = useRef(0);
  const repeatedStrategyCount = useRef(0);
  const repeatedFailedStrategyCount = useRef(0);
  const adaptiveResponses = useRef(0);
  const defensiveAdaptationsDetected = useRef(0);
  const defensiveAdaptationsMissed = useRef(0);
  
  const situationalAwarenessEvents = useRef(0);
  const selectiveAttentionEvents = useRef(0);
  const distractorResponses = useRef(0);

  // Repetition & Strategy Shifting Trackers
  const lastPassTargetId = useRef<string | null>(null);
  const consecutivePassesToTarget = useRef<Record<string, number>>({});
  const lastPassTimeRef = useRef(0);

  // React States for HUD
  const [started, setStarted] = useState(false);
  const [timePreview, setTimePreview] = useState(remainingSeconds ?? 120);
  const [currentLevelName, setCurrentLevelName] = useState("");
  const [passesCompletedVal, setPassesCompletedVal] = useState(0);
  const [passesRequiredVal, setPassesRequiredVal] = useState(0);
  const [alertText, setAlertText] = useState("");
  const [alertTimer, setAlertTimer] = useState<NodeJS.Timeout | null>(null);

  // Handle updates to complete callback reference
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  // Display commentary alert briefly
  const showAlert = useCallback((text: string) => {
    setAlertText(text);
    if (alertTimer) clearTimeout(alertTimer);
    const t = setTimeout(() => {
      setAlertText("");
    }, 2000);
    setAlertTimer(t);
  }, [alertTimer]);

  // Submit final results
  const finish = useCallback((status = "COMPLETED") => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);

    const elapsed = performance.now() - startRef.current;

    // Calculate dynamic performance indicators relative to target
    const beginningPerformance = passesCompleted.current >= 2 ? 90 : passesCompleted.current > 0 ? 65 : 40;
    const middlePerformance = passesCompleted.current >= 5 ? 92 : passesCompleted.current >= 2 ? 70 : 50;
    const endingPerformance = passesCompleted.current >= 8 ? 95 : passesCompleted.current >= 4 ? 75 : 60;

    // Averages
    const avgDecisionTime = decisionTimes.current.length > 0
      ? decisionTimes.current.reduce((a, b) => a + b, 0) / decisionTimes.current.length
      : 0.8;

    const receiverPredictionAccuracy = receiverPredictionAccs.current.length > 0
      ? Math.round(receiverPredictionAccs.current.reduce((a, b) => a + b, 0) / receiverPredictionAccs.current.length)
      : 80;

    const defenderPredictionAccuracy = Math.max(30, Math.min(100, Math.round(100 - (passesIntercepted.current / Math.max(1, passesAttempted.current)) * 100)));

    const metricsData = scorePlaymaker({
      sessionDuration: Math.round(elapsed / 1000),
      playsStarted: playsStarted.current,
      playsCompleted: playsCompleted.current,
      passesAttempted: passesAttempted.current,
      passesCompleted: passesCompleted.current,
      passesIntercepted: passesIntercepted.current,
      passesOutOfBounds: passesOutOfBounds.current,
      passTargetSelections: passTargetSelections.current,
      appropriateTargetSelections: appropriateTargetSelections.current,
      poorTargetSelections: poorTargetSelections.current,
      leadPassAttempts: leadPassAttempts.current,
      leadPassSuccesses: leadPassSuccesses.current,
      receiverMovementTracked: receiverMovementTracked.current,
      receiverPredictionAccuracy,
      defenderPredictionAccuracy,
      passingLaneRecognitions: passingLaneRecognitions.current,
      passingLaneErrors: passingLaneErrors.current,
      earlyPasses: earlyPasses.current,
      latePasses: latePasses.current,
      wellTimedPasses: wellTimedPasses.current,
      decisionEvents: decisionEvents.current,
      decisionTimes: decisionTimes.current,
      averageDecisionTime: parseFloat(avgDecisionTime.toFixed(2)),
      riskPasses: riskPasses.current,
      safePasses: safePasses.current,
      riskOutcomes: riskOutcomes.current,
      strategyChanges: strategyChanges.current,
      successfulStrategyChanges: successfulStrategyChanges.current,
      failedStrategyChanges: failedStrategyChanges.current,
      repeatedStrategyCount: repeatedStrategyCount.current,
      repeatedFailedStrategyCount: repeatedFailedStrategyCount.current,
      adaptiveResponses: adaptiveResponses.current,
      defensiveAdaptationsDetected: defensiveAdaptationsDetected.current,
      defensiveAdaptationsMissed: defensiveAdaptationsMissed.current,
      situationalAwarenessEvents: situationalAwarenessEvents.current,
      selectiveAttentionEvents: selectiveAttentionEvents.current,
      distractorResponses: distractorResponses.current,
      beginningPerformance,
      middlePerformance,
      endingPerformance,
      highestDifficulty: Math.max(1, levelIndexRef.current + 1),
    });

    void completeRef.current(metricsData);
  }, []);

  // Shared timer triggers finish
  useEffect(() => {
    if (started && !practiceOnly && remainingSeconds !== undefined && remainingSeconds <= 0 && !endingRef.current) {
      endingRef.current = true;
      finishAtRef.current = performance.now() + 1000;
    }
  }, [started, practiceOnly, remainingSeconds]);

  // Practice mode local timer
  useEffect(() => {
    if (!started || !practiceOnly || disabled) return;
    const id = setInterval(() => setTimePreview((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [started, practiceOnly, disabled]);

  // Trigger local completion
  useEffect(() => {
    if (practiceOnly && timePreview <= 0 && !endingRef.current) {
      endingRef.current = true;
      finish();
    }
  }, [practiceOnly, timePreview, finish]);

  // Core Game Loop
  useEffect(() => {
    if (!started || disabled || doneRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    startRef.current = performance.now();
    lastTimeRef.current = startRef.current;
    lastPassTimeRef.current = startRef.current;

    // Track active keys
    const keysPressed: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed[key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed[key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Track mouse movement
    let mouseX = 400;
    let mouseY = 300;
    const handleCanvasMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    canvas.addEventListener("mousemove", handleCanvasMouseMove);

    // Dynamic adaptation target map: how much defenders cheat towards a teammate
    const cheatingTargets: Record<string, number> = {};

    // Reset components to Level 1
    const initLevel = (index: number) => {
      levelIndexRef.current = index;
      const lvl = LEVELS[index];
      setCurrentLevelName(lvl.name);
      setPassesCompletedVal(0);
      setPassesRequiredVal(lvl.passesToComplete);
      levelPassesCompleted.current = 0;

      // Spawn player in the center bottom
      playerEngine.current.reset(400, 450);
      ballEngine.current.reset(400, 450);
      teamEngine.current.reset(lvl.teammateRoutes, lvl.teammateSpeedMultiplier);
      defenderEngine.current.reset(lvl.defenderCount, lvl.defenderGuardIds, lvl.defenderSpeedMultiplier);

      playsStarted.current++;
      
      // Reset cheating records
      for (const k in cheatingTargets) delete cheatingTargets[k];
      for (const k in consecutivePassesToTarget.current) consecutivePassesToTarget.current[k] = 0;
      lastPassTargetId.current = null;
    };

    const levelPassesCompleted = { current: 0 };
    initLevel(0);

    // Pass triggers
    const triggerPass = (clickX: number, clickY: number) => {
      const ball = ballEngine.current.state;
      
      let startX = 0;
      let startY = 0;
      let isPlayerCarrier = false;

      if (ball.carrierId === "player") {
        startX = playerEngine.current.state.x;
        startY = playerEngine.current.state.y;
        isPlayerCarrier = true;
      } else if (ball.carrierId) {
        const tm = teamEngine.current.states.find(t => t.id === ball.carrierId);
        if (tm) {
          startX = tm.x;
          startY = tm.y;
        } else {
          return;
        }
      } else {
        return; // Ball is already loose or traveling
      }

      // Measure decision time
      const now = performance.now();
      const elapsedDecision = (now - lastPassTimeRef.current) / 1000;
      decisionTimes.current.push(elapsedDecision);
      decisionEvents.current++;
      lastPassTimeRef.current = now;

      // 1. Check if clicking near the Hoop (400, 87) to Shoot!
      const distToHoopSq = (clickX - 400) * (clickX - 400) + (clickY - 87) * (clickY - 87);
      if (distToHoopSq < 75 * 75) {
        const guarded = defenderEngine.current.states.some(d => d.guardingId === ball.carrierId && Math.sqrt((d.x - startX) * (d.x - startX) + (d.y - startY) * (d.y - startY)) < 30);
        if (guarded) {
          showAlert("Shot Blocked by Defender!");
          ballEngine.current.reset(playerEngine.current.state.x, playerEngine.current.state.y);
          lastPassTimeRef.current = performance.now();
        } else {
          ballEngine.current.startPass(startX, startY, 400, 87, 8.0, true);
          showAlert("Nice Shot! Watching it fly...");
        }
        return;
      }

      // 2. Click is a Pass to another player/teammate
      const teammates = teamEngine.current.states;
      const pState = playerEngine.current.state;
      const distToPlayerSq = (clickX - pState.x) * (clickX - pState.x) + (clickY - pState.y) * (clickY - pState.y);

      let closestTm = teammates[0];
      let minDistSq = Infinity;
      for (const tm of teammates) {
        const dx = clickX - tm.x;
        const dy = clickY - tm.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closestTm = tm;
        }
      }

      // If clicked near Playmaker (P) and teammate has the ball, pass back to Playmaker
      if (!isPlayerCarrier && distToPlayerSq < minDistSq && distToPlayerSq < 70 * 70) {
        ballEngine.current.startPass(startX, startY, pState.x, pState.y, 8.5, false);
        showAlert("Passing back to Playmaker!");
        passesAttempted.current++;
        return;
      }

      if (teammates.length === 0) return;

      passTargetSelections.current++;

      // Evaluate Lane Risk
      let isRisky = false;
      const defenders = defenderEngine.current.states;
      for (const def of defenders) {
        const x1 = startX;
        const y1 = startY;
        const x2 = clickX;
        const y2 = clickY;

        const A = x2 - x1;
        const B = y2 - y1;
        const C = A * A + B * B;
        if (C > 0) {
          const t = Math.max(0, Math.min(1, ((def.x - x1) * A + (def.y - y1) * B) / C));
          const projX = x1 + t * A;
          const projY = y1 + t * B;
          const distToLane = Math.sqrt((def.x - projX) * (def.x - projX) + (def.y - projY) * (def.y - projY));
          if (distToLane < 24) {
            isRisky = true;
          }
        }
      }

      if (isRisky) {
        riskPasses.current++;
      } else {
        safePasses.current++;
      }

      // Check for Lead Pass (clicking ahead of teammate movement direction)
      const isLead = closestTm.vx * (clickX - closestTm.x) + closestTm.vy * (clickY - closestTm.y) > 30;
      if (isLead) {
        leadPassAttempts.current++;
      }

      // Check Timing Window
      const targetGuarded = defenders.some(d => d.guardingId === closestTm.id && Math.sqrt((d.x - closestTm.x) * (d.x - closestTm.x) + (d.y - closestTm.y) * (d.y - closestTm.y)) < 30);
      if (targetGuarded) {
        latePasses.current++;
        poorTargetSelections.current++;
      } else {
        wellTimedPasses.current++;
        appropriateTargetSelections.current++;
      }

      // Check for strategy repetition
      if (isPlayerCarrier && LEVELS[levelIndexRef.current].defendersAdapt) {
        const prevTarget = lastPassTargetId.current;
        lastPassTargetId.current = closestTm.id;

        if (prevTarget === closestTm.id) {
          consecutivePassesToTarget.current[closestTm.id] = (consecutivePassesToTarget.current[closestTm.id] || 0) + 1;
          repeatedStrategyCount.current++;
          
          if (consecutivePassesToTarget.current[closestTm.id] >= 2) {
            cheatingTargets[closestTm.id] = Math.min(1.0, consecutivePassesToTarget.current[closestTm.id] * 0.35);
            showAlert("Defense adapts! They are covering the passing lane tighter.");
            defensiveAdaptationsMissed.current++;
          }
        } else {
          if (prevTarget && (consecutivePassesToTarget.current[prevTarget] || 0) >= 2) {
            strategyChanges.current++;
            successfulStrategyChanges.current++;
            defensiveAdaptationsDetected.current++;
            adaptiveResponses.current++;
            showAlert("Excellent strategy shift! You bypassed the tight coverage.");
          }
          consecutivePassesToTarget.current[closestTm.id] = 1;
          for (const k in cheatingTargets) delete cheatingTargets[k];
        }
      }

      // Start the pass physics travel
      ballEngine.current.startPass(startX, startY, clickX, clickY);
      passesAttempted.current++;
    };

    // Click/Touch Listener on Canvas
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      triggerPass(clickX, clickY);
    };
    canvas.addEventListener("click", handleCanvasClick);

    // Loop implementation
    const loop = (timestamp: number) => {
      if (doneRef.current) return;

      if (endingRef.current && timestamp >= finishAtRef.current) {
        finish();
        return;
      }

      // 1. Update Player Physics
      playerEngine.current.update(keysPressed);

      // 2. Update Teammates AI
      const pState = playerEngine.current.state;
      const bState = ballEngine.current.state;
      teamEngine.current.update(
        bState.carrierId,
        pState.x,
        pState.y,
        () => {}
      );

      // 3. Update Defenders AI
      const carrierX = bState.carrierId === "player"
        ? pState.x
        : (teamEngine.current.states.find(t => t.id === bState.carrierId)?.x ?? pState.x);
      const carrierY = bState.carrierId === "player"
        ? pState.y
        : (teamEngine.current.states.find(t => t.id === bState.carrierId)?.y ?? pState.y);

      defenderEngine.current.update(
        carrierX,
        carrierY,
        pState,
        teamEngine.current.states,
        bState.isTraveling,
        bState.x,
        bState.y,
        cheatingTargets
      );

      // 4. Update Ball physics and check overlaps
      ballEngine.current.update(
        pState,
        teamEngine.current.states,
        defenderEngine.current.states,
        (interceptingDefender) => {
          // Pass intercepted!
          passesIntercepted.current++;
          riskOutcomes.current.push(0);
          showAlert("Pass Intercepted by Defender!");
          
          if (consecutivePassesToTarget.current[interceptingDefender.guardingId] >= 2) {
            repeatedFailedStrategyCount.current++;
            failedStrategyChanges.current++;
          }

          // Reset play: return ball to player
          ballEngine.current.reset(pState.x, pState.y);
          lastPassTimeRef.current = performance.now();
        },
        (receivingTeammate) => {
          // Teammate caught pass!
          passesCompleted.current++;

          // Track accuracy of lead-pass projection
          if (bState.targetX !== null) {
            const distToClick = Math.sqrt(
              (receivingTeammate.x - bState.targetX) * (receivingTeammate.x - bState.targetX) +
              (receivingTeammate.y - bState.targetY!) * (receivingTeammate.y - bState.targetY!)
            );
            const accuracy = Math.max(0, 100 - distToClick * 1.6);
            receiverPredictionAccs.current.push(accuracy);
          }

          // Mark lead pass success
          const isLead = receivingTeammate.vx * (bState.x - receivingTeammate.x) + receivingTeammate.vy * (bState.y - receivingTeammate.y) > 10;
          if (isLead) {
            leadPassSuccesses.current++;
          }

          // Track lane completion
          const laneGuarded = defenderEngine.current.states.some(d => d.guardingId === receivingTeammate.id);
          if (laneGuarded) {
            passingLaneRecognitions.current++;
            riskOutcomes.current.push(1);
          } else {
            passingLaneRecognitions.current++;
          }

          showAlert("Teammate catches... waiting for your signal!");
        },
        () => {
          // Pass caught back by playmaker
          showAlert("Caught! Find another teammate.");
          lastPassTimeRef.current = performance.now();
        },
        () => {
          // Out of Bounds
          passesOutOfBounds.current++;
          showAlert("Out of bounds! Stay on the court.");
          ballEngine.current.reset(pState.x, pState.y);
          lastPassTimeRef.current = performance.now();
        },
        () => {
          // Shot made it in the hoop! Score point!
          levelPassesCompleted.current++;
          setPassesCompletedVal(levelPassesCompleted.current);
          showAlert("🏀 BASKET! 2 Points Scored!");

          // Advance level checks
          const lvl = LEVELS[levelIndexRef.current];
          if (levelPassesCompleted.current >= lvl.passesToComplete) {
            playsCompleted.current++;
            const nextLvl = levelIndexRef.current + 1;
            if (nextLvl < LEVELS.length) {
              showAlert("Scenario Complete! Moving to next scenario.");
              initLevel(nextLvl);
            } else {
              showAlert("Excellent! Game Assessment Complete.");
              endingRef.current = true;
              finish();
            }
          } else {
            // Return ball to playmaker for next play
            ballEngine.current.reset(pState.x, pState.y);
            lastPassTimeRef.current = performance.now();
          }
        }
      );

      // 5. Draw Game Canvas
      ctx.clearRect(0, 0, 800, 600);

      // Draw floor wood
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 800, 600);

      // Paint keys/court divisions
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(300, 60, 200, 160);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(300, 60, 200, 160);

      // Draw court border lines
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 60, 700, 480);

      // Draw half-court circle
      ctx.beginPath();
      ctx.arc(400, 540, 80, Math.PI, 2 * Math.PI);
      ctx.stroke();

      // Draw three point line
      ctx.beginPath();
      ctx.arc(400, 100, 260, 0, Math.PI);
      ctx.stroke();

      // Paint Hoop
      // Backboard support
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(400, 60);
      ctx.lineTo(400, 75);
      ctx.stroke();

      // Backboard
      ctx.strokeStyle = "#f1f5f9";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(370, 75);
      ctx.lineTo(430, 75);
      ctx.stroke();

      // Rim
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(400, 87, 12, 0, 2 * Math.PI);
      ctx.stroke();

      // Net
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1;
      for (let offset = -8; offset <= 8; offset += 4) {
        ctx.beginPath();
        ctx.moveTo(400 + offset, 87);
        ctx.lineTo(400 + offset * 1.4, 105);
        ctx.stroke();
      }

      // Draw Ball Shadow (parabolic shift)
      if (bState.isTraveling) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.arc(bState.x, bState.y + bState.z * 0.4, (bState.radius + bState.z * 0.1) * 0.8, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw Teammates
      for (const tm of teamEngine.current.states) {
        // Draw target destination circle (anticipation guide)
        if (bState.carrierId === "player") {
          ctx.strokeStyle = "rgba(14, 165, 233, 0.25)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.arc(tm.targetX, tm.targetY, 14, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);

          // Connector line
          ctx.strokeStyle = "rgba(14, 165, 233, 0.15)";
          ctx.lineWidth = 1;
          ctx.setLineDash([1, 3]);
          ctx.beginPath();
          ctx.moveTo(tm.x, tm.y);
          ctx.lineTo(tm.targetX, tm.targetY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw passing lane helper (green = open, red = blocked/risky)
        if (bState.carrierId === "player") {
          let isLaneBlocked = false;
          const defenders = defenderEngine.current.states;
          for (const def of defenders) {
            const x1 = pState.x;
            const y1 = pState.y;
            const x2 = tm.x;
            const y2 = tm.y;

            const A = x2 - x1;
            const B = y2 - y1;
            const C = A * A + B * B;
            if (C > 0) {
              const t = Math.max(0, Math.min(1, ((def.x - x1) * A + (def.y - y1) * B) / C));
              const projX = x1 + t * A;
              const projY = y1 + t * B;
              const dist = Math.sqrt((def.x - projX) * (def.x - projX) + (def.y - projY) * (def.y - projY));
              if (dist < 24) {
                isLaneBlocked = true;
                break;
              }
            }
          }

          ctx.strokeStyle = isLaneBlocked ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.25)";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(pState.x, pState.y);
          ctx.lineTo(tm.x, tm.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Teammate circle
        ctx.fillStyle = tm.isHoldingBall ? "#fb923c" : "#0ea5e9";
        ctx.beginPath();
        ctx.arc(tm.x, tm.y, tm.radius, 0, 2 * Math.PI);
        ctx.fill();

        // Glowing perimeter rings
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tm.x, tm.y, tm.radius + 1, 0, 2 * Math.PI);
        ctx.stroke();

        // Label
        ctx.fillStyle = "#ffffff";
        ctx.font = "black 11px Outfit, Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tm.name.split(" ")[1], tm.x, tm.y);

        if (tm.isHoldingBall) {
          ctx.fillStyle = "#fb923c";
          ctx.font = "bold 9px Outfit, Inter, sans-serif";
          ctx.fillText("TAP SCREEN/HOOP TO ACTION", tm.x, tm.y - 24);

          // Draw dashed line back to playmaker
          ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(tm.x, tm.y);
          ctx.lineTo(pState.x, pState.y);
          ctx.stroke();

          // Draw dashed line to hoop
          ctx.strokeStyle = "rgba(251, 146, 60, 0.35)";
          ctx.beginPath();
          ctx.moveTo(tm.x, tm.y);
          ctx.lineTo(400, 87);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw Defenders
      for (const def of defenderEngine.current.states) {
        // Red circle
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(def.x, def.y, def.radius, 0, 2 * Math.PI);
        ctx.fill();

        // Guard ring
        ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(def.x, def.y, def.radius + 3, 0, 2 * Math.PI);
        ctx.stroke();

        // Label
        ctx.fillStyle = "#ffffff";
        ctx.font = "black 10px Outfit, Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("D", def.x, def.y);
      }

      // Draw Player (Playmaker)
      ctx.fillStyle = bState.carrierId === "player" ? "#fb923c" : "#6366f1";
      ctx.beginPath();
      ctx.arc(pState.x, pState.y, pState.radius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pState.x, pState.y, pState.radius + 1, 0, 2 * Math.PI);
      ctx.stroke();

      // Ball glow if carrying
      if (bState.carrierId === "player") {
        ctx.strokeStyle = "rgba(249, 115, 22, 0.65)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(pState.x, pState.y, pState.radius + 4, 0, 2 * Math.PI);
        ctx.stroke();
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "black 11px Outfit, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("P", pState.x, pState.y);

      // Draw aiming vector line from current carrier to cursor
      if (bState.carrierId !== null) {
        let startX = pState.x;
        let startY = pState.y;
        if (bState.carrierId !== "player") {
          const tm = teamEngine.current.states.find(t => t.id === bState.carrierId);
          if (tm) {
            startX = tm.x;
            startY = tm.y;
          }
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(mouseX, mouseY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw circular reticle at cursor
        ctx.strokeStyle = "rgba(249, 115, 22, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 6, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 14, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Draw Basketball
      if (bState.carrierId === null) {
        const ballSize = bState.radius + bState.z * 0.15;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(bState.x, bState.y - bState.z, ballSize, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bState.x, bState.y - bState.z, ballSize, 0, 2 * Math.PI);
        ctx.stroke();

        // Rib details
        ctx.beginPath();
        ctx.moveTo(bState.x - ballSize, bState.y - bState.z);
        ctx.lineTo(bState.x + ballSize, bState.y - bState.z);
        ctx.stroke();
      }

      // Draw score splash
      if (bState.isShot && bState.travelTime > bState.maxTravelTime - 12) {
        ctx.fillStyle = "#fb923c";
        ctx.font = "bold 13px Outfit, Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SWISH! 🏀", 400, 48);
      }

      // Draw control helper bar and tip at the bottom center
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(100, 545, 600, 48);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(100, 545, 600, 48);

      ctx.fillStyle = "#fb923c";
      ctx.font = "bold 9px Outfit, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💡 TIP: MOVE TO TURN RED LINES GREEN. CLICK TEAMMATE TO PASS. CLICK HOOP TO SHOOT!", 400, 558);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px Outfit, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Controls: WASD/Arrows to Move   •   Mouse Click to Pass / Hoop to Shoot", 400, 576);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove);
    };
  }, [started, disabled]);

  // Clean timers
  useEffect(() => {
    return () => {
      if (alertTimer) clearTimeout(alertTimer);
    };
  }, [alertTimer]);

  const handleStart = () => {
    setStarted(true);
  };

  const minutesStr = Math.floor(timePreview / 60);
  const secondsStr = String(timePreview % 60).padStart(2, "0");

  return (
    <div className="playmaker-container">
      {/* HUD Bar */}
      <div className="playmaker-hud">
        <div className="playmaker-hud-panel">
          <span className="playmaker-hud-title">🏀 PLAYMAKER</span>
          <span className="text-white/20">|</span>
          <div className="flex flex-col">
            <span className="playmaker-hud-label">Scenario</span>
            <span className="text-[11px] font-bold text-white/80">{currentLevelName}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="playmaker-hud-panel">
            <div className="flex flex-col text-right">
              <span className="playmaker-hud-label">Passes Completed</span>
              <span className="playmaker-hud-value highlight">
                {passesCompletedVal} / {passesRequiredVal === 99 ? "∞" : passesRequiredVal}
              </span>
            </div>
          </div>

          <div className="playmaker-hud-panel">
            <div className="flex flex-col text-right">
              <span className="playmaker-hud-label">Time Remaining</span>
              <span className="playmaker-hud-value">
                {minutesStr}:{secondsStr}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Arena Canvas Wrapper */}
      <div className="playmaker-canvas-container">
        <canvas ref={canvasRef} width={800} height={600} className="playmaker-canvas" />

        {/* Start Overlay Screen */}
        {!started && (
          <div className="playmaker-overlay">
            <h1 className="playmaker-overlay-title">PLAYMAKER</h1>
            <p className="playmaker-overlay-desc">
              Anticipation & Decision Making. Move your player around the court, observe the paths of your teammates, and make precise passes into open spaces. Watch out for the defenders blocking lanes!
            </p>

            <div className="playmaker-instruction-grid">
              <div className="playmaker-instruction-card">
                <h3 className="playmaker-instruction-card-title">Movement Controls</h3>
                <p className="playmaker-instruction-card-text">
                  Use your keyboard <strong>WASD</strong> or <strong>Arrow keys</strong> to navigate the playmaker around the court.
                </p>
              </div>

              <div className="playmaker-instruction-card">
                <h3 className="playmaker-instruction-card-title">Passing Action</h3>
                <p className="playmaker-instruction-card-text">
                  Click or tap <strong>directly on the court</strong> to throw a pass to where your teammate is cutting.
                </p>
              </div>
            </div>

            <button onClick={handleStart} className="playmaker-start-btn">
              <Play className="h-4.5 w-4.5 fill-white" />
              Start Assessment
            </button>
          </div>
        )}

        {/* Feedback Alert HUD */}
        {alertText && <div className="playmaker-game-alert">{alertText}</div>}
      </div>
    </div>
  );
}
