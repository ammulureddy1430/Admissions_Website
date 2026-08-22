"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Timer } from "lucide-react";
import { BallSortAnalyticsService } from "./AnalyticsService";
import { scoreBallSort } from "./ScoringEngine";
import type { BallColor, Tube, RawBallSortMetrics, BallSortScores } from "./Types";
import "./BallSortGame.css";

// Web Audio sound synthesizer for asset-free premium audio feedback
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

  playPop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDrop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
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

// Progressive levels configuration matching child developmental guidelines
const LEVELS: { colors: BallColor[]; tubes: BallColor[][]; capacity: number }[] = [
  {
    // Level 1: 2 colors, 3 tubes total (1 empty) - Extremely simple to understand
    colors: ["red", "blue"],
    tubes: [
      ["red", "blue", "red"],
      ["blue", "red", "blue"],
      [],
    ],
    capacity: 3,
  },
  {
    // Level 2: 3 colors, 4 tubes total (1 empty)
    colors: ["red", "blue", "green"],
    tubes: [
      ["red", "green", "blue"],
      ["green", "blue", "red"],
      ["blue", "red", "green"],
      [],
    ],
    capacity: 3,
  },
  {
    // Level 3: 3 colors (more mixed), 4 tubes total
    colors: ["red", "blue", "yellow"],
    tubes: [
      ["yellow", "red", "blue"],
      ["blue", "yellow", "red"],
      ["red", "blue", "yellow"],
      [],
    ],
    capacity: 3,
  },
  {
    // Level 4: 4 colors, 5 tubes total (1 empty)
    colors: ["red", "blue", "green", "yellow"],
    tubes: [
      ["red", "green", "yellow"],
      ["blue", "red", "green"],
      ["yellow", "blue", "red"],
      ["green", "yellow", "blue"],
      [],
    ],
    capacity: 3,
  },
];

