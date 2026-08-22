"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  angularDifference,
  createChallenges,
  isOrientationMatch,
  normalizeRotation,
  shortestRequiredRotation,
} from "./MentalRotationEngine";
import { scoreMentalRotation } from "./ScoringEngine";
import type {
  MentalRotationMetrics,
  RotationAttempt,
  RotationShape,
} from "./Types";
import "./MentalRotationGame.css";

type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (metrics: MentalRotationMetrics) => void | Promise<void>;
};

function Shape({ shape }: { shape: RotationShape }) {
  const paths: Record<RotationShape, React.ReactNode> = {
    key: (
      <path d="M16 28a18 18 0 1 0 32 11h38v16H75v12H62V55H47A18 18 0 0 0 16 28Zm18 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z" />
    ),
    plane: (
      <path d="M10 54 45 42 54 12l12 2-2 29 25 12-2 12-27-5-11 25-10-3 5-26-33 7Z" />
    ),
    chair: <path d="M24 14h18v38h34V30h16v55H79V68H42v17H29V58h-5z" />,
    boot: (
      <path d="M22 12h31v47c9 9 19 13 34 14v15H30c-11 0-18-8-18-18v-8h18V34h-8z" />
    ),
    rocket: (
      <path d="M50 10c18 14 25 33 19 55L50 86 31 65c-6-22 1-41 19-55Zm0 23a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM29 64 14 82l22-4m35-14 15 18-22-4" />
    ),
  };
  return (
    <svg viewBox="0 0 100 100" aria-hidden>
      {paths[shape]}
    </svg>
  );
}

