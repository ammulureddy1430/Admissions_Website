"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Timer, Footprints, Keyboard, MousePointer2, Target } from "lucide-react";
import { RedLightGreenLightAnalyticsService } from "./AnalyticsService";
import { scoreRedLightGreenLight } from "./ScoringEngine";
import type { RawRedLightGreenLightMetrics, RedLightGreenLightScores } from "./Types";
import "./RedLightGreenLightGame.css";

// Web Audio sound synthesizer for child-friendly feedback
class SoundSynth {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  playGreen() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playRed() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(220, this.ctx.currentTime); // A3 (lower alert tone)
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playLevelUp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const playNote = (freq: number, start: number, duration: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };
    playNote(523.25, now, 0.15); // C5
    playNote(659.25, now + 0.12, 0.15); // E5
    playNote(783.99, now + 0.24, 0.15); // G5
    playNote(1046.50, now + 0.36, 0.3); // C6
  }
}

// Progressive levels configuration
// Green/Red durations are longer and more predictable at Level 1, and shorter/unpredictable at Level 4
const LEVEL_TIMINGS = [
  { greenMin: 3500, greenMax: 5000, redMin: 2500, redMax: 3500 }, // Level 1
  { greenMin: 2500, greenMax: 4000, redMin: 2000, redMax: 3000 }, // Level 2
  { greenMin: 2000, greenMax: 3000, redMin: 1500, redMax: 2500 }, // Level 3
  { greenMin: 1200, greenMax: 2500, redMin: 1200, redMax: 2000 }, // Level 4
];