export default function BallSortGame({
  disabled = false,
  sound = true,
  durationSeconds = 120,
  onComplete,
}: {
  disabled?: boolean;
  sound?: boolean;
  durationSeconds?: number;
  onComplete: (metrics: BallSortScores) => void | Promise<void>;
}) {
  const startedAt = useRef(0);
  const levelsCompleted = useRef(0);
  const totalMoves = useRef(0);
  const correctMoves = useRef(0);
  const incorrectMoves = useRef(0);
  const highestLevel = useRef(1);
  
  const finished = useRef(false);
  const sounds = useRef<SoundSynth | null>(null);
  const analytics = useRef(new BallSortAnalyticsService(onComplete));

  const [started, setStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [tubes, setTubes] = useState<Tube[]>([]);
  const [selectedTubeId, setSelectedTubeId] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ sourceTubeId: number; color: BallColor; pointerId: number; x: number; y: number } | null>(null);
  const [invalidTubeId, setInvalidTubeId] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [seconds, setSeconds] = useState(durationSeconds);
  const [celebrating, setCelebrating] = useState(false);
  const [result, setResult] = useState<BallSortScores | null>(null);

  // Initialize sounds and analytics reference
  useEffect(() => {
    sounds.current = new SoundSynth(sound);
    analytics.current = new BallSortAnalyticsService(onComplete);
  }, [sound, onComplete]);

  // Load level configuration
  const loadLevel = useCallback((lvlIndex: number) => {
    const data = LEVELS[Math.min(lvlIndex - 1, LEVELS.length - 1)];
    const configuredTubes = data.tubes.map((balls, idx) => ({
      id: idx + 1,
      balls: [...balls],
      capacity: data.capacity,
    }));
    setTubes(configuredTubes);
    setSelectedTubeId(null);
    setDrag(null);
  }, []);

  // Finish game assessment
  const finish = useCallback(
    async (status: RawBallSortMetrics["completionStatus"]) => {
      if (finished.current) return;
      finished.current = true;
      setSelectedTubeId(null);

      const elapsed = Math.min(durationSeconds, Math.floor((Date.now() - startedAt.current) / 1000));
      const accuracy = totalMoves.current
        ? (correctMoves.current / totalMoves.current) * 100
        : 0;
      
      // Calculate efficiency: optimal moves approximation (e.g. correct ratio scaled)
      const efficiency = totalMoves.current
        ? correctMoves.current / (totalMoves.current + incorrectMoves.current * 0.5)
        : 0;

      const rawMetrics: RawBallSortMetrics = {
        levels_started: Math.max(1, levelsCompleted.current + (status === "COMPLETED" ? 0 : 1)),
        levels_completed: levelsCompleted.current,
        total_moves: totalMoves.current,
        correct_moves: correctMoves.current,
        incorrect_moves: incorrectMoves.current,
        completion_time: elapsed,
        highest_level: highestLevel.current,
        sorting_accuracy: accuracy,
        efficiency: Math.min(1, Math.max(0, efficiency)),
        completionStatus: status,
      };

      const finalScores = scoreBallSort(rawMetrics);
      setResult(finalScores);
      await analytics.current.save(finalScores);
    },
    [durationSeconds]
  );

  // Timer loop
  useEffect(() => {
    if (disabled || !started || finished.current) return;
    const interval = window.setInterval(() => {
      setSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [disabled, started]);

  useEffect(() => {
    if (seconds === 0 && started && !finished.current) {
      void finish("TIMEOUT");
    }
  }, [seconds, started, finish]);

  const handleStart = () => {
    startedAt.current = Date.now();
    setStarted(true);
    loadLevel(1);
  };

  // Check if all tubes are solved (either empty or full of identical colors)
  const checkWinCondition = useCallback((currentTubes: Tube[]): boolean => {
    return currentTubes.every((tube) => {
      if (tube.balls.length === 0) return true;
      if (tube.balls.length !== tube.capacity) return false;
      const first = tube.balls[0];
      return tube.balls.every((c) => c === first);
    });
  }, []);

  const attemptMove = useCallback((sourceTubeId: number, targetTubeId: number | null) => {
    if (disabled || finished.current || celebrating) return;
    const sourceTube = tubes.find((t) => t.id === sourceTubeId);
    const targetTube = targetTubeId === null ? null : tubes.find((t) => t.id === targetTubeId);
    if (!sourceTube || !sourceTube.balls.length) return;

    const topBall = sourceTube.balls[sourceTube.balls.length - 1];
    totalMoves.current++;
    setMoveCount(totalMoves.current);

    const hasSpace = Boolean(targetTube && targetTube.balls.length < targetTube.capacity);
    const targetIsEmpty = targetTube?.balls.length === 0;
    const targetTopBallColorMatches = Boolean(
      targetTube && targetTube.balls[targetTube.balls.length - 1] === topBall,
    );
    const validMove = Boolean(
      targetTube && targetTube.id !== sourceTube.id && hasSpace && (targetIsEmpty || targetTopBallColorMatches),
    );

      if (validMove && targetTube) {
        // Valid Move
        sounds.current?.playDrop();
        correctMoves.current++;

        const nextTubes = tubes.map((t) => {
          if (t.id === sourceTube.id) {
            return { ...t, balls: t.balls.slice(0, -1) };
          }
          if (t.id === targetTube.id) {
            return { ...t, balls: [...t.balls, topBall] };
          }
          return t;
        });

        setTubes(nextTubes);
        setSelectedTubeId(null);

        // Check if level solved
        if (checkWinCondition(nextTubes)) {
          levelsCompleted.current++;
          sounds.current?.playLevelUp();
          
          if (level >= LEVELS.length) {
            // Last level solved
            void finish("COMPLETED");
          } else {
            // Go to next level
            setCelebrating(true);
            window.setTimeout(() => {
              setCelebrating(false);
              const nextLevel = level + 1;
              highestLevel.current = Math.max(highestLevel.current, nextLevel);
              setLevel(nextLevel);
              loadLevel(nextLevel);
            }, 1200);
          }
        }
    } else {
      incorrectMoves.current++;
      setInvalidTubeId(targetTubeId);
      sounds.current?.playDrop();
      window.setTimeout(() => setInvalidTubeId(null), 320);
    }
  }, [disabled, celebrating, tubes, checkWinCondition, level, finish, loadLevel]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>, tube: Tube) => {
    if (disabled || finished.current || celebrating || !tube.balls.length) return;
    const color = tube.balls[tube.balls.length - 1];
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedTubeId(tube.id);
    setDrag({ sourceTubeId: tube.id, color, pointerId: event.pointerId, x: event.clientX, y: event.clientY });
    sounds.current?.playPop();
  };

  useEffect(() => {
    if (!drag) return;

    const move = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      setDrag((current) => current && current.pointerId === event.pointerId
        ? { ...current, x: event.clientX, y: event.clientY }
        : current);
    };
    const release = (event: PointerEvent) => {
      if (event.pointerId !== drag.pointerId) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-tube-id]");
      const targetTubeId = target ? Number(target.dataset.tubeId) : null;
      setDrag(null);
      setSelectedTubeId(null);
      attemptMove(drag.sourceTubeId, Number.isFinite(targetTubeId) ? targetTubeId : null);
    };
    const cancel = () => {
      setDrag(null);
      setSelectedTubeId(null);
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", keyDown);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", keyDown);
    };
  }, [drag, attemptMove]);

  const progressPercentage = ((durationSeconds - seconds) / durationSeconds) * 100;

  // Format timer text
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="ball-sort-container" role="application" aria-label="Ball Sort game assessment">
      {/* HUD Bar */}
      <div className="ball-sort-hud">
        <div className="ball-sort-level">
          <span>LEVEL</span>
          <b>{level} / {LEVELS.length}</b>
        </div>
        <div className="ball-sort-hud-center">
          <h2>Put same colors in one tube!</h2>
          <p>Drag the top ball into another tube. Every drop counts.</p>
        </div>
        <div className="ball-sort-timer">
          <Timer className="h-5 w-5" />
          <strong>{formatTime(seconds)}</strong>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-[80px] left-0 right-0 h-1 bg-[#102a43]/50 z-20">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-1000"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Gameplay Arena */}
      <div className="ball-sort-gameplay">
        {tubes.map((tube) => {
          const isSelected = selectedTubeId === tube.id;
          return (
            <div
              key={tube.id}
              data-tube-id={tube.id}
              className={`ball-sort-tube-container ${invalidTubeId === tube.id ? "invalid-drop" : ""}`}
            >
              <div className={`ball-sort-tube ${isSelected ? "selected" : ""}`}>
                {tube.balls.map((color, index) => {
                  const isTopBall = index === tube.balls.length - 1;
                  return (
                    <div
                      key={index}
                      className={`ball-sort-ball ${color} ${
                        isSelected && isTopBall ? "selected-hover" : ""
                      } ${drag?.sourceTubeId === tube.id && isTopBall ? "drag-source" : ""}`}
                      onPointerDown={isTopBall ? (event) => startDrag(event, tube) : undefined}
                    />
                  );
                })}
              </div>
              <span className="ball-sort-tube-label">TUBE {tube.id}</span>
            </div>
          );
        })}
      </div>

      {drag && (
        <div className={`ball-sort-drag-ball ${drag.color}`} style={{ left: drag.x, top: drag.y }} aria-hidden />
      )}

      <div className="ball-sort-footer">
        <span>MOVES: {moveCount}</span>
      </div>

      {/* Intro Modal Overlay */}
      {!started && (
        <div className="ball-sort-intro">
          <div className="ball-sort-intro-card">
            <div className="ball-sort-intro-mark">🧪</div>
            <p>2 MINUTES · 5 LEVELS</p>
            <h2>Ball Sort Puzzle</h2>
            <span className="ball-sort-intro-copy">
              Sort the colored balls so each container has only one color. 
              Only place matching colors together!
            </span>
            <button type="button" onClick={handleStart}>
              <Play className="h-5 w-5 fill-current" /> Start Sorting
            </button>
          </div>
        </div>
      )}

      {/* Celebrating Level Up Overlay */}
      {celebrating && (
        <div className="ball-sort-celebration">
          <span>🌟 Level Complete! 🌟</span>
        </div>
      )}

      {/* Finish Overlay */}
      {result && (
        <div className="ball-sort-finish">
          <div>
            <span>🏁</span>
            <h2>Well Done!</h2>
            <p>You completed {result.levels_completed} sorting tasks!</p>
          </div>
        </div>
      )}
    </div>
  );
}
