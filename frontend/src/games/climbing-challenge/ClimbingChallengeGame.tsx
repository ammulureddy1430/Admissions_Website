import React, { useEffect, useRef, useState, useCallback } from "react";
import { ClimberEngine } from "./ClimberEngine";
import { LEVELS } from "./Levels";
import { ClimbingMetrics, ClimbingHold } from "./Types";
import { scoreClimbingChallenge } from "./ScoringEngine";
import "./ClimbingChallengeGame.css";

interface ClimbingChallengeGameProps {
  remainingSeconds: number;
  practiceOnly?: boolean;
  onComplete?: (score: number, metrics: ClimbingMetrics) => void;
}

const ClimbingChallengeGame: React.FC<ClimbingChallengeGameProps> = ({
  remainingSeconds,
  practiceOnly = false,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const climberEngine = useRef<ClimberEngine>(new ClimberEngine(400, 1300));
  
  // Game states
  const [levelIndex, setLevelIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [alertText, setAlertText] = useState("");
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [balanceVal, setBalanceVal] = useState(100);

  // Time Preview for practice mode
  const [timePreview, setTimePreview] = useState(remainingSeconds || 120);

  // References to preserve state in anim frame
  const levelIndexRef = useRef(0);
  const levelHoldsRef = useRef<ClimbingHold[]>([]);
  const startRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const cameraYRef = useRef<number>(900);
  const doneRef = useRef<boolean>(false);
  const endingRef = useRef<boolean>(false);
  const finishAtRef = useRef<number>(Infinity);
  const rafRef = useRef<number>(0);

  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const draggedFootRef = useRef<"leftFoot" | "rightFoot" | null>(null);
  const suppressClickRef = useRef(false);
  const popupsRef = useRef<{ x: number; y: number; text: string; color: string; timer: number }[]>([]);

  // Telemetry variables
  const climbsStarted = useRef(0);
  const climbsCompleted = useRef(0);
  const holdsReached = useRef(0);
  const holdsMissed = useRef(0);
  const reachAttempts = useRef(0);
  const successfulReaches = useRef(0);
  const failedReaches = useRef(0);
  const movementAttempts = useRef(0);
  const successfulMovements = useRef(0);
  const movementCorrections = useRef(0);
  const unnecessaryMovements = useRef(0);
  const routeChoices = useRef(0);
  const routeChanges = useRef(0);
  const multiStepSequences = useRef(0);
  const sequenceSuccesses = useRef(0);
  const sequenceErrors = useRef(0);
  const bodyRepositioningEvents = useRef(0);
  const successfulRepositioning = useRef(0);
  const balanceEvents = useRef(0);
  const recoveryEvents = useRef(0);
  const clicksArray = useRef<{ x: number; y: number; time: number }[]>([]);
  const adaptiveEvents = useRef(0);
  const successfulAdaptations = useRef(0);
  const failedAdaptations = useRef(0);

  const showAlert = (text: string) => {
    setAlertText(text);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setAlertText(""), 2200);
  };

  const initLevel = useCallback((index: number) => {
    levelIndexRef.current = index;
    setLevelIndex(index);
    
    const lvl = LEVELS[index];
    // Copy holds so we can modify availability dynamically
    levelHoldsRef.current = lvl.holds.map(h => ({ ...h }));

    // Spawn climber near starting holds at the bottom of the wall
    climberEngine.current.reset(400, lvl.height - 180);
    cameraYRef.current = lvl.height - 600;

    climbsStarted.current++;
    showAlert(`Starting ${lvl.name}`);
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);

    // Calculate decision times
    let avgDecision = 1.1;
    if (clicksArray.current.length > 1) {
      let sum = 0;
      for (let i = 1; i < clicksArray.current.length; i++) {
        sum += (clicksArray.current[i].time - clicksArray.current[i - 1].time) / 1000;
      }
      avgDecision = sum / (clicksArray.current.length - 1);
    }

    const elapsed = performance.now() - (startRef.current || performance.now());
    
    // Evaluate Precision metrics
    const reachAcc = Math.max(75, Math.min(99, 98 - failedReaches.current * 4));
    const moveAcc = Math.max(75, Math.min(99, 97 - balanceEvents.current * 5));

    const metricsData = scoreClimbingChallenge({
      sessionDuration: Math.round(elapsed / 1000),
      climbsStarted: climbsStarted.current,
      climbsCompleted: climbsCompleted.current,
      holdsReached: holdsReached.current,
      holdsMissed: holdsMissed.current,
      reachAttempts: reachAttempts.current,
      successfulReaches: successfulReaches.current,
      failedReaches: failedReaches.current,
      movementAttempts: movementAttempts.current,
      successfulMovements: successfulMovements.current,
      movementCorrections: movementCorrections.current,
      unnecessaryMovements: unnecessaryMovements.current,
      routeChoices: routeChoices.current,
      routeChanges: routeChanges.current,
      multiStepSequences: multiStepSequences.current,
      sequenceSuccesses: sequenceSuccesses.current,
      sequenceErrors: sequenceErrors.current,
      bodyRepositioningEvents: bodyRepositioningEvents.current,
      successfulRepositioning: successfulRepositioning.current,
      balanceEvents: balanceEvents.current,
      recoveryEvents: recoveryEvents.current,
      reachAccuracy: reachAcc,
      movementAccuracy: moveAcc,
      adaptiveEvents: adaptiveEvents.current,
      successfulAdaptations: successfulAdaptations.current,
      failedAdaptations: failedAdaptations.current,
      averageDecisionTime: parseFloat(avgDecision.toFixed(2)),
      climbingSpeed: Math.round((holdsReached.current / Math.max(1, elapsed / 1000)) * 60),
      highestDifficulty: Math.max(1, levelIndexRef.current + 1),
    });

    if (onComplete) {
      onComplete(metricsData.overallScore || 0, metricsData);
    }
  }, [onComplete]);

  // Practice mode timer countdown
  useEffect(() => {
    if (!started || !practiceOnly) return;
    const interval = setInterval(() => {
      setTimePreview((v) => {
        if (v <= 1) {
          clearInterval(interval);
          finish();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started, practiceOnly, finish]);

  // Real-time runtime shared timer completes
  useEffect(() => {
    if (started && !practiceOnly && remainingSeconds !== undefined && remainingSeconds <= 0 && !endingRef.current) {
      endingRef.current = true;
      finishAtRef.current = performance.now() + 1000;
    }
  }, [started, practiceOnly, remainingSeconds]);

  // Core 60fps game loop
  useEffect(() => {
    if (!started || doneRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    startRef.current = performance.now();
    lastTimeRef.current = startRef.current;
    initLevel(0);

    const loop = (timestamp: number) => {
      if (doneRef.current) return;

      if (endingRef.current && timestamp >= finishAtRef.current) {
        finish();
        return;
      }

      const holds = levelHoldsRef.current;
      const lvl = LEVELS[levelIndexRef.current];

      // 1. Dynamic holds update (Level 7/8 flasher)
      holds.forEach(h => {
        if (h.type === "temporary") {
          if (!h.flashTimer) h.flashTimer = 0;
          h.flashTimer++;
          // Flashes and goes unavailable every 3.5s (210 frames)
          const cycle = h.flashTimer % 220;
          h.available = cycle < 130; // Available for 2.1s, invisible/blocked for 1.5s
          h.flashState = cycle > 90 && cycle < 130; // flashes right before disappearing
        }
      });

      // 2. Update character kinematics
      const engine = climberEngine.current;
      const oldState = engine.state.state;
      engine.update(holds);
      
      setBalanceVal(Math.round(engine.state.balance));

      // Telemetry balance metrics
      if (engine.state.state === "wobbling" && oldState !== "wobbling") {
        balanceEvents.current++;
        showAlert("Warning: Balance unstable!");
      }
      if (engine.state.state === "recovering" && oldState === "wobbling") {
        recoveryEvents.current++;
      }

      // 3. Camera Smooth Scroll follow (Torso y center coordinates)
      const targetCamY = engine.state.y - 280;
      cameraYRef.current += (targetCamY - cameraYRef.current) * 0.07;
      // Clamp bounds
      cameraYRef.current = Math.max(0, Math.min(lvl.height - 600, cameraYRef.current));

      const camY = cameraYRef.current;

      // 4. Complete only after the climber has finished pulling up and their
      // upper body has actually crossed the visible finish line.
      const hasCrossedFinishLine = engine.state.y - 72 <= lvl.targetY;
      if (hasCrossedFinishLine && !engine.state.isTransitioning) {
        climbsCompleted.current++;
        showAlert("Awesome! Climbing Challenge completed.");
        endingRef.current = true;
        finish();
        return;
      }

      // 5. Draw Canvas Wall
      ctx.clearRect(0, 0, 800, 600);

      // Floor plank background
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, 800, 600);

      // Draw rock vertical lines
      ctx.strokeStyle = "rgba(56, 189, 248, 0.05)";
      ctx.lineWidth = 1;
      for (let x = 100; x < 800; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 600);
        ctx.stroke();
      }

      // Optional physical-looking obstacles for levels that define them.
      lvl.obstacles?.forEach((obstacle) => {
        const drawY = obstacle.y - camY;
        if (drawY < -120 || drawY > 720) return;
        ctx.save();
        ctx.translate(obstacle.x, drawY);
        ctx.rotate(obstacle.rotation || 0);
        const gradient = ctx.createLinearGradient(
          -obstacle.width / 2,
          -obstacle.height / 2,
          obstacle.width / 2,
          obstacle.height / 2
        );
        gradient.addColorStop(0, obstacle.kind === "loose-rock" ? "#7c3f2c" : "#475569");
        gradient.addColorStop(1, "#172033");
        ctx.fillStyle = gradient;
        ctx.strokeStyle = obstacle.kind === "loose-rock" ? "#fb923c" : "#64748b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-obstacle.width / 2, -obstacle.height * 0.25);
        ctx.lineTo(-obstacle.width * 0.3, -obstacle.height / 2);
        ctx.lineTo(obstacle.width * 0.35, -obstacle.height * 0.43);
        ctx.lineTo(obstacle.width / 2, obstacle.height * 0.15);
        ctx.lineTo(obstacle.width * 0.2, obstacle.height / 2);
        ctx.lineTo(-obstacle.width * 0.4, obstacle.height * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = obstacle.kind === "loose-rock" ? "rgba(253,186,116,.8)" : "rgba(148,163,184,.55)";
        ctx.lineWidth = obstacle.kind === "crack" ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(-obstacle.width * 0.2, -obstacle.height * 0.32);
        ctx.lineTo(obstacle.width * 0.08, -obstacle.height * 0.05);
        ctx.lineTo(-obstacle.width * 0.03, obstacle.height * 0.18);
        ctx.lineTo(obstacle.width * 0.25, obstacle.height * 0.36);
        ctx.stroke();
        ctx.restore();
      });

      // Draw Holds
      holds.forEach(h => {
        if (!h.available && h.type === "temporary") return; // invisible

        const drawY = h.y - camY;
        if (drawY < -50 || drawY > 650) return; // culling

        // Glow ring if selected/flashing
        ctx.beginPath();
        if (h.type === "temporary" && h.flashState) {
          ctx.strokeStyle = "rgba(168, 85, 247, 0.75)";
          ctx.lineWidth = 3;
          ctx.arc(h.x, drawY, h.size + 4, 0, 2 * Math.PI);
          ctx.stroke();
        }

        // Color based on type
        let fill = "#22c55e"; // Large (green)
        if (h.type === "medium") fill = "#3b82f6"; // Blue
        else if (h.type === "small") fill = "#eab308"; // Yellow
        else if (h.type === "side") fill = "#f97316"; // Orange
        else if (h.type === "temporary") fill = "#a855f7"; // Purple

        ctx.fillStyle = fill;
        ctx.beginPath();
        
        if (h.type === "side") {
          // Draw crescent shape hold
          ctx.arc(h.x, drawY, h.size, Math.PI * 0.5, Math.PI * 1.5);
          ctx.lineTo(h.x - h.size * 0.3, drawY);
        } else {
          ctx.arc(h.x, drawY, h.size, 0, 2 * Math.PI);
        }
        ctx.fill();

        // Hold texture borders
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner ridge
        ctx.beginPath();
        ctx.arc(h.x, drawY, h.size * 0.5, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.stroke();
      });

      // Draw reach range circle (240px maximum reach indicator)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(engine.state.x, engine.state.y - camY, 240, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw mouse hover reach guides
      const mx = mouseXRef.current;
      const my = mouseYRef.current;
      const wmx = mx;
      const wmy = my + camY;

      let hoveredHold: ClimbingHold | null = null;
      let minDist = Infinity;
      for (const h of holds) {
        if (!h.available) continue;
        const dx = wmx - h.x;
        const dy = wmy - h.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < h.size + 25) {
          if (d < minDist) {
            minDist = d;
            hoveredHold = h;
          }
        }
      }

      if (hoveredHold) {
        let limbKey: "leftHand" | "rightHand" | "leftFoot" | "rightFoot";
        const torsoY = engine.state.y;
        if (hoveredHold.y < torsoY) {
          const dTorso = Math.sqrt((hoveredHold.x - engine.state.x) ** 2 + (hoveredHold.y - engine.state.y) ** 2);
          if (dTorso <= 240) {
            limbKey = engine.state.leftHand.y < engine.state.rightHand.y ? "rightHand" : "leftHand";
          } else {
            const dL = Math.sqrt((hoveredHold.x - engine.state.leftHand.x) ** 2 + (hoveredHold.y - engine.state.leftHand.y) ** 2);
            const dR = Math.sqrt((hoveredHold.x - engine.state.rightHand.x) ** 2 + (hoveredHold.y - engine.state.rightHand.y) ** 2);
            limbKey = dL < dR ? "leftHand" : "rightHand";
          }
        } else {
          const dTorso = Math.sqrt((hoveredHold.x - engine.state.x) ** 2 + (hoveredHold.y - engine.state.y) ** 2);
          if (dTorso <= 220) {
            limbKey = engine.state.leftFoot.y < engine.state.rightFoot.y ? "rightFoot" : "leftFoot";
          } else {
            const dL = Math.sqrt((hoveredHold.x - engine.state.leftFoot.x) ** 2 + (hoveredHold.y - engine.state.leftFoot.y) ** 2);
            const dR = Math.sqrt((hoveredHold.x - engine.state.rightFoot.x) ** 2 + (hoveredHold.y - engine.state.rightFoot.y) ** 2);
            limbKey = dL < dR ? "leftFoot" : "rightFoot";
          }
        }

        const limb = engine.state[limbKey];
        const dx = hoveredHold.x - engine.state.x;
        const dy = hoveredHold.y - engine.state.y;
        const distToTorso = Math.sqrt(dx * dx + dy * dy);
        const limit = limbKey.includes("Hand") ? 240 : 220;
        const reachable = distToTorso <= limit;

        ctx.strokeStyle = reachable ? "rgba(34, 197, 94, 0.45)" : "rgba(239, 68, 68, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(limb.x, limb.y - camY);
        ctx.lineTo(hoveredHold.x, hoveredHold.y - camY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = reachable ? "#22c55e" : "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hoveredHold.x, hoveredHold.y - camY, hoveredHold.size + 4, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = reachable ? "#22c55e" : "#ef4444";
        ctx.font = "bold 9px Outfit, Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          reachable ? "REACHABLE (Click to Grab)" : "TOO FAR",
          hoveredHold.x,
          hoveredHold.y - camY - hoveredHold.size - 8
        );
      }

      // Direct foot control preview: press a shoe, drag, and release on a hold.
      const draggedFoot = draggedFootRef.current;
      if (draggedFoot) {
        const foot = engine.state[draggedFoot];
        const targetWorldY = mouseYRef.current + camY;
        const targetDistance = Math.hypot(
          mouseXRef.current - engine.state.x,
          targetWorldY - engine.state.y
        );
        const canPlace = targetDistance <= 220;
        ctx.strokeStyle = canPlace ? "rgba(34,197,94,.9)" : "rgba(239,68,68,.9)";
        ctx.lineWidth = 4;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.moveTo(foot.x, foot.y - camY);
        ctx.lineTo(mouseXRef.current, mouseYRef.current);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = canPlace ? "rgba(34,197,94,.75)" : "rgba(239,68,68,.75)";
        ctx.beginPath();
        ctx.ellipse(mouseXRef.current, mouseYRef.current, 13, 8, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render floating popups queue
      popupsRef.current = popupsRef.current.filter(p => {
        p.timer--;
        p.y -= 0.8;
        ctx.fillStyle = p.color;
        ctx.font = "bold 12px Outfit, Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.globalAlpha = p.timer / 40;
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1.0;
        return p.timer > 0;
      });

      // Draw an articulated, fully dressed climber instead of a stick figure.
      const j = engine.getJoints();

      // Adjust joints coordinates to camera offset with breathing kinematics
      const breathe = Math.sin(timestamp / 350) * 1.5;

      const drawCoord = (pt: { x: number; y: number }) => ({
        x: pt.x,
        y: pt.y - camY,
      });

      const head = drawCoord({ x: j.head.x, y: j.head.y + breathe });
      const torso = drawCoord({ x: j.torsoCenter.x, y: j.torsoCenter.y + breathe * 0.5 });
      const lSh = drawCoord({ x: j.lShoulder.x, y: j.lShoulder.y + breathe });
      const rSh = drawCoord({ x: j.rShoulder.x, y: j.rShoulder.y + breathe });
      const lEl = drawCoord({ x: j.lElbow.x, y: j.lElbow.y + breathe * 0.7 });
      const rEl = drawCoord({ x: j.rElbow.x, y: j.rElbow.y + breathe * 0.7 });
      const lHa = drawCoord(j.lHand);
      const rHa = drawCoord(j.rHand);
      const lHi = drawCoord(j.lHip);
      const rHi = drawCoord(j.rHip);
      const lKn = drawCoord(j.lKnee);
      const rKn = drawCoord(j.rKnee);
      const lFo = drawCoord(j.lFoot);
      const rFo = drawCoord(j.rFoot);

      // Arms and legs use broad outlined segments so the animation reads as a person.
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#172033";
      ctx.beginPath();
      ctx.moveTo(lSh.x, lSh.y);
      ctx.lineTo(lEl.x, lEl.y);
      ctx.lineTo(lHa.x, lHa.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rSh.x, rSh.y);
      ctx.lineTo(rEl.x, rEl.y);
      ctx.lineTo(rHa.x, rHa.y);
      ctx.stroke();
      ctx.strokeStyle = "#0f766e";
      ctx.beginPath();
      ctx.moveTo(lHi.x, lHi.y);
      ctx.lineTo(lKn.x, lKn.y);
      ctx.lineTo(lFo.x, lFo.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rHi.x, rHi.y);
      ctx.lineTo(rKn.x, rKn.y);
      ctx.lineTo(rFo.x, rFo.y);
      ctx.stroke();

      // Jacket-shaped torso.
      ctx.fillStyle = "#0284c7";
      ctx.strokeStyle = "#0c4a6e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lSh.x, lSh.y - 3);
      ctx.lineTo(rSh.x, rSh.y - 3);
      ctx.lineTo(rHi.x + 5, rHi.y + 5);
      ctx.lineTo(lHi.x - 5, lHi.y + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Safety harness and belt.
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(lHi.x - 4, lHi.y - 3);
      ctx.lineTo(rHi.x + 4, rHi.y - 3);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(torso.x, torso.y + 3);
      ctx.lineTo(lHi.x, lHi.y + 8);
      ctx.moveTo(torso.x, torso.y + 3);
      ctx.lineTo(rHi.x, rHi.y + 8);
      ctx.stroke();

      // Face and helmet.
      ctx.fillStyle = "#f2c6a0";
      ctx.beginPath();
      ctx.arc(head.x, head.y, 13, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(head.x, head.y - 3, 14, Math.PI, 2 * Math.PI);
      ctx.fill();
      ctx.fillRect(head.x - 14, head.y - 4, 28, 4);
      ctx.fillStyle = "#172033";
      ctx.beginPath();
      ctx.arc(head.x + 5, head.y + 1, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Gloves and climbing shoes follow the animated limb endpoints.
      [lHa, rHa].forEach((hand) => {
        ctx.fillStyle = "#f2c6a0";
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, 7, 0, Math.PI * 2);
        ctx.fill();
      });
      [lFo, rFo].forEach((foot) => {
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.ellipse(foot.x, foot.y, 10, 6, -0.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw limb status highlights
      const drawLimbGlow = (hand: { x: number; y: number }, active: boolean) => {
        ctx.fillStyle = active ? "#22c55e" : "#e11d48";
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, 6, 0, 2 * Math.PI);
        ctx.fill();
      };
      drawLimbGlow(lHa, !!engine.state.leftHand.holdId);
      drawLimbGlow(rHa, !!engine.state.rightHand.holdId);
      drawLimbGlow(lFo, !!engine.state.leftFoot.holdId);
      drawLimbGlow(rFo, !!engine.state.rightFoot.holdId);

      // Finish boundary line
      const finishY = lvl.targetY - camY;
      ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(50, finishY);
      ctx.lineTo(750, finishY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(34, 197, 94, 0.6)";
      ctx.font = "bold 9px Outfit, Inter, sans-serif";
      ctx.fillText("FINISH ZONE", 80, finishY - 8);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [started, initLevel, finish]);

  const handleStart = () => {
    setStarted(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseXRef.current = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseYRef.current = (e.clientY - rect.top) * (canvas.height / rect.height);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!started || doneRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    handlePointerMove(e);
    const camY = cameraYRef.current;
    const engine = climberEngine.current;
    const feet = (["leftFoot", "rightFoot"] as const).map((key) => ({
      key,
      distance: Math.hypot(
        mouseXRef.current - engine.state[key].x,
        mouseYRef.current - (engine.state[key].y - camY)
      ),
    }));
    const closest = feet.sort((a, b) => a.distance - b.distance)[0];
    if (closest.distance <= 28) {
      draggedFootRef.current = closest.key;
      canvas.setPointerCapture(e.pointerId);
      suppressClickRef.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const footKey = draggedFootRef.current;
    if (!footKey) return;
    handlePointerMove(e);
    draggedFootRef.current = null;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);

    const worldX = mouseXRef.current;
    const worldY = mouseYRef.current + cameraYRef.current;
    const hold = levelHoldsRef.current.find((candidate) =>
      candidate.available &&
      Math.hypot(worldX - candidate.x, worldY - candidate.y) <= candidate.size + 18
    );
    if (!hold) {
      holdsMissed.current++;
      showAlert("Place the foot directly on a climbing hold.");
      return;
    }

    reachAttempts.current++;
    movementAttempts.current++;
    const success = climberEngine.current.tryReach(hold, footKey);
    if (success) {
      successfulReaches.current++;
      successfulMovements.current++;
      holdsReached.current++;
      popupsRef.current.push({
        x: mouseXRef.current,
        y: mouseYRef.current,
        text: "FOOT PLACED!",
        color: "#22c55e",
        timer: 40,
      });
    } else {
      failedReaches.current++;
      showAlert("That foothold is too far away.");
    }
  };

  const handlePointerCancel = () => {
    draggedFootRef.current = null;
    suppressClickRef.current = false;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (!started || doneRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const camY = cameraYRef.current;
    const worldX = clickX;
    const worldY = clickY + camY;

    // Track decision events time
    clicksArray.current.push({ x: clickX, y: clickY, time: performance.now() });

    // 1. Find if a hold is clicked
    const holds = levelHoldsRef.current;
    const clickedHold = holds.find(h => {
      if (!h.available) return false;
      const dx = worldX - h.x;
      const dy = worldY - h.y;
      return Math.sqrt(dx * dx + dy * dy) < h.size + 15; // slightly larger click tolerance
    });

    if (!clickedHold) {
      holdsMissed.current++;
      showAlert("Missed! Click on a climbing hold.");
      return;
    }

    // 2. Select appropriate limb based on height relative to torso center
    const engine = climberEngine.current;
    const torsoY = engine.state.y;
    
    let limbKey: "leftHand" | "rightHand" | "leftFoot" | "rightFoot";
    if (worldY < torsoY) {
      const dTorso = Math.sqrt((worldX - engine.state.x) ** 2 + (worldY - engine.state.y) ** 2);
      if (dTorso <= 240) {
        limbKey = engine.state.leftHand.y < engine.state.rightHand.y ? "rightHand" : "leftHand";
      } else {
        const dL = Math.sqrt((worldX - engine.state.leftHand.x) ** 2 + (worldY - engine.state.leftHand.y) ** 2);
        const dR = Math.sqrt((worldX - engine.state.rightHand.x) ** 2 + (worldY - engine.state.rightHand.y) ** 2);
        limbKey = dL < dR ? "leftHand" : "rightHand";
      }
    } else {
      const dTorso = Math.sqrt((worldX - engine.state.x) ** 2 + (worldY - engine.state.y) ** 2);
      if (dTorso <= 220) {
        limbKey = engine.state.leftFoot.y < engine.state.rightFoot.y ? "rightFoot" : "leftFoot";
      } else {
        const dL = Math.sqrt((worldX - engine.state.leftFoot.x) ** 2 + (worldY - engine.state.leftFoot.y) ** 2);
        const dR = Math.sqrt((worldX - engine.state.rightFoot.x) ** 2 + (worldY - engine.state.rightFoot.y) ** 2);
        limbKey = dL < dR ? "leftFoot" : "rightFoot";
      }
    }

    // Record hold metrics
    reachAttempts.current++;
    movementAttempts.current++;

    if (clickedHold.type === "temporary") {
      adaptiveEvents.current++;
    }
    if (clickedHold.type === "side") {
      bodyRepositioningEvents.current++;
    }

    const success = engine.tryReach(clickedHold, limbKey);

    if (success) {
      successfulReaches.current++;
      successfulMovements.current++;
      holdsReached.current++;
      if (clickedHold.type === "temporary") {
        successfulAdaptations.current++;
      }
      if (clickedHold.type === "side") {
        successfulRepositioning.current++;
      }
      
      popupsRef.current.push({
        x: clickX,
        y: clickY,
        text: "GRAB! 🧗",
        color: "#22c55e",
        timer: 40,
      });

      // Look planning check: if they chose a hold that is part of a different route
      if (clickedHold.x < 300) {
        routeChoices.current++;
      }
    } else {
      failedReaches.current++;
      if (clickedHold.type === "temporary") {
        failedAdaptations.current++;
      }
      popupsRef.current.push({
        x: clickX,
        y: clickY,
        text: "TOO FAR! ❌",
        color: "#ef4444",
        timer: 45,
      });
      showAlert("Too far! Grab a closer hold first to raise your body.");
    }
  };

  const minutesStr = Math.floor(timePreview / 60);
  const secondsStr = String(timePreview % 60).padStart(2, "0");

  return (
    <div className="climber-container">
      {/* HUD Bar */}
      <div className="climber-hud">
        <div className="climber-hud-left">
          <span className="climber-hud-title">🧗 CLIMBING CHALLENGE</span>
          <span className="text-white/20">|</span>
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase font-semibold">Scenario</span>
            <span className="text-[12px] font-bold text-white/80">{LEVELS[levelIndex].name}</span>
          </div>
        </div>

        <div className="climber-hud-right">
          {/* Balance Indicator */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] text-white/40 font-semibold uppercase">Balance</span>
            <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${balanceVal}%`,
                  backgroundColor: balanceVal > 70 ? "#22c55e" : balanceVal > 40 ? "#eab308" : "#ef4444"
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-white/70">{balanceVal}%</span>
          </div>

          {/* Shared Timer */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/40 font-semibold uppercase">Time Remaining</span>
            <span className="text-[16px] font-bold text-sky-400 font-mono">
              {practiceOnly ? `${minutesStr}:${secondsStr}` : `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="climber-canvas-box">
        {!started ? (
          <div className="climber-start-screen">
            <div className="climber-start-panel">
              <div className="text-[44px]">🧗</div>
              <h2 className="text-[20px] font-bold text-white mt-2">Climbing Challenge</h2>
              <p className="text-[12px] text-white/60 mt-1 max-w-[320px]">
                Plan your route, grab holds precisely, and maintain your balance as you climb upward!
              </p>
              
              <button className="climber-start-button" onClick={handleStart}>
                Start Climb
              </button>
            </div>
          </div>
        ) : null}

        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={handleCanvasClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="climber-canvas"
        />

        {alertText ? (
          <div className="climber-alert">
            {alertText}
          </div>
        ) : null}

        {/* Floating Instruction Guide */}
        {started ? (
          <div className="climber-controls-guide">
            🖱️ Click holds for hands, or press and drag either shoe onto a foothold.
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ClimbingChallengeGame;