export default function RedLightGreenLightGame({
  disabled = false,
  sound = true,
  durationSeconds = 120,
  onComplete,
}: {
  disabled?: boolean;
  sound?: boolean;
  durationSeconds?: number;
  onComplete: (metrics: RedLightGreenLightScores) => void | Promise<void>;
}) {
  const startedAt = useRef(0);
  const finished = useRef(false);
  const sounds = useRef<SoundSynth | null>(null);
  const analytics = useRef(new RedLightGreenLightAnalyticsService(onComplete));

  const [started, setStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [lightState, setLightState] = useState<"GREEN" | "RED">("GREEN");
  const [isPressing, setIsPressing] = useState(false);
  const [characterProgress, setCharacterProgress] = useState(0); // 0 to 100%
  const [seconds, setSeconds] = useState(durationSeconds);
  const [celebrating, setCelebrating] = useState(false);
  const [result, setResult] = useState<RedLightGreenLightScores | null>(null);
  const [feedback, setFeedback] = useState("Wait for GREEN, then hold to walk");
  const [mistakes, setMistakes] = useState(0);

  // Performance metrics logs
  const greenLightEvents = useRef(0);
  const redLightEvents = useRef(0);
  const correctStarts = useRef(0);
  const correctStops = useRef(0);
  const prematureMovements = useRef(0);
  
  // Latency metrics logs
  const lightStateChangedAt = useRef(0);
  const greenStartTimes = useRef<number[]>([]);
  const redStopTimes = useRef<number[]>([]);
  const startedOnThisGreen = useRef(false);
  const violatedThisRed = useRef(false);
  const pressingRef = useRef(false);

  const overallProgress = Math.min(100, Math.round((((level - 1) + characterProgress / 85) / 4) * 100));

  // Sound and analytics instance init
  useEffect(() => {
    sounds.current = new SoundSynth(sound);
    analytics.current = new RedLightGreenLightAnalyticsService(onComplete);
  }, [sound, onComplete]);

  // General finish routine
  const finish = useCallback(
    async (status: RawRedLightGreenLightMetrics["completionStatus"]) => {
      if (finished.current) return;
      finished.current = true;
      setIsPressing(false);

      const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const averageStartReactionTime = Math.round(avg(greenStartTimes.current));
      const averageStopReactionTime = Math.round(avg(redStopTimes.current));

      const rawMetrics: RawRedLightGreenLightMetrics = {
        greenLightEvents: greenLightEvents.current,
        redLightEvents: redLightEvents.current,
        correctStarts: correctStarts.current,
        correctStops: correctStops.current,
        prematureMovements: prematureMovements.current,
        averageStartReactionTime,
        averageStopReactionTime,
        progress: overallProgress,
        difficultyReached: level,
        completionStatus: status,
      };

      const finalScores = scoreRedLightGreenLight(rawMetrics);
      setResult(finalScores);
      await analytics.current.save(finalScores);
    },
    [overallProgress, level]
  );

  // Main countdown timer loop
  useEffect(() => {
    if (disabled || !started || finished.current) return;
    const interval = window.setInterval(() => {
      setSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [disabled, started]);

  // Session timeout checker
  useEffect(() => {
    if (seconds === 0 && started && !finished.current) {
      void finish("TIMEOUT");
    }
  }, [seconds, started, finish]);

  // Start game handler
  const handleStart = () => {
    startedAt.current = Date.now();
    setStarted(true);
    lightStateChangedAt.current = Date.now();
    greenLightEvents.current = 1;
  };

  // Randomized signal transitions
  useEffect(() => {
    if (disabled || !started || finished.current || celebrating) return;

    const currentTimings = LEVEL_TIMINGS[level - 1] || LEVEL_TIMINGS[LEVEL_TIMINGS.length - 1];
    
    // Choose delay based on state
    const delay = lightState === "GREEN"
      ? Math.floor(Math.random() * (currentTimings.greenMax - currentTimings.greenMin)) + currentTimings.greenMin
      : Math.floor(Math.random() * (currentTimings.redMax - currentTimings.redMin)) + currentTimings.redMin;

    const timer = window.setTimeout(() => {
      const nextState = lightState === "GREEN" ? "RED" : "GREEN";
      setLightState(nextState);
      lightStateChangedAt.current = Date.now();

      if (nextState === "GREEN") {
        greenLightEvents.current++;
        startedOnThisGreen.current = false;
        setFeedback("GREEN — hold the button or Space to walk!");
        sounds.current?.playGreen();
      } else {
        redLightEvents.current++;
        violatedThisRed.current = false;
        setFeedback("RED — release now and freeze!");
        sounds.current?.playRed();
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [started, lightState, level, disabled, celebrating]);

  // Walking/Movement loops
  useEffect(() => {
    if (disabled || !started || finished.current || celebrating) return;
    if (!isPressing) return;

    const interval = window.setInterval(() => {
      if (lightState === "GREEN") {
        setCharacterProgress((prev) => Math.min(85, prev + 1.2));
      } else if (!violatedThisRed.current) {
        violatedThisRed.current = true;
        prematureMovements.current++;
        setMistakes(prematureMovements.current);
        setFeedback("Oops! Freeze on RED — try again");
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [isPressing, lightState, level, disabled, celebrating]);

  // Level completion / win checks effect
  useEffect(() => {
    if (characterProgress >= 85 && !celebrating && !finished.current) {
      sounds.current?.playLevelUp();
      if (level >= 4) {
        // Final level solved
        void finish("COMPLETED");
      } else {
        setCelebrating(true);
        setIsPressing(false);
        const timer = window.setTimeout(() => {
          setCelebrating(false);
          setCharacterProgress(0);
          setLevel((prevLvl) => prevLvl + 1);
        }, 1200);
        return () => window.clearTimeout(timer);
      }
    }
  }, [characterProgress, level, celebrating, finish]);

  // Tap-and-Hold Button Handlers
  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (disabled || finished.current || celebrating) return;
    
    if (pressingRef.current) return;
    pressingRef.current = true;
    setIsPressing(true);

    if (lightState === "GREEN") {
      if (!startedOnThisGreen.current) {
        startedOnThisGreen.current = true;
        correctStarts.current++;
        greenStartTimes.current.push(Date.now() - lightStateChangedAt.current);
      }
      setFeedback("Great! Keep holding while it is GREEN");
    } else if (!violatedThisRed.current) {
      // Immediate red light walk violation
      violatedThisRed.current = true;
      prematureMovements.current++;
      setMistakes(prematureMovements.current);
      setFeedback("Not yet — wait for GREEN");
    }
  };

  const handlePressEnd = () => {
    if (!pressingRef.current) return;
    pressingRef.current = false;
    setIsPressing(false);

    if (lightState === "RED") {
      correctStops.current++;
      // Log stop reaction latency (time since light turned red)
      const latency = Date.now() - lightStateChangedAt.current;
      redStopTimes.current.push(latency);
      if (!violatedThisRed.current) setFeedback("Perfect stop! Wait for GREEN");
    }
  };

  useEffect(() => {
    if (!started || result || disabled || celebrating) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      handlePressStart(event as unknown as React.MouseEvent);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      event.preventDefault();
      handlePressEnd();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      pressingRef.current = false;
    };
  }, [started, result, disabled, celebrating, lightState]);

  // Convert timer formatting
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rlgl-container" role="application" aria-label="Red Light, Green Light assessment">
      {/* HUD status */}
      <div className="rlgl-hud">
        <div className="rlgl-level">
          <span>LEVEL</span>
          <b>{level} / 4</b>
        </div>
        <div className="rlgl-level">
          <span>GAME PROGRESS</span>
          <b>{overallProgress}%</b>
        </div>
        <div className="rlgl-level rlgl-mistakes"><span>MISTAKES</span><b>{mistakes}</b></div>
        <div className={`rlgl-timer ${seconds <= 10 ? "warning" : ""}`} aria-label={`${seconds} seconds left`}>
          <Timer className="h-5 w-5" />
          <span><small>TIME LEFT</small><strong>{formatTime(seconds)}</strong></span>
        </div>
      </div>

      <div className="rlgl-time-track" aria-hidden="true">
        <span style={{ width: `${Math.max(0, (seconds / durationSeconds) * 100)}%` }} />
      </div>

      {/* Graphical Signal Light */}
      <div className="rlgl-signal-container">
        <div className="rlgl-light-box">
          <div className={`rlgl-light-circle red ${lightState === "RED" ? "active" : ""}`} />
          <div className={`rlgl-light-circle green ${lightState === "GREEN" ? "active" : ""}`} />
        </div>
        <span className={`rlgl-signal-status ${lightState.toLowerCase()}`}>
          {lightState === "GREEN" ? "🟢 WALK" : "🔴 STOP"}
        </span>
        <span className="rlgl-feedback" aria-live="polite">{feedback}</span>
      </div>

      {/* Path Playfield */}
      <div className="rlgl-playfield">
        <div className="rlgl-track-lane">
          {/* FOX Character */}
          <div
            className={`rlgl-character ${isPressing && lightState === "GREEN" ? "walking" : ""}`}
            style={{ left: `${characterProgress}%` }}
          >
            🦊
          </div>
          <div className="rlgl-finish-gate" />
          <span className="rlgl-finish-label">FINISH</span>
        </div>
      </div>

      {/* Button Controls */}
      <div className="rlgl-controls-container">
        <button
          type="button"
          className={`rlgl-hold-btn ${lightState === "RED" ? "danger-state" : ""}`}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressEnd}
          disabled={!started || disabled || Boolean(result)}
          aria-label="Hold to walk on green; release to stop on red"
        >
          <Footprints className="h-10 w-10" />
          <span>{isPressing ? "WALKING..." : "HOLD TO WALK"}</span>
        </button>
        <span className="rlgl-hold-label mt-4">Hold button or Space on GREEN · release on RED</span>
      </div>

      {/* Intro Overlay Card */}
      {!started && (
        <div className="rlgl-intro">
          <div className="rlgl-intro-card">
            <div className="rlgl-intro-mark">🦊</div>
            <p>{Math.ceil(durationSeconds / 60)} MIN · 4 LEVELS</p>
            <h2>Red Light, Green Light</h2>
            <div className="rlgl-how-to-play">
              <div><span><Target /></span><b>1. Watch</b><small>Look at the traffic light.</small></div>
              <div><span><MousePointer2 /></span><b>2. Walk</b><small>Hold the button on GREEN.</small></div>
              <div><span><Keyboard /></span><b>3. Freeze</b><small>Release immediately on RED.</small></div>
            </div>
            <span className="rlgl-intro-copy">Reach the finish line in all 4 levels. You can also hold the <kbd>Space</kbd> key.</span>
            <button type="button" onClick={handleStart}>
              <Play className="h-5 w-5 fill-current" /> Start Game
            </button>
          </div>
        </div>
      )}

      {/* Celebration Level-Up Overlay */}
      {celebrating && (
        <div className="rlgl-celebration">
          <span>🌟 Level Complete! 🌟</span>
        </div>
      )}

      {/* Final results summary screen */}
      {result && (
        <div className="rlgl-finish">
          <div>
            <span>🏁</span>
            <h2>Well Done!</h2>
            <p>You completed level {result.difficultyReached} of the self-regulation challenge!</p>
          </div>
        </div>
      )}
    </div>
  );
}
