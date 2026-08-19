"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { TRACKS } from "./Levels";
import { TrackEngine } from "./TrackEngine";
import { VehicleEngine } from "./VehicleEngine";
import { OpponentEngine } from "./OpponentEngine";
import { scoreRacingStrategist } from "./ScoringEngine";
import { DecisionEvent, Obstacle, Opponent, RacingStrategistMetrics } from "./Types";
import "./RacingStrategistGame.css";

type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (m: RacingStrategistMetrics) => void | Promise<void>;
  onBack?: () => void;
};

export default function RacingStrategistGame({
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
  const trackIndexRef = useRef(0);
  const trackEngine = useRef(new TrackEngine(TRACKS[0]));
  const vehicleEngine = useRef(new VehicleEngine(200, 150));
  const opponentEngine = useRef(new OpponentEngine(TRACKS[0].opponents));

  // Analytics Metrics Refs
  const tracksStarted = useRef<number[]>([]);
  const tracksCompleted = useRef<number[]>([]);
  const totalDistance = useRef(0);
  const routeChoices = useRef(0);
  const safeRouteChoices = useRef(0);
  const riskyRouteChoices = useRef(0);
  const shortcutChoices = useRef(0);
  const shortcutSuccesses = useRef(0);
  const shortcutFailures = useRef(0);
  const overtakeAttempts = useRef(0);
  const successfulOvertakes = useRef(0);
  const unsuccessfulOvertakes = useRef(0);
  const overtakeWaitDecisions = useRef(0);
  const collisions = useRef(0);
  const nearCollisions = useRef(0);
  const obstacleAvoidanceAttempts = useRef(0);
  const successfulObstacleAvoidance = useRef(0);
  const brakingEvents = useRef(0);
  const appropriateBrakingEvents = useRef(0);
  const lateBrakingEvents = useRef(0);
  const unnecessaryBrakingEvents = useRef(0);
  const speedChanges = useRef(0);
  const routeChanges = useRef(0);
  const strategyChanges = useRef(0);
  const adaptiveDecisions = useRef(0);
  const successfulAdaptations = useRef(0);
  const failedAdaptations = useRef(0);
  const anticipatedEvents = useRef(0);
  const lateResponses = useRef(0);
  const decisionEvents = useRef(0);
  const decisionTimes = useRef<number[]>([]);
  const routeChoiceTypes = useRef<string[]>([]);
  const riskOutcomes = useRef<string[]>([]);
  
  // Track state-dependent metrics
  const hasCollidedOnShortcut = useRef(false);
  const insideShortcut = useRef(false);
  const lastForkDecision = useRef<number>(0); // 0 = none, 1 = left, 2 = right
  const forkApproachTime = useRef<number>(0);
  const decisionTrackedForSplit = useRef<string>("");
  const waitingBehindAI = useRef<Record<string, number>>({});
  const adaptiveBlockTriggered = useRef(false);
  const [adaptiveMessage, setAdaptiveMessage] = useState("");

  // Visual and game-feel systems
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }[]>([]);
  const skidmarksRef = useRef<{ x1: number; y1: number; x2: number; y2: number; opacity: number }[]>([]);
  const roadsidePropsRef = useRef<{ y: number; side: "left" | "right"; offset: number; size: number; color: string; type: "tree" | "bush" | "rock" }[]>([]);
  const shakeTimeRef = useRef(0);
  const finishAnimRef = useRef(0); // Checkered flag particle animation timer

  const [started, setStarted] = useState(false);
  const [timePreview, setTimePreview] = useState(remainingSeconds ?? 120);
  const [speedVal, setSpeedVal] = useState(0);
  const [progressVal, setProgressVal] = useState(0);

  // Update callback reference
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  // Submit final results
  const finish = useCallback((status = "COMPLETED") => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);

    const elapsed = performance.now() - startRef.current;
    
    // Calculate decision consistency (standard deviation of decision times)
    const times = decisionTimes.current;
    let consistency = 85;
    if (times.length > 1) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((a, b) => a + Math.pow(b - avgTime, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      consistency = Math.max(20, Math.min(100, Math.round(100 - stdDev * 20)));
    }

    // Determine performance percentages across stages dynamically relative to total track levels
    const totalTracks = TRACKS.length;
    const completedCount = tracksCompleted.current.length;
    const ratio = totalTracks > 0 ? completedCount / totalTracks : 0;
    const beginningPerformance = ratio >= 0.5 ? 90 : ratio > 0 ? 70 : 50;
    const middlePerformance = ratio >= 0.75 ? 92 : ratio >= 0.5 ? 75 : 60;
    const endingPerformance = ratio >= 1.0 ? 95 : ratio >= 0.8 ? 80 : 65;

    const metricsData = scoreRacingStrategist({
      sessionDuration: Math.round(elapsed / 1000),
      tracksStarted: tracksStarted.current.length,
      tracksCompleted: completedCount,
      distanceTravelled: Math.round(totalDistance.current),
      routeChoices: routeChoices.current,
      safeRouteChoices: safeRouteChoices.current,
      riskyRouteChoices: riskyRouteChoices.current,
      shortcutChoices: shortcutChoices.current,
      shortcutSuccesses: shortcutSuccesses.current,
      shortcutFailures: shortcutFailures.current,
      overtakeAttempts: overtakeAttempts.current,
      successfulOvertakes: successfulOvertakes.current,
      unsuccessfulOvertakes: unsuccessfulOvertakes.current,
      overtakeWaitDecisions: overtakeWaitDecisions.current,
      collisions: collisions.current,
      nearCollisions: nearCollisions.current,
      obstacleAvoidanceAttempts: obstacleAvoidanceAttempts.current,
      successfulObstacleAvoidance: successfulObstacleAvoidance.current,
      brakingEvents: brakingEvents.current,
      appropriateBrakingEvents: appropriateBrakingEvents.current,
      lateBrakingEvents: lateBrakingEvents.current,
      unnecessaryBrakingEvents: unnecessaryBrakingEvents.current,
      speedChanges: speedChanges.current,
      routeChanges: routeChanges.current,
      strategyChanges: strategyChanges.current,
      adaptiveDecisions: adaptiveDecisions.current,
      successfulAdaptations: successfulAdaptations.current,
      failedAdaptations: failedAdaptations.current,
      anticipatedEvents: anticipatedEvents.current,
      lateResponses: lateResponses.current,
      decisionEvents: decisionEvents.current,
      averageDecisionTime: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length * 10) / 10 : 0,
      decisionConsistency: consistency,
      riskDecisions: shortcutChoices.current + riskyRouteChoices.current,
      opponentInteractions: overtakeAttempts.current,
      trackConditionChanges: 1, // Wet track section
      responseToTrackChanges: anticipatedEvents.current,
      beginningPerformance,
      middlePerformance,
      endingPerformance,
      highestDifficulty: Math.max(1, trackIndexRef.current + 1),
      decisionTimes: times,
      routeChoiceTypes: routeChoiceTypes.current,
      riskOutcomes: riskOutcomes.current,
      completionStatus: status,
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

  useEffect(() => {
    if (started && practiceOnly && timePreview <= 0 && !endingRef.current) {
      endingRef.current = true;
      finishAtRef.current = performance.now() + 1000;
    }
  }, [started, practiceOnly, timePreview]);

  // Core Game Loop
  useEffect(() => {
    if (!started || disabled || doneRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    startRef.current = performance.now();
    lastTimeRef.current = startRef.current;

    // Generate trees/bushes/rocks dynamically along the grass
    const generateRoadsideProps = (length: number) => {
      const props: { y: number; side: "left" | "right"; offset: number; size: number; color: string; type: "tree" | "bush" | "rock" }[] = [];
      const colors = ["#15803d", "#166534", "#14532d", "#0f766e", "#115e59"];
      for (let y = 100; y < length - 150; y += 80 + Math.random() * 90) {
        const side = Math.random() > 0.5 ? "left" : "right";
        const offset = 30 + Math.random() * 45;
        const size = 12 + Math.random() * 14;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const type = Math.random() > 0.3 ? "tree" : Math.random() > 0.5 ? "bush" : "rock";
        props.push({ y, side, offset, size, color, type });
      }
      roadsidePropsRef.current = props;
    };

    // Track initialization
    const initTrack = (index: number) => {
      trackIndexRef.current = index;
      const trackData = TRACKS[index];
      trackEngine.current.setTrack(trackData);
      vehicleEngine.current.reset(200, 150);
      opponentEngine.current.reset(trackData.opponents);
      
      generateRoadsideProps(trackData.length);
      particlesRef.current = [];
      skidmarksRef.current = [];
      
      hasCollidedOnShortcut.current = false;
      insideShortcut.current = false;
      lastForkDecision.current = 0;
      forkApproachTime.current = 0;
      decisionTrackedForSplit.current = "";
      adaptiveBlockTriggered.current = false;
      setAdaptiveMessage("");
      
      if (!tracksStarted.current.includes(trackData.id)) {
        tracksStarted.current.push(trackData.id);
      }
    };

    initTrack(0);

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = bounds.width * pixelRatio;
      canvas.height = bounds.height * pixelRatio;
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    // Keyboard handlers
    const keysPressed: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      keysPressed[e.key.toLowerCase()] = true;
      
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        brakingEvents.current++;
        
        // Analyze braking context
        const veh = vehicleEngine.current.state;
        const road = trackEngine.current.getRoadBoundsAt(veh.x, veh.y);
        
        // Find upcoming obstacles or sharp turns within 150px ahead
        const trackData = trackEngine.current.currentTrack;
        const upcomingObs = trackData.obstacles.find(o => o.y > veh.y && o.y < veh.y + 150);
        const upcomingWet = trackData.segments.find(s => s.type === "wet" && s.yStart > veh.y && s.yStart < veh.y + 150);
        
        if (veh.speed > 3 && (upcomingObs || upcomingWet)) {
          appropriateBrakingEvents.current++;
          anticipatedEvents.current++;
        } else if (upcomingObs && upcomingObs.y - veh.y < 60) {
          lateBrakingEvents.current++;
          lateResponses.current++;
        } else if (veh.speed < 1.5) {
          unnecessaryBrakingEvents.current++;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Mouse steering
    let pointerX: number | null = null;
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = e.clientX - rect.left;
    };
    const handlePointerLeave = () => {
      pointerX = null;
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    // Overtake timers
    const timeLastDecision = { current: performance.now() };

    // Render & Physics Loop
    const loop = (timestamp: number) => {
      if (doneRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 400;
      const height = rect.height || 600;

      // Handle Timer Completion delay
      if (endingRef.current && timestamp >= finishAtRef.current) {
        finish();
        return;
      }

      // Input mappings
      const veh = vehicleEngine.current.state;
      
      // Horizontal Steer
      if (pointerX !== null) {
        const dxCenter = (width - 400) / 2;
        const gamePointerX = pointerX - dxCenter;
        const dx = gamePointerX - veh.x;
        veh.steering = Math.max(-1, Math.min(1, dx / 40));
      } else {
        const left = keysPressed["arrowleft"] || keysPressed["a"];
        const right = keysPressed["arrowright"] || keysPressed["d"];
        veh.steering = left ? -1 : right ? 1 : 0;
      }

      // Acceleration & Braking
      const up = keysPressed["arrowup"] || keysPressed["w"];
      const down = keysPressed["arrowdown"] || keysPressed["s"];
      veh.accelerating = up && !down;
      veh.braking = down;

      // Update Vehicle Physics
      const isWet = trackEngine.current.isWetAt(veh.y);
      vehicleEngine.current.update(isWet);
      totalDistance.current += veh.vy * 0.01;

      // Update React State values for visual HUD
      setSpeedVal(Math.round(veh.speed * 22)); // in km/h
      const trackData = trackEngine.current.currentTrack;
      const finishSegment = trackData.segments.find(s => s.type === "finish");
      const finishY = finishSegment ? finishSegment.yStart : trackData.length;
      setProgressVal(Math.min(100, Math.round((veh.y / finishY) * 100)));

      // Spawn Exhaust Smoke
      if (veh.accelerating && Math.random() > 0.45) {
        const backX = veh.x - (veh.height / 2) * Math.sin(veh.heading);
        const backY = veh.y - (veh.height / 2) * Math.cos(veh.heading);
        particlesRef.current.push({
          x: backX,
          y: backY,
          vx: -Math.sin(veh.heading) * 0.6 + (Math.random() - 0.5) * 0.3,
          vy: -Math.cos(veh.heading) * 0.6 + (Math.random() - 0.5) * 0.3,
          life: 0,
          maxLife: 15 + Math.random() * 15,
          color: "rgba(226, 232, 240, 0.4)",
          size: 3 + Math.random() * 4,
        });
      }

      // Spawn Wet Water Splash Particles
      if (isWet && veh.speed > 2.0 && Math.random() > 0.25) {
        particlesRef.current.push({
          x: veh.x + (Math.random() - 0.5) * veh.width,
          y: veh.y + (Math.random() - 0.5) * veh.height,
          vx: (Math.random() - 0.5) * 2.0,
          vy: -veh.speed * 0.25,
          life: 0,
          maxLife: 12,
          color: "rgba(56, 189, 248, 0.6)",
          size: 2 + Math.random() * 3,
        });
      }

      // Add Skidmarks
      const isDrifting = isWet && veh.speed > 2.0 && Math.abs(veh.steering) > 0.35;
      const isHardBraking = veh.braking && veh.speed > 1.5;
      if (isDrifting || isHardBraking) {
        const leftX = veh.x - (veh.width / 3.5) * Math.cos(veh.heading);
        const leftY = veh.y + (veh.width / 3.5) * Math.sin(veh.heading);
        skidmarksRef.current.push({
          x1: leftX,
          y1: leftY,
          x2: leftX - veh.vx * 0.8,
          y2: leftY - veh.vy * 0.8,
          opacity: isHardBraking ? 0.45 : 0.25,
        });
        if (skidmarksRef.current.length > 400) {
          skidmarksRef.current.shift();
        }
      }

      // Update Opponents
      opponentEngine.current.update(trackEngine.current);

      const cameraY = veh.y - 220; // Centered camera viewport placing player near bottom

      // Dynamic blockage adaptive logic for Track 2 (Strategic Splits)
      if (trackData.id === 2) {
        // Trigger rockfall obstacle when player passes Y = 350
        if (veh.y > 350 && !adaptiveBlockTriggered.current) {
          adaptiveBlockTriggered.current = true;
          adaptiveDecisions.current++;
          setAdaptiveMessage("ROCKFALL AHEAD! PATH BLOCKED!");
          // Block the left fork segment dynamically
          const segment = trackEngine.current.getSegmentAt(1000);
          if (segment) {
            segment.isBlocked = true;
          }
          // Dynamically place a boulder to block the left fork path
          const exists = trackData.obstacles.some(o => o.id === "t2_adaptive_block");
          if (!exists) {
            trackData.obstacles.push({
              id: "t2_adaptive_block",
              x: 110, // Left fork center
              y: 1000,
              width: 50,
              height: 25,
              type: "debris",
              vx: 0,
              avoided: false,
              collided: false
            });
          }
        }
      }

      // Check Road Boundary & Split Divider Collisions
      const currentRoad = trackEngine.current.getRoadBoundsAt(veh.x, veh.y);
      
      // Hitting track boundaries (left/right walls)
      if (veh.x - veh.width/2 < currentRoad.left) {
        veh.x = currentRoad.left + veh.width/2;
        veh.vx = 0;
        veh.speed *= 0.5;
        collisions.current++;
        lateResponses.current++;
        strategyChanges.current++;
        shakeTimeRef.current = 15; // Camera shake intensity

        // Spawn bright yellow sparks
        for (let i = 0; i < 10; i++) {
          particlesRef.current.push({
            x: currentRoad.left,
            y: veh.y,
            vx: 1 + Math.random() * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 0,
            maxLife: 20 + Math.random() * 10,
            color: "#f59e0b", // Yellow/amber spark
            size: 2 + Math.random() * 2,
          });
        }
      } else if (veh.x + veh.width/2 > currentRoad.right) {
        veh.x = currentRoad.right - veh.width/2;
        veh.vx = 0;
        veh.speed *= 0.5;
        collisions.current++;
        lateResponses.current++;
        strategyChanges.current++;
        shakeTimeRef.current = 15;

        // Sparks
        for (let i = 0; i < 10; i++) {
          particlesRef.current.push({
            x: currentRoad.right,
            y: veh.y,
            vx: -1 - Math.random() * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 0,
            maxLife: 20 + Math.random() * 10,
            color: "#f59e0b",
            size: 2 + Math.random() * 2,
          });
        }
      }

      // Hitting the central grass fork divider
      if (currentRoad.inDivider) {
        // Slow down and bounce back slightly
        veh.speed *= 0.35;
        veh.vx = -veh.vx * 0.8;
        collisions.current++;
        lateResponses.current++;
        shakeTimeRef.current = 12;

        // Dust mud particles
        for (let i = 0; i < 8; i++) {
          particlesRef.current.push({
            x: veh.x + (Math.random() - 0.5) * veh.width,
            y: veh.y,
            vx: (Math.random() - 0.5) * 3,
            vy: -1 - Math.random() * 2,
            life: 0,
            maxLife: 25,
            color: "#854d0e", // Mud brown
            size: 3 + Math.random() * 4,
          });
        }
      }

      // Shortcut track metrics & outcome monitoring
      const seg = trackEngine.current.getSegmentAt(veh.y);
      if (seg && seg.type === "shortcut") {
        const choice = trackEngine.current.getChosenRoute(veh.x, veh.y);
        
        if (choice === 2) { // Committed to shortcut route
          if (!insideShortcut.current) {
            insideShortcut.current = true;
            shortcutChoices.current++;
            decisionEvents.current++;
            routeChoiceTypes.current.push("shortcut_fast");
            
            // Record decision time
            if (forkApproachTime.current > 0) {
              const dTime = (timestamp - forkApproachTime.current) / 1000;
              decisionTimes.current.push(dTime);
            }
          }
        }
      } else if (insideShortcut.current && (!seg || seg.type !== "shortcut")) {
        // Exited shortcut segment
        insideShortcut.current = false;
        if (hasCollidedOnShortcut.current) {
          shortcutFailures.current++;
          riskOutcomes.current.push("risk_failed");
        } else {
          shortcutSuccesses.current++;
          riskOutcomes.current.push("risk_succeeded");
        }
      }

      // Split Fork Decisions Trackings
      if (seg && (seg.type === "split" || seg.type === "shortcut") && !decisionTrackedForSplit.current) {
        if (forkApproachTime.current === 0) {
          forkApproachTime.current = timestamp;
        }

        const choice = trackEngine.current.getChosenRoute(veh.x, veh.y);
        if (choice !== 0) {
          decisionTrackedForSplit.current = seg.yStart.toString();
          routeChoices.current++;
          decisionEvents.current++;

          if (seg.type === "split") {
            if (choice === 1) { // Left = narrow / risky
              riskyRouteChoices.current++;
              routeChoiceTypes.current.push("split_narrow_risky");
            } else { // Right = wide / safe
              safeRouteChoices.current++;
              routeChoiceTypes.current.push("split_wide_safe");
            }
          }

          // Check if dynamic adaptive blockage was resolved correctly
          if (trackData.id === 2 && adaptiveBlockTriggered.current) {
            if (choice === 2) { // Successfully rerouted to the open right fork
              successfulAdaptations.current++;
              anticipatedEvents.current++;
            } else {
              failedAdaptations.current++;
              lateResponses.current++;
            }
          }

          // Record decision time
          if (forkApproachTime.current > 0) {
            const dTime = (timestamp - forkApproachTime.current) / 1000;
            decisionTimes.current.push(dTime);
            forkApproachTime.current = 0;
          }
        }
      } else if (!seg || (seg.type !== "split" && seg.type !== "shortcut")) {
        decisionTrackedForSplit.current = "";
        forkApproachTime.current = 0;
      }

      // Check Static & Moving Obstacle Collisions
      for (const obs of trackData.obstacles) {
        // Move rocks horizontally
        if (obs.type === "moving_rock") {
          obs.x += obs.vx;
          if (obs.minX && obs.x < obs.minX) {
            obs.x = obs.minX;
            obs.vx = -obs.vx;
          } else if (obs.maxX && obs.x > obs.maxX) {
            obs.x = obs.maxX;
            obs.vx = -obs.vx;
          }
        }

        // AABB Collision Check
        const collides =
          veh.x - veh.width/2 < obs.x + obs.width/2 &&
          veh.x + veh.width/2 > obs.x - obs.width/2 &&
          veh.y - veh.height/2 < obs.y + obs.height/2 &&
          veh.y + veh.height/2 > obs.y - obs.height/2;

        if (collides && !obs.collided) {
          obs.collided = true;
          collisions.current++;
          if (insideShortcut.current) {
            hasCollidedOnShortcut.current = true;
          }
          
          if (obs.id === "t2_adaptive_block") {
            failedAdaptations.current++;
          }

          // Violent bounce back physics
          veh.y -= 12;
          veh.speed = -0.8;
          veh.vx = (veh.x - obs.x) * 0.15;
          shakeTimeRef.current = 18;

          // Spawn collision spark particles
          for (let i = 0; i < 15; i++) {
            particlesRef.current.push({
              x: (veh.x + obs.x) / 2 + (Math.random() - 0.5) * 8,
              y: (veh.y + obs.y) / 2 + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 6,
              vy: -2 + (Math.random() - 0.5) * 4,
              life: 0,
              maxLife: 20 + Math.random() * 15,
              color: "#f59e0b",
              size: 2 + Math.random() * 2
            });
          }
        }

        // Near-collision or Successful avoidance tracking
        if (!obs.collided && !obs.avoided && veh.y > obs.y + obs.height) {
          obs.avoided = true;
          obstacleAvoidanceAttempts.current++;

          // Check lateral separation when passing
          const lateralDist = Math.abs(veh.x - obs.x);
          if (lateralDist < 26) {
            nearCollisions.current++;
          } else {
            successfulObstacleAvoidance.current++;
          }
        }
      }

      // Check AI Opponent Interactions (Overtaking)
      for (const opp of opponentEngine.current.opponents) {
        // Collision AABB
        const collides =
          veh.x - veh.width/2 < opp.x + opp.width/2 &&
          veh.x + veh.width/2 > opp.x - opp.width/2 &&
          veh.y - veh.height/2 < opp.y + opp.height/2 &&
          veh.y + veh.height/2 > opp.y - opp.height/2;

        if (collides && !opp.isCollided) {
          opp.isCollided = true;
          collisions.current++;
          
          // Violent bounce back physics
          veh.y -= 12;
          veh.speed = -0.8;
          veh.vx = (veh.x - opp.x) * 0.15;
          shakeTimeRef.current = 18;

          // Spawn collision spark particles
          for (let i = 0; i < 15; i++) {
            particlesRef.current.push({
              x: (veh.x + opp.x) / 2 + (Math.random() - 0.5) * 8,
              y: (veh.y + opp.y) / 2 + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 6,
              vy: -2 + (Math.random() - 0.5) * 4,
              life: 0,
              maxLife: 20 + Math.random() * 15,
              color: "#fb923c",
              size: 2 + Math.random() * 2
            });
          }
        }

        // Avoidance / waiting logic
        if (!opp.isOvertaken) {
          // Player is behind AI in the same vertical corridor
          if (veh.y < opp.y && opp.y - veh.y < 120 && Math.abs(veh.x - opp.x) < 30) {
            // Track how long player waits behind the AI without overtaking
            if (!opp.waitTracked) {
              const startWait = waitingBehindAI.current[opp.id] || timestamp;
              waitingBehindAI.current[opp.id] = startWait;

              if (timestamp - startWait > 1200) { // Waited at least 1.2 seconds
                overtakeWaitDecisions.current++;
                opp.waitTracked = true;
              }
            }
          }

          // Player has cleanly passed the AI
          if (veh.y > opp.y + opp.height) {
            opp.isOvertaken = true;
            overtakeAttempts.current++;
            
            if (opp.isCollided) {
              unsuccessfulOvertakes.current++;
            } else {
              successfulOvertakes.current++;
            }
            
            const latDist = Math.abs(veh.x - opp.x);
            if (latDist < 25) {
              nearCollisions.current++;
            }
          }
        }
      }

      // Check Track Level Finish (cross the checkerboard line)
      if (veh.y >= finishY) {
        tracksCompleted.current.push(trackData.id);
        const nextIndex = trackIndexRef.current + 1;
        
        if (nextIndex < TRACKS.length) {
          initTrack(nextIndex);
        } else {
          // Finished all tracks successfully!
          finish();
          return;
        }
      }

      // Render Scene
      ctx.clearRect(0, 0, width, height);
      
      // Save canvas state
      ctx.save();

      // Screen Shake
      if (shakeTimeRef.current > 0) {
        const dx = (Math.random() - 0.5) * 6;
        const dy = (Math.random() - 0.5) * 6;
        ctx.translate(dx, dy);
        shakeTimeRef.current--;
      }
      
      // Draw background (Grass/Grid) over the entire screen container
      ctx.fillStyle = "#166534"; // Green grass background
      ctx.fillRect(0, 0, width, height);

      // Translate context to center the 400-wide road horizontally
      const dxCenter = (width - 400) / 2;
      ctx.save();
      ctx.translate(dxCenter, 0);

      // Draw Grid / Track Side Lines (Grass details)
      ctx.strokeStyle = "#15803d";
      ctx.lineWidth = 1;
      const scrollOffset = cameraY % 60;
      for (let gridY = height; gridY >= -60; gridY -= 60) {
        ctx.beginPath();
        ctx.moveTo(0, gridY + scrollOffset);
        ctx.lineTo(400, gridY + scrollOffset);
        ctx.stroke();
      }

      // Draw Skidmarks
      ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
      ctx.lineWidth = 3;
      for (const skid of skidmarksRef.current) {
        const drawY1 = height - (skid.y1 - cameraY);
        const drawY2 = height - (skid.y2 - cameraY);
        if ((drawY1 > 0 && drawY1 < height) || (drawY2 > 0 && drawY2 < height)) {
          ctx.beginPath();
          ctx.moveTo(skid.x1, drawY1);
          ctx.lineTo(skid.x2, drawY2);
          ctx.stroke();
        }
      }

      // Draw Asphalt Track Polygon
      ctx.fillStyle = "#262626"; // Dark Asphalt

      // Loop through segments visible on screen
      for (const segment of trackData.segments) {
        const drawStart = height - (segment.yStart - cameraY);
        const drawEnd = height - (segment.yEnd - cameraY);
        ctx.fillStyle = "#262626"; // Reset asphalt fill color to prevent state pollution from rumble strips

        if (segment.type === "split" || segment.type === "shortcut") {
          const leftForkX = segment.leftForkCenterX || 110;
          const rightForkX = segment.rightForkCenterX || 290;
          const forkW = segment.forkWidth || 80;

          // Smooth transition Y coordinates (transition height is 200 track units)
          const transitionY = segment.yStart + Math.min(200, (segment.yEnd - segment.yStart) * 0.35);
          const drawTransition = height - (transitionY - cameraY);

          // Draw transition road polygons (asphalt #262626)
          ctx.fillStyle = "#262626";
          
          // Left fork transition
          ctx.beginPath();
          ctx.moveTo(110, drawStart);
          ctx.lineTo(200, drawStart);
          ctx.lineTo(leftForkX + forkW/2, drawTransition);
          ctx.lineTo(leftForkX - forkW/2, drawTransition);
          ctx.closePath();
          ctx.fill();

          // Right fork transition
          ctx.beginPath();
          ctx.moveTo(200, drawStart);
          ctx.lineTo(290, drawStart);
          ctx.lineTo(rightForkX + forkW/2, drawTransition);
          ctx.lineTo(rightForkX - forkW/2, drawTransition);
          ctx.closePath();
          ctx.fill();

          // Parallel Roads (from drawTransition to drawEnd)
          ctx.beginPath();
          ctx.rect(leftForkX - forkW/2, drawEnd, forkW, drawTransition - drawEnd);
          ctx.rect(rightForkX - forkW/2, drawEnd, forkW, drawTransition - drawEnd);
          ctx.fill();

          // Draw Divider (Transition wedge + parallel block)
          ctx.fillStyle = "#334155";
          
          // Divider transition wedge starting at a sharp point (200, drawStart)
          ctx.beginPath();
          ctx.moveTo(200, drawStart);
          ctx.lineTo(rightForkX - forkW/2, drawTransition);
          ctx.lineTo(leftForkX + forkW/2, drawTransition);
          ctx.closePath();
          ctx.fill();

          // Parallel Divider block
          ctx.fillRect(leftForkX + forkW/2, drawEnd, (rightForkX - forkW/2) - (leftForkX + forkW/2), drawTransition - drawEnd);

          // Outline outer boundaries and divider lines
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 3;
          
          // Left fork left edge outline
          ctx.beginPath();
          ctx.moveTo(110, drawStart);
          ctx.lineTo(leftForkX - forkW/2, drawTransition);
          ctx.lineTo(leftForkX - forkW/2, drawEnd);
          ctx.stroke();

          // Right fork right edge outline
          ctx.beginPath();
          ctx.moveTo(290, drawStart);
          ctx.lineTo(rightForkX + forkW/2, drawTransition);
          ctx.lineTo(rightForkX + forkW/2, drawEnd);
          ctx.stroke();

          // Divider outlines
          ctx.beginPath();
          ctx.moveTo(200, drawStart);
          ctx.lineTo(leftForkX + forkW/2, drawTransition);
          ctx.lineTo(leftForkX + forkW/2, drawEnd);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(200, drawStart);
          ctx.lineTo(rightForkX - forkW/2, drawTransition);
          ctx.lineTo(rightForkX - forkW/2, drawEnd);
          ctx.stroke();

          // Lane markers on splits
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.setLineDash([12, 18]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          // Left lane marker
          ctx.moveTo((110 + 200)/2, drawStart);
          ctx.lineTo(leftForkX, drawTransition);
          ctx.lineTo(leftForkX, drawEnd);

          // Right lane marker
          ctx.moveTo((200 + 290)/2, drawStart);
          ctx.lineTo(rightForkX, drawTransition);
          ctx.lineTo(rightForkX, drawEnd);
          
          ctx.stroke();
          ctx.setLineDash([]);
          
          ctx.fillStyle = "#262626"; // Reset asphalt fill color
        } else {
          // Regular Road
          ctx.beginPath();
          ctx.rect(segment.centerX - segment.width/2, drawEnd, segment.width, drawStart - drawEnd);
          ctx.fill();

          // Side lane markings (Rumble Strips)
          const stripHeight = 15;
          let count = 0;
          for (let ry = drawStart; ry > drawEnd; ry -= stripHeight) {
            ctx.fillStyle = count % 2 === 0 ? "#ef4444" : "#ffffff";
            ctx.fillRect(segment.centerX - segment.width/2 - 4, ry - stripHeight, 4, stripHeight);
            ctx.fillRect(segment.centerX + segment.width/2, ry - stripHeight, 4, stripHeight);
            count++;
          }

          // Lane Divider Lines
          ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
          ctx.lineWidth = 2;
          ctx.setLineDash([15, 20]);
          const laneSpan = segment.width / segment.laneCount;
          for (let l = 1; l < segment.laneCount; l++) {
            ctx.beginPath();
            ctx.moveTo(segment.centerX - segment.width/2 + l * laneSpan, drawStart);
            ctx.lineTo(segment.centerX - segment.width/2 + l * laneSpan, drawEnd);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }

        // Draw Wet Surface Visual overlay
        if (segment.type === "wet") {
          ctx.fillStyle = "rgba(14, 165, 233, 0.3)"; // Shiny blue water overlay
          ctx.fillRect(segment.centerX - segment.width/2, drawEnd, segment.width, drawStart - drawEnd);
          
          // Reflections
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          for (let d = drawStart; d > drawEnd; d -= 70) {
            ctx.fillRect(segment.centerX - segment.width/3, d - 10, (segment.width * 2)/3, 3);
          }
        }

        // Draw Finish Line
        if (segment.type === "finish") {
          const fY = drawStart - 24;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(segment.centerX - segment.width/2, fY, segment.width, 24);
          ctx.fillStyle = "#000000";
          const sq = 8;
          for (let fy = fY; fy < drawStart; fy += sq) {
            const oddRow = Math.round((fy - fY) / sq) % 2 === 0;
            for (let fx = segment.centerX - segment.width/2; fx < segment.centerX + segment.width/2; fx += sq) {
              const oddCol = Math.round((fx - (segment.centerX - segment.width/2)) / sq) % 2 === 0;
              if (oddRow === oddCol) {
                ctx.fillRect(fx, fy, sq, sq);
              }
            }
          }
        }
      }

      // Draw Roadside props (trees/bushes/rocks)
      for (const prop of roadsidePropsRef.current) {
        const drawY = height - (prop.y - cameraY);
        if (drawY > -30 && drawY < height + 30) {
          const seg = trackEngine.current.getSegmentAt(prop.y);
          const roadCenter = seg ? seg.centerX : 200;
          const roadWidth = seg ? seg.width : 180;
          const drawX = prop.side === "left" ? roadCenter - roadWidth/2 - prop.offset : roadCenter + roadWidth/2 + prop.offset;

          ctx.save();
          ctx.translate(drawX, drawY);

          // Draw Shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
          ctx.beginPath();
          ctx.arc(4, 4, prop.size, 0, Math.PI * 2);
          ctx.fill();

          if (prop.type === "tree") {
            // Trunk
            ctx.fillStyle = "#78350f";
            ctx.fillRect(-3, 0, 6, 12);
            // Foliage
            ctx.fillStyle = prop.color;
            ctx.beginPath();
            ctx.arc(0, -5, prop.size, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
            ctx.beginPath();
            ctx.arc(-2, -7, prop.size * 0.7, 0, Math.PI * 2);
            ctx.fill();
          } else if (prop.type === "bush") {
            ctx.fillStyle = prop.color;
            ctx.beginPath();
            ctx.arc(0, 0, prop.size, 0, Math.PI * 2);
            ctx.arc(-prop.size * 0.4, 0, prop.size * 0.8, 0, Math.PI * 2);
            ctx.arc(prop.size * 0.4, 0, prop.size * 0.8, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Rock
            ctx.fillStyle = "#64748b";
            ctx.beginPath();
            ctx.arc(0, 0, prop.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // Draw Dynamic blocked route visual indicators
      if (trackData.id === 2 && adaptiveBlockTriggered.current) {
        const segBlock = trackEngine.current.getSegmentAt(1000);
        if (segBlock && segBlock.isBlocked) {
          const drawY = height - (1000 - cameraY);
          ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
          ctx.fillRect(110 - 40, drawY - 20, 80, 40);
          
          // Draw blocked stripe barrier
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(110 - 35, drawY - 5, 70, 10);
        }
      }

      // Draw Obstacles
      for (const obs of trackData.obstacles) {
        const drawX = obs.x;
        const drawY = height - (obs.y - cameraY);

        if (drawY > -50 && drawY < height + 50) {
          ctx.save();
          ctx.translate(drawX, drawY);

          if (obs.type === "static_barrier") {
            // Detailed striped barricade with orange light indicators
            ctx.fillStyle = "#334155";
            ctx.fillRect(-obs.width/2, -obs.height/2, obs.width, obs.height);
            
            // Stripe pattern
            ctx.fillStyle = "#f59e0b";
            ctx.fillRect(-obs.width/2 + 5, -obs.height/3, obs.width - 10, obs.height/2);
            ctx.fillStyle = "#000000";
            ctx.lineWidth = 3;
            for (let ox = -obs.width/2 + 10; ox < obs.width/2 - 10; ox += 12) {
              ctx.beginPath();
              ctx.moveTo(ox, -obs.height/3);
              ctx.lineTo(ox + 6, obs.height/6);
              ctx.stroke();
            }
          } else if (obs.type === "debris") {
            // Oil puddle / rock debris
            ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
            ctx.beginPath();
            ctx.ellipse(0, 0, obs.width/2, obs.height/3, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Shaded boulder rock
            ctx.fillStyle = "#475569";
            ctx.beginPath();
            ctx.arc(0, 0, obs.width/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#64748b";
            ctx.beginPath();
            ctx.arc(-3, -3, obs.width/3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // Draw Opponents (AI vehicles)
      for (const opp of opponentEngine.current.opponents) {
        const drawX = opp.x;
        const drawY = height - (opp.y - cameraY);

        if (drawY > -50 && drawY < height + 50) {
          ctx.save();
          ctx.translate(drawX, drawY);

          // Opponent wheels
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(-opp.width * 0.58, -opp.height * 0.42, opp.width * 0.16, opp.height * 0.25);
          ctx.fillRect(opp.width * 0.42, -opp.height * 0.42, opp.width * 0.16, opp.height * 0.25);
          ctx.fillRect(-opp.width * 0.58, opp.height * 0.17, opp.width * 0.16, opp.height * 0.25);
          ctx.fillRect(opp.width * 0.42, opp.height * 0.17, opp.width * 0.16, opp.height * 0.25);

          // Opponent vehicle body (F1 look)
          ctx.fillStyle = opp.color;
          ctx.fillRect(-opp.width/2, -opp.height/2, opp.width, opp.height);
          
          // Spoiler
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(-opp.width * 0.65, opp.height * 0.35, opp.width * 1.3, opp.height * 0.15);

          // Cockpit windshield
          ctx.fillStyle = "#475569";
          ctx.fillRect(-opp.width * 0.3, -opp.height * 0.22, opp.width * 0.6, opp.height * 0.18);

          // Headlights glow
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(-opp.width * 0.4, -opp.height * 0.55, opp.width * 0.2, 2);
          ctx.fillRect(opp.width * 0.2, -opp.height * 0.55, opp.width * 0.2, 2);

          ctx.restore();
        }
      }

      // Draw Particles
      for (const p of particlesRef.current) {
        const drawY = height - (p.y - cameraY);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, drawY, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Update particle
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
      }
      // Filter out dead particles
          particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      // Draw Player Car (High fidelity sporty visual styling)
      const playerDrawX = veh.x;
      const playerDrawY = height - (veh.y - cameraY);
      const speedVibe = veh.speed > 0.5 ? (Math.random() - 0.5) * 0.7 : 0;

      ctx.save();
      ctx.translate(playerDrawX + speedVibe, playerDrawY);
      ctx.rotate(veh.heading);

      // Flickering rocket exhaust booster flames when accelerating
      if (veh.accelerating) {
        ctx.fillStyle = Math.random() > 0.5 ? "#f97316" : "#ef4444";
        ctx.beginPath();
        // Left exhaust flame
        ctx.moveTo(-veh.width * 0.25, veh.height * 0.45);
        ctx.lineTo(-veh.width * 0.15, veh.height * 0.45);
        ctx.lineTo(-veh.width * 0.2, veh.height * 0.45 + 8 + Math.random() * 8);
        // Right exhaust flame
        ctx.moveTo(veh.width * 0.15, veh.height * 0.45);
        ctx.lineTo(veh.width * 0.25, veh.height * 0.45);
        ctx.lineTo(veh.width * 0.2, veh.height * 0.45 + 8 + Math.random() * 8);
        ctx.closePath();
        ctx.fill();

        // Inner glowing yellow core
        ctx.fillStyle = "#eab308";
        ctx.beginPath();
        ctx.moveTo(-veh.width * 0.22, veh.height * 0.45);
        ctx.lineTo(-veh.width * 0.18, veh.height * 0.45);
        ctx.lineTo(-veh.width * 0.2, veh.height * 0.45 + 4 + Math.random() * 4);
        ctx.moveTo(veh.width * 0.18, veh.height * 0.45);
        ctx.lineTo(veh.width * 0.22, veh.height * 0.45);
        ctx.lineTo(veh.width * 0.2, veh.height * 0.45 + 4 + Math.random() * 4);
        ctx.closePath();
        ctx.fill();
      }

      // Black side tires
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-veh.width * 0.6, -veh.height * 0.42, veh.width * 0.16, veh.height * 0.25);
      ctx.fillRect(veh.width * 0.44, -veh.height * 0.42, veh.width * 0.16, veh.height * 0.25);
      ctx.fillRect(-veh.width * 0.6, veh.height * 0.18, veh.width * 0.16, veh.height * 0.25);
      ctx.fillRect(veh.width * 0.44, veh.height * 0.18, veh.width * 0.16, veh.height * 0.25);

      // Main sporty carbon-red body
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(-veh.width/2, -veh.height/2, veh.width, veh.height);

      // Carbon stripes
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(-veh.width * 0.15, -veh.height * 0.5, veh.width * 0.3, veh.height);

      // Rear Spoiler wings
      ctx.fillStyle = "#eab308";
      ctx.fillRect(-veh.width * 0.68, veh.height * 0.32, veh.width * 1.36, veh.height * 0.15);

      // Glass Cockpit windshield
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(-veh.width * 0.32, -veh.height * 0.2, veh.width * 0.64, veh.height * 0.18);

      // Glowing cyan front headlights
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(-veh.width * 0.42, -veh.height * 0.55, veh.width * 0.18, 3);
      ctx.fillRect(veh.width * 0.24, -veh.height * 0.55, veh.width * 0.18, 3);

      ctx.restore();
      ctx.restore(); // Restore track horizontal alignment context (dxCenter save)
      ctx.restore(); // Restore global camera coordinate context translation (Screen Shake save)

      // Next tick
      rafRef.current = requestAnimationFrame(loop);
    };

    // Trigger loop
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      resizeObserver.disconnect();
    };
  }, [started, disabled]);

  const clickStart = () => {
    setStarted(true);
  };

  return (
    <main className="racing-strategist-container">
      {/* Start Game Screen Overlay */}
      {!started && (
        <section className="start-screen">
          <button className="back-btn" onClick={onBack || (() => window.history.back())}>
            ← Back
          </button>
          <h2 className="start-title">🏎️ RACING STRATEGIST</h2>
          <p className="start-desc">
            Drive a vehicle through challenging race tracks. Adapt to route splits, slow traffic blockages, and wet road slides. Make strategic choices.
          </p>

          <div className="start-instructions">
            <div className="instruction-row">
              <span className="key-badge">W</span> / <span className="key-badge">▲</span>
              <span>Accelerate vehicle</span>
            </div>
            <div className="instruction-row">
              <span className="key-badge">S</span> / <span className="key-badge">▼</span>
              <span>Brake / Slow down</span>
            </div>
            <div className="instruction-row">
              <span className="key-badge">A</span> / <span className="key-badge">D</span> / <span className="key-badge">◀</span> / <span className="key-badge">▶</span>
              <span>Steer left / right</span>
            </div>
            <div className="instruction-row">
              <span className="key-badge">Mouse / Pointer</span>
              <span>Drag or slide pointer to steer</span>
            </div>
          </div>

          <button className="start-btn" onClick={clickStart}>
            <Play className="h-4 w-4" /> Start Strategy Assessment
          </button>
        </section>
      )}

      {/* Game Canvas Wrapper */}
      <section className="racing-canvas-wrapper">
        <canvas ref={canvasRef} className="racing-canvas" />

        {/* HUD Displays */}
        {started && (
          <>
            <button className="play-back-btn" onClick={onBack || (() => window.history.back())} title="Exit Game">
              ← Exit
            </button>
            <div className="racing-hud">
              <div className="hud-panel">
                <span className="hud-title">Circuit</span>
                <span className="hud-value text-sky-400">{TRACKS[trackIndexRef.current].name}</span>
              </div>
              <div className="hud-panel">
                <span className="hud-title">Time remaining</span>
                <span className="hud-value text-rose-400">
                  {Math.floor(timePreview / 60)}:
                  {String(timePreview % 60).padStart(2, "0")}
                </span>
              </div>
              <div className="hud-panel">
                <span className="hud-title">Speed</span>
                <span className="hud-value text-amber-400">{speedVal} <span className="text-[8px] font-bold">km/h</span></span>
              </div>
              <div className="hud-panel">
                <span className="hud-title">Progress</span>
                <div className="flex items-center gap-1.5" style={{ marginTop: '2px' }}>
                  <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-emerald-400 transition-all duration-100 ease-out" style={{ width: `${progressVal}%` }} />
                  </div>
                  <span className="hud-value text-emerald-400" style={{ fontSize: '10px' }}>{progressVal}%</span>
                </div>
              </div>
            </div>

            {/* Dynamic Adaptive alerts */}
            {adaptiveMessage && (
              <div className="adaptive-overlay">{adaptiveMessage}</div>
            )}

            {/* Touchscreen Steering & Braking Buttons (Mobile/Tablet support) */}
            <div className="touch-controls">
              <div className="control-group">
                <button
                  className="control-btn"
                  onTouchStart={() => {
                    const veh = vehicleEngine.current.state;
                    veh.steering = -1;
                  }}
                  onTouchEnd={() => {
                    const veh = vehicleEngine.current.state;
                    veh.steering = 0;
                  }}
                  onMouseDown={() => {
                    const veh = vehicleEngine.current.state;
                    veh.steering = -1;
                  }}
                  onMouseUp={() => {
                    const veh = vehicleEngine.current.state;
                    veh.steering = 0;
                  }}
                >
                  ◀
                </button>
                <button
                  className="control-btn"
                  onTouchStart={() => {
                    const veh = vehicleEngine.current.state;
                    veh.steering = 1;
                  }}
                  onTouchEnd={() => {
                    const veh = vehicleEngine.current.state;
                    veh.steering = 0;
                  }}
                  onMouseDown={() => {
                    const veh = vehicleEngine.current.state;
                    veh.steering = 1;
                  }}
                  onMouseUp={() => {
                    const veh = vehicleEngine.current.state;
                    veh.steering = 0;
                  }}
                >
                  ▶
                </button>
              </div>

              <div className="control-group">
                <button
                  className="control-btn"
                  style={{ background: "rgba(239, 68, 68, 0.25)", borderColor: "#dc2626" }}
                  onTouchStart={() => {
                    const veh = vehicleEngine.current.state;
                    veh.braking = true;
                    veh.accelerating = false;
                  }}
                  onTouchEnd={() => {
                    const veh = vehicleEngine.current.state;
                    veh.braking = false;
                  }}
                  onMouseDown={() => {
                    const veh = vehicleEngine.current.state;
                    veh.braking = true;
                    veh.accelerating = false;
                  }}
                  onMouseUp={() => {
                    const veh = vehicleEngine.current.state;
                    veh.braking = false;
                  }}
                >
                  {speedVal <= 0 ? "REVERSE" : "BRAKE"}
                </button>
                <button
                  className="control-btn"
                  style={{ background: "rgba(16, 185, 129, 0.25)", borderColor: "#10b981" }}
                  onTouchStart={() => {
                    const veh = vehicleEngine.current.state;
                    veh.accelerating = true;
                    veh.braking = false;
                  }}
                  onTouchEnd={() => {
                    const veh = vehicleEngine.current.state;
                    veh.accelerating = false;
                  }}
                  onMouseDown={() => {
                    const veh = vehicleEngine.current.state;
                    veh.accelerating = true;
                    veh.braking = false;
                  }}
                  onMouseUp={() => {
                    const veh = vehicleEngine.current.state;
                    veh.accelerating = false;
                  }}
                >
                  GO
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
