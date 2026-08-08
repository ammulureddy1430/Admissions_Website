"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, MousePointer2, Timer } from "lucide-react";
import { MagicTrainAnalyticsService } from "./AnalyticsService";
import { wait } from "./AnimationController";
import {
  MagicTrainEngine,
  MAGIC_TRAIN_DURATION_SECONDS,
  MAGIC_TRAIN_TOTAL_ROUNDS,
} from "./GameEngine";
import { scoreMagicTrain } from "./ScoringEngine";
import { SoundManager } from "./SoundManager";
import type {
  Carriage,
  GamePhase,
  MagicTrainRawMetrics,
  MagicTrainScores,
  TrainRound,
} from "./Types";
import "./MagicTrainGame.css";

const initialMetrics = (): MagicTrainRawMetrics => ({
  age_group: "4–5 Years",
  total_trains: 0,
  completed_trains: 0,
  total_carriages: 0,
  correct_carriages: 0,
  incorrect_selections: 0,
  response_times: [],
  completion_times: [],
  highest_sequence_length: 0,
  highest_difficulty: 1,
  started_at: new Date().toISOString(),
  completed_at: "",
});

function CoachIcon({ phase }: { phase: GamePhase }) {
  const isBuilding = phase === "building";
  return (
    <div className={`mt-coach ${phase}`} aria-hidden>
      <span className="mt-coach-icon">
        {isBuilding ? <MousePointer2 /> : <Eye />}
      </span>
      <strong>{isBuilding ? "Tap a carriage below" : "Watch the train"}</strong>
      {isBuilding && <span className="mt-coach-down">↓</span>}
    </div>
  );
}
function CarriageView({
  item,
  compact = false,
}: {
  item: Carriage;
  compact?: boolean;
}) {
  return (
    <div
      className={`mt-carriage ${compact ? "compact" : ""}`}
      style={{ "--carriage": item.color } as React.CSSProperties}
    >
      <span className="mt-carriage-token">{item.token}</span>
      <i className="mt-wheel left" />
      <i className="mt-wheel right" />
    </div>
  );
}
function Engine() {
  return (
    <div className="mt-engine" aria-hidden>
      <div className="mt-chimney" />
      <div className="mt-cab">
        <i />
      </div>
      <div className="mt-boiler">
        <span>✦</span>
      </div>
      <div className="mt-cowcatcher" />
      <i className="mt-wheel big" />
      <i className="mt-wheel small" />
      <div className="mt-smoke">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export default function MagicTrainGame({
  disabled = false,
  sound = true,
  durationSeconds = MAGIC_TRAIN_DURATION_SECONDS,
  onComplete,
}: {
  disabled?: boolean;
  sound?: boolean;
  durationSeconds?: number;
  onComplete: (metrics: MagicTrainScores) => void | Promise<void>;
}) {
  const engine = useRef(new MagicTrainEngine());
  const sounds = useRef<SoundManager | undefined>(undefined);
  const analytics = useRef(new MagicTrainAnalyticsService(onComplete));
  const metrics = useRef(initialMetrics());
  const finished = useRef(false);
  const cancelled = useRef(false);
  const started = useRef(false);
  const buildStarted = useRef(0);
  const lastTap = useRef(0);
  const [round, setRound] = useState<TrainRound>(() =>
    new MagicTrainEngine().round(),
  );
  const [phase, setPhase] = useState<GamePhase>("tutorial");
  const [attached, setAttached] = useState<Carriage[]>([]);
  const [choices, setChoices] = useState<Carriage[]>([]);
  const [moving, setMoving] = useState("");
  const [dragging, setDragging] = useState("");
  const [justAttached, setJustAttached] = useState("");
  const [seconds, setSeconds] = useState(durationSeconds);

  useEffect(() => {
    cancelled.current = false;
    sounds.current = new SoundManager(sound);
    return () => {
      cancelled.current = true;
      sounds.current?.dispose();
    };
  }, [sound]);
  useEffect(() => sounds.current?.setEnabled(sound), [sound]);
  useEffect(() => {
    analytics.current = new MagicTrainAnalyticsService(onComplete);
  }, [onComplete]);

  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    cancelled.current = true;
    metrics.current.completed_at = new Date().toISOString();
    setPhase("complete");
    await analytics.current.save(scoreMagicTrain(metrics.current));
  }, []);
  const playRound = useCallback(async (next: TrainRound) => {
    if (finished.current) return;
    setRound(next);
    setAttached([]);
    setChoices([]);
    setJustAttached("");
    setPhase("observing");
    metrics.current.total_trains += 1;
    metrics.current.total_carriages += next.sequence.length;
    metrics.current.highest_difficulty = Math.max(
      metrics.current.highest_difficulty,
      next.difficulty,
    );
    sounds.current?.whistle();
    await wait(next.observationMs);
    if (cancelled.current) return;
    setPhase("building");
    setChoices(next.choices);
    buildStarted.current = performance.now();
    lastTap.current = buildStarted.current;
  }, []);
  const beginGame = () => {
    if (disabled || started.current) return;
    started.current = true;
    void playRound(round);
  };
  useEffect(() => {
    if (
      disabled ||
      !started.current ||
      phase === "tutorial" ||
      phase === "complete"
    )
      return;
    const id = window.setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [disabled, phase]);
  useEffect(() => {
    if (seconds === 0) void finish();
  }, [seconds, finish]);

  const select = async (item: Carriage) => {
    if (phase !== "building" || disabled || finished.current || moving) return;
    // Timing is sampled only from a direct student interaction.
    // eslint-disable-next-line react-hooks/purity
    const now = performance.now();
    metrics.current.response_times.push(Math.round(now - lastTap.current));
    lastTap.current = now;
    const matchesExpectedPosition = engine.current.accepts(
      round,
      attached.length,
      item,
    );
    if (!matchesExpectedPosition) {
      metrics.current.incorrect_selections += 1;
    } else {
      metrics.current.correct_carriages += 1;
    }
    setMoving(item.id);
    await wait(380);
    if (cancelled.current) return;
    sounds.current?.connect();
    const nextAttached = [...attached, item];
    setAttached(nextAttached);
    setJustAttached(item.id);
    setChoices((items) => items.filter((choice) => choice.id !== item.id));
    setMoving("");
    setDragging("");
    window.setTimeout(() => setJustAttached(""), 750);
    if (nextAttached.length !== round.sequence.length) return;
    metrics.current.completed_trains += 1;
    metrics.current.highest_sequence_length = Math.max(
      metrics.current.highest_sequence_length,
      round.sequence.length,
    );
    metrics.current.completion_times.push(
      Math.round(now - buildStarted.current),
    );
    setPhase("departing");
    sounds.current?.whistle();
    await wait(1900);
    if (cancelled.current) return;
    if (metrics.current.completed_trains >= MAGIC_TRAIN_TOTAL_ROUNDS) {
      await finish();
      return;
    }
    engine.current.advance();
    await playRound(engine.current.round());
  };

  return (
    <main
      className="magic-train-world"
      aria-label="Magic Train pattern and sequencing assessment"
    >
      <div className="mt-sky">
        <i className="mt-sun" />
        <i className="mt-cloud one" />
        <i className="mt-cloud two" />
        <i className="mt-cloud three" />
        <div className="mt-mountains" />
        <div className="mt-hills" />
      </div>
      <div className="mt-particles">
        {Array.from({ length: 14 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 29) % 96}%`,
              animationDelay: `${-i * 0.7}s`,
            }}
          />
        ))}
      </div>
      <div className="mt-station">
        <div className="mt-roof" />
        <div className="mt-clock">◷</div>
        <div className="mt-sign">
          <span>✦</span>
          <span className="mt-sign-train">🚂</span>
          <span>✦</span>
        </div>
        <div className="mt-door" />
      </div>
      <div className="mt-timer">
        <Timer />
        <strong>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </strong>
      </div>
      {phase !== "tutorial" && phase !== "complete" && (
        <div
          className="mt-round-progress"
          aria-label={`Round ${round.difficulty} of ${MAGIC_TRAIN_TOTAL_ROUNDS}`}
        >
          <strong>
            Round {Math.min(round.difficulty, MAGIC_TRAIN_TOTAL_ROUNDS)} /{" "}
            {MAGIC_TRAIN_TOTAL_ROUNDS}
          </strong>
          <div aria-hidden>
            {Array.from({ length: MAGIC_TRAIN_TOTAL_ROUNDS }, (_, index) => (
              <i
                key={index}
                className={index < round.difficulty ? "active" : ""}
              >
                {index < round.difficulty ? "★" : ""}
              </i>
            ))}
          </div>
        </div>
      )}
      {phase !== "tutorial" && <CoachIcon phase={phase} />}
      <section className={`mt-train-stage ${phase}`} aria-live="polite">
        <div className="mt-train">
          {phase === "building" &&
            Array.from(
              { length: round.sequence.length - attached.length },
              (_, index) => (
                <div
                  key={index}
                  className={`mt-coupling-slot ${index === round.sequence.length - attached.length - 1 ? "next" : ""}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const found = choices.find(
                      (choice) =>
                        choice.id === event.dataTransfer.getData("text/plain"),
                    );
                    if (found) void select(found);
                  }}
                >
                  <span>＋</span>
                  <i />
                  <i />
                </div>
              ),
            )}
          {[...(phase === "observing" ? round.sequence : attached)]
            .reverse()
            .map((item, index) => (
              <div
                className={`mt-attached ${justAttached === item.id ? "newly-attached" : ""}`}
                key={`${item.id}-${index}`}
              >
                <CarriageView item={item} />
              </div>
            ))}
          <Engine />
        </div>
      </section>
      <div className="mt-track">
        <i />
        <i />
        <span />
      </div>
      <section
        className={`mt-yard ${phase === "building" ? "visible" : ""}`}
        aria-label="Available train carriages"
      >
        {choices.map((item) => (
          <button
            key={item.id}
            draggable
            className={`${moving === item.id ? "attaching" : ""} ${dragging === item.id ? "dragging" : ""}`}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", item.id);
              event.dataTransfer.effectAllowed = "move";
              setDragging(item.id);
            }}
            onDragEnd={() => setDragging("")}
            onClick={() => void select(item)}
            disabled={!!moving}
            aria-label="Attach carriage"
          >
            <CarriageView item={item} compact />
          </button>
        ))}
      </section>
      {phase === "complete" && (
        <div className="mt-finish" aria-hidden>
          <span>🚂</span>
          <i />
          <i />
          <i />
        </div>
      )}
      {phase === "tutorial" && (
        <section
          className="mt-tutorial"
          role="dialog"
          aria-label="How to play Magic Train"
        >
          <div className="mt-tutorial-card">
            <div className="mt-tutorial-title">
              <span>✨</span>
              <h2>How to Play</h2>
              <span>✨</span>
            </div>
            <div className="mt-tutorial-steps">
              <div>
                <span className="mt-step-number">1</span>
                <span className="mt-step-picture">👀 🚂 🟥 🟨</span>
                <strong>Watch the train</strong>
              </div>
              <div>
                <span className="mt-step-number">2</span>
                <span className="mt-step-picture">☝️ 🟨 ➜ 🚂</span>
                <strong>Build the same train</strong>
              </div>
              <div>
                <span className="mt-step-number">3</span>
                <span className="mt-step-picture">🚂 💨 ✨</span>
                <strong>Complete and go!</strong>
              </div>
            </div>
            <button type="button" onClick={beginGame}>
              <span>▶</span> Let&apos;s Go!
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
