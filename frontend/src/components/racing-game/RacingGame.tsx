"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronLeft, ChevronRight, CircleStop, Coins, Flag, Gauge, Sparkles, Zap } from "lucide-react";

type RacingOption = {
  id?: string;
  optionKey?: string;
  optionText: string;
  imageUrl?: string | null;
};

type RacingQuestion = {
  id: string;
  questionText: string;
  options?: RacingOption[];
  imageUrl?: string | null;
  difficulty?: string;
};

type RacingMode = "SPEED_RACER" | "COIN_CHASE" | "OBSTACLE_CHALLENGE";

export function RacingGame({
  question,
  questionIndex,
  questionCount,
  configuration,
  disabled,
  sound,
  onAnswer,
}: {
  question: RacingQuestion;
  questionIndex: number;
  questionCount: number;
  configuration?: Record<string, unknown>;
  disabled: boolean;
  sound: boolean;
  onAnswer: (answer: string) => Promise<unknown> | unknown;
}) {
  const mode = racingMode(configuration, questionIndex);
  const [lane, setLane] = useState(1);
  const [phase, setPhase] = useState<"approach" | "checkpoint" | "boost" | "finish">("checkpoint");
  const [selected, setSelected] = useState("");
  const [speed, setSpeed] = useState(0);
  const [nitro, setNitro] = useState(64);
  const [particles, setParticles] = useState(0);
  const [crashed, setCrashed] = useState(false);
  const [collisionCount, setCollisionCount] = useState(0);
  const [driveState, setDriveState] = useState<"CRUISE" | "FORWARD" | "BRAKE">("BRAKE");
  const [raceProgress, setRaceProgress] = useState(0);
  const [obstaclePass, setObstaclePass] = useState(0);
  const [drivingQuestionId, setDrivingQuestionId] = useState("");
  const carRef = useRef<HTMLDivElement>(null);
  const obstacleRefs = useRef<Array<HTMLElement | null>>([]);
  const collisionLocked = useRef(false);
  const forwardHeld = useRef(false);
  const raceProgressRef = useRef(0);
  const locked = disabled || phase === "boost" || phase === "finish" || !!selected;
  const options = useMemo(() => question.options || [], [question.options]);

  useEffect(() => {
    // A new checkpoint intentionally resets all transient driving state together.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected("");
    setLane(Math.min(1, Math.max(0, options.length - 1)));
    setPhase("checkpoint");
    setSpeed(0);
    setCrashed(false);
    setCollisionCount(0);
    setDriveState("BRAKE");
    setRaceProgress(0);
    setObstaclePass(0);
    raceProgressRef.current = 0;
    setDrivingQuestionId("");
    forwardHeld.current = false;
    collisionLocked.current = false;
  }, [question.id, options.length]);

  const play = useCallback((frequency: number, duration = 0.08) => {
    if (!sound || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, context.currentTime + duration);
      gain.gain.setValueAtTime(0.045, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
      oscillator.addEventListener("ended", () => void context.close(), { once: true });
    } catch {
      // Audio is an enhancement; gameplay remains available when it is blocked.
    }
  }, [sound]);

  useEffect(() => {
    if (phase === "finish") return;
    let frame = 0;
    const detectCollision = () => {
      const car = carRef.current?.getBoundingClientRect();
      if (car && !collisionLocked.current) {
        const hit = obstacleRefs.current.some((obstacle) => {
          if (!obstacle) return false;
          const barrier = obstacle.getBoundingClientRect();
          const insetX = Math.min(8, car.width * .08);
          const insetY = Math.min(8, car.height * .08);
          return barrier.left < car.right - insetX
            && barrier.right > car.left + insetX
            && barrier.top < car.bottom - insetY
            && barrier.bottom > car.top + insetY;
        });
        if (hit) {
          collisionLocked.current = true;
          setCrashed(true);
          setCollisionCount(value => value + 1);
          forwardHeld.current = false;
          setDriveState("BRAKE");
          setSpeed(0);
          const backedUpProgress = Math.max(0, raceProgressRef.current - 18);
          raceProgressRef.current = backedUpProgress;
          setRaceProgress(backedUpProgress);
          setParticles(value => value + 1);
          play(92, .22);
          window.setTimeout(() => {
            setCrashed(false);
            setSpeed(forwardHeld.current ? 218 : 0);
          }, 720);
          window.setTimeout(() => {
            collisionLocked.current = false;
          }, 1150);
        }
      }
      frame = window.requestAnimationFrame(detectCollision);
    };
    frame = window.requestAnimationFrame(detectCollision);
    return () => window.cancelAnimationFrame(frame);
  }, [phase, play]);

  const choose = useCallback(async (option: RacingOption, index: number) => {
    if (locked) return;
    const answer = option.optionText;
    forwardHeld.current = false;
    setLane(index);
    setSelected(option.id || option.optionKey || answer);
    setPhase(questionIndex + 1 === questionCount ? "finish" : "boost");
    setDriveState("BRAKE");
    setSpeed(0);
    raceProgressRef.current = 0;
    setRaceProgress(0);
    setNitro(value => Math.max(0, value - 18));
    setParticles(value => value + 1);
    play(mode === "COIN_CHASE" ? 920 : 560, 0.14);
    await onAnswer(answer);
  }, [locked, mode, onAnswer, play, questionCount, questionIndex]);

  const steer = useCallback((direction: number) => {
    if (locked || phase !== "checkpoint" || !options.length) return;
    setLane(current => Math.min(options.length - 1, Math.max(0, current + direction)));
    play(210, 0.05);
  }, [locked, options.length, phase, play]);

  const driveForward = useCallback(() => {
    if (locked || phase !== "checkpoint" || forwardHeld.current) return;
    setDrivingQuestionId(question.id);
    forwardHeld.current = true;
    setDriveState("FORWARD");
    setSpeed(0);
    play(420, .08);
  }, [locked, phase, play, question.id]);

  useEffect(() => {
    if (driveState !== "FORWARD" || locked || drivingQuestionId !== question.id) return;
    let frame = 0;
    let previous = performance.now();
    const advance = (now: number) => {
      const elapsed = Math.min(50, now - previous);
      previous = now;
      const next = Math.min(100, raceProgressRef.current + elapsed * .018);
      raceProgressRef.current = next;
      setRaceProgress(next);
      setSpeed(current => Math.min(218, current + elapsed * .09));
      if (next >= 100) {
        return;
      }
      frame = window.requestAnimationFrame(advance);
    };
    frame = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(frame);
  }, [driveState, drivingQuestionId, locked, question.id]);

  const brake = useCallback(() => {
    if (disabled || phase !== "checkpoint") return;
    forwardHeld.current = false;
    setDriveState("BRAKE");
    setSpeed(0);
    raceProgressRef.current = 0;
    setRaceProgress(0);
    play(120, .1);
  }, [disabled, phase, play]);

  const confirmAnswer = useCallback(() => {
    if (locked || phase !== "checkpoint" || !options[lane]) return;
    forwardHeld.current = false;
    void choose(options[lane], lane);
  }, [choose, lane, locked, options, phase]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.repeat) {
        if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d", " "].includes(key)) event.preventDefault();
        return;
      }
      if (key === "arrowleft" || key === "a") steer(-1);
      if (key === "arrowright" || key === "d") steer(1);
      if (key === "arrowup" || key === "w") driveForward();
      if (key === "arrowdown" || key === "s") brake();
      if (key === " ") confirmAnswer();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d", " "].includes(key)) {
        event.preventDefault();
      }
    };
    const keyup = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "arrowup" || key === "w") {
        event.preventDefault();
        brake();
      }
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", brake);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", brake);
    };
  }, [brake, confirmAnswer, driveForward, steer]);

  const laneCount = Math.max(2, options.length);
  const obstacleLanes = [Math.min(1 + (obstaclePass % 2), laneCount - 1)];
  const carPosition = `${((lane + 0.5) / laneCount) * 100}%`;
  const drivingCurrentQuestion = drivingQuestionId === question.id;
  const visibleDriveState = driveState === "FORWARD" && !drivingCurrentQuestion ? "BRAKE" : driveState;
  const visibleRaceProgress = drivingCurrentQuestion ? raceProgress : 0;
  const visibleSpeed = drivingCurrentQuestion ? Math.round(speed) : 0;

  return (
    <div className={`racing-game racing-${mode.toLowerCase().replaceAll("_", "-")} phase-${phase} drive-${visibleDriveState.toLowerCase()}`} aria-label={`${modeName(mode)} racing game`}>
      <div className="racing-sky" aria-hidden="true">
        <div className="racing-sun" />
        <div className="racing-cloud cloud-one" /><div className="racing-cloud cloud-two" />
        <div className="racing-mountains far" /><div className="racing-mountains near" />
        <div className="racing-city">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
        <div className="racing-trees">{Array.from({ length: 14 }, (_, index) => <i key={index} />)}</div>
      </div>

      <div className="racing-hud">
        <div><Gauge /><span><small>Speed</small><b>{visibleSpeed} KM/H</b></span></div>
        <div className="racing-mode-badge"><Flag /><span><small>Race mode</small><b>{modeName(mode)}</b></span></div>
        <div><Zap /><span><small>Nitro</small><b>{nitro}%</b></span></div>
      </div>

      <div className="racing-question-banner">
        <span>Question {questionIndex + 1} of {questionCount}</span>
        <h1>{question.questionText}</h1>
        {question.imageUrl && <img src={question.imageUrl} alt="" />}
      </div>
      <div className="racing-drive-guide" aria-label="How to play">
        <span><b>1</b> ↑ Drive</span><i /><span><b>2</b> ← → Dodge</span><i /><span><b>3</b> Space Answer</span>
      </div>

      <div className="racing-road" style={{ "--lane-count": laneCount } as React.CSSProperties}>
        <div className="racing-road-lines">{Array.from({ length: laneCount - 1 }, (_, index) => {
          const position = (index + 1) / laneCount;
          const horizon = 35 + 30 * position;
          const foreground = 100 * position;
          return <i key={index} style={{ clipPath: `polygon(${horizon - .15}% 0,${horizon + .15}% 0,${foreground + .2}% 100%,${foreground - .2}% 100%)` }} />;
        })}</div>
        <div className="racing-road-texture" />
        <div className={`racing-obstacles ${mode === "OBSTACLE_CHALLENGE" ? "is-challenge" : "is-ambient"}`} aria-hidden="true">{obstacleLanes.map((obstacleLane, index) => {
          const laneRatio = (obstacleLane + .5) / laneCount;
          const horizonLaneCenter = 35 + 30 * laneRatio;
          const foregroundLaneCenter = 100 * laneRatio;
          return <i
            ref={(node) => { obstacleRefs.current[index] = node; }}
            key={index}
            onAnimationIteration={() => setObstaclePass(value => value + 1)}
            style={{
              left: `${horizonLaneCenter}%`,
              "--obstacle-horizon-x": `${horizonLaneCenter}%`,
              "--obstacle-foreground-x": `${foregroundLaneCenter}%`,
              "--obstacle-delay": `${1 + index * 6}s`,
              "--obstacle-speed": "12s",
            } as React.CSSProperties}
          />;
        })}</div>
        <div className="racing-traffic" aria-hidden="true"><i /><i /></div>

        <div className="racing-options" role="group" aria-label="Drive through an answer option">
          {options.map((option, index) => {
            const key = option.id || option.optionKey || `${question.id}-${index}`;
            return (
              <button
                key={key}
                type="button"
                disabled={locked || phase !== "checkpoint"}
                onPointerEnter={() => !locked && setLane(index)}
                onClick={() => {
                  if (!locked) {
                    setLane(index);
                    play(260, .05);
                  }
                }}
                className={`${lane === index ? "is-targeted" : ""} ${selected === key ? "is-collected" : ""}`}
                aria-label={`Select ${option.optionText}. Press Space to confirm`}
              >
                {mode === "COIN_CHASE" ? <Coins /> : mode === "OBSTACLE_CHALLENGE" ? <Sparkles /> : <Flag />}
                {option.imageUrl && <img src={option.imageUrl} alt="" />}
                <b>{option.optionText}</b>
              </button>
            );
          })}
        </div>

        <div
          ref={carRef}
          className={`racing-car-camera drive-${driveState.toLowerCase()} ${crashed ? "is-crashed" : ""}`}
          style={{ left: carPosition }}
        >
          <div className="racing-nitro" aria-hidden="true"><i /><i /><i /></div>
          <img
            className="racing-car-image"
            src="/games/real-racing-car.png"
            alt="Red racing car"
            draggable={false}
          />
          <div className="racing-dust">{Array.from({ length: 7 }, (_, index) => <i key={`${particles}-${index}`} />)}</div>
          {crashed && <div key={collisionCount} className="racing-impact" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--impact-index": index } as React.CSSProperties} />)}</div>}
        </div>
        <div className="racing-finish-line" />
      </div>

      <div className="racing-controls">
        <button type="button" onClick={() => steer(-1)} disabled={locked || phase !== "checkpoint"} aria-label="Steer left"><ChevronLeft /></button>
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            driveForward();
          }}
          onPointerUp={brake}
          onPointerCancel={brake}
          onLostPointerCapture={brake}
          disabled={locked || phase !== "checkpoint"}
          aria-label="Hold to accelerate"
          className="racing-forward-control"
        ><ArrowUp /></button>
        <button type="button" onClick={confirmAnswer} disabled={locked || phase !== "checkpoint"} className="racing-space-control">
          <kbd>SPACE</kbd><small>Select answer</small>
        </button>
        <button type="button" onClick={brake} disabled={disabled || phase !== "checkpoint"} aria-label="Apply brake" className="racing-brake-control"><CircleStop /></button>
        <button type="button" onClick={() => steer(1)} disabled={locked || phase !== "checkpoint"} aria-label="Steer right"><ChevronRight /></button>
      </div>

      {crashed && <div className="racing-collision-alert" role="status">Barrier hit — moved back. Press Up to continue</div>}
      {phase === "finish" && <div className="racing-finish-celebration" aria-live="polite"><Flag /><h2>Finish line</h2><p>Race completed</p><div>{Array.from({ length: 32 }, (_, index) => <i key={index} style={{ "--confetti-index": index } as React.CSSProperties} />)}</div></div>}
    </div>
  );
}

function racingMode(configuration: Record<string, unknown> | undefined, questionIndex: number): RacingMode {
  const configured = String(configuration?.racingType || configuration?.raceMode || configuration?.gameType || "").toUpperCase().replaceAll(" ", "_");
  if (configured.includes("COIN")) return "COIN_CHASE";
  if (configured.includes("OBSTACLE")) return "OBSTACLE_CHALLENGE";
  if (configured.includes("SPEED")) return "SPEED_RACER";
  return (["SPEED_RACER", "COIN_CHASE", "OBSTACLE_CHALLENGE"] as const)[questionIndex % 3];
}

function modeName(mode: RacingMode) {
  return mode === "COIN_CHASE" ? "Coin Chase" : mode === "OBSTACLE_CHALLENGE" ? "Obstacle Challenge" : "Speed Racer";
}
