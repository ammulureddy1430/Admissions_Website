"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  HelpCircle,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
} from "lucide-react";
import { SOKOBAN_LEVELS } from "./Levels";
import {
  cellAt,
  directionForKey,
  loadLevel,
  movePlayer,
  resetLevel,
  timedOut,
} from "./SokobanEngine";
import { scoreSokoban } from "./ScoringEngine";
import type { Direction, SokobanAttempt, SokobanMetrics } from "./Types";
import "./SokobanGame.css";

type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (metrics: SokobanMetrics) => void | Promise<void>;
};

const ROUND_SECONDS = 20;

export default function SokobanGame({
  disabled = false,
  remainingSeconds,
  practiceOnly = false,
  onComplete,
}: Props) {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = SOKOBAN_LEVELS[levelIndex];
  const [state, setState] = useState(() => loadLevel(level));
  const [transitioning, setTransitioning] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(practiceOnly);
  const [roundSeconds, setRoundSeconds] = useState(ROUND_SECONDS);
  const attempts = useRef<SokobanAttempt[]>([]);
  const levelMoves = useRef(0),
    levelPushes = useRef(0),
    blocked = useRef(0),
    badPushes = useRef(0),
    deadlocks = useRef(0),
    resets = useRef(0);
  const startedAt = useRef(0),
    finished = useRef(false),
    transitionTimer = useRef<number | null>(null),
    touchStart = useRef<{ x: number; y: number } | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    startedAt.current = performance.now();
    return () => {
      if (transitionTimer.current !== null)
        window.clearTimeout(transitionTimer.current);
    };
  }, []);

  const finish = useCallback(
    (status: string, includeCurrent = false) => {
      if (finished.current) return;
      finished.current = true;
      if (transitionTimer.current !== null)
        window.clearTimeout(transitionTimer.current);
      const recorded = [...attempts.current];
      if (
        includeCurrent &&
        (levelMoves.current || blocked.current || resets.current)
      )
        recorded.push({
          levelId: level.id,
          difficulty: level.difficulty,
          completed: false,
          moves: levelMoves.current,
          pushes: levelPushes.current,
          unnecessaryMoves: blocked.current,
          unnecessaryPushes: badPushes.current,
          deadlocks: deadlocks.current,
          resets: resets.current,
          optimalMoves: level.optimalMoves,
          completionTime: Math.round(performance.now() - startedAt.current),
        });
      setTransitioning(false);
      void onCompleteRef.current(scoreSokoban(recorded, status));
    },
    [level],
  );

  useEffect(() => {
    if (!practiceOnly && timedOut(remainingSeconds))
      finish("TIME_LIMIT_REACHED", true);
  }, [finish, practiceOnly, remainingSeconds]);

  const nextRound = useCallback(
    (completed: boolean) => {
      if (
        disabled ||
        transitioning ||
        transitionTimer.current !== null ||
        finished.current
      )
        return;
      attempts.current.push({
        levelId: level.id,
        difficulty: level.difficulty,
        completed,
        moves: levelMoves.current,
        pushes: levelPushes.current,
        unnecessaryMoves: blocked.current,
        unnecessaryPushes: badPushes.current,
        deadlocks: deadlocks.current,
        resets: resets.current,
        optimalMoves: level.optimalMoves,
        completionTime: Math.round(performance.now() - startedAt.current),
      });
      setTransitioning(true);
      transitionTimer.current = window.setTimeout(
        () => {
          transitionTimer.current = null;
          if (levelIndex + 1 >= SOKOBAN_LEVELS.length) {
            finish("COMPLETED");
            return;
          }
          const next = SOKOBAN_LEVELS[levelIndex + 1];
          levelMoves.current = 0;
          levelPushes.current = 0;
          blocked.current = 0;
          badPushes.current = 0;
          deadlocks.current = 0;
          resets.current = 0;
          startedAt.current = performance.now();
          setRoundSeconds(ROUND_SECONDS);
          setLevelIndex((value) => value + 1);
          setState(loadLevel(next));
          setTransitioning(false);
        },
        completed ? 620 : 250,
      );
    },
    [disabled, finish, level, levelIndex, transitioning],
  );

  useEffect(() => {
    if (disabled || transitioning || showHowToPlay || finished.current) return;
    const timer = window.setInterval(() => {
      setRoundSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          nextRound(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [disabled, nextRound, showHowToPlay, transitioning]);

  const move = useCallback(
    (direction: Direction) => {
      if (disabled || transitioning || showHowToPlay || finished.current)
        return;
      setState((current) => {
        const result = movePlayer(current, direction);
        if (result.moved) levelMoves.current += 1;
        if (result.pushed) levelPushes.current += 1;
        if (result.blocked) blocked.current += 1;
        if (result.deadlock) {
          badPushes.current += 1;
          deadlocks.current += 1;
        }
        if (!result.state.completed) return result.state;
        nextRound(true);
        return result.state;
      });
    },
    [disabled, nextRound, showHowToPlay, transitioning],
  );

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const direction = directionForKey(event.key);
      if (!direction) return;
      event.preventDefault();
      move(direction);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [move]);

  const reset = () => {
    if (disabled || transitioning || showHowToPlay) return;
    resets.current += 1;
    setState(resetLevel(level));
  };
  const endSwipe = (x: number, y: number) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = x - start.x,
      dy = y - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 34) return;
    move(
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up",
    );
  };
  const cells = Array.from({ length: state.rows * state.cols }, (_, index) => ({
    row: Math.floor(index / state.cols),
    col: index % state.cols,
  }));

  return (
    <div
      className={`sokoban-game${transitioning ? " is-transitioning" : ""}`}
      onPointerDown={(event) => {
        if (showHowToPlay) return;
        touchStart.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        if (!showHowToPlay) endSwipe(event.clientX, event.clientY);
      }}
    >
      <div className="sokoban-game__progress" aria-hidden>
        {SOKOBAN_LEVELS.map((item, index) => (
          <i key={item.id} className={index <= levelIndex ? "is-active" : ""} />
        ))}
      </div>
      <div
        className={`sokoban-game__timer${roundSeconds <= 5 ? " is-low" : ""}`}
        role="timer"
        aria-label={`${roundSeconds} seconds left in this round`}
      >
        <Timer />
        <span>{roundSeconds}</span>
      </div>
      <div
        className="sokoban-game__board"
        style={{ gridTemplateColumns: `repeat(${state.cols}, 1fr)` }}
        aria-label="Treasure delivery puzzle board"
      >
        {cells.map((position) => {
          const cell = cellAt(state, position);
          return (
            <span
              key={`${position.row}-${position.col}`}
              className={`sokoban-game__cell sokoban-game__cell--${cell}`}
              aria-hidden
            >
              <i className="sokoban-game__goal">★</i>
              <i className="sokoban-game__box">◆</i>
              <i className="sokoban-game__player">
                <b />
              </i>
            </span>
          );
        })}
      </div>
      <div className="sokoban-game__controls" aria-label="Movement controls">
        <button
          className="up"
          type="button"
          onPointerUp={(event) => {
            event.stopPropagation();
            move("up");
          }}
          disabled={disabled || transitioning}
          aria-label="Move up"
        >
          <ArrowUp />
        </button>
        <button
          className="left"
          type="button"
          onPointerUp={(event) => {
            event.stopPropagation();
            move("left");
          }}
          disabled={disabled || transitioning}
          aria-label="Move left"
        >
          <ArrowLeft />
        </button>
        <button
          className="down"
          type="button"
          onPointerUp={(event) => {
            event.stopPropagation();
            move("down");
          }}
          disabled={disabled || transitioning}
          aria-label="Move down"
        >
          <ArrowDown />
        </button>
        <button
          className="right"
          type="button"
          onPointerUp={(event) => {
            event.stopPropagation();
            move("right");
          }}
          disabled={disabled || transitioning}
          aria-label="Move right"
        >
          <ArrowRight />
        </button>
      </div>
      <button
        className="sokoban-game__next"
        type="button"
        onPointerUp={(event) => {
          event.stopPropagation();
          nextRound(false);
        }}
        disabled={disabled || transitioning || showHowToPlay}
        aria-label="Skip this puzzle and go to the next round"
      >
        <span>Next</span>
        <SkipForward />
      </button>
      <button
        className="sokoban-game__help"
        type="button"
        onPointerUp={(event) => {
          event.stopPropagation();
          setShowHowToPlay(true);
        }}
        aria-label="Show how to play"
      >
        <HelpCircle />
      </button>
      <button
        className="sokoban-game__reset"
        type="button"
        onPointerUp={(event) => {
          event.stopPropagation();
          reset();
        }}
        disabled={disabled || transitioning}
        aria-label="Reset puzzle"
      >
        <RotateCcw />
      </button>
      {showHowToPlay && (
        <div
          className="sokoban-game__how-to"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sokoban-how-to-title"
        >
          <div className="sokoban-game__how-to-card">
            <h2 id="sokoban-how-to-title">Push every box onto a star!</h2>
            <div className="sokoban-game__demo" aria-hidden>
              <DemoPlayer />
              <ArrowRight className="sokoban-game__demo-arrow" />
              <span className="sokoban-game__demo-box">◆</span>
              <ArrowRight className="sokoban-game__demo-arrow" />
              <span className="sokoban-game__demo-goal">★</span>
            </div>
            <p>
              Use the arrows to walk. Stand beside a box and move toward it to
              push it.
            </p>
            <p className="sokoban-game__warning">
              Boxes can be pushed, but they cannot be pulled.
            </p>
            <button
              className="sokoban-game__play"
              type="button"
              onPointerUp={(event) => {
                event.stopPropagation();
                setShowHowToPlay(false);
              }}
              aria-label="Start playing"
            >
              <Play fill="currentColor" />
              Play
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoPlayer() {
  return (
    <span className="sokoban-game__demo-player" aria-hidden>
      <b />
    </span>
  );
}
