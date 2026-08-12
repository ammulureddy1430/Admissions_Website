"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Volume2, VolumeX, Music } from "lucide-react";
import { SoundDetectiveEngine } from "./GameEngine";
import { scoreSoundDetective } from "./ScoringEngine";
import { SoundDetectiveAnalyticsService } from "./AnalyticsService";
import { SoundManager } from "./Sounds/SoundManager";
import type { GamePhase, RawGameMetrics, SoundDetectiveScores, SoundItem } from "./Types";
import "./Styles/Game.css";

const ROUND_TIME_LIMIT = 15; // 15 seconds per round
const MAX_ROUNDS = 4;

export default function SoundDetectiveGame({
  disabled = false,
  sound = true,
  practiceOnly = false,
  maxRounds = MAX_ROUNDS,
  onComplete,
}: {
  disabled?: boolean;
  sound?: boolean;
  durationSeconds?: number;
  practiceOnly?: boolean;
  maxRounds?: number;
  onComplete: (metrics: SoundDetectiveScores) => void | Promise<void>;
}) {
  const engine = useRef(new SoundDetectiveEngine(practiceOnly));
  const sounds = useRef<SoundManager | null>(null);
  const analytics = useRef(new SoundDetectiveAnalyticsService(onComplete));
  const cancelled = useRef(false);
  const finished = useRef(false);
  const started = useRef(false);
  const roundIntroTimeout = useRef<number | undefined>(undefined);
  const isSelecting = useRef(false);

  // Time tracking
  const inputStartedAt = useRef(0);
  const elapsedRef = useRef(0);

  const metrics = useRef<RawGameMetrics>({
    roundsPlayed: 0,
    correctResponses: 0,
    incorrectResponses: 0,
    reactionTimes: [],
    highestDifficulty: 1,
    elapsedSeconds: 0,
    endReason: "COMPLETED",
    roundResponses: [],
  });

  // Phases: 'instructions' | 'ready' | 'listen' | 'choices' | 'complete'
  const [phase, setPhase] = useState<GamePhase | "instructions">("instructions");
  const [startIn, setStartIn] = useState(3);
  const [roundSeconds, setRoundSeconds] = useState(ROUND_TIME_LIMIT);
  const [soundEnabled, setSoundEnabled] = useState(sound);

  // Round State
  const [round, setRound] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [target, setTarget] = useState<SoundItem | null>(null);
  const [options, setOptions] = useState<SoundItem[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showRoundIntro, setShowRoundIntro] = useState(false);

  // Lifecycle
  useEffect(() => {
    cancelled.current = false;
    finished.current = false;
    sounds.current = new SoundManager(soundEnabled);
    return () => {
      cancelled.current = true;
      sounds.current?.dispose();
      if (roundIntroTimeout.current) {
        window.clearTimeout(roundIntroTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    sounds.current?.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    analytics.current = new SoundDetectiveAnalyticsService(onComplete);
  }, [onComplete]);

  // Finish assessment
  const finish = useCallback(
    async (reason: RawGameMetrics["endReason"]) => {
      if (finished.current) return;
      finished.current = true;
      cancelled.current = true;
      if (roundIntroTimeout.current) {
        window.clearTimeout(roundIntroTimeout.current);
        roundIntroTimeout.current = undefined;
      }
      metrics.current.elapsedSeconds = elapsedRef.current;
      metrics.current.endReason = reason;

      setPhase("complete");
      setIsAudioPlaying(false);

      const finalScores = scoreSoundDetective(metrics.current);
      await analytics.current.save(finalScores);
    },
    []
  );

  // Begin next round
  const beginRound = useCallback(() => {
    if (finished.current || cancelled.current) return;

    if (roundIntroTimeout.current) {
      window.clearTimeout(roundIntroTimeout.current);
      roundIntroTimeout.current = undefined;
    }

    isSelecting.current = false;

    const next = engine.current.nextRound();
    metrics.current.roundsPlayed += 1;
    metrics.current.highestDifficulty = Math.max(metrics.current.highestDifficulty, next.difficulty);

    setRound(next.round);
    setDifficulty(next.difficulty);
    setTarget(next.target);
    setOptions(next.options);
    setPhase("listen");
    setIsAudioPlaying(false);
    setShowRoundIntro(true);
    setRoundSeconds(ROUND_TIME_LIMIT);

    // Show round intro banner for 1.5s, then start audio playback
    roundIntroTimeout.current = window.setTimeout(() => {
      roundIntroTimeout.current = undefined;
      if (cancelled.current || finished.current) return;
      setShowRoundIntro(false);
      setIsAudioPlaying(true);

      if (sounds.current) {
        sounds.current.play(next.target.id, () => {
          if (cancelled.current || finished.current) return;
          setIsAudioPlaying(false);
          setPhase("choices");
          inputStartedAt.current = performance.now();
        });
      } else {
        setIsAudioPlaying(false);
        setPhase("choices");
        inputStartedAt.current = performance.now();
      }
    }, 1500);
  }, []);

  // Handle countdown start after instructions are accepted
  const startCountdown = () => {
    if (sounds.current) {
      sounds.current.initContext();
    }
    setPhase("ready");
    setStartIn(3);
    started.current = true;
    void (async () => {
      for (let val = 3; val > 0; val--) {
        setStartIn(val);
        await new Promise<void>((resolve) => window.setTimeout(resolve, 1000));
        if (cancelled.current) return;
      }
      setStartIn(0);
      beginRound();
    })();
  };

  // Timer tick for per-round countdown and tracking total elapsed seconds
  useEffect(() => {
    if (disabled || phase === "instructions" || phase === "ready" || phase === "complete" || showRoundIntro) return;

    const timer = window.setInterval(() => {
      elapsedRef.current += 1;

      if (phase === "choices" && !isAudioPlaying) {
        setRoundSeconds((prev) => {
          if (prev <= 1) {
            // Time out: treated as incorrect
            isSelecting.current = true;
            metrics.current.incorrectResponses += 1;
            metrics.current.reactionTimes.push(ROUND_TIME_LIMIT * 1000);
            metrics.current.roundResponses.push({
              round,
              questionText: "Which picture matches the sound you heard?",
              options: options.map((item) => item.label),
              correctAnswer: target?.label || "Unknown sound",
              studentAnswer: "Not answered",
              correct: false,
              responseTimeMs: ROUND_TIME_LIMIT * 1000,
            });

            if (metrics.current.roundsPlayed >= maxRounds) {
              void finish("COMPLETED");
            } else {
              beginRound();
            }
            return ROUND_TIME_LIMIT;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [disabled, phase, showRoundIntro, isAudioPlaying, beginRound, finish, options, round, target]);

  // Handle card selection
  const selectCard = (choice: SoundItem, eventTime: number) => {
    if (phase !== "choices" || disabled || finished.current || isSelecting.current) return;
    isSelecting.current = true;

    const rt = eventTime - inputStartedAt.current;
    metrics.current.reactionTimes.push(rt);

    const correct = engine.current.isCorrect(choice.id);
    metrics.current.roundResponses.push({
      round,
      questionText: "Which picture matches the sound you heard?",
      options: options.map((item) => item.label),
      correctAnswer: target?.label || "Unknown sound",
      studentAnswer: choice.label,
      correct,
      responseTimeMs: Math.round(rt),
    });

    if (correct) {
      metrics.current.correctResponses += 1;
    } else {
      metrics.current.incorrectResponses += 1;
    }

    if (metrics.current.roundsPlayed >= maxRounds) {
      void finish("COMPLETED");
    } else {
      beginRound();
    }
  };

  const getAnimationClass = (item: SoundItem) => {
    if (difficulty < 2) return "";
    switch (item.animationType) {
      case "bounce":
        return "animate-bounce-gentle";
      case "pulse":
        return "animate-pulse-gentle";
      case "float":
        return "animate-float-gentle";
      case "shake":
        return "animate-shake-gentle";
      case "spin":
        return "animate-spin-gentle";
      default:
        return "";
    }
  };

  if (phase === "instructions") {
    return (
      <div className="sound-detective-world fixed inset-0 flex h-full w-full items-center justify-center p-6 overflow-y-auto">
        <div className="bg-white border-4 border-[#ffb142] rounded-[2.5rem] p-8 max-w-lg w-full text-center shadow-2xl animate-in zoom-in duration-300">
          <span className="text-6xl mb-4 block">🕵️‍♂️👂</span>
          <h1 className="sound-detective-title text-4xl font-extrabold text-[#b33939] tracking-wider mb-2">
            SOUND DETECTIVE
          </h1>
          <p className="text-sm font-black text-[#ff793f] uppercase tracking-widest mb-6">
            {practiceOnly ? "Practice round · Not scored" : "Listening Assessment"}
          </p>

          <div className="bg-[#fffcf4] border-2 border-[#ffe9c7] rounded-2xl p-5 text-left mb-8 space-y-4">
            <h3 className="font-bold text-lg text-[#4b382a] flex items-center gap-2">
              <Music className="h-5 w-5 text-[#ff793f]" /> How to Play:
            </h3>
            <ul className="space-y-3 text-[#70523c] font-semibold text-sm">
              <li className="flex items-start gap-2.5">
                <span className="text-lg">1.</span>
                <span>Listen closely to the secret sound that plays.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-lg">2.</span>
                <span>Four cards will appear on the screen.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-lg">3.</span>
                <span>Tap the card that matches the sound you heard!</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-lg">4.</span>
                <span>Answer all {MAX_ROUNDS} rounds before your timer runs out.</span>
              </li>
            </ul>
          </div>

          <button
            onClick={startCountdown}
            className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[#ff793f] to-[#ffb142] hover:from-[#e05d20] hover:to-[#e09a20] text-white font-black text-xl rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Start Assessment
          </button>
        </div>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className="sound-detective-world fixed inset-0 flex h-full w-full items-center justify-center p-6">
        <div className="sound-detective-ready-screen">
          <h1 className="sound-detective-title text-5xl font-black text-[#b33939] mb-4">
            Get Ready...
          </h1>
          <p className="text-xl font-bold text-[#70523c] mb-12">
            Listen carefully to the first sound!
          </p>
          <div className="sound-detective-countdown">{startIn}</div>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="sound-detective-world fixed inset-0 flex h-full w-full items-center justify-center p-6">
        <div className="text-center animate-in fade-in duration-500">
          <h2 className="text-4xl font-black text-[#2b1f15] mb-4">Good Job!</h2>
          <p className="text-lg text-[#70523c]">The listening game is complete.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sound-detective-world fixed inset-0 flex h-full w-full flex-col select-none overflow-hidden">
      {/* Premium Header */}
      <header className="sound-detective-header flex shrink-0 items-center justify-between px-6 py-4">
        <div>
          <h1 className="sound-detective-title text-xl font-black text-[#b33939]">
            Sound Detective
          </h1>
          <p className="text-xs font-bold text-[#8c6b53] mt-0.5">
            Round {round} of {MAX_ROUNDS}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Large Kid-friendly Countdown Timer */}
          <div className="sound-detective-timer-badge flex items-center gap-1.5 bg-amber-500 text-white shadow-md">
            <Timer className="h-5 w-5" />
            <span>{roundSeconds}s</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label="Toggle Sound"
            className="grid h-12 w-12 place-items-center rounded-2xl bg-white border-2 border-[#ffe9c7] text-[#8c6b53] hover:text-[#b33939] transition-colors"
          >
            {soundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Progress Bar of Completed Rounds */}
      <div className="px-6 py-1 bg-white/20">
        <div className="sound-detective-progress-bar">
          <div
            className="sound-detective-progress-fill h-full"
            style={{ width: `${(round / MAX_ROUNDS) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Game Interface */}
      <main className="sound-detective-main-container flex-1">
        {showRoundIntro && (
          <div className="text-center animate-in zoom-in duration-300">
            <div className="bg-white border-4 border-[#ffb142] rounded-[2.5rem] py-8 px-12 shadow-xl">
              <span className="text-7xl mb-2 block">🔔</span>
              <h2 className="text-3xl font-black text-[#b33939] mb-1">Round {round}</h2>
              <p className="text-lg font-bold text-[#70523c]">Listen closely...</p>
            </div>
          </div>
        )}

        {!showRoundIntro && phase === "listen" && target && (
          <div className="flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
            <div
              className={`sound-detective-speaker-card ${isAudioPlaying ? "is-listening" : ""}`}
              onClick={() => {
                if (!isAudioPlaying && sounds.current && target) {
                  setIsAudioPlaying(true);
                  sounds.current.play(target.id, () => setIsAudioPlaying(false));
                }
              }}
            >
              <span className={`sound-detective-speaker-icon ${isAudioPlaying ? "is-listening" : ""}`}>
                🔊
              </span>
              <p className="text-[#8c6b53] font-bold text-lg mt-6">
                {isAudioPlaying ? "Listening..." : "Tap to listen again"}
              </p>
            </div>
          </div>
        )}

        {!showRoundIntro && phase === "choices" && (
          <div className="flex flex-col items-center justify-center w-full animate-in fade-in duration-300">
            <button
              type="button"
              className={`sound-detective-replay ${isAudioPlaying ? "is-playing" : ""}`}
              disabled={isAudioPlaying || !soundEnabled}
              onClick={() => {
                if (!target || !sounds.current || isAudioPlaying) return;
                setIsAudioPlaying(true);
                sounds.current.play(target.id, () => setIsAudioPlaying(false));
              }}
              aria-label="Play the sound again"
            >
              <span>{isAudioPlaying ? "🔊" : "▶"}</span>
              <strong>{isAudioPlaying ? "LISTEN..." : "PLAY SOUND AGAIN"}</strong>
              <Volume2 />
            </button>
            <div className="sound-detective-grid">
              {options.map((item) => (
                <button
                  key={item.id}
                  onClick={(event) => selectCard(item, event.timeStamp)}
                  disabled={isAudioPlaying}
                  className={`sound-detective-card group`}
                >
                  <span className={`sound-detective-emoji ${getAnimationClass(item)}`}>
                    {item.emoji}
                  </span>
                  <span className="sound-detective-label">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