export default function MentalRotationGame({
  disabled = false,
  remainingSeconds,
  onComplete,
}: Props) {
  const [challenges] = useState(() => createChallenges().slice(0, 6));
  const [index, setIndex] = useState(0);
  const [rotation, setRotation] = useState(challenges[0].startRotation);
  const [transitioning, setTransitioning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(1, remainingSeconds ?? 120));
  const attempts = useRef<RotationAttempt[]>([]);
  const challengeStarted = useRef(0);
  const actions = useRef(0);
  const amount = useRef(0);
  const lastRotation = useRef(rotation);
  const drag = useRef<{ pointerId: number; lastAngle: number } | null>(null);
  const finished = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const challenge = challenges[index];

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    challengeStarted.current = performance.now();
  }, []);
  const finish = useCallback(
    (status: string) => {
      if (finished.current) return;
      finished.current = true;
      void onCompleteRef.current(
        scoreMentalRotation(challenges, attempts.current, status),
      );
    },
    [challenges],
  );
  useEffect(() => {
    if (disabled || finished.current) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [disabled]);
  useEffect(() => {
    if (secondsLeft === 0) finish("TIME_LIMIT_REACHED");
  }, [finish, secondsLeft]);

  const recordAction = (next: number) => {
    const normalized = normalizeRotation(next);
    amount.current += angularDifference(lastRotation.current, normalized);
    actions.current += 1;
    lastRotation.current = normalized;
    setRotation(normalized);
  };

  const evaluate = useCallback(
    (finalRotation: number) => {
      if (disabled || transitioning || finished.current) return;
      const difference = angularDifference(
        finalRotation,
        challenge.targetRotation,
      );
      const matched = isOrientationMatch(finalRotation, challenge.targetRotation);
      attempts.current.push({
        challengeId: challenge.id,
        level: challenge.level,
        matched,
        targetRotation: challenge.targetRotation,
        finalRotation: normalizeRotation(finalRotation),
        angularDifference: difference,
        rotationAmount: amount.current,
        rotationActions: actions.current,
        extraRotations: Math.max(
          0,
          Math.round(
            (amount.current -
              shortestRequiredRotation(
                challenge.startRotation,
                challenge.targetRotation,
              )) /
              45,
          ),
        ),
        completionTime: Math.round(
          performance.now() - challengeStarted.current,
        ),
      });
      setTransitioning(true);
      window.setTimeout(() => {
        if (index + 1 >= challenges.length) {
          finish("COMPLETED");
          return;
        }
        const next = challenges[index + 1];
        actions.current = 0;
        amount.current = 0;
        lastRotation.current = next.startRotation;
        challengeStarted.current = performance.now();
        setIndex((value) => value + 1);
        setRotation(next.startRotation);
        setTransitioning(false);
      }, 180);
    },
    [
      challenge,
      challenges,
      disabled,
      finish,
      index,
      transitioning,
    ],
  );

  const pointerAngle = (
    element: HTMLElement,
    clientX: number,
    clientY: number,
  ) => {
    const rect = element.getBoundingClientRect();
    return (
      (Math.atan2(
        clientY - (rect.top + rect.height / 2),
        clientX - (rect.left + rect.width / 2),
      ) *
        180) /
      Math.PI
    );
  };

  const rotateWithButton = (direction: -1 | 1) => {
    const next = lastRotation.current + direction * 45;
    recordAction(next);
  };

  const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;

  return (
    <div
      className={`mental-rotation-game${transitioning ? " is-transitioning" : ""}`}
    >
      <header className="mental-rotation-game__assessment-hud">
        <div><small>MENTAL ROTATION ASSESSMENT</small><strong>Make the right shape match the target</strong></div>
        <span>Trial {index + 1} of {challenges.length}</span>
        <time>{formatTime(secondsLeft)}</time>
      </header>
      <div
        className="mental-rotation-game__progress"
        aria-label={`Difficulty ${challenge.level} of 5`}
      >
        <i style={{ width: `${((index + 1) / challenges.length) * 100}%` }} />
      </div>
      <section
        className="mental-rotation-game__target"
        aria-label="Target orientation"
      >
        <b className="mental-rotation-game__panel-label">TARGET</b>
        <div className="mental-rotation-game__target-frame">
          <span className="mental-rotation-game__target-marker" aria-hidden>
            ◎
          </span>
          <div
            className="mental-rotation-game__target-shape"
            style={{ transform: `rotate(${challenge.targetRotation}deg)` }}
          >
            <Shape shape={challenge.shape} />
          </div>
        </div>
      </section>
      <div className="mental-rotation-game__divider" aria-hidden>
        <i />
      </div>
      <section
        className="mental-rotation-game__work"
        aria-label="Rotatable object"
      >
        <b className="mental-rotation-game__panel-label">ROTATE THIS</b>
        <div className="mental-rotation-game__orbit" aria-hidden />
        <div
          className="mental-rotation-game__object"
          onPointerDown={(event) => {
            if (disabled || transitioning) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = {
              pointerId: event.pointerId,
              lastAngle: pointerAngle(
                event.currentTarget,
                event.clientX,
                event.clientY,
              ),
            };
          }}
          onPointerMove={(event) => {
            if (!drag.current || drag.current.pointerId !== event.pointerId)
              return;
            const angle = pointerAngle(
              event.currentTarget,
              event.clientX,
              event.clientY,
            );
            recordAction(lastRotation.current + angle - drag.current.lastAngle);
            drag.current.lastAngle = angle;
          }}
          onPointerUp={(event) => {
            if (!drag.current) return;
            drag.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { drag.current = null; }}
        >
          <div
            className="mental-rotation-game__object-shape"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <Shape shape={challenge.shape} />
          </div>
        </div>
      </section>
      <div className="mental-rotation-game__controls">
        <button
          type="button"
          disabled={disabled || transitioning}
          aria-label="Rotate left"
          onClick={() => rotateWithButton(-1)}
        >
          ↶
        </button>
        <span aria-hidden>⟳</span>
        <button
          type="button"
          disabled={disabled || transitioning}
          aria-label="Rotate right"
          onClick={() => rotateWithButton(1)}
        >
          ↷
        </button>
        <button
          type="button"
          className="mental-rotation-game__check"
          disabled={disabled || transitioning}
          onClick={() => evaluate(lastRotation.current)}
        >
          CHECK MATCH
        </button>
      </div>
    </div>
  );
}
