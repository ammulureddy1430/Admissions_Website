"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  HelpCircle,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
} from "lucide-react";
import {
  applyJugAction,
  CHALLENGES,
  createJugs,
  isUnnecessaryAction,
  targetReached,
  timedOut,
} from "./WaterJugsEngine";
import { scoreWaterJugs } from "./ScoringEngine";
import type { ChallengeAttempt, JugAction, WaterJugsMetrics } from "./Types";
import "./WaterJugsGame.css";

type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (metrics: WaterJugsMetrics) => void | Promise<void>;
};

const ROUND_SECONDS = 30;

export default function WaterJugsGame({
  disabled = false,
  remainingSeconds,
  practiceOnly = false,
  onComplete,
}: Props) {
  const [challengeIndex, setChallengeIndex] = useState(0);
  const challenge = CHALLENGES[challengeIndex];
  const [jugs, setJugs] = useState(() => createJugs(challenge.capacities));
  const [selected, setSelected] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(practiceOnly);
  const [roundSeconds, setRoundSeconds] = useState(ROUND_SECONDS);
  const [pouring, setPouring] = useState<{ from: number; to: number } | null>(
    null,
  );
  const attempts = useRef<ChallengeAttempt[]>([]);
  const actionCount = useRef(0);
  const unnecessaryCount = useRef(0);
  const resetCount = useRef(0);
  const challengeStarted = useRef(0);
  const finished = useRef(false);
  const timer = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    challengeStarted.current = performance.now();
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const finish = useCallback(
    (status: string, includeCurrent = false) => {
      if (finished.current) return;
      finished.current = true;
      if (timer.current !== null) window.clearTimeout(timer.current);
      const recorded = [...attempts.current];
      if (
        includeCurrent &&
        (actionCount.current > 0 || resetCount.current > 0)
      ) {
        recorded.push({
          challengeId: challenge.id,
          level: challenge.level,
          targetReached: false,
          actions: actionCount.current,
          unnecessaryActions: unnecessaryCount.current,
          resets: resetCount.current,
          optimalActions: challenge.optimalActions,
          completionTime: Math.round(
            performance.now() - challengeStarted.current,
          ),
        });
      }
      setAnimating(false);
      setPouring(null);
      void onCompleteRef.current(scoreWaterJugs(recorded, status));
    },
    [challenge],
  );

  useEffect(() => {
    if (!practiceOnly && timedOut(remainingSeconds))
      finish("TIME_LIMIT_REACHED", true);
  }, [finish, practiceOnly, remainingSeconds]);

  const advanceChallenge = useCallback(
    (reached: boolean) => {
      if (disabled || animating || finished.current || timer.current !== null)
        return;
      attempts.current.push({
        challengeId: challenge.id,
        level: challenge.level,
        targetReached: reached,
        actions: actionCount.current,
        unnecessaryActions: unnecessaryCount.current,
        resets: resetCount.current,
        optimalActions: challenge.optimalActions,
        completionTime: Math.round(
          performance.now() - challengeStarted.current,
        ),
      });
      setAnimating(true);
      timer.current = window.setTimeout(
        () => {
          timer.current = null;
          if (challengeIndex + 1 >= CHALLENGES.length) {
            finish("COMPLETED");
            return;
          }
          const next = CHALLENGES[challengeIndex + 1];
          actionCount.current = 0;
          unnecessaryCount.current = 0;
          resetCount.current = 0;
          challengeStarted.current = performance.now();
          setRoundSeconds(ROUND_SECONDS);
          setChallengeIndex((value) => value + 1);
          setJugs(createJugs(next.capacities));
          setSelected(null);
          setPouring(null);
          setAnimating(false);
        },
        reached ? 650 : 250,
      );
    },
    [animating, challenge, challengeIndex, disabled, finish],
  );

  const nextChallenge = useCallback(
    (nextJugs: typeof jugs) => {
      if (!targetReached(nextJugs, challenge)) return;
      advanceChallenge(true);
    },
    [advanceChallenge, challenge],
  );

  useEffect(() => {
    if (disabled || animating || showHowToPlay || finished.current) return;
    const countdown = window.setInterval(() => {
      setRoundSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(countdown);
          advanceChallenge(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(countdown);
  }, [advanceChallenge, animating, disabled, showHowToPlay]);

  const act = (action: JugAction) => {
    if (
      disabled ||
      animating ||
      showHowToPlay ||
      finished.current ||
      timer.current !== null
    )
      return;
    if (isUnnecessaryAction(jugs, action)) unnecessaryCount.current += 1;
    actionCount.current += 1;
    if (action.type === "reset") resetCount.current += 1;
    if (action.type === "pour")
      setPouring({ from: action.from, to: action.to });
    setAnimating(true);
    const next = applyJugAction(jugs, action);
    timer.current = window.setTimeout(
      () => {
        timer.current = null;
        setJugs(next);
        setPouring(null);
        setAnimating(false);
        nextChallenge(next);
      },
      action.type === "pour" ? 520 : 360,
    );
  };

  const selectJug = (index: number) => {
    if (selected === null) setSelected(index);
    else if (selected === index) setSelected(null);
    else {
      const from = selected;
      setSelected(null);
      act({ type: "pour", from, to: index });
    }
  };

  const targetCapacity = challenge.capacities[challenge.targetJug];
  return (
    <div className={`water-jugs-game${animating ? " is-animating" : ""}`}>
      <div className="water-jugs-game__progress" aria-hidden>
        {CHALLENGES.map((item, index) => (
          <i
            key={item.id}
            className={index <= challengeIndex ? "is-active" : ""}
          />
        ))}
      </div>
      <div
        className={`water-jugs-game__timer${roundSeconds <= 5 ? " is-low" : ""}`}
        role="timer"
        aria-label={`${roundSeconds} seconds left in this round`}
      >
        <Timer />
        <span>{roundSeconds}</span>
      </div>
      <div className="water-jugs-game__target" aria-label="Target liquid level">
        <span className="water-jugs-game__target-icon" aria-hidden>
          ◎
        </span>
        <JugVisual
          capacity={targetCapacity}
          amount={challenge.targetAmount}
          target
          ghost
        />
        <strong>
          Goal: {challenge.targetAmount} L in the {targetCapacity} L jug
        </strong>
      </div>
      <div
        className="water-jugs-game__stream"
        data-visible={pouring !== null}
        aria-hidden
      >
        💧
      </div>
      <div className="water-jugs-game__jugs">
        {jugs.map((jug, index) => (
          <div
            className="water-jugs-game__jug-station"
            key={`${challenge.id}-${index}`}
          >
            <button
              type="button"
              className={`water-jugs-game__jug${selected === index ? " is-selected" : ""}${selected !== null && selected !== index ? " is-destination" : ""}`}
              onPointerUp={() => selectJug(index)}
              disabled={disabled || animating}
              aria-label={
                selected === null
                  ? "Select jug"
                  : selected === index
                    ? "Cancel jug selection"
                    : "Pour into this jug"
              }
            >
              <JugVisual capacity={jug.capacity} amount={jug.amount} />
              <strong className="water-jugs-game__amount">
                {jug.amount} / {jug.capacity} L
              </strong>
              {selected === index && (
                <span className="water-jugs-game__selection-label">
                  Pour from here
                </span>
              )}
              {selected !== null && selected !== index && (
                <span className="water-jugs-game__destination-label">
                  Tap to pour here
                </span>
              )}
            </button>
            <div className="water-jugs-game__actions">
              <button
                type="button"
                onPointerUp={() => act({ type: "fill", jug: index })}
                disabled={disabled || animating}
                aria-label="Fill jug"
              >
                <span aria-hidden>🚰</span>
                <span>Fill</span>
              </button>
              <button
                type="button"
                onPointerUp={() => act({ type: "empty", jug: index })}
                disabled={disabled || animating}
                aria-label="Empty jug"
              >
                <span aria-hidden>💧</span>
                <span>Empty</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      <p
        className={`water-jugs-game__pour-help${selected !== null ? " is-ready" : ""}`}
        aria-live="polite"
      >
        {selected === null
          ? "Fill a jug → tap that jug → tap the other jug to pour."
          : `Pouring from the ${jugs[selected].capacity} L jug. Now tap the jug to pour into.`}
      </p>
      <button
        type="button"
        className="water-jugs-game__next"
        onPointerUp={() => advanceChallenge(false)}
        disabled={disabled || animating || showHowToPlay}
        aria-label="Skip this puzzle and go to the next round"
      >
        <span>Next</span>
        <SkipForward />
      </button>
      <button
        type="button"
        className="water-jugs-game__help"
        onPointerUp={() => setShowHowToPlay(true)}
        aria-label="Show how to play"
      >
        <HelpCircle />
      </button>
      <button
        type="button"
        className="water-jugs-game__reset"
        onPointerUp={() => {
          setSelected(null);
          act({ type: "reset" });
        }}
        disabled={disabled || animating}
        aria-label="Reset jugs"
      >
        <RotateCcw aria-hidden />
      </button>
      {showHowToPlay && (
        <div
          className="water-jugs-game__how-to"
          role="dialog"
          aria-modal="true"
          aria-labelledby="water-jugs-how-to-title"
        >
          <div className="water-jugs-game__how-to-card">
            <h2 id="water-jugs-how-to-title">Make the exact water amount!</h2>
            <div
              className="water-jugs-game__demo"
              aria-label="Example: make two litres using five litre and three litre jugs"
            >
              <span>Fill 5 L</span>
              <ArrowRight />
              <span>Pour into 3 L</span>
              <ArrowRight />
              <span className="water-jugs-game__demo-result">2 L left ✓</span>
            </div>
            <p>
              A pour stops when the other jug is full. So, 5 L poured into a 3 L
              jug leaves exactly 2 L behind.
            </p>
            <ol className="water-jugs-game__steps">
              <li>Tap Fill under the 5 L jug.</li>
              <li>Tap the 5 L jug to select it.</li>
              <li>Tap the 3 L jug to pour into it.</li>
            </ol>
            <button
              className="water-jugs-game__play"
              type="button"
              onPointerUp={() => setShowHowToPlay(false)}
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

function JugVisual({
  capacity,
  amount,
  target = false,
  ghost = false,
}: {
  capacity: number;
  amount: number;
  target?: boolean;
  ghost?: boolean;
}) {
  const height = 132 + capacity * 8;
  return (
    <span
      className={`water-jugs-game__vessel${ghost ? " is-ghost" : ""}`}
      style={{ height }}
      aria-hidden
    >
      <span
        className="water-jugs-game__liquid"
        style={{ height: `${(amount / capacity) * 100}%` }}
      >
        <i />
        <i />
      </span>
      {target && (
        <span
          className="water-jugs-game__target-line"
          style={{ bottom: `${(amount / capacity) * 100}%` }}
        />
      )}
      <span className="water-jugs-game__shine" />
    </span>
  );
}
