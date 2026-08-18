"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, ArrowLeft, ArrowRight, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { RuleEngine } from "./RuleEngine";
import { ObjectEngine } from "./ObjectEngine";
import { SpawnEngine } from "./SpawnEngine";
import { DifficultyEngine } from "./DifficultyEngine";
import { scoreRuleShift, TrialEvent } from "./ScoringEngine";
import { ActiveRule, GameObject, RuleShiftScores } from "./Types";
import "./RuleShiftChallengeGame.css";

interface Props {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (metrics: RuleShiftScores) => void | Promise<void>;
}

export default function RuleShiftChallengeGame({
  disabled = false,
  remainingSeconds,
  practiceOnly = false,
  onComplete,
}: Props) {
  // Engine Instances (held in state/ref to survive renders)
  const ruleEngine = useRef(new RuleEngine());
  const objectEngine = useRef(new ObjectEngine());
  const spawnEngine = useRef(new SpawnEngine());
  const difficultyEngine = useRef(new DifficultyEngine());

  // Refs for tracking state inside animation loop
  const finished = useRef(false);
  const start = useRef(0);
  const lastTime = useRef(0);
  const events = useRef<TrialEvent[]>([]);
  const ruleDisplayTimer = useRef<number | null>(null);
  const trialsCount = useRef(0);
  const activeObjectStartTime = useRef(0);
  const hasSelectedSinceActive = useRef(false);
  const completionSent = useRef(false);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const canvasRef = useCallback((el: HTMLCanvasElement | null) => {
    setCanvasElement(el);
  }, []);


  // React state for UI
  const [started, setStarted] = useState(false);
  const [levelName, setLevelName] = useState("");
  const [levelNum, setLevelNum] = useState(1);
  const [ruleDescription, setRuleDescription] = useState("");
  const [showRuleDisplay, setShowRuleDisplay] = useState(true);
  const [isRuleShiftBanner, setIsRuleShiftBanner] = useState(false);
  const [previewSeconds, setPreviewSeconds] = useState(120);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState("");
  const frameCount = useRef(0);
  const particles = useRef<{x: number, y: number, vx: number, vy: number, color: string, alpha: number, size: number}[]>([]);
  const shakeIntensity = useRef(0);

  const triggerVisualEffects = useCallback((active: any, side: "left" | "right" | "miss", isError: boolean) => {
    if (isError) {
      shakeIntensity.current = 15;
    }
    const el = canvasElement;
    if (!el) return;
    const w = el.width;
    const h = el.height;
    const pX = (active.x / 100) * w;
    const pY = (active.y / 100) * h;
    let color = "#96a5ad";
    if (!active.isDistractor) {
      if (active.color === "red") color = "#ef5365";
      else if (active.color === "blue") color = "#3c82f6";
      else if (active.color === "green") color = "#2fbf76";
      else if (active.color === "yellow") color = "#f59e0b";
    }
    const particleColor = isError ? "#ff7675" : color;
    const count = isError ? 12 : 25;
    for (let i = 0; i < count; i++) {
      let vx = (Math.random() - 0.5) * 8;
      let vy = (Math.random() - 0.5) * 8 - 2;
      if (side === "left") {
        vx = -Math.random() * 6 - 4;
      } else if (side === "right") {
        vx = Math.random() * 6 + 4;
      }
      particles.current.push({
        x: pX,
        y: pY,
        vx,
        vy,
        color: particleColor,
        alpha: 1.0,
        size: Math.random() * 4 + 2,
      });
    }
  }, [canvasElement]);

  // Audio Context (Synthesized simple feedback sounds)
  const playBeep = (freq: number, type: OscillatorType, duration: number) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context block
    }
  };

  const playSuccessSound = () => playBeep(587.33, "sine", 0.15); // D5
  const playFailureSound = () => playBeep(220, "triangle", 0.25); // A3
  const playShiftSound = () => {
    playBeep(440, "sine", 0.1);
    setTimeout(() => playBeep(880, "sine", 0.15), 100);
  };

  // Synchronize Authoritative Complete callback
  const completeCallback = useRef(onComplete);
  useEffect(() => {
    completeCallback.current = onComplete;
  }, [onComplete]);

  // Finish gameplay helper
  const finish = useCallback((status: "COMPLETED" | "INCOMPLETE" = "COMPLETED") => {
    if (completionSent.current) return;
    completionSent.current = true;
    finished.current = true;

    const elapsed = Math.max(1, Date.now() - start.current);
    const sessionDuration = Math.round(elapsed / 1000);
    const finalMetrics = scoreRuleShift(
      events.current,
      sessionDuration,
      difficultyEngine.current.getCurrentLevel().level
    );

    // Override completion status if forced
    finalMetrics.completionStatus = status;

    void completeCallback.current(finalMetrics);
  }, []);

  // Sync remainingSeconds from standard autorun player
  useEffect(() => {
    if (started && !practiceOnly && remainingSeconds !== undefined && remainingSeconds <= 0) {
      finish("COMPLETED");
    }
  }, [started, practiceOnly, remainingSeconds, finish]);

  // Count down local timer for practice modes
  useEffect(() => {
    if (!started || !practiceOnly || disabled) return;
    const intervalId = window.setInterval(() => {
      setPreviewSeconds((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [started, practiceOnly, disabled]);

  // Finish practice when timer reaches 0
  useEffect(() => {
    if (started && practiceOnly && previewSeconds <= 0 && !finished.current) {
      finish("COMPLETED");
    }
  }, [started, practiceOnly, previewSeconds, finish]);

  // Handle active object timeouts (Missed targets)
  const handleMiss = useCallback(() => {
    const active = objectEngine.current.getActiveObject();
    if (!active) return;

    if (!active.isDistractor) {
      playFailureSound();
      triggerVisualEffects(active, "miss", true);
      events.current.push({
        timestamp: Date.now(),
        level: difficultyEngine.current.getCurrentLevel().level,
        ruleVersion: ruleEngine.current.activeRule.version,
        ruleMode: ruleEngine.current.activeRule.mode,
        color: active.color,
        shape: active.shape,
        isDistractor: false,
        response: null,
        responseTime: Date.now() - activeObjectStartTime.current,
        correct: false,
        isRuleChangeTrial: active.spawnedAt - start.current < 4000, // approximation helper
      });
      objectEngine.current.missActive();
    } else {
      // Distractor ignored: successful non-response!
      objectEngine.current.missActive();
    }

    hasSelectedSinceActive.current = false;
    trialsCount.current++;
    
    // Progress difficulty index
    const levelChanged = difficultyEngine.current.registerTrial();
    if (levelChanged) {
      triggerLevelChange();
    } else {
      triggerUnpredictableRuleShift();
    }
  }, []);

  // Process sorting decision
  const makeDecision = useCallback((side: "left" | "right") => {
    if (disabled || finished.current || isRuleShiftBanner) return;

    const active = objectEngine.current.getActiveObject();
    if (!active) return;

    const responseTime = Date.now() - activeObjectStartTime.current;
    
    if (active.isDistractor) {
      // Pressed decision for a distractor: error!
      playFailureSound();
      triggerVisualEffects(active, side, true);
      events.current.push({
        timestamp: Date.now(),
        level: difficultyEngine.current.getCurrentLevel().level,
        ruleVersion: ruleEngine.current.activeRule.version,
        ruleMode: ruleEngine.current.activeRule.mode,
        color: active.color,
        shape: active.shape,
        isDistractor: true,
        response: side,
        responseTime,
        correct: false,
        isRuleChangeTrial: false,
      });
      objectEngine.current.sortActive(side);
    } else {
      // Target sorting
      const correctSide = ruleEngine.current.getCorrectSide(active.color, active.shape);
      const isCorrect = side === correctSide;

      if (isCorrect) {
        playSuccessSound();
        triggerVisualEffects(active, side, false);
      } else {
        playFailureSound();
        triggerVisualEffects(active, side, true);
      }

      // Record event
      events.current.push({
        timestamp: Date.now(),
        level: difficultyEngine.current.getCurrentLevel().level,
        ruleVersion: ruleEngine.current.activeRule.version,
        ruleMode: ruleEngine.current.activeRule.mode,
        color: active.color,
        shape: active.shape,
        isDistractor: false,
        response: side,
        responseTime,
        correct: isCorrect,
        isRuleChangeTrial: spawnEngine.current.getTrialsSinceLastShift() <= 2,
        previousRuleMapping: ruleEngine.current.activeRule.mode !== 'combination' ? {
          mode: ruleEngine.current.activeRule.mode,
          colorMapping: ruleEngine.current.activeRule.colorMapping,
          shapeMapping: ruleEngine.current.activeRule.shapeMapping,
        } : undefined,
      });

      objectEngine.current.sortActive(side);
    }

    hasSelectedSinceActive.current = false;
    trialsCount.current++;

    // Progress level or rule state
    const levelChanged = difficultyEngine.current.registerTrial();
    if (levelChanged) {
      triggerLevelChange();
    } else {
      triggerUnpredictableRuleShift();
    }
  }, [disabled, isRuleShiftBanner]);

  // Level setup logic
  const triggerLevelChange = () => {
    const nextConfig = difficultyEngine.current.getCurrentLevel();
    setLevelNum(nextConfig.level);
    setLevelName(nextConfig.name);
    
    // Switch to new level's mode
    const rule = ruleEngine.current.generateNextRule(nextConfig.mode, nextConfig.level);
    setRuleDescription(rule.description);
    
    setIsRuleShiftBanner(true);
    playShiftSound();

    setTimeout(() => {
      setIsRuleShiftBanner(false);
      resetRuleDisplayTimer(nextConfig.ruleDisplayDuration);
    }, 1800);
  };

  // Rule shift checker
  const triggerUnpredictableRuleShift = () => {
    const config = difficultyEngine.current.getCurrentLevel();
    if (!config.hasShifts) return;

    // Check if spawn trials exceeds rule limit (randomized 8 to 12 trials)
    const threshold = config.trialsPerRule + Math.floor(Math.random() * 3) - 1;
    if (spawnEngine.current.getTrialsSinceLastShift() >= threshold) {
      spawnEngine.current.resetShiftTrials();
      
      // Toggle mapping mode or reverse
      let nextMode = config.mode;
      if (config.level === 2) {
        nextMode = ruleEngine.current.activeRule.mode === 'color' ? 'shape' : 'color';
      }


      const rule = ruleEngine.current.generateNextRule(nextMode, config.level);
      setRuleDescription(rule.description);
      
      setIsRuleShiftBanner(true);
      playShiftSound();

      setTimeout(() => {
        setIsRuleShiftBanner(false);
        resetRuleDisplayTimer(config.ruleDisplayDuration);
      }, 1600);
    }
  };

  const resetRuleDisplayTimer = (duration: number) => {
    if (ruleDisplayTimer.current) {
      clearTimeout(ruleDisplayTimer.current);
    }
    setShowRuleDisplay(true);
    if (duration > 0) {
      ruleDisplayTimer.current = window.setTimeout(() => {
        setShowRuleDisplay(false);
      }, duration);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        makeDecision("left");
      } else if (e.key === "ArrowRight") {
        makeDecision("right");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [makeDecision]);

  // Main canvas animation loop
  const drawShape = (ctx: CanvasRenderingContext2D, shape: string, color1: string, color2: string, x: number, y: number, size: number) => {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    const grad = ctx.createRadialGradient(x - size * 0.15, y - size * 0.15, size * 0.05, x, y, size * 0.5);
    grad.addColorStop(0, color2);
    grad.addColorStop(1, color1);
    ctx.fillStyle = grad;
    ctx.beginPath();

    if (shape === "circle") {
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    } else if (shape === "triangle") {
      const r = 5; // corner radius
      const p1 = { x, y: y - size / 2 };
      const p2 = { x: x + size / 2, y: y + size / 2 };
      const p3 = { x: x - size / 2, y: y + size / 2 };
      ctx.moveTo(p1.x, p1.y);
      ctx.arcTo(p2.x, p2.y, p3.x, p3.y, r);
      ctx.arcTo(p3.x, p3.y, p1.x, p1.y, r);
      ctx.arcTo(p1.x, p1.y, p2.x, p2.y, r);
    } else if (shape === "square") {
      const radius = 8;
      ctx.roundRect(x - size / 2, y - size / 2, size, size, radius);
    } else if (shape === "star") {
      const spikes = 5;
      const outerRadius = size / 2;
      const innerRadius = size / 4;
      let rot = (Math.PI / 2) * 3;
      let cx = x;
      let cy = y;
      let step = Math.PI / spikes;

      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        cx = x + Math.cos(rot) * outerRadius;
        cy = y + Math.sin(rot) * outerRadius;
        ctx.lineTo(cx, cy);
        rot += step;

        cx = x + Math.cos(rot) * innerRadius;
        cy = y + Math.sin(rot) * innerRadius;
        ctx.lineTo(cx, cy);
        rot += step;
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.arc(x - size * 0.12, y - size * 0.12, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Sync banner state to ref to avoid stale closures in the loop
  const isRuleShiftBannerRef = useRef(false);
  useEffect(() => {
    isRuleShiftBannerRef.current = isRuleShiftBanner;
  }, [isRuleShiftBanner]);

  // Main canvas animation loop & ResizeObserver hook
  useEffect(() => {
    if (!started || !canvasElement || finished.current) return;

    const el = canvasElement;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    let localLastTime = 0;

    const resize = () => {
      const parent = el.parentElement;
      if (parent) {
        const b = parent.getBoundingClientRect();
        const s = Math.min(window.devicePixelRatio || 1, 2);
        el.width = Math.max(1, Math.round(b.width * s));
        el.height = Math.max(1, Math.round(b.height * s));
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const loop = (timestamp: number) => {
      if (finished.current) return;
      try {
        if (localLastTime === 0) localLastTime = timestamp;
        const dt = timestamp - localLastTime;
        localLastTime = timestamp;

        const w = el.width;
        const h = el.height;
        const s = el.width / el.clientWidth;
        
        ctx.save();
        if (shakeIntensity.current > 0.1) {
          const dx = (Math.random() - 0.5) * shakeIntensity.current;
          const dy = (Math.random() - 0.5) * shakeIntensity.current;
          ctx.translate(dx, dy);
          shakeIntensity.current *= 0.88;
        }

        // Draw deep premium space background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, "#081026");
        bgGrad.addColorStop(1, "#030712");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Tech grid lines
        ctx.strokeStyle = "rgba(0, 245, 212, 0.04)";
        ctx.lineWidth = 1;
        const grid = 50;
        for (let gx = 0; gx < w; gx += grid) {
          ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
        }
        for (let gy = 0; gy < h; gy += grid) {
          ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
        }

        frameCount.current++;
        if (frameCount.current % 10 === 0) {
          setDebugInfo(`Canvas: ${w}x${h} | Frame: ${frameCount.current} | Objects: ${objectEngine.current.objects.length} | Active: ${objectEngine.current.getActiveObject() ? "Yes" : "No"}`);
        }

        // 1. Draw conveyor belt track (metallic neon)
        const beltX = w * 0.44;
        const beltW = w * 0.12;
        ctx.fillStyle = "#111827";
        ctx.fillRect(beltX, 0, beltW, h * 0.68);

        // Neon side rails
        const railGrad = ctx.createLinearGradient(beltX, 0, beltX + beltW, 0);
        railGrad.addColorStop(0, "#007f70");
        railGrad.addColorStop(0.5, "#0d9488");
        railGrad.addColorStop(1, "#007f70");
        ctx.strokeStyle = railGrad;
        ctx.lineWidth = 4 * s;
        ctx.strokeRect(beltX, -10, beltW, h * 0.68 + 10);

        // Animated scrolling rollers
        ctx.fillStyle = "#374151";
        const rollerSpacing = 35 * s;
        const scrollOffset = (Date.now() / 25) % rollerSpacing;
        for (let rY = -rollerSpacing; rY < h * 0.68; rY += rollerSpacing) {
          const currentY = rY + scrollOffset;
          if (currentY > 0 && currentY < h * 0.68) {
            ctx.fillRect(beltX + 4 * s, currentY, beltW - 8 * s, 4 * s);
          }
        }

        // Draw left & right drop buckets/zones
        const leftZoneX = w * 0.15;
        const rightZoneX = w * 0.85;
        const zoneY = h * 0.72;
        const zoneRadius = Math.min(w, h) * 0.1;

        // Left Zone
        ctx.save();
        ctx.shadowColor = "rgba(239, 83, 101, 0.4)";
        ctx.shadowBlur = 15 * s;
        ctx.strokeStyle = "rgba(239, 83, 101, 0.5)";
        ctx.lineWidth = 3.5 * s;
        ctx.setLineDash([6 * s, 4 * s]);
        ctx.beginPath(); ctx.arc(leftZoneX, zoneY, zoneRadius, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(239, 83, 101, 0.08)"; ctx.fill();
        ctx.restore();

        // Right Zone
        ctx.save();
        ctx.shadowColor = "rgba(59, 130, 246, 0.4)";
        ctx.shadowBlur = 15 * s;
        ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
        ctx.lineWidth = 3.5 * s;
        ctx.setLineDash([6 * s, 4 * s]);
        ctx.beginPath(); ctx.arc(rightZoneX, zoneY, zoneRadius, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(59, 130, 246, 0.08)"; ctx.fill();
        ctx.restore();

        // Target zone titles - Made bright and highly visible
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = `bold ${Math.round(13 * s)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText("LEFT CONTAINER", leftZoneX, zoneY + zoneRadius + 24 * s);
        ctx.fillText("RIGHT CONTAINER", rightZoneX, zoneY + zoneRadius + 24 * s);

        // 2. Draw Decision Point Box (active slot)
        const boxX = w * 0.41;
        const boxY = h * 0.58;
        const boxW = w * 0.18;
        const boxH = h * 0.14;
        const pulse = Math.sin(Date.now() / 150) * 0.15 + 0.85;
        
        ctx.strokeStyle = isRuleShiftBannerRef.current ? `rgba(239, 83, 101, ${pulse})` : `rgba(0, 245, 212, ${pulse})`;
        ctx.lineWidth = 3.5 * s;
        ctx.setLineDash([8 * s, 4 * s]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.setLineDash([]);

        // corner brackets
        ctx.strokeStyle = isRuleShiftBannerRef.current ? "#ef5365" : "#00f5d4";
        ctx.lineWidth = 5 * s;
        const bracket = 15 * s;
        ctx.beginPath(); ctx.moveTo(boxX + bracket, boxY); ctx.lineTo(boxX, boxY); ctx.lineTo(boxX, boxY + bracket); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(boxX + boxW - bracket, boxY); ctx.lineTo(boxX + boxW, boxY); ctx.lineTo(boxX + boxW, boxY + bracket); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(boxX + bracket, boxY + boxH); ctx.lineTo(boxX, boxY + boxH); ctx.lineTo(boxX, boxY + boxH - bracket); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(boxX + boxW - bracket, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH - bracket); ctx.stroke();

        ctx.fillStyle = isRuleShiftBannerRef.current ? "rgba(239, 83, 101, 0.05)" : "rgba(0, 245, 212, 0.05)";
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Sweeping Laser Beam
        const laserY = boxY + (Math.sin(Date.now() / 200) * 0.5 + 0.5) * boxH;
        const laserGrad = ctx.createLinearGradient(boxX, 0, boxX + boxW, 0);
        laserGrad.addColorStop(0, "rgba(0, 245, 212, 0)");
        laserGrad.addColorStop(0.5, isRuleShiftBannerRef.current ? "rgba(239, 83, 101, 0.8)" : "rgba(0, 239, 83, 0.8)");
        laserGrad.addColorStop(1, "rgba(0, 245, 212, 0)");
        ctx.strokeStyle = laserGrad;
        ctx.lineWidth = 3 * s;
        ctx.beginPath(); ctx.moveTo(boxX, laserY); ctx.lineTo(boxX + boxW, laserY); ctx.stroke();

        ctx.fillStyle = isRuleShiftBannerRef.current ? "#ef5365" : "#00f5d4";
        ctx.font = `bold ${Math.round(13 * s)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(isRuleShiftBannerRef.current ? "CALIBRATING..." : "SCAN ZONE", w * 0.5, boxY - 11 * s);

        // 3. Spawning engine integration
        const config = difficultyEngine.current.getCurrentLevel();
        if (!isRuleShiftBannerRef.current) {
          const pendingCount = objectEngine.current.objects.filter(
            (o) => o.status === "moving" || o.status === "active"
          ).length;
          
          if (spawnEngine.current.shouldSpawn(Date.now(), config.spawnInterval, pendingCount)) {
            const next = spawnEngine.current.generateNext(config, ruleEngine.current.activeRule);
            objectEngine.current.spawnObject(next.color, next.shape, next.isDistractor, config.speed);
          }
        }

        // 4. Update coordinates
        objectEngine.current.update(dt);

        // Track active object timing
        const activeObj = objectEngine.current.getActiveObject();
        if (activeObj) {
          if (!hasSelectedSinceActive.current) {
            hasSelectedSinceActive.current = true;
            activeObjectStartTime.current = Date.now();
          }

          // Handle decision timeout
          const age = Date.now() - activeObjectStartTime.current;
          const timeoutLimit = activeObj.isDistractor ? 1500 : 3000;
          if (age >= timeoutLimit) {
            handleMiss();
          }
        }

        // 5. Draw Game Objects
        objectEngine.current.objects.forEach((obj) => {
          const oX = (obj.x / 100) * w;
          const oY = (obj.y / 100) * h;
          const size = Math.min(w, h) * 0.15;

          ctx.save();
          ctx.globalAlpha = obj.opacity ?? 1.0;

          // Curated neon palettes
          let c1 = "#485563"; // distractor base
          let c2 = "#dfe6e9"; // distractor highlight
          if (!obj.isDistractor) {
            if (obj.color === "red") { c1 = "#d9383a"; c2 = "#ff7675"; }
            else if (obj.color === "blue") { c1 = "#0984e3"; c2 = "#74b9ff"; }
            else if (obj.color === "green") { c1 = "#00b894"; c2 = "#55efc4"; }
            else if (obj.color === "yellow") { c1 = "#fdcb6e"; c2 = "#ffeaa7"; }
          }

          // Draw glossy 3D shape
          drawShape(ctx, obj.shape, c1, c2, oX, oY, size);
          ctx.restore();
        });

        // Update & Draw Particles
        particles.current = particles.current.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.15; // gravity
          p.alpha -= 0.025;
          if (p.alpha <= 0) return false;
          
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          return true;
        });

        ctx.restore(); // Restore shake
        frameId = requestAnimationFrame(loop);
      } catch (err: any) {
        console.error("Game loop error:", err);
        setError(err?.message || String(err));
      }
    };

    frameId = requestAnimationFrame(loop);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [started, canvasElement, handleMiss]);

  // Start gameplay
  const startChallenge = () => {
    setStarted(true);
    start.current = Date.now();
    lastTime.current = 0;
    difficultyEngine.current.reset();
    spawnEngine.current.reset();
    
    // Initialize first level
    const firstConfig = difficultyEngine.current.getCurrentLevel();
    setLevelNum(firstConfig.level);
    setLevelName(firstConfig.name);
    const rule = ruleEngine.current.generateNextRule(firstConfig.mode, firstConfig.level);
    setRuleDescription(rule.description);

    resetRuleDisplayTimer(firstConfig.ruleDisplayDuration);
  };


  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (ruleDisplayTimer.current) clearTimeout(ruleDisplayTimer.current);
    };
  }, []);

  const renderVisualRuleGuides = (rule: any, isOverlay = false) => {
    if (!rule) return null;
    
    const config = difficultyEngine.current.getCurrentLevel();
    const allowedColors = config.allowedColors || [];
    const allowedShapes = config.allowedShapes || [];
    
    const cardClass = isOverlay
      ? "bg-white/10 border border-white/20 px-6 py-3.5 rounded-2xl text-sm md:text-base font-black text-white flex items-center gap-2 shadow-lg tracking-wide shrink-0 keep-white"
      : "bg-white/15 px-3 py-1.5 rounded-lg text-xs md:text-sm font-black text-white flex items-center gap-2 shadow-sm shrink-0 keep-white";

    const containerClass = isOverlay
      ? "flex flex-wrap gap-4 justify-center mt-6"
      : "flex gap-2.5 text-white";

    if (rule.colorMapping) {
      const leftColors = Object.keys(rule.colorMapping).filter(c => rule.colorMapping[c] === "left" && allowedColors.includes(c as any));
      const rightColors = Object.keys(rule.colorMapping).filter(c => rule.colorMapping[c] === "right" && allowedColors.includes(c as any));
      
      const colorEmojis: Record<string, string> = {
        red: "🔴",
        blue: "🔵",
        green: "🟢",
        yellow: "🟡",
      };

      const formatColorList = (colors: string[]) => {
        return colors.map(c => `${colorEmojis[c] || "•"} ${c.toUpperCase()}`).join(" / ");
      };

      return (
        <div className={containerClass}>
          {leftColors.length > 0 && (
            <span className={cardClass}>
              {formatColorList(leftColors)} ➔ LEFT
            </span>
          )}
          {rightColors.length > 0 && (
            <span className={cardClass}>
              {formatColorList(rightColors)} ➔ RIGHT
            </span>
          )}
        </div>
      );
    }

    if (rule.shapeMapping) {
      const leftShapes = Object.keys(rule.shapeMapping).filter(s => rule.shapeMapping[s] === "left" && allowedShapes.includes(s as any));
      const rightShapes = Object.keys(rule.shapeMapping).filter(s => rule.shapeMapping[s] === "right" && allowedShapes.includes(s as any));

      const shapeEmojis: Record<string, string> = {
        circle: "●",
        triangle: "▲",
        square: "■",
        star: "★",
      };

      const formatShapeList = (shapes: string[]) => {
        return shapes.map(s => `${shapeEmojis[s] || "•"} ${s.toUpperCase()}`).join(" / ");
      };

      return (
        <div className={containerClass}>
          {leftShapes.length > 0 && (
            <span className={cardClass}>
              {formatShapeList(leftShapes)} ➔ LEFT
            </span>
          )}
          {rightShapes.length > 0 && (
            <span className={cardClass}>
              {formatShapeList(rightShapes)} ➔ RIGHT
            </span>
          )}
        </div>
      );
    }

    return null;
  };


  return (
    <div className="rsc-container border border-[#e0ece9] rounded-2xl bg-white shadow-sm flex flex-col items-stretch overflow-hidden select-none">
      {/* Upper Status Panel */}
      <header className="rsc-header bg-[#fafdfc] border-b border-[#edf2f1] px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-black uppercase text-[#007f70] tracking-widest">
            Rule Shift Challenge
          </span>
          <h2 className="text-sm md:text-base font-black text-[#071633] mt-0.5">
            Level {levelNum}: {levelName}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Sounds Toggle */}
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className="p-2 text-[#96a5ad] hover:text-[#007f70] transition"
            title="Toggle sound effects"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Time Counter */}
          <div className="rounded-xl border border-[#edf2f1] bg-white px-3 py-2 text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#96a5ad]">
              Time Remaining
            </p>
            <p className="mt-0.5 text-sm md:text-base font-black text-[#173044]">
              {practiceOnly 
                ? `${Math.floor(previewSeconds / 60)}:${String(previewSeconds % 60).padStart(2, "0")}`
                : remainingSeconds !== undefined
                  ? `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`
                  : "2:00"
              }
            </p>
          </div>
        </div>
      </header>

      {/* Main Interactive Screen */}
      <div className="rsc-gameplay-area flex-1 relative flex flex-col items-stretch bg-[#f4f7f6]">
        {!started ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center bg-[#f4f7f6]/95 p-8">
            <div className="max-w-2xl bg-white rounded-3xl border border-[#e8eff0] p-8 shadow-xl flex flex-col items-center">
              <RefreshCw className="h-10 w-10 text-[#007f70] animate-spin-slow mb-3" />
              <h1 className="text-xl font-black text-[#071633] tracking-wide">
                Rule Shift Challenge
              </h1>
              <p className="mt-1 text-xs text-[#526474] max-w-lg text-center">
                A real-time cognitive flexibility assessment testing sorting adaptation and inhibitory control.
              </p>

              {/* Visual 3-Step Instruction Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 w-full text-left">
                <div className="bg-[#f4fcf9] border border-[#d2efe5] rounded-2xl p-4 flex flex-col justify-start">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#007f70] text-[10px] font-black text-white">1</span>
                    <h3 className="text-xs font-black text-[#007f70] uppercase tracking-wider">Sort Targets</h3>
                  </div>
                  <p className="text-[11px] leading-5 text-[#4a5e6a]">
                    Wait for shapes to enter the pulsing <strong className="text-[#007f70]">SCAN ZONE</strong>, then sort them left/right using buttons or <strong className="text-[#007f70]">`←` / `→` keys</strong>.
                  </p>
                </div>

                <div className="bg-[#f5f9fc] border border-[#dce8f0] rounded-2xl p-4 flex flex-col justify-start">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#2f7bbd] text-[10px] font-black text-white">2</span>
                    <h3 className="text-xs font-black text-[#2f7bbd] uppercase tracking-wider">Adapt & Memory</h3>
                  </div>
                  <p className="text-[11px] leading-5 text-[#4a5e6a]">
                    Watch for <strong className="text-[#2f7bbd]">"Rule Shift!"</strong> overlays to change rules. Remember the rules—the banner will <strong className="text-[#2f7bbd]">fade out</strong> after a few seconds!
                  </p>
                </div>

                <div className="bg-[#fff9f6] border border-[#fce4da] rounded-2xl p-4 flex flex-col justify-start">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e05638] text-[10px] font-black text-white">3</span>
                    <h3 className="text-xs font-black text-[#e05638] uppercase tracking-wider">Inhibit</h3>
                  </div>
                  <p className="text-[11px] leading-5 text-[#4a5e6a]">
                    Do <strong className="text-[#e05638]">NOT</strong> press any buttons for <strong className="text-[#e05638]">Gray Distractor</strong> shapes (like gray stars). Let them pass through freely!
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-4 border-t border-[#edf2f1] pt-5 w-full">
                <div className="text-left px-4 py-2 bg-[#f7faf9] rounded-xl border border-[#edf2f1] min-w-32 flex-1 max-w-44">
                  <p className="text-[8px] font-black uppercase tracking-wider text-[#96a5ad]">Primary Skill</p>
                  <p className="text-xs font-black text-[#173044] mt-0.5">Cognitive Flexibility</p>
                </div>
                <div className="text-left px-4 py-2 bg-[#f7faf9] rounded-xl border border-[#edf2f1] min-w-32 flex-1 max-w-44">
                  <p className="text-[8px] font-black uppercase tracking-wider text-[#96a5ad]">Duration</p>
                  <p className="text-xs font-black text-[#173044] mt-0.5">2 Minutes</p>
                </div>
                <div className="text-left px-4 py-2 bg-[#f7faf9] rounded-xl border border-[#edf2f1] min-w-32 flex-1 max-w-44">
                  <p className="text-[8px] font-black uppercase tracking-wider text-[#96a5ad]">Target Age</p>
                  <p className="text-xs font-black text-[#173044] mt-0.5">9–11 Years</p>
                </div>
              </div>

              <button
                onClick={startChallenge}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#007f70] px-8 py-3.5 text-xs font-black text-white hover:bg-[#00665a] transition active:scale-95 shadow-md"
              >
                <Play className="h-4 w-4 fill-white" />
                Start Assessment
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Active Rule Indicator */}
            <div className="rsc-rule-banner bg-[#071633] text-white py-3.5 px-6 flex items-center justify-between z-10 shadow-sm transition keep-white">
              <div>
                <span className="text-[10px] font-bold uppercase text-cyan-300 tracking-widest">
                  Active Rule
                </span>
                <p className="text-sm md:text-base font-black mt-0.5 text-white keep-white">
                  {showRuleDisplay ? ruleDescription : "Rule hidden! Use working memory."}
                </p>
              </div>

              <div className="flex gap-3">
                {showRuleDisplay && renderVisualRuleGuides(ruleEngine.current.activeRule, false)}
              </div>
            </div>

            {/* Rule Shift Banner Overlay */}
            {isRuleShiftBanner && (
              <div className="absolute inset-0 bg-[#071633]/95 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center text-white px-6 keep-white">
                <RefreshCw className="h-12 w-12 text-[#00f5d4] animate-spin mb-4" />
                <h2 className="text-xl font-black tracking-widest uppercase text-[#00f5d4] animate-pulse keep-white">
                  Rule Shift!
                </h2>
                <p className="mt-3 text-sm font-extrabold text-white/90 max-w-md bg-white/5 px-6 py-3 rounded-2xl border border-white/10 keep-white">
                  {ruleDescription}
                </p>
                
                {/* Large visual guides for rule shifting */}
                {renderVisualRuleGuides(ruleEngine.current.activeRule, true)}

                <p className="mt-6 text-[10px] text-white/60 tracking-widest uppercase font-black keep-white">
                  Remember this mapping!
                </p>
              </div>
            )}

            {/* Graphics Canvas */}
            <div className="flex-1 relative bg-[#edf7f5]">
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full block" />
              {error && (
                <div className="absolute inset-0 bg-red-900/90 text-white p-6 z-50 overflow-auto flex flex-col justify-center">
                  <h3 className="font-black text-md">Game Crash Error</h3>
                  <pre className="text-[10px] mt-2 bg-black/40 p-4 rounded whitespace-pre-wrap">{error}</pre>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="bg-[#fafdfc] border-t border-[#edf2f1] p-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => makeDecision("left")}
                className="flex items-center justify-center gap-2 border border-[#dceae6] bg-white rounded-2xl py-4 hover:bg-emerald-50 active:scale-95 transition"
              >
                <ArrowLeft className="h-5 w-5 text-[#007f70]" />
                <span className="text-xs md:text-sm font-black text-[#007f70] uppercase tracking-widest">
                  LEFT (← Key)
                </span>
              </button>

              <button
                onClick={() => makeDecision("right")}
                className="flex items-center justify-center gap-2 border border-[#dceae6] bg-white rounded-2xl py-4 hover:bg-emerald-50 active:scale-95 transition"
              >
                <span className="text-xs md:text-sm font-black text-[#007f70] uppercase tracking-widest">
                  RIGHT (→ Key)
                </span>
                <ArrowRight className="h-5 w-5 text-[#007f70]" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
