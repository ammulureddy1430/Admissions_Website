"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, MousePointer2, Timer } from "lucide-react";
import { playLightSequence } from "./AnimationController";
import { FollowLightsAnalyticsService } from "./AnalyticsService";
import {
  FollowLightsEngine,
  GAME_DURATION_SECONDS,
  MAX_MISTAKES,
} from "./GameEngine";
import { scoreFollowLights } from "./ScoringEngine";
import { SoundManager } from "./Sounds/SoundManager";
import type {
  CognitiveScores,
  GamePhase,
  LightColor,
  RawGameMetrics,
} from "./Types";
import { LightButton } from "./UI/LightButton";
import "./Styles/Game.css";

const COLORS: LightColor[] = ["red", "green", "blue", "yellow"];

export default function FollowTheLightsGame({
  disabled = false,
  sound = true,
  durationSeconds = GAME_DURATION_SECONDS,
  onComplete,
}: {
  disabled?: boolean;
  sound?: boolean;
  durationSeconds?: number;
  onComplete: (metrics: CognitiveScores) => void | Promise<void>;
}) {
  const engine = useRef(new FollowLightsEngine());
  const sounds = useRef<SoundManager | null>(null);
  const analytics = useRef(new FollowLightsAnalyticsService(onComplete));
  const cancelled = useRef(false);
  const finished = useRef(false);
  const started = useRef(false);
  const inputStartedAt = useRef(0);
  const previousTapAt = useRef(0);
  const tapLockedRef = useRef(true);
  const roundMistakeRef = useRef(false);
  const metrics = useRef<RawGameMetrics>({
    totalSequences: 0,
    completedSequences: 0,
    longestSequence: 0,
    mistakes: 0,
    correctTaps: 0,
    wrongTaps: 0,
    reactionTimes: [],
    tapDelays: [],
    elapsedSeconds: 0,
    endReason: "TIME_LIMIT_REACHED",
  });
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [active, setActive] = useState<LightColor | null>(null);
  const [inputIndex, setInputIndex] = useState(0);
  const [sequenceLength, setSequenceLength] = useState(0);
  const [tapLocked, setTapLocked] = useState(true);
  const [nextRoundIn, setNextRoundIn] = useState(0);
  const [startIn, setStartIn] = useState(5);
  const [willAdvanceRound, setWillAdvanceRound] = useState(false);
  const [round, setRound] = useState(0);
  const [seconds, setSeconds] = useState(durationSeconds);

  useEffect(() => {
    // React Strict Mode runs an extra setup/cleanup cycle in development. Reset
    // this guard on every mount so sequence playback can unlock student input.
    cancelled.current = false;
    finished.current = false;
    sounds.current = new SoundManager(true);
    return () => {
      cancelled.current = true;
      sounds.current?.dispose();
    };
  }, []);
  useEffect(() => {
    sounds.current?.setEnabled(sound);
  }, [sound]);
  useEffect(() => {
    analytics.current = new FollowLightsAnalyticsService(onComplete);
  }, [onComplete]);

  const finish = useCallback(
    async (reason: RawGameMetrics["endReason"]) => {
      if (finished.current) return;
      finished.current = true;
      cancelled.current = true;
      metrics.current.elapsedSeconds = durationSeconds - seconds;
      metrics.current.endReason = reason;
      setPhase("complete");
      setActive(null);
      await analytics.current.save(scoreFollowLights(metrics.current));
    },
    [durationSeconds, seconds],
  );

  const beginRound = useCallback(async (increaseDifficulty = true) => {
    if (finished.current) return;
    const next = engine.current.nextRound(increaseDifficulty);
    metrics.current.totalSequences += 1;
    setRound(next.round);
    setInputIndex(0);
    setSequenceLength(next.sequence.length);
    roundMistakeRef.current = false;
    tapLockedRef.current = true;
    setTapLocked(true);
    setPhase("watch");
    await playLightSequence(
      next.sequence,
      next.glowMs,
      next.gapMs,
      setActive,
      (color) => sounds.current?.play(color),
      () => cancelled.current,
    );
    if (cancelled.current) return;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 550));
    if (cancelled.current) return;
    setPhase("repeat");
    await new Promise<void>((resolve) => window.setTimeout(resolve, 1000));
    if (cancelled.current) return;
    inputStartedAt.current = performance.now();
    previousTapAt.current = inputStartedAt.current;
    tapLockedRef.current = false;
    setTapLocked(false);
  }, []);

  useEffect(() => {
    if (!disabled && phase === "ready" && !started.current) {
      started.current = true;
      void (async () => {
        for (let value = 5; value > 0; value -= 1) {
          setStartIn(value);
          await new Promise<void>((resolve) =>
            window.setTimeout(resolve, 1000),
          );
          if (cancelled.current) return;
        }
        setStartIn(0);
        await beginRound();
      })();
    }
  }, [disabled, phase, beginRound]);
  useEffect(() => {
    if (disabled || phase === "ready" || phase === "complete") return;
    const timer = window.setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [disabled, phase]);
  useEffect(() => {
    if (seconds === 0) void finish("TIME_LIMIT_REACHED");
  }, [seconds, finish]);

  const press = async (color: LightColor) => {
    if (
      phase !== "repeat" ||
      disabled ||
      finished.current ||
      tapLockedRef.current
    )
      return;
    tapLockedRef.current = true;
    setTapLocked(true);
    const now = performance.now();
    if (inputIndex === 0)
      metrics.current.reactionTimes.push(now - inputStartedAt.current);
    else metrics.current.tapDelays.push(now - previousTapAt.current);
    previousTapAt.current = now;
    sounds.current?.play(color);
    setActive(color);
    const matches = engine.current.expected(inputIndex) === color;
    if (!matches) {
      roundMistakeRef.current = true;
      metrics.current.wrongTaps += 1;
      metrics.current.mistakes += 1;
    } else {
      metrics.current.correctTaps += 1;
    }
    const nextIndex = inputIndex + 1;
    setInputIndex(nextIndex);
    if (nextIndex === engine.current.length()) {
      if (!roundMistakeRef.current) {
        metrics.current.completedSequences += 1;
        metrics.current.longestSequence = Math.max(
          metrics.current.longestSequence,
          engine.current.length(),
        );
      }
      const shouldAdvance = !roundMistakeRef.current;
      setWillAdvanceRound(shouldAdvance);
      setPhase("transition");
      setNextRoundIn(5);
      const countdown = window.setInterval(
        () => setNextRoundIn((value) => Math.max(0, value - 1)),
        1000,
      );
      window.setTimeout(() => setActive(null), 520);
      window.setTimeout(() => {
        window.clearInterval(countdown);
        setNextRoundIn(0);
        if (metrics.current.mistakes >= MAX_MISTAKES) {
          void finish("MISTAKE_LIMIT_REACHED");
        } else if (round >= 3 && shouldAdvance) {
          void finish("ROUNDS_COMPLETED");
        } else {
          void beginRound(shouldAdvance);
        }
      }, 5000);
    } else {
      window.setTimeout(() => {
        setActive(null);
        tapLockedRef.current = false;
        setTapLocked(false);
      }, 520);
    }
  };

  const progress = Math.min(
    100,
    ((durationSeconds - seconds) / durationSeconds) * 100,
  );
  return (
    <div className="follow-lights-world relative flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-4 sm:p-6">
      {Array.from({ length: 16 }, (_, index) => (
        <span
          key={index}
          className="follow-particle"
          style={{
            left: `${(index * 37) % 100}%`,
            bottom: `${(index * 19) % 35}%`,
            animationDelay: `${-index * 0.55}s`,
            animationDuration: `${7 + (index % 5)}s`,
          }}
        />
      ))}
      <div className="follow-progress-card absolute left-4 top-20 rounded-2xl bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur sm:left-7">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#648097]">
          Progress
        </p>
        <div className="mt-1 h-2 w-28 overflow-hidden rounded-full bg-slate-200 sm:w-40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-[width] duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-[#173650] shadow-xl sm:right-7 sm:top-6">
        <Timer className="h-5 w-5 text-violet-500" />
        <span className="text-xl font-black tabular-nums">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </span>
      </div>
      <div className="relative z-10 mb-4 text-center sm:mb-6">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-md">
          <Eye className="h-6 w-6 text-violet-500" />
        </div>
        <h1 className="mt-3 text-xl font-black text-[#173650] sm:text-3xl">
          Follow the Lights
        </h1>
        <p className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-violet-600">
          Round {round || 1}
        </p>
        <div className="mt-2 flex justify-center gap-2" aria-label={`Round ${round || 1} of 3`}>{[1,2,3].map(item => <i key={item} className={`h-1.5 rounded-full transition-all ${item <= (round || 1) ? "w-7 bg-violet-500" : "w-3 bg-[#cbd9e5]"}`} />)}</div>
        <div
          aria-live="assertive"
          className={`follow-phase mt-2 ${phase === "watch" ? "is-watch" : ""} ${phase === "repeat" && !tapLocked ? "is-turn" : ""}`}
        >
          {phase === "watch" ? (
            <>
              <Eye className="h-4 w-4" /> WATCH
            </>
          ) : phase === "repeat" && tapLocked && inputIndex === 0 ? (
            <>
              <span className="follow-phase-dot" /> GET READY
            </>
          ) : phase === "repeat" ? (
            <>
              <MousePointer2 className="h-4 w-4" /> TAP THE COLORS IN ORDER
            </>
          ) : phase === "transition" ? (
            <>
              <span className="follow-phase-dot" />{" "}
              {willAdvanceRound
                ? round >= 3
                  ? "FINISHING"
                  : "NEXT ROUND"
                : "GET READY"}{" "}
              IN {nextRoundIn}
            </>
          ) : phase === "complete" ? (
            "ALL DONE"
          ) : (
            `STARTING IN ${startIn}`
          )}
        </div>
      </div>
      <div className="follow-lights-board relative z-10">
        <div className="follow-lights-grid">
          {COLORS.map((color) => (
            <LightButton
              key={color}
              color={color}
              active={active === color}
              ready={phase === "repeat" && !tapLocked}
              disabled={phase !== "repeat" || disabled || tapLocked}
              onPress={(value) => void press(value)}
            />
          ))}
        </div>
      {phase === "repeat" && (
        <div
          className="relative z-10 mt-4 flex items-center gap-2"
          aria-label={`${inputIndex} of ${sequenceLength} taps entered`}
        >
          {Array.from({ length: sequenceLength }, (_, index) => (
            <span
              key={index}
              className={`h-2.5 w-2.5 rounded-full transition ${index < inputIndex ? "scale-110 bg-[#7c4dff]" : "bg-white ring-2 ring-[#9db4c7]"}`}
            />
          ))}
        </div>
      )}
      <div
        className="relative z-10 mt-4 flex items-center justify-center gap-2"
        aria-label={`Round ${round}`}
      >
        <span className="h-2 w-2 rounded-full bg-violet-500" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#72879a]">
          Round {round} · {sequenceLength} lights
        </span>
      </div>
      </div>
    </div>
  );
}
