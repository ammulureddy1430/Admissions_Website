"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAICars,
  createCar,
  difficultyFor,
  generateObstacles,
  getTrackPositionInfo,
  handleObstacleCollisions,
  stepAICars,
  stepCarPhysics,
  stepCones,
  TRACK_WAYPOINTS,
  type AICarState,
  type CarState,
  type Obstacle,
  type SmokeParticle,
  type SkidMark,
  type SurfaceType,
} from "./Engines";
import { scoreDriftRacer, type DriftMetrics } from "./ScoringEngine";
import "./DriftRacerGame.css";

type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  sound?: boolean;
  attemptSeed?: number;
  onComplete?: (m: DriftMetrics) => void;
};

const VIEW_W = 1000;
const VIEW_H = 600;

export default function DriftRacerGame({
  disabled = false,
  remainingSeconds = 180,
  practiceOnly = false,
  sound = true,
  attemptSeed = 0,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const doneRef = useRef<boolean>(false);
  const endingRef = useRef<boolean>(false);
  const lastHudUpdateRef = useRef<number>(0);
  const remainingSecondsRef = useRef(remainingSeconds);
  const localTimeRef = useRef(remainingSeconds);
  const wasOnTrackRef = useRef(true);

  // Vehicle states
  const carState = useRef<CarState>(createCar(300, 300));
  const aiCars = useRef<AICarState[]>(createAICars());
  const obstacles = useRef<Obstacle[]>(generateObstacles(attemptSeed));

  // Visual effects
  const particles = useRef<SmokeParticle[]>([]);
  const skidMarks = useRef<SkidMark[]>([]);
  const lastLeftTire = useRef<{ x: number; y: number } | null>(null);
  const lastRightTire = useRef<{ x: number; y: number } | null>(null);

  // Input states
  const keys = useRef<Set<string>>(new Set());
  const touchInput = useRef<{
    steer: number;
    throttle: number;
    brake: number;
    handbrake: number;
  }>({ steer: 0, throttle: 0, brake: 0, handbrake: 0 });
  const pressedControls = useRef<Set<string>>(new Set());

  // Telemetry metric tracking
  const metrics = useRef({
    driftCount: 0,
    driftDuration: 0,
    maxDriftAngle: 0,
    driftSumAngle: 0,
    driftOvercorrection: 0,
    driftRecoveries: 0,
    successfulDrifts: 0,
    failedDrifts: 0,
    steeringChanges: 0,
    steeringCorrections: 0,
    lastSteerSign: 0,
    oversteers: 0,
    understeers: 0,
    boundaryHits: 0,
    obstacleCollisions: 0,
    spins: 0,
    recoveries: 0,
    surfaceChanges: 0,
    lastSurface: "ASPHALT" as SurfaceType,
    surfaceAdaptationTime: 0,
    surfaceChangeElapsed: 0,
    offTrackTime: 0,
    brakingEventsCount: 0,
    accelerationEventsCount: 0,
    lapsCompletedCount: 0,
    maxSpeedValue: 0,
    speedSum: 0,
    speedSamples: 0,
    cornerTime: 0,
    lastAngle: 0,
  });

  const [started, setStarted] = useState(false);
  const [hud, setHud] = useState({
    speed: 0,
    lap: 1,
    time: remainingSeconds,
    distance: 0,
    surface: "ASPHALT" as SurfaceType,
    driftState: "DRY_GRIP" as CarState["driftState"],
  });
  const [localTime, setLocalTime] = useState(remainingSeconds);
  const [showHelp, setShowHelp] = useState(false);
  const [activeControls, setActiveControls] = useState<Set<string>>(new Set());

  useEffect(() => {
    remainingSecondsRef.current = remainingSeconds;
  }, [remainingSeconds]);

  useEffect(() => {
    localTimeRef.current = localTime;
  }, [localTime]);

  // Audio mock references
  const audioContext = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioContext.current && typeof window !== "undefined") {
      const AudioContextConstructor = window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext.current = new AudioContextConstructor();
    }
  };

  const playScreech = () => {
    if (!sound || !audioContext.current) return;
    try {
      const osc = audioContext.current.createOscillator();
      const gain = audioContext.current.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, audioContext.current.currentTime);
      gain.gain.setValueAtTime(0.04, audioContext.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioContext.current.destination);
      osc.start();
      osc.stop(audioContext.current.currentTime + 0.15);
    } catch {}
  };

  const playThud = () => {
    if (!sound || !audioContext.current) return;
    try {
      const osc = audioContext.current.createOscillator();
      const gain = audioContext.current.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(80, audioContext.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, audioContext.current.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, audioContext.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioContext.current.destination);
      osc.start();
      osc.stop(audioContext.current.currentTime + 0.2);
    } catch {}
  };

  // Complete and Submit Assessment Results
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(loopRef.current);

    const elapsed = Math.max(1, (performance.now() - startTimeRef.current) / 1000);
    const m = metrics.current;
    
    const avgSpeed = m.speedSamples > 0 ? m.speedSum / m.speedSamples : 0;
    const avgDriftAngle = m.driftCount > 0 ? m.driftSumAngle / Math.max(1, m.driftDuration * 60) : 0;

    // Compile DriftMetrics payload
    const payload: DriftMetrics = {
      sessionDuration: Math.round(elapsed),
      distanceTravelled: Math.round(elapsed * avgSpeed * 0.15),
      lapsCompleted: m.lapsCompletedCount,
      averageSpeed: Math.round(avgSpeed),
      maximumSpeed: Math.round(m.maxSpeedValue),
      brakingEvents: m.brakingEventsCount,
      accelerationEvents: m.accelerationEventsCount,
      cornerCount: Math.round(elapsed * 0.08), // Proxy count based on duration
      corneringTime: Math.round(m.cornerTime),
      trackBoundaryHits: m.boundaryHits,
      obstacleCollisions: m.obstacleCollisions,
      spinCount: m.spins,
      recoveryCount: m.recoveries,
      
      // Drifting Metrics
      driftCount: m.driftCount,
      driftDuration: Math.round(m.driftDuration),
      averageDriftAngle: Math.round(avgDriftAngle * (180 / Math.PI)), // degrees
      maximumDriftAngle: Math.round(m.maxDriftAngle * (180 / Math.PI)),
      driftRecoveryCount: m.driftRecoveries,
      driftOvercorrectionCount: m.driftOvercorrection,
      counterSteeringEvents: m.steeringCorrections,
      successfulCornerDrifts: m.successfulDrifts,
      failedCornerDrifts: m.failedDrifts,
      
      // Steering Metrics
      steeringChanges: m.steeringChanges,
      steeringMagnitude: Math.round(m.steeringChanges > 0 ? 55 : 0),
      oversteerEvents: m.oversteers,
      understeerEvents: m.understeers,
      steeringCorrections: m.steeringCorrections,
      averageCorrectionTime: 1, // Standardized baseline
      correctionMagnitude: Math.round(m.steeringChanges > 0 ? 40 : 0),
      steeringConsistency: Math.max(20, Math.round(100 - m.steeringChanges * 0.3)),

      // Surface Adaptations
      surfaceChanges: m.surfaceChanges,
      adaptationTime: Math.round(m.surfaceAdaptationTime / Math.max(1, m.surfaceChanges)),
      preChangeControl: 85,
      postChangeControl: Math.max(30, 85 - m.spins * 10),
      surfaceRecoveryTime: Math.round(m.surfaceAdaptationTime),
      offTrackDuration: Math.round(m.offTrackTime),

      // Performance Sections
      beginningPerformance: Math.max(40, Math.round(85 - m.boundaryHits * 3)),
      middlePerformance: Math.max(40, Math.round(85 - m.boundaryHits * 2.5 - m.obstacleCollisions * 4)),
      endingPerformance: Math.max(40, Math.round(85 - m.boundaryHits * 2)),
      highestDifficulty: difficultyFor(elapsed),
      
      movementConsistency: Math.max(35, Math.round(90 - m.steeringChanges * 0.2)),
      controlConsistency: Math.max(40, Math.round(92 - m.driftOvercorrection * 5)),
      adaptationConsistency: Math.max(35, Math.round(88 - m.spins * 6)),
      errorRecovery: m.boundaryHits + m.spins > 0 ? Math.round((m.recoveries / (m.boundaryHits + m.spins)) * 100) : 100,
      completionStatus: "COMPLETED",
    };

    onComplete?.(scoreDriftRacer(payload));
  }, [onComplete]);

  // Set shared timer triggers
  useEffect(() => {
    if (started && !practiceOnly && remainingSeconds <= 0) {
      endingRef.current = true;
    }
  }, [started, practiceOnly, remainingSeconds]);

  // Set standalone practice timer
  useEffect(() => {
    if (!started || !practiceOnly || disabled || showHelp) return;
    const id = setInterval(() => {
      setLocalTime((t) => {
        if (t <= 1) {
          endingRef.current = true;
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, practiceOnly, disabled, showHelp]);

  // Keyboard Handlers
  useEffect(() => {
    if (disabled || doneRef.current) return;

    const onKeyDown = (e: KeyboardEvent) => {
      initAudio();
      const code = e.code;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS", "KeyA", "KeyD", "Space"].includes(
          code,
        )
      ) {
        e.preventDefault();
        keys.current.add(code);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (keys.current.has(code)) {
        keys.current.delete(code);
      }
    };
    const onBlur = () => keys.current.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [disabled]);

  // Particle Generators
  const spawnDriftSmoke = (x: number, y: number, carAngle: number) => {
    const angle = carAngle + Math.PI + (Math.random() - 0.5) * 0.5;
    const speed = 25 + Math.random() * 45;
    particles.current.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + Math.random() * 8,
      life: 0,
      maxLife: 0.35 + Math.random() * 0.25,
      alpha: 0.65,
    });
  };

  const startGame = () => {
    initAudio();
    setStarted(true);
    startTimeRef.current = performance.now();
    lastTimeRef.current = performance.now();
    setShowHelp(true);
  };

  const setControl = (
    name: string,
    pressed: boolean,
  ) => {
    initAudio();
    if (pressed) pressedControls.current.add(name);
    else pressedControls.current.delete(name);
    touchInput.current.steer = pressedControls.current.has("left")
      ? -1
      : pressedControls.current.has("right")
        ? 1
        : 0;
    touchInput.current.throttle = pressedControls.current.has("gas") ? 1 : 0;
    touchInput.current.brake = pressedControls.current.has("brake") ? 1 : 0;
    touchInput.current.handbrake = pressedControls.current.has("drift") ? 1 : 0;
    setActiveControls((current) => {
      const next = new Set(current);
      if (pressed) next.add(name);
      else next.delete(name);
      return next;
    });
  };

  const resetToTrack = () => {
    const car = carState.current;
    const info = getTrackPositionInfo(car.x, car.y);
    const waypoint = TRACK_WAYPOINTS[(info.closestSegmentIndex + 1) % TRACK_WAYPOINTS.length];
    const previous = TRACK_WAYPOINTS[info.closestSegmentIndex];
    car.x = info.closestPoint.x;
    car.y = info.closestPoint.y;
    car.vx = 0;
    car.vy = 0;
    car.speed = 0;
    car.angle = Math.atan2(waypoint.y - previous.y, waypoint.x - previous.x);
    car.angularVelocity = 0;
    car.driftState = "DRY_GRIP";
    car.spinTimer = 0;
    touchInput.current = { steer: 0, throttle: 0, brake: 0, handbrake: 0 };
    pressedControls.current.clear();
    keys.current.clear();
    setActiveControls(new Set());
  };

  const closeHelp = () => {
    const now = performance.now();
    if (startTimeRef.current === 0 || hud.speed < 1) startTimeRef.current = now;
    lastTimeRef.current = now;
    setShowHelp(false);
  };

  // Main real-time physics loop
  useEffect(() => {
    if (!started || disabled || showHelp) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tick = (now: number) => {
      let dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Bound dt to prevent huge leaps on tab switches
      if (dt > 0.1) dt = 0.1;

      const timeElapsed = (now - startTimeRef.current) / 1000;

      if (endingRef.current) {
        finish();
        return;
      }

      // 1. Gather Keyboard and Touch Inputs
      let throttle = 0;
      let brake = 0;
      let steer = 0;
      let handbrake = 0;

      if (keys.current.has("ArrowUp") || keys.current.has("KeyW")) throttle = 1.0;
      if (keys.current.has("ArrowDown") || keys.current.has("KeyS")) brake = 1.0;
      if (keys.current.has("ArrowLeft") || keys.current.has("KeyA")) steer = -1.0;
      if (keys.current.has("ArrowRight") || keys.current.has("KeyD")) steer = 1.0;
      if (keys.current.has("Space")) handbrake = 1.0;

      // Overlay touch inputs if active
      if (touchInput.current.throttle > 0) throttle = touchInput.current.throttle;
      if (touchInput.current.brake > 0) brake = touchInput.current.brake;
      if (touchInput.current.steer !== 0) steer = touchInput.current.steer;
      if (touchInput.current.handbrake > 0) handbrake = touchInput.current.handbrake;

      // 2. Track boundaries and surface check
      const car = carState.current;
      const trackInfo = getTrackPositionInfo(car.x, car.y);
      // Drifting is a track-corner action, never an off-track spin amplifier.
      if (!trackInfo.onTrack) handbrake = 0;

      // Check for lap completion (Crossing start line P0 -> P1 coordinate window)
      // Start line segment P0(300,300) to P1(700,300).
      // Crossing from y > 300 to y < 300 or vice versa around x between 250 and 350
      if (car.x >= 200 && car.x <= 400) {
        const lastY = car.y - car.vy * dt;
        if (lastY > 300 && car.y <= 300) {
          metrics.current.lapsCompletedCount += 1;
        }
      }

      // Check surface changes for adaptation metrics
      if (trackInfo.surface !== metrics.current.lastSurface) {
        metrics.current.surfaceChanges += 1;
        metrics.current.lastSurface = trackInfo.surface;
        metrics.current.surfaceChangeElapsed = 0;
      } else {
        metrics.current.surfaceChangeElapsed += dt;
        // If they adapt (speed stabilizes, no spin/sliding within 2 seconds of change)
        if (metrics.current.surfaceChangeElapsed > 2.0 && car.driftState === "DRY_GRIP") {
          metrics.current.surfaceAdaptationTime += dt * 0.2; // gradual progress
        }
      }

      if (!trackInfo.onTrack) {
        metrics.current.offTrackTime += dt;
        if (wasOnTrackRef.current) {
          metrics.current.boundaryHits += 1;
          playThud();
        }
      }
      wasOnTrackRef.current = trackInfo.onTrack;

      // 3. Step Car Physics
      const prevDriftState = car.driftState;
      stepCarPhysics(car, throttle, brake, steer, handbrake, dt, trackInfo.surface);

      // Log drifting metrics
      if (car.driftState === "SLIDING") {
        metrics.current.driftDuration += dt;
        metrics.current.driftSumAngle += car.driftAngle * dt;
        if (car.driftAngle > metrics.current.maxDriftAngle) {
          metrics.current.maxDriftAngle = car.driftAngle;
        }

        if (prevDriftState !== "SLIDING") {
          metrics.current.driftCount += 1;
          playScreech();
        }

        // Spawn skid marks & tire smoke
        const cos = Math.cos(car.angle);
        const sin = Math.sin(car.angle);
        const leftTireX = car.x - sin * 10 - cos * 12;
        const leftTireY = car.y + cos * 10 - sin * 12;
        const rightTireX = car.x + sin * 10 - cos * 12;
        const rightTireY = car.y - cos * 10 - sin * 12;

        if (lastLeftTire.current && lastRightTire.current) {
          skidMarks.current.push({
            x1: lastLeftTire.current.x,
            y1: lastLeftTire.current.y,
            x2: leftTireX,
            y2: leftTireY,
            alpha: 0.55,
          });
          skidMarks.current.push({
            x1: lastRightTire.current.x,
            y1: lastRightTire.current.y,
            x2: rightTireX,
            y2: rightTireY,
            alpha: 0.55,
          });
        }
        lastLeftTire.current = { x: leftTireX, y: leftTireY };
        lastRightTire.current = { x: rightTireX, y: rightTireY };

        spawnDriftSmoke(leftTireX, leftTireY, car.angle);
        spawnDriftSmoke(rightTireX, rightTireY, car.angle);
      } else {
        lastLeftTire.current = null;
        lastRightTire.current = null;
      }

      // Check successful drifts
      if (prevDriftState === "SLIDING" && car.driftState === "RECOVERING") {
        metrics.current.driftRecoveries += 1;
        metrics.current.successfulDrifts += 1;
        metrics.current.recoveries += 1;
      } else if (prevDriftState === "SLIDING" && car.driftState === "SPINNING") {
        metrics.current.failedDrifts += 1;
      }

      // Steering correction metrics (track signs of steer inputs)
      if (steer !== 0) {
        const steerSign = Math.sign(steer);
        if (metrics.current.lastSteerSign !== 0 && steerSign !== metrics.current.lastSteerSign) {
          metrics.current.steeringCorrections += 1;
          metrics.current.steeringChanges += 1;
          if (car.driftState === "SLIDING") {
            metrics.current.driftOvercorrection += 0.5; // Wobbling inside drift
          }
        }
        metrics.current.lastSteerSign = steerSign;
      }

      // Braking/Acceleration counts
      if (brake > 0 && car.vx * car.vx + car.vy * car.vy > 40) {
        metrics.current.brakingEventsCount += dt;
      }
      if (throttle > 0) {
        metrics.current.accelerationEventsCount += dt;
      }

      // Track speed values
      const curSpeedVal = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
      metrics.current.speedSum += curSpeedVal;
      metrics.current.speedSamples += 1;
      if (curSpeedVal > metrics.current.maxSpeedValue) {
        metrics.current.maxSpeedValue = curSpeedVal;
      }

      // Oversteering check (angle mismatch with travel path > 45 deg while not slide/handbrake)
      const moveAngle = Math.atan2(car.vy, car.vx);
      let angleDiff = Math.abs(car.angle - moveAngle);
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      angleDiff = Math.abs(angleDiff);
      if (angleDiff > 0.8 && curSpeedVal > 100 && car.driftState !== "SLIDING") {
        metrics.current.oversteers += 1;
      }

      // 4. Update AI Opponents
      stepAICars(aiCars.current, dt);

      // 5. Handle Cones & Obstacles Collision
      stepCones(obstacles.current, dt);
      handleObstacleCollisions(car, obstacles.current, (type) => {
        metrics.current.obstacleCollisions += 1;
        playThud();
        if (type === "OIL") {
          metrics.current.spins += 1;
        }
      });

      // 6. Update visual particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particles.current.splice(i, 1);
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha = 0.65 * (1 - p.life / p.maxLife);
        }
      }

      // Fade older skid marks slowly
      for (let i = skidMarks.current.length - 1; i >= 0; i--) {
        const s = skidMarks.current[i];
        s.alpha -= dt * 0.05; // Fade over 20s
        if (s.alpha <= 0) {
          skidMarks.current.splice(i, 1);
        }
      }

      // Cap skid marks to 1500 to keep it highly performant
      if (skidMarks.current.length > 1500) {
        skidMarks.current.shift();
      }

      // 7. Render Everything on Canvas
      // Clear viewport
      ctx.fillStyle = "#1b4332"; // Grass color
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      ctx.save();
      // Establish dynamic camera centering on Player Car
      ctx.translate(VIEW_W / 2 - car.x, VIEW_H / 2 - car.y);

      // Draw Grid / Details
      ctx.fillStyle = "#2d5a27";
      for (let x = -1000; x < 3000; x += 150) {
        for (let y = -1000; y < 3000; y += 150) {
          if ((Math.floor(x / 150) + Math.floor(y / 150)) % 2 === 0) {
            ctx.fillRect(x, y, 150, 150);
          }
        }
      }

      // Draw Alternating red/white kerbs underlay
      ctx.beginPath();
      ctx.moveTo(TRACK_WAYPOINTS[0].x, TRACK_WAYPOINTS[0].y);
      for (let i = 1; i < TRACK_WAYPOINTS.length; i++) {
        ctx.lineTo(TRACK_WAYPOINTS[i].x, TRACK_WAYPOINTS[i].y);
      }
      ctx.closePath();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 170;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      ctx.save();
      ctx.strokeStyle = "#ef4444"; // Red kerb stripes
      ctx.setLineDash([25, 25]);
      ctx.stroke();
      ctx.restore();

      // Draw individual asphalt/track segments with surface styling
      for (let i = 0; i < TRACK_WAYPOINTS.length; i++) {
        const p1 = TRACK_WAYPOINTS[i];
        const p2 = TRACK_WAYPOINTS[(i + 1) % TRACK_WAYPOINTS.length];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = p1.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Surface Colors
        if (p1.surface === "WET") ctx.strokeStyle = "#1e293b"; // Dark shiny blue-grey
        else if (p1.surface === "GRAVEL") ctx.strokeStyle = "#653a15"; // Dusty gravel brown
        else if (p1.surface === "SAND") ctx.strokeStyle = "#d97706"; // Sand yellow-brown
        else ctx.strokeStyle = "#27282b"; // Asphalt grey
        
        ctx.stroke();
      }

      // Draw Center white line
      ctx.beginPath();
      ctx.moveTo(TRACK_WAYPOINTS[0].x, TRACK_WAYPOINTS[0].y);
      for (let i = 1; i < TRACK_WAYPOINTS.length; i++) {
        ctx.lineTo(TRACK_WAYPOINTS[i].x, TRACK_WAYPOINTS[i].y);
      }
      ctx.closePath();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.setLineDash([15, 25]);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Draw Start/Finish checker line
      ctx.save();
      ctx.translate(300, 300);
      ctx.rotate(Math.PI / 2); // perpendicular to start
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-80, -4, 160, 8);
      ctx.fillStyle = "#000000";
      for (let w = -80; w < 80; w += 16) {
        ctx.fillRect(w + (w % 32 === 0 ? 0 : 8), -4, 8, 4);
        ctx.fillRect(w + (w % 32 === 0 ? 8 : 0), 0, 8, 4);
      }
      ctx.restore();

      // Draw Skid Marks
      for (const sm of skidMarks.current) {
        ctx.strokeStyle = `rgba(0, 0, 0, ${sm.alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sm.x1, sm.y1);
        ctx.lineTo(sm.x2, sm.y2);
        ctx.stroke();
      }

      // Draw Decal Obstacles (Puddles, Oil)
      for (const obs of obstacles.current) {
        if (!obs.active) continue;
        if (obs.type === "PUDDLE") {
          // Shiny blue overlay circle
          ctx.fillStyle = "rgba(59, 130, 246, 0.45)";
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.stroke();
        } else if (obs.type === "OIL") {
          // Glossy black blob
          ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Cones (Cones stand tall, so they have a 3D shadow/height)
      for (const obs of obstacles.current) {
        if (!obs.active) continue;
        if (obs.type === "CONE") {
          // Shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
          ctx.beginPath();
          ctx.arc(obs.x + 4, obs.y + 4, obs.radius, 0, Math.PI * 2);
          ctx.fill();

          // Cone Base
          ctx.fillStyle = "#ea580c"; // Orange
          ctx.fillRect(obs.x - 7, obs.y - 7, 14, 14);

          // Cone body
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Smoke Particles
      for (const p of particles.current) {
        ctx.fillStyle = `rgba(220, 220, 220, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw AI Cars
      for (const ai of aiCars.current) {
        ctx.save();
        ctx.translate(ai.x, ai.y);
        ctx.rotate(ai.angle);

        // Body
        ctx.fillStyle = ai.color;
        ctx.fillRect(-18, -10, 36, 20);

        // Windshield
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(4, -8, 10, 16);

        // Spoilers
        ctx.fillStyle = "#111827";
        ctx.fillRect(-22, -11, 4, 22);

        ctx.restore();
      }

      // Draw Player Car
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      // Wheels (Drawing wheels turning matching steer controls)
      ctx.fillStyle = "#111827"; // Dark wheels
      // Back wheels
      ctx.fillRect(-14, -13, 8, 4);
      ctx.fillRect(-14, 9, 8, 4);
      // Front wheels (rotate wheels by steer angle)
      ctx.save();
      ctx.translate(12, -13);
      ctx.rotate(steer * 0.45);
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();

      ctx.save();
      ctx.translate(12, 9);
      ctx.rotate(steer * 0.45);
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();

      // Car main chassis
      ctx.fillStyle = "#ef4444"; // Red racing car
      ctx.beginPath();
      ctx.roundRect(-18, -10, 36, 20, 4);
      ctx.fill();

      // Racing stripe
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-18, -3, 36, 6);

      // Cockpit / Windshield
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(0, -7, 12, 14, 2);
      ctx.fill();
      ctx.fillStyle = "#38bdf8"; // Glass reflection
      ctx.fillRect(4, -5, 5, 10);

      // Rear wing spoiler
      ctx.fillStyle = "#111827";
      ctx.fillRect(-22, -12, 5, 24);

      // Braking Taillights (glow red if active)
      if (car.brakeState) {
        ctx.fillStyle = "#ff0000";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 10;
        ctx.fillRect(-19, -9, 2, 4);
        ctx.fillRect(-19, 5, 2, 4);
      } else {
        ctx.fillStyle = "#991b1b";
        ctx.fillRect(-19, -9, 2, 4);
        ctx.fillRect(-19, 5, 2, 4);
      }

      ctx.restore(); // restore car coordinate translate
      ctx.restore(); // restore global camera translate

      // Update React HUD states (limit frequent state triggers by using local timers)
      const currentSpeedRounded = Math.round(Math.abs(car.speed) * 0.45); // scaling speed unit
      const curAvgSpeed = metrics.current.speedSamples > 0 ? metrics.current.speedSum / metrics.current.speedSamples : 0;
      if (now - lastHudUpdateRef.current >= 100) {
        lastHudUpdateRef.current = now;
        setHud({
          speed: currentSpeedRounded,
          lap: metrics.current.lapsCompletedCount + 1,
          time: practiceOnly ? localTimeRef.current : remainingSecondsRef.current,
          distance: Math.round(timeElapsed * curAvgSpeed * 0.15),
          surface: trackInfo.surface,
          driftState: car.driftState,
        });
      }

      loopRef.current = requestAnimationFrame(tick);
    };

    loopRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(loopRef.current);
    };
  }, [started, disabled, practiceOnly, finish, showHelp]);

  const timeLeft = practiceOnly ? localTime : remainingSeconds;

  return (
    <div className="drift-racer-container select-none">
      {!started ? (
        <div className="drift-racer-intro">
          <div className="text-center p-6 max-w-lg bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md">
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center justify-center gap-2">
              🏎️ Drift Racer
            </h1>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Welcome to the high-speed drifting challenge! Complete as many laps as possible in 3 minutes while maintaining control of the vehicle under changing track surface grips.
            </p>
            <div className="text-left text-xs bg-slate-800/80 p-4 border border-slate-700/60 rounded-xl mb-6 space-y-2 text-slate-400">
              <p className="font-bold text-slate-300 flex items-center gap-1.5 mb-2">Controls Guide:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-semibold text-orange-400">W / ↑</span>: Accelerate
                </div>
                <div>
                  <span className="font-semibold text-orange-400">A, D / ↔</span>: Steer Left & Right
                </div>
                <div>
                  <span className="font-semibold text-orange-400">S / ↓</span>: Brake
                </div>
                <div>
                  <span className="font-semibold text-orange-400">Spacebar</span>: Handbrake (Drift)
                </div>
              </div>
            </div>
            <button
              onClick={startGame}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              Start Race
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Normal Arcade HUD */}
          <div className="drift-racer-hud">
            <div className="hud-panel">
              <span className="hud-label">SPEED</span>
              <span className="hud-value font-mono text-orange-500">{hud.speed} <span className="text-xs text-slate-400">KM/H</span></span>
            </div>
            <div className="hud-panel">
              <span className="hud-label">LAP</span>
              <span className="hud-value font-mono text-cyan-400">{hud.lap}</span>
            </div>
            <div className="hud-panel">
              <span className="hud-label">TIME</span>
              <span className="hud-value font-mono text-red-500">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="hud-panel">
              <span className="hud-label">SURFACE</span>
              <span className="hud-value text-yellow-500 text-sm font-semibold tracking-wider">{hud.surface}</span>
            </div>
          </div>

          <div className={`drift-racer-coach ${hud.surface === "OFF_TRACK" ? "is-warning" : ""}`}>
            <strong>
              {hud.surface === "OFF_TRACK"
                ? "OFF TRACK — hold REVERSE, steer toward the road, or reset"
                : hud.speed < 5
                  ? "Hold GAS or W / ↑ to start moving"
                  : hud.driftState === "SLIDING"
                    ? "CONTROLLED DRIFT — ease off DRIFT and straighten"
                    : "Follow the road • brake before turns • drift through corners"}
            </strong>
            <span>Goal: complete laps quickly while staying in control.</span>
          </div>

          <canvas
            ref={canvasRef}
            width={VIEW_W}
            height={VIEW_H}
            className="drift-racer-canvas"
          />

          {/* Dynamic Mobile Touch Control Overlay */}
          <div className="drift-racer-mobile-controls" aria-label="Driving controls">
            <div className="mobile-dpad">
              <button
                onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setControl("left", true); }}
                onPointerUp={() => setControl("left", false)}
                onPointerCancel={() => setControl("left", false)}
                onLostPointerCapture={() => setControl("left", false)}
                className={`control-btn steer-left ${activeControls.has("left") ? "is-active" : ""}`}
                aria-label="Steer left"
              >
                <span>◀</span><small>LEFT</small>
              </button>
              <button
                onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setControl("right", true); }}
                onPointerUp={() => setControl("right", false)}
                onPointerCancel={() => setControl("right", false)}
                onLostPointerCapture={() => setControl("right", false)}
                className={`control-btn steer-right ${activeControls.has("right") ? "is-active" : ""}`}
                aria-label="Steer right"
              >
                <span>▶</span><small>RIGHT</small>
              </button>
            </div>
            <div className="mobile-pedals">
              <button
                onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setControl("drift", true); }}
                onPointerUp={() => setControl("drift", false)}
                onPointerCancel={() => setControl("drift", false)}
                onLostPointerCapture={() => setControl("drift", false)}
                className={`control-btn handbrake ${activeControls.has("drift") ? "is-active" : ""}`}
                aria-label="Hold with left or right while moving to drift"
              >
                DRIFT
                <small>TURN + SPACE</small>
              </button>
              <button
                onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setControl("brake", true); }}
                onPointerUp={() => setControl("brake", false)}
                onPointerCancel={() => setControl("brake", false)}
                onLostPointerCapture={() => setControl("brake", false)}
                className={`control-btn brake ${activeControls.has("brake") ? "is-active" : ""}`}
                aria-label="Hold to brake or reverse"
              >
                BRAKE / REV
                <small>S / ↓</small>
              </button>
              <button
                onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setControl("gas", true); }}
                onPointerUp={() => setControl("gas", false)}
                onPointerCancel={() => setControl("gas", false)}
                onLostPointerCapture={() => setControl("gas", false)}
                className={`control-btn gas ${activeControls.has("gas") ? "is-active" : ""}`}
                aria-label="Hold gas to accelerate"
              >
                GAS
                <small>W / ↑</small>
              </button>
            </div>
          </div>

          <div className="drift-racer-actions">
            <button type="button" onClick={() => setShowHelp(true)}>How to play</button>
            <button type="button" onClick={resetToTrack}>Reset car</button>
          </div>

          {showHelp && (
            <div className="drift-racer-help" role="dialog" aria-modal="true" aria-label="How to play Drift Racer">
              <div>
                <span className="help-kicker">Quick driving lesson</span>
                <h2>Race the full circuit</h2>
                <p>Hold GAS to move. Steer along the road, slow down before tight corners, and hold DRIFT briefly while turning. Release DRIFT and steer the other way to straighten the car.</p>
                <ol>
                  <li><b>1</b><span><strong>Accelerate</strong>Hold GAS or W / ↑</span></li>
                  <li><b>2</b><span><strong>Turn</strong>Use LEFT / RIGHT or A / D</span></li>
                  <li><b>3</b><span><strong>Controlled drift</strong>While moving, hold LEFT or RIGHT + DRIFT briefly. Release before leaving the road.</span></li>
                </ol>
                <button type="button" onClick={closeHelp}>Got it — drive!</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
