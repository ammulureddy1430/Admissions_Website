"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  Dices,
  Goal,
  Maximize2,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { BuildingGame } from "./building-game/BuildingGame";
import { AdventureGame } from "./adventure-game/AdventureGame";
import { BoardGame } from "./board-game/BoardGame";
import { FishingGame } from "./fishing-game/FishingGame";
import { LogicGame } from "./logic-game/LogicGame";
import { MatchingGame } from "./matching-game/MatchingGame";
import { MazeGame } from "./maze-game/MazeGame";
import { MemoryGame } from "./memory-game/MemoryGame";
import { RacingGame } from "./racing-game/RacingGame";
import { SortingGame } from "./sorting-game/SortingGame";
import { TreasureHuntGame } from "./treasure-hunt-game/TreasureHuntGame";
import { DragDropGame } from "./drag-drop-game/DragDropGame";
import { BuiltInVideoTutorial } from "./game-tutorial-screen";
import FollowTheLightsGame from "@/games/follow-the-lights/Game";
import BallStackGame from "@/games/ball-stack/Game";
import SoundDetectiveGame from "@/games/sound-detective/Game";
import ColorPathGame from "@/games/color-path/Game";

const MAX_SECURITY_WARNINGS = 3;
type GameOption = { id?: string; optionKey?: string; optionText: string };
type AnswerResult = {
  correct?: boolean;
  state?: { lastAnswerCorrect?: boolean };
} | void;

export function GameRuntimePlayer({
  initial,
  request,
  onClose,
  onComplete,
  secureMode = false,
  tutorial,
  forceRunning = false,
}: {
  initial: any;
  request: (path: string, init?: RequestInit) => Promise<any>;
  onClose: () => void;
  onComplete?: (session: any) => void;
  secureMode?: boolean;
  tutorial?: any;
  forceRunning?: boolean;
}) {
  const [state, setState] = useState(() =>
    forceRunning ? { ...initial, status: "RUNNING" } : initial,
  );
  const [sound, setSound] = useState(true);
  const [fishingBoatPosition, setFishingBoatPosition] = useState(50);
  const [fishingCaughtFish, setFishingCaughtFish] = useState<string[]>([]);
  const [securityWarning, setSecurityWarning] = useState<
    "fullscreen_exit" | "tab_switch" | null
  >(null);
  const [fullscreenRequired, setFullscreenRequired] = useState(false);
  const totalGameSeconds = Number(initial.configuration?.timeLimitMinutes)
    ? Number(initial.configuration.timeLimitMinutes) * 60
    : Number(
        initial.configuration?.gameTimeSeconds ||
          Number(initial.configuration?.timerSeconds || 30) *
            Number(initial.questionCount || 1),
      );
  const [seconds, setSeconds] = useState(totalGameSeconds);
  const timeoutHandled = useRef(false);
  const securityBusyRef = useRef(false);
  const lastViolationRef = useRef(0);
  const suppressSecurityRef = useRef(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const questionStartedAt = useRef(Date.now());

  useEffect(() => {
    if (state.status !== "RUNNING") return;
    const timer = window.setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [state.status, state.currentIndex]);

  const checkFullscreenState = () => {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  };

  const enterFullscreen = async (element: HTMLDivElement | null) => {
    if (!element) return false;
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen({ navigationUI: "hide" });
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
      return checkFullscreenState();
    } catch (err) {
      console.warn("Fullscreen request prevented:", err);
      return false;
    }
  };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = playerRef.current;
    if (element && !checkFullscreenState()) void enterFullscreen(element);
    return () => {
      document.body.style.overflow = previous;
      if (checkFullscreenState()) {
        if (document.exitFullscreen) {
          void document.exitFullscreen().catch(() => undefined);
        } else if ((document as any).webkitExitFullscreen) {
          void (document as any).webkitExitFullscreen().catch(() => undefined);
        } else if ((document as any).mozCancelFullScreen) {
          void (document as any).mozCancelFullScreen().catch(() => undefined);
        } else if ((document as any).msExitFullscreen) {
          void (document as any).msExitFullscreen().catch(() => undefined);
        }
      }
    };
  }, []);
  const closePlayer = () => {
    suppressSecurityRef.current = true;
    if (checkFullscreenState()) {
      if (document.exitFullscreen) {
        void document.exitFullscreen().catch(() => undefined);
      } else if ((document as any).webkitExitFullscreen) {
        void (document as any).webkitExitFullscreen().catch(() => undefined);
      } else if ((document as any).mozCancelFullScreen) {
        void (document as any).mozCancelFullScreen().catch(() => undefined);
      } else if ((document as any).msExitFullscreen) {
        void (document as any).msExitFullscreen().catch(() => undefined);
      }
    }
    onClose();
  };
  const forcePlayerFullscreen = async () => {
    const element = playerRef.current;
    if (!element) return;
    try {
      if (
        document.fullscreenElement === element ||
        (document as any).webkitFullscreenElement === element
      ) {
        setFullscreenRequired(false);
        return;
      }
      if (element.requestFullscreen) {
        await element.requestFullscreen({ navigationUI: "hide" });
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      }
      if (checkFullscreenState()) setFullscreenRequired(false);
    } catch (err) {
      console.warn("Fullscreen request prevented:", err);
    }
  };
  const startGame = async () => {
    const element = playerRef.current;
    if (!checkFullscreenState()) {
      const entered = await enterFullscreen(element);
      if (!entered) {
        setFullscreenRequired(true);
        return;
      }
    }
    setFullscreenRequired(false);
    await action("START");
  };
  const action = async (actionName: string, payload?: any, visualDelay = 0) => {
    if (state.demo) {
      if (actionName === "START" || actionName === "RESUME") {
        setState({ ...state, status: "RUNNING" });
        return;
      }
      if (actionName === "PAUSE") {
        setState({ ...state, status: "PAUSED" });
        return;
      }
      if (actionName === "ANSWER") {
        const correct =
          String(payload?.answer || "")
            .trim()
            .toLowerCase() ===
          String(state.currentQuestion?.correctAnswer || "")
            .trim()
            .toLowerCase();
        const nextIndex = state.currentIndex + 1;
        const complete = nextIndex >= state.questionCount;
        const next = {
          ...state,
          currentIndex: nextIndex,
          currentQuestion: complete ? null : state.demoQuestions[nextIndex],
          progress: Math.round((nextIndex / state.questionCount) * 100),
          score: state.score + (correct ? 10 : 0),
          livesRemaining: correct
            ? state.livesRemaining
            : Math.max(0, state.livesRemaining - 1),
          status: complete ? "COMPLETED" : "RUNNING",
        };
        const applyDemoResult = () => {
          setState(next);
          if (complete) onComplete?.(next);
        };
        visualDelay
          ? window.setTimeout(applyDemoResult, visualDelay)
          : applyDemoResult();
        return { correct, state: next };
      }
    }
    const result = await request(
      `game-assessments/engine/sessions/${state.id}/action`,
      { method: "POST", body: JSON.stringify({ action: actionName, payload }) },
    );
    const next = result.state || result;
    const applyResult = () => {
      setState(next);
      if (actionName === "ANSWER") {
        if (next.status === "COMPLETED") onComplete?.(next);
      } else if (
        (actionName === "COMPLETE" ||
          actionName === "MAZE_COMPLETE" ||
          actionName === "FOLLOW_LIGHTS_COMPLETE" ||
          actionName === "BALL_STACK_COMPLETE" ||
          actionName === "SOUND_DETECTIVE_COMPLETE" ||
          actionName === "COLOR_PATH_COMPLETE") &&
        next.status === "COMPLETED"
      ) {
        onComplete?.(next);
      } else if (
        actionName === "SECURITY_VIOLATION" &&
        next.status === "COMPLETED"
      ) {
        suppressSecurityRef.current = true;
        onComplete?.(next);
      }
    };
    visualDelay ? window.setTimeout(applyResult, visualDelay) : applyResult();
    return result;
  };
  const securityStats = state.runtimeState?.security || {};
  const warningCount = Number(securityStats.totalWarnings || 0);
  const reportSecurityViolation = async (
    type: "fullscreen_exit" | "tab_switch",
  ) => {
    if (
      !secureMode ||
      state.status !== "RUNNING" ||
      suppressSecurityRef.current ||
      securityBusyRef.current
    )
      return;
    const now = Date.now();
    if (now - lastViolationRef.current < 1500) return;
    lastViolationRef.current = now;
    securityBusyRef.current = true;
    setSecurityWarning(type);
    try {
      await action("SECURITY_VIOLATION", {
        type,
        browser: navigator.userAgent,
        device: navigator.platform,
      });
    } finally {
      securityBusyRef.current = false;
    }
  };
  useEffect(() => {
    if (!secureMode || state.status !== "RUNNING") return;
    const fullscreenChanged = () => {
      if (!checkFullscreenState() && !suppressSecurityRef.current)
        void reportSecurityViolation("fullscreen_exit");
    };
    const visibilityChanged = () => {
      if (document.hidden) void reportSecurityViolation("tab_switch");
    };
    const lostFocus = () => void reportSecurityViolation("tab_switch");
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Refreshing or leaving will submit your assessment.";
    };
    document.addEventListener("fullscreenchange", fullscreenChanged);
    document.addEventListener("webkitfullscreenchange", fullscreenChanged);
    document.addEventListener("mozfullscreenchange", fullscreenChanged);
    document.addEventListener("MSFullscreenChange", fullscreenChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("blur", lostFocus);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("fullscreenchange", fullscreenChanged);
      document.removeEventListener("webkitfullscreenchange", fullscreenChanged);
      document.removeEventListener("mozfullscreenchange", fullscreenChanged);
      document.removeEventListener("MSFullscreenChange", fullscreenChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("blur", lostFocus);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [secureMode, state.status, warningCount]);
  const resumeSecureAssessment = async () => {
    const element = playerRef.current;
    if (element && !checkFullscreenState()) await enterFullscreen(element);
    setSecurityWarning(null);
  };
  useEffect(() => {
    timeoutHandled.current = false;
    questionStartedAt.current = Date.now();
  }, [state.currentIndex]);
  useEffect(() => {
    if (
      seconds !== 0 ||
      state.status !== "RUNNING" ||
      timeoutHandled.current ||
      state.engine?.engineKey === "BALL_STACK" ||
      state.engine?.engineKey === "SOUND_DETECTIVE" ||
      state.engine?.engineKey === "COLOR_PATH"
    )
      return;
    timeoutHandled.current = true;
    void action("COMPLETE", { reason: "TIME_LIMIT_REACHED" });
  }, [seconds, state.status]);
  const q = state.currentQuestion;
  const isAdventure = state.engine?.engineKey === "ADVENTURE_GAME";
  const isBoardGame = state.engine?.engineKey === "BOARD_GAME";
  const isBuildingGame = state.engine?.engineKey === "BUILDING_GAME";
  const isFishingGame = state.engine?.engineKey === "FISHING_GAME";
  const isLogicGame = state.engine?.engineKey === "LOGIC_GAME";
  const isMazeGame = state.engine?.engineKey === "MAZE";
  const isMemoryGame = state.engine?.engineKey === "MEMORY_MATCH";
  const isRacingGame = state.engine?.engineKey === "RACING_GAME";
  const isSortingGame = state.engine?.engineKey === "SORTING_GAME";
  const isDragDropGame = state.engine?.engineKey === "DRAG_DROP";
  const isTreasureHunt = state.engine?.engineKey === "TREASURE_HUNT";
  const isFollowTheLights = state.engine?.engineKey === "FOLLOW_THE_LIGHTS";
  const isBallStack = state.engine?.engineKey === "BALL_STACK";
  const isSoundDetective = state.engine?.engineKey === "SOUND_DETECTIVE";
  const isColorPath = state.engine?.engineKey === "COLOR_PATH";
  const showGameIntro = state.status === "READY";
  const assignedGameName =
    state.generatedGame?.title ||
    tutorial?.game?.name ||
    state.engine?.name ||
    "Assessment game";
  const introTutorial =
    tutorial ||
    defaultRuntimeTutorial(
      state.engine?.engineKey || "QUIZ_CHALLENGE",
      assignedGameName,
    );
  const isFsGame =
    isAdventure ||
    isBoardGame ||
    isDragDropGame ||
    isLogicGame ||
    isMazeGame ||
    isRacingGame ||
    isSortingGame ||
    isTreasureHunt ||
    isBuildingGame ||
    isFishingGame ||
    isMemoryGame ||
    isFollowTheLights ||
    isBallStack ||
    isSoundDetective ||
    isColorPath;
  const player = (
    <div
      ref={playerRef}
      data-engine={state.engine?.engineKey || "QUIZ_CHALLENGE"}
      onPointerMove={(event) => {
        if (!isAdventure) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty(
          "--adventure-x",
          `${((event.clientX - bounds.left) / bounds.width - 0.5) * 2}`,
        );
        event.currentTarget.style.setProperty(
          "--adventure-y",
          `${((event.clientY - bounds.top) / bounds.height - 0.5) * 2}`,
        );
      }}
      className={`game-runtime-player fixed inset-0 z-[9999] flex h-[100dvh] w-screen flex-col bg-gradient-to-br from-[#071633] via-[#123b5a] to-[#007f70] text-white ${isAdventure ? "is-adventure-game" : ""} ${isBoardGame ? "is-board-game" : ""} ${isBuildingGame ? "is-building-game" : ""} ${isDragDropGame ? "is-drag-drop-game" : ""} ${isFishingGame ? "is-fishing-game" : ""} ${isLogicGame ? "is-logic-game" : ""} ${isMazeGame ? "is-maze-game" : ""} ${isMemoryGame ? "is-memory-game" : ""} ${isRacingGame ? "is-racing-game" : ""} ${isSortingGame ? "is-sorting-game" : ""} ${isTreasureHunt ? "is-treasure-hunt" : ""}`}
    >
      {!isFollowTheLights && !isBallStack && !isSoundDetective && !isColorPath && (
        <>
          <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="keep-white text-[9px] font-black uppercase tracking-widest opacity-80">
                {assignedGameName}
              </p>
              <p className="keep-white text-xs font-bold">
                {showGameIntro
                  ? `${state.questionCount} challenges await`
                  : `Question ${Math.min(state.currentIndex + 1, state.questionCount)} of ${state.questionCount}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Pill>
                <Timer /> {Math.floor(seconds / 60)}:
                {String(seconds % 60).padStart(2, "0")}
              </Pill>
              <button
                onClick={forcePlayerFullscreen}
                aria-label="Enter fullscreen"
                title="Enter fullscreen"
                className="game-icon keep-white"
              >
                <Maximize2 />
              </button>
              <button
                onClick={() => setSound(!sound)}
                aria-label="Toggle sound"
                className="game-icon keep-white"
              >
                {sound ? <Volume2 /> : <VolumeX />}
              </button>
              <button
                onClick={closePlayer}
                aria-label="Close game"
                className="game-icon keep-white"
              >
                <X />
              </button>
            </div>
          </header>
          <div className="h-1 bg-white/10">
            <div
              className="h-full bg-cyan-300 transition-all"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </>
      )}
      <main
        className={`relative flex min-h-0 flex-1 overflow-hidden ${isFsGame ? "p-0 items-stretch" : "p-4 items-center justify-center"}`}
      >
        {!isFsGame && (
          <>
            <div className="game-orb left-[8%] top-[15%]" />
            <div className="game-orb bottom-[12%] right-[10%]" />
          </>
        )}
        <section
          className={`relative z-10 my-auto w-full ${isFsGame ? "h-full max-w-none flex flex-col" : `${isMemoryGame ? "max-w-5xl" : "max-w-3xl"} rounded-[2rem] border border-white/25 bg-[#173f59]/95 p-5 shadow-2xl backdrop-blur-xl sm:p-8`} ${isBuildingGame ? "construction-site-game-panel" : ""} ${isFishingGame ? "fishing-world-panel" : ""} ${isMemoryGame ? "memory-world-panel" : ""}`}
        >
          {showGameIntro ? (
            <AssessmentTutorialIntro
              tutorial={introTutorial}
              preview={state}
              gameName={assignedGameName}
              onStart={startGame}
            />
          ) : isFollowTheLights ? (
            <FollowTheLightsGame
              disabled={state.status !== "RUNNING"}
              sound={sound}
              durationSeconds={120}
              onComplete={(metrics) =>
                action("FOLLOW_LIGHTS_COMPLETE", metrics)
              }
            />
          ) : isBallStack ? (
            <BallStackGame
              disabled={state.status !== "RUNNING"}
              sound={sound}
              durationSeconds={90}
              onComplete={(metrics) => action("BALL_STACK_COMPLETE", metrics)}
            />
          ) : isSoundDetective ? (
            <SoundDetectiveGame
              disabled={state.status !== "RUNNING"}
              sound={sound}
              onComplete={(metrics) =>
                action("SOUND_DETECTIVE_COMPLETE", metrics)
              }
            />
          ) : isColorPath ? (
            <ColorPathGame
              disabled={state.status !== "RUNNING"}
              sound={sound}
              durationSeconds={60}
              onComplete={(metrics) => action("COLOR_PATH_COMPLETE", metrics)}
            />
          ) : q ? (
            state.engine?.engineKey === "BOARD_GAME" ? (
              <BoardGame
                key={q.id}
                question={q}
                questionIndex={state.currentIndex}
                questionCount={state.questionCount}
                configuration={state.configuration}
                disabled={state.status !== "RUNNING"}
                sound={sound}
                onAnswer={(answer) =>
                  action(
                    "ANSWER",
                    {
                      answer,
                      timeTaken: Math.max(
                        0,
                        Math.round(
                          (Date.now() - questionStartedAt.current) / 1000,
                        ),
                      ),
                    },
                    state.currentIndex + 1 === state.questionCount ? 1700 : 850,
                  )
                }
              />
            ) : state.engine?.engineKey === "ADVENTURE_GAME" ? (
              <AdventureGame
                key={q.id}
                question={q}
                questionIndex={state.currentIndex}
                questionCount={state.questionCount}
                configuration={state.configuration}
                disabled={state.status !== "RUNNING"}
                sound={sound}
                onAnswer={(answer) =>
                  action(
                    "ANSWER",
                    {
                      answer,
                      timeTaken: Math.max(
                        0,
                        Math.round(
                          (Date.now() - questionStartedAt.current) / 1000,
                        ),
                      ),
                    },
                    state.currentIndex + 1 === state.questionCount ? 1700 : 850,
                  )
                }
              />
            ) : state.engine?.engineKey === "TREASURE_HUNT" ? (
              <TreasureHuntGame
                key={q.id}
                question={q}
                questionIndex={state.currentIndex}
                questionCount={state.questionCount}
                configuration={state.configuration}
                disabled={state.status !== "RUNNING"}
                sound={sound}
                onAnswer={(answer) =>
                  action(
                    "ANSWER",
                    {
                      answer,
                      timeTaken: Math.max(
                        0,
                        Math.round(
                          (Date.now() - questionStartedAt.current) / 1000,
                        ),
                      ),
                    },
                    state.currentIndex + 1 === state.questionCount ? 1700 : 850,
                  )
                }
              />
            ) : state.engine?.engineKey === "DRAG_DROP" ? (
              <DragDropGame
                key={q.id}
                question={q}
                questionIndex={state.currentIndex}
                questionCount={state.questionCount}
                configuration={state.configuration}
                disabled={state.status !== "RUNNING"}
                sound={sound}
                onAnswer={(answer) =>
                  action(
                    "ANSWER",
                    {
                      answer,
                      timeTaken: Math.max(
                        0,
                        Math.round(
                          (Date.now() - questionStartedAt.current) / 1000,
                        ),
                      ),
                    },
                    state.currentIndex + 1 === state.questionCount ? 1500 : 700,
                  )
                }
              />
            ) : state.engine?.engineKey === "SORTING_GAME" ? (
              <SortingGame
                key={q.id}
                question={q}
                questionIndex={state.currentIndex}
                questionCount={state.questionCount}
                configuration={state.configuration}
                disabled={state.status !== "RUNNING"}
                sound={sound}
                onAnswer={(answer) =>
                  action(
                    "ANSWER",
                    {
                      answer,
                      timeTaken: Math.max(
                        0,
                        Math.round(
                          (Date.now() - questionStartedAt.current) / 1000,
                        ),
                      ),
                    },
                    state.currentIndex + 1 === state.questionCount ? 1500 : 600,
                  )
                }
              />
            ) : state.engine?.engineKey === "RACING_GAME" ? (
              <RacingGame
                key={q.id}
                question={q}
                questionIndex={state.currentIndex}
                questionCount={state.questionCount}
                configuration={state.configuration}
                disabled={state.status !== "RUNNING"}
                sound={sound}
                onAnswer={(answer) =>
                  action(
                    "ANSWER",
                    {
                      answer,
                      timeTaken: Math.max(
                        0,
                        Math.round(
                          (Date.now() - questionStartedAt.current) / 1000,
                        ),
                      ),
                    },
                    state.currentIndex + 1 === state.questionCount ? 1800 : 650,
                  )
                }
              />
            ) : state.engine?.engineKey === "MEMORY_MATCH" ? (
              <MemoryGame
                key={q.id}
                question={q}
                questionIndex={state.currentIndex}
                questionCount={state.questionCount}
                disabled={state.status !== "RUNNING"}
                sound={sound}
                onComplete={(payload) =>
                  payload.response !== null &&
                  typeof payload.response === "object" &&
                  "answer" in payload.response
                    ? action("ANSWER", {
                        answer: payload.response.answer,
                        timeTaken: payload.timeTaken,
                      })
                    : action("MEMORY_COMPLETE", payload)
                }
              />
            ) : state.engine?.engineKey === "MAZE" ? (
              <MazeGame
                maze={state.runtimeState.maze}
                disabled={state.status !== "RUNNING"}
                sound={sound}
                seconds={seconds}
                onProgress={(payload) => action("MAZE_PROGRESS", payload)}
                onChallenge={(payload) => action("MAZE_ANSWER", payload)}
                onComplete={(payload) => action("MAZE_COMPLETE", payload)}
              />
            ) : state.engine?.engineKey === "LOGIC_GAME" ? (
              <LogicGame
                key={q.id}
                question={q}
                request={request}
                sound={sound}
                questionIndex={state.currentIndex}
                questionCount={state.questionCount}
                onAnswer={(answer) =>
                  action("ANSWER", {
                    answer,
                    timeTaken: Math.max(
                      0,
                      Math.round(
                        (Date.now() - questionStartedAt.current) / 1000,
                      ),
                    ),
                  })
                }
                disabled={state.status !== "RUNNING"}
              />
            ) : state.engine?.engineKey === "MATCHING_GAME" ? (
              <MatchingGame
                question={q}
                request={request}
                sound={sound}
                questionIndex={state.currentIndex}
                questionCount={state.questionCount}
                onAnswer={(answer) =>
                  action("ANSWER", {
                    answer,
                    timeTaken: Math.max(
                      0,
                      Math.round(
                        (Date.now() - questionStartedAt.current) / 1000,
                      ),
                    ),
                  })
                }
                disabled={state.status !== "RUNNING"}
              />
            ) : (
              <div className="game-question-stage">
                <div className="flex items-center gap-3">
                  <span className="runtime-instruction rounded-full bg-cyan-100 px-3 py-1 text-[10px] font-black text-[#07324a]">
                    {gameInstruction(state.engine?.engineKey)}
                  </span>
                </div>
                <h1 className="keep-white mx-auto mt-5 max-w-3xl break-words text-center text-lg font-black leading-7 sm:text-xl">
                  {simpleQuestion(q.questionText)}
                </h1>
                {q.options?.length ? (
                  <MiniGameOptions
                    key={isFishingGame ? "fishing-session" : q.id}
                    engineKey={state.engine?.engineKey || "QUIZ_CHALLENGE"}
                    options={q.options}
                    disabled={
                      isFishingGame
                        ? state.status === "PAUSED" ||
                          state.status === "COMPLETED"
                        : state.status !== "RUNNING"
                    }
                    sound={sound}
                    questionIndex={state.currentIndex}
                    questionCount={state.questionCount}
                    fishingBoatPosition={fishingBoatPosition}
                    onFishingBoatPositionChange={setFishingBoatPosition}
                    fishingCaughtFish={fishingCaughtFish}
                    onFishingFishCaught={(label) =>
                      setFishingCaughtFish((current) => [...current, label])
                    }
                    onAnswer={(answer) =>
                      action(
                        "ANSWER",
                        {
                          answer,
                          timeTaken: Math.max(
                            0,
                            Math.round(
                              (Date.now() - questionStartedAt.current) / 1000,
                            ),
                          ),
                        },
                        isAdventure ? 1300 : 0,
                      )
                    }
                  />
                ) : (
                  <div className="mt-6 grid">
                    <input
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          void action("ANSWER", {
                            answer: e.currentTarget.value,
                            timeTaken: Math.max(
                              0,
                              Math.round(
                                (Date.now() - questionStartedAt.current) / 1000,
                              ),
                            ),
                          });
                      }}
                      disabled={state.status !== "RUNNING"}
                      placeholder="Type your answer and press Enter"
                      className="keep-white rounded-2xl border border-white/30 bg-white/10 p-4 text-sm outline-none placeholder:text-white/60 focus:border-cyan-300 disabled:opacity-60"
                    />
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="py-12 text-center">
              <h1 className="keep-white text-3xl font-black">
                Assessment submitted!
              </h1>
            </div>
          )}
        </section>
      </main>
      {secureMode && securityWarning && state.status === "RUNNING" && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/90 p-4 backdrop-blur-md">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-label="Security violation warning"
            className="w-full max-w-md rounded-3xl border border-rose-400/30 bg-white p-6 text-center shadow-2xl sm:p-8"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-600 text-white">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-black text-[#071633]">
              Security violation detected
            </h2>
            <p className="mt-2 text-sm font-semibold text-rose-700">
              {securityWarning === "fullscreen_exit"
                ? "You exited fullscreen mode."
                : "You switched tabs or moved away from the assessment window."}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              Warning {Math.min(warningCount, MAX_SECURITY_WARNINGS)} of{" "}
              {MAX_SECURITY_WARNINGS}. On the third violation, your assessment
              is automatically submitted.
            </p>
            <button
              type="button"
              onClick={resumeSecureAssessment}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#007f70] px-4 py-3 text-sm font-black text-white"
            >
              <Maximize2 className="h-4 w-4" /> Resume secure assessment
            </button>
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
              <Shield className="h-3.5 w-3.5" /> Security events are recorded
              for school review.
            </div>
          </section>
        </div>
      )}
      {secureMode && fullscreenRequired && state.status === "READY" && (
        <div className="absolute inset-0 z-[60] grid place-items-center bg-slate-950/95 p-4 backdrop-blur-md">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-label="Fullscreen required"
            className="w-full max-w-md rounded-3xl border border-cyan-300/30 bg-white p-6 text-center shadow-2xl sm:p-8"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#007f70] text-white">
              <Maximize2 className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-xl font-black text-[#071633]">
              Fullscreen is required
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This is a secure assessment. You cannot begin until the game is in
              fullscreen mode.
            </p>
            <button
              type="button"
              onClick={forcePlayerFullscreen}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#007f70] px-4 py-3 text-sm font-black text-white"
            >
              <Maximize2 className="h-4 w-4" /> Enter fullscreen
            </button>
            <p className="mt-4 text-[10px] font-bold text-slate-500">
              Switching tabs or exiting fullscreen during the assessment is
              recorded.
            </p>
          </section>
        </div>
      )}
    </div>
  );
  return typeof document === "undefined"
    ? null
    : createPortal(player, document.body);
}
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="keep-white flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black [&_svg]:h-3 [&_svg]:w-3">
      {children}
    </span>
  );
}
function FishingSession(props: React.ComponentProps<typeof FishingGame>) {
  const [caughtFish, setCaughtFish] = useState<string[]>([]);
  const [boatPosition, setBoatPosition] = useState(50);
  return (
    <FishingGame
      key={props.questionIndex}
      {...props}
      caughtFish={caughtFish}
      onFishCaught={(label) => setCaughtFish((current) => [...current, label])}
      initialBoatX={boatPosition}
      onBoatPositionChange={setBoatPosition}
    />
  );
}
function MiniGameOptions({
  engineKey,
  options,
  disabled,
  onAnswer,
  sound = true,
  questionIndex = 0,
  questionCount = 1,
  fishingBoatPosition,
  onFishingBoatPositionChange,
  fishingCaughtFish,
  onFishingFishCaught,
}: {
  engineKey: string;
  options: any[];
  disabled: boolean;
  onAnswer: (answer: string) => any;
  sound?: boolean;
  questionIndex?: number;
  questionCount?: number;
  fishingBoatPosition?: number;
  onFishingBoatPositionChange?: (position: number) => void;
  fishingCaughtFish?: string[];
  onFishingFishCaught?: (label: string) => void;
}) {
  const [dragged, setDragged] = useState("");
  const [popping, setPopping] = useState("");
  const [activating, setActivating] = useState("");
  const [playPopped, setPlayPopped] = useState<number[]>([]);
  const [playRespawns, setPlayRespawns] = useState<number[]>(() =>
    Array(10).fill(0),
  );
  if (engineKey === "ADVENTURE_GAME")
    return (
      <AdventureOptions
        options={options}
        disabled={disabled}
        sound={sound}
        questionIndex={questionIndex}
        questionCount={questionCount}
        onAnswer={onAnswer}
      />
    );
  if (engineKey === "BOARD_GAME")
    return (
      <BoardGameArena
        options={options}
        disabled={disabled}
        sound={sound}
        questionIndex={questionIndex}
        questionCount={questionCount}
        onAnswer={onAnswer}
      />
    );
  if (engineKey === "BUILDING_GAME")
    return (
      <BuildingGame
        options={options}
        disabled={disabled}
        sound={sound}
        questionIndex={questionIndex}
        questionCount={questionCount}
        onAnswer={onAnswer}
        playSound={beep}
      />
    );
  if (engineKey === "FISHING_GAME" && fishingBoatPosition !== undefined)
    return (
      <FishingGame
        key={questionIndex}
        options={options}
        disabled={disabled}
        sound={sound}
        questionIndex={questionIndex}
        questionCount={questionCount}
        onAnswer={onAnswer}
        playSound={beep}
        initialBoatX={fishingBoatPosition}
        onBoatPositionChange={onFishingBoatPositionChange}
        caughtFish={fishingCaughtFish}
        onFishCaught={onFishingFishCaught}
      />
    );
  if (engineKey === "FISHING_GAME")
    return (
      <FishingSession
        options={options}
        disabled={disabled}
        sound={sound}
        questionIndex={questionIndex}
        questionCount={questionCount}
        onAnswer={onAnswer}
        playSound={beep}
      />
    );
  if (engineKey === "BALLOON_POP") {
    const pop = (option: any) => {
      if (disabled || popping) return;
      const key = option.id || option.optionKey;
      setPopping(key);
      window.setTimeout(() => onAnswer(option.optionText), 240);
    };
    return (
      <div
        className="mini-balloon-field relative mt-5 h-[390px] overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-sky-300/20 to-cyan-950/10 sm:h-[350px]"
        aria-label="Moving answer balloons"
      >
        <div className="balloon-play-decor">
          {Array.from({ length: 10 }, (_, index) => (
            <button
              type="button"
              key={`${index}-${playRespawns[index]}`}
              tabIndex={-1}
              aria-label="Pop bonus balloon"
              style={{ animationDelay: playRespawns[index] ? "0s" : undefined }}
              onClick={() => {
                if (playPopped.includes(index)) return;
                setPlayPopped((current) => [...current, index]);
                if (sound) beep(460 + index * 18);
                window.setTimeout(() => {
                  setPlayRespawns((current) =>
                    current.map((value, position) =>
                      position === index ? value + 1 : value,
                    ),
                  );
                  setPlayPopped((current) =>
                    current.filter((value) => value !== index),
                  );
                }, 460);
              }}
              className={`play-balloon play-balloon-${index + 1} ${playPopped.includes(index) ? "is-popped" : ""}`}
            >
              <span />
            </button>
          ))}
        </div>
        {options.map((option, index) => {
          const key = option.id || option.optionKey;
          return (
            <button
              key={key}
              disabled={disabled || !!popping}
              onClick={() => pop(option)}
              aria-label={`Pop balloon ${option.optionKey}: ${option.optionText}`}
              style={{
                animationDelay: `${index * -5.2}s`,
                animationDuration: `${22 + index * 2.5}s`,
              }}
              className={`runtime-answer keep-white mini-real-balloon mini-moving-balloon mini-balloon-${index + 1} ${popping === key ? "is-popping" : ""} absolute grid h-28 w-24 place-items-center rounded-[50%] text-center text-xs font-black disabled:opacity-65 sm:h-32 sm:w-28 sm:text-sm`}
            >
              <span className="answer-balloon-face">
                <span className="keep-white break-words">
                  {option.optionText}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  if (engineKey === "DRAG_DROP")
    return (
      <div className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => (
            <button
              draggable={!disabled}
              onDragStart={() => setDragged(option.optionText)}
              onClick={() => setDragged(option.optionText)}
              key={option.id}
              disabled={disabled}
              className={`runtime-answer keep-white rounded-2xl border p-4 text-sm font-bold transition disabled:opacity-70 ${dragged === option.optionText ? "border-cyan-300 bg-cyan-300/30" : "border-white/30 bg-black/20"}`}
            >
              ↕ {option.optionText}
            </button>
          ))}
        </div>
        <button
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => dragged && onAnswer(dragged)}
          onClick={() => dragged && onAnswer(dragged)}
          disabled={disabled || !dragged}
          className="runtime-answer keep-white mt-4 w-full rounded-2xl border-2 border-dashed border-cyan-300 bg-cyan-300/20 p-4 text-sm font-black disabled:opacity-50"
        >
          Drop answer here
        </button>
      </div>
    );
  const theme = optionTheme(engineKey);
  const activate = (option: any) => {
    if (disabled || activating) return;
    const key = option.id || option.optionKey;
    setActivating(key);
    window.setTimeout(() => onAnswer(option.optionText), 280);
  };
  return (
    <div
      className={`mini-game-grid mt-6 grid gap-3 sm:grid-cols-2 ${theme.container}`}
    >
      {options.map((option, index) => {
        const key = option.id || option.optionKey;
        return (
          <button
            key={key}
            disabled={disabled || !!activating}
            onClick={() => activate(option)}
            style={{ animationDelay: `${index * -0.35}s` }}
            className={`runtime-answer keep-white mini-live-option ${theme.button} ${activating === key ? "is-activated" : ""} min-h-16 border border-white/30 bg-black/20 p-4 text-sm font-black transition hover:-translate-y-1 hover:border-cyan-300 hover:bg-cyan-300/20 disabled:opacity-70`}
          >
            <span className="mini-option-icon mr-2 text-xl" aria-hidden>
              {theme.icons[index % theme.icons.length]}
            </span>
            <span className="keep-white">{option.optionText}</span>
          </button>
        );
      })}
    </div>
  );
}
function BoardGameArena({
  options,
  disabled,
  onAnswer,
  sound,
  questionIndex,
  questionCount,
}: {
  options: GameOption[];
  disabled: boolean;
  onAnswer: (answer: string) => AnswerResult | Promise<AnswerResult>;
  sound: boolean;
  questionIndex: number;
  questionCount: number;
}) {
  const [lane, setLane] = useState(0);
  const [phase, setPhase] = useState<"aim" | "rolling" | "moving">("aim");
  const [die, setDie] = useState(1);
  const [position, setPosition] = useState(0);
  const [rolls, setRolls] = useState<number[]>([]);
  const busy = disabled || phase !== "aim";
  const chooseLane = (direction: number) => {
    if (busy || position > 0) return;
    setLane(
      (current) => (current + direction + options.length) % options.length,
    );
    if (sound) beep(310 + lane * 35);
  };
  const makeMove = async () => {
    if (busy || !options[lane]) return;
    setPhase("rolling");
    if (sound) beep(220);
    const randomDie = () => {
      if (window.crypto?.getRandomValues) {
        const value = new Uint32Array(1);
        window.crypto.getRandomValues(value);
        return (value[0] % 6) + 1;
      }
      return Math.floor(Math.random() * 6) + 1;
    };
    const finalRoll = randomDie();
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const tumble = (now: number) => {
        setDie(randomDie());
        if (now - started < 850) requestAnimationFrame(tumble);
        else {
          setDie(finalRoll);
          resolve();
        }
      };
      requestAnimationFrame(tumble);
    });
    setRolls((current) => [...current.slice(-3), finalRoll]);
    setPhase("moving");
    const destination = Math.min(6, position + finalRoll);
    for (let step = position + 1; step <= destination; step += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 190));
      setPosition(step);
      if (sound) beep(330 + step * 35);
    }
    if (destination < 6) {
      await new Promise((resolve) => window.setTimeout(resolve, 280));
      setPhase("aim");
      return;
    }
    try {
      await onAnswer(options[lane].optionText);
      if (sound) beep(520);
    } catch {
      setPhase("aim");
    }
  };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        chooseLane(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        chooseLane(1);
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        void makeMove();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });
  const progress = Math.round(
    (questionIndex / Math.max(questionCount, 1)) * 100,
  );
  return (
    <div
      className={`board-arena phase-${phase}`}
      aria-label="Interactive board game"
    >
      <div className="board-status">
        <span>
          <Goal /> Stage {questionIndex + 1}/{questionCount}
        </span>
        <div>
          <i style={{ width: `${Math.max(5, progress)}%` }} />
        </div>
        <strong>
          {phase === "aim"
            ? position
              ? `Lane locked · ${6 - position} spaces left`
              : "Choose a lane"
            : phase === "rolling"
              ? "Dice rolling live…"
              : `Moving ${die} spaces…`}
        </strong>
      </div>
      <div
        className="board-track"
        style={{ "--board-lanes": options.length || 1 } as React.CSSProperties}
      >
        <div className="board-finish-line" aria-hidden>
          <Goal />
          <span>FINISH</span>
        </div>
        {options.map((option, index) => (
          <div
            key={option.id || option.optionKey}
            className={`board-lane ${lane === index ? "is-active" : position > 0 ? "is-inactive" : ""}`}
          >
            <div className="board-destination">
              <Sparkles />
              <span>{option.optionText}</span>
            </div>
            {Array.from({ length: 6 }, (_, cell) => {
              const space = 6 - cell;
              const activeLane = lane === index;
              return (
                <i
                  key={cell}
                  className={`board-cell ${activeLane && position >= space ? "is-cleared" : ""} ${activeLane && position === space ? "is-current" : ""}`}
                >
                  <span>{space}</span>
                  {space === 3 && <Sparkles />}
                </i>
              );
            })}
          </div>
        ))}
        <div
          className="board-pawn"
          style={
            {
              "--pawn-lane": lane,
              "--pawn-step": position,
            } as React.CSSProperties
          }
        >
          <span />
          <b />
        </div>
        {phase === "rolling" && (
          <div className="board-live-dice" aria-live="polite">
            <DiceFace value={die} />
            <strong>ROLLING</strong>
          </div>
        )}
      </div>
      <div className="board-controls">
        <button
          type="button"
          onClick={() => chooseLane(-1)}
          disabled={busy || position > 0}
          aria-label="Move pawn left"
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          onClick={() => void makeMove()}
          disabled={busy}
          className="board-roll"
        >
          <Dices />
          <span>
            {phase === "aim"
              ? position
                ? "Roll again"
                : "Roll & move"
              : phase === "rolling"
                ? "Rolling…"
                : `Moving ${die}`}
          </span>
          <b className={phase === "rolling" ? "is-tumbling" : ""}>
            <DiceFace value={die} />
          </b>
        </button>
        <button
          type="button"
          onClick={() => chooseLane(1)}
          disabled={busy || position > 0}
          aria-label="Move pawn right"
        >
          <ChevronRight />
        </button>
      </div>
      <div className="board-roll-history" aria-label="Recent dice rolls">
        <span>Recent rolls</span>
        {rolls.length ? (
          rolls.map((roll, index) => (
            <i key={`${roll}-${index}`}>
              <DiceFace value={roll} />
            </i>
          ))
        ) : (
          <em>No rolls yet</em>
        )}
      </div>
      <p className="board-key-hint">
        {position
          ? "Your lane is locked. Press Space to keep rolling toward the finish."
          : "Use ← → to choose a lane, then press Space to roll"}
      </p>
    </div>
  );
}
function DiceFace({ value }: { value: number }) {
  const faces = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const Face = faces[Math.max(0, Math.min(5, value - 1))];
  return <Face aria-label={`Dice showing ${value}`} />;
}
function AdventureBackdrop() {
  return (
    <div className="adventure-world" aria-hidden>
      <div className="adventure-sun" />
      <div className="adventure-cloud cloud-one" />
      <div className="adventure-cloud cloud-two" />
      <div className="adventure-birds">⌁　⌁　⌁</div>
      <div className="adventure-river" />
      <div className="adventure-mountains adventure-mountains-back" />
      <div className="adventure-mountains adventure-mountains-front" />
      <div className="adventure-forest forest-left">♠ ♠ ♠</div>
      <div className="adventure-forest forest-right">♠ ♠ ♠ ♠</div>
      <div className="adventure-fireflies">
        {Array.from({ length: 12 }, (_, index) => (
          <i
            key={index}
            style={
              {
                "--i": index,
                top: `${8 + ((index * 37) % 78)}%`,
                left: `${3 + ((index * 53) % 92)}%`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
function AssessmentTutorialIntro({
  tutorial,
  preview,
  gameName,
  onStart,
}: {
  tutorial: any;
  preview: any;
  gameName: string;
  onStart: () => void;
}) {
  const instructionCopy = defaultRuntimeTutorial(
    preview.engine?.engineKey || tutorial.engineKey || "QUIZ_CHALLENGE",
    gameName,
  );
  const steps: string[] = instructionCopy.steps;
  const [showMockGame, setShowMockGame] = useState(false);
  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-br from-[#071633] via-[#0b4960] to-[#008f80]">
      <section className="grid min-h-full w-full lg:grid-cols-[1.05fr_.95fr]">
        <div className="flex flex-col justify-start p-6 pt-10 sm:p-10 sm:pt-12 lg:p-14 lg:pt-16">
          <p
            className="keep-white text-xs font-black uppercase tracking-[.22em] !text-cyan-200"
            style={{ color: "#a5f3fc" }}
          >
            Before you begin · Read the instructions
          </p>
          <h1
            className="keep-white mt-3 text-3xl font-black leading-tight !text-white sm:text-5xl"
            style={{ color: "#ffffff" }}
          >
            {tutorial.tutorialTitle || `How to play ${gameName}`}
          </h1>
          <p
            className="keep-white mt-4 max-w-3xl text-base font-medium leading-7 !text-white sm:text-lg"
            style={{ color: "#ffffff" }}
          >
            {instructionCopy.tutorialDescription}
          </p>
          <ol className="mt-7 grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li
                key={`${index}-${step}`}
                className="flex min-h-20 items-center gap-3 rounded-xl border border-white/25 bg-white/10 p-4 text-sm font-semibold leading-6 shadow-sm"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-200 font-black text-[#052438]">
                  {index + 1}
                </span>
                <span
                  className="keep-white !text-white"
                  style={{ color: "#ffffff" }}
                >
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-2xl border border-cyan-200/35 bg-cyan-300/10 p-4 shadow-lg shadow-black/15">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-200 text-[#052438]">
                <Play className="h-5 w-5" />
              </div>
              <div>
                <p
                  className="keep-white text-[10px] font-black uppercase tracking-[.16em] !text-cyan-200"
                  style={{ color: "#a5f3fc" }}
                >
                  Mock game · Optional practice
                </p>
                <h2
                  className="keep-white mt-1 text-lg font-black !text-white"
                  style={{ color: "#ffffff" }}
                >
                  Practice the controls first
                </h2>
                <p
                  className="keep-white mt-1 text-xs font-semibold leading-5 !text-white"
                  style={{ color: "#ffffff" }}
                >
                  Safe demo only—no timer, score, or submission.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMockGame(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-cyan-100 bg-cyan-200 px-6 py-3.5 text-sm font-black text-[#052438] shadow-lg transition hover:bg-cyan-100 focus:outline-none focus:ring-4 focus:ring-cyan-200/40"
            >
              <Play className="h-4 w-4" /> Open Mock Game
            </button>
          </div>
        </div>
        <div className="flex min-h-[45vh] items-center justify-center border-t border-white/10 bg-black/20 p-6 sm:p-10 lg:min-h-full lg:border-l lg:border-t-0">
          <section className="w-full max-w-lg rounded-[2rem] border border-white/20 bg-[#071f35]/90 p-7 text-center shadow-2xl sm:p-10">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-amber-200/50 bg-amber-300/15 text-4xl">
              {instructionCopy.icon}
            </div>
            <p
              className="keep-white mt-6 text-xs font-black uppercase tracking-[.2em] !text-amber-200"
              style={{ color: "#fde68a" }}
            >
              Real assessment · Scored
            </p>
            <h2
              className="keep-white mt-2 text-2xl font-black !text-white sm:text-3xl"
              style={{ color: "#ffffff" }}
            >
              Begin your real attempt
            </h2>
            <p
              className="keep-white mx-auto mt-3 max-w-sm text-sm leading-6 !text-white"
              style={{ color: "#ffffff" }}
            >
              Continue only when you are ready. Your timer starts and every
              answer is recorded.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-amber-300/45 bg-amber-300/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-amber-100">
              <Shield className="h-3.5 w-3.5" /> Timed · Scored · Answers
              submitted
            </div>
            <button
              type="button"
              onClick={onStart}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-100 bg-amber-300 px-6 py-3.5 text-sm font-black text-[#302006] shadow-lg shadow-amber-950/30 transition hover:-translate-y-0.5 hover:bg-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-200/40"
            >
              <Play className="h-4 w-4" /> Begin Real Assessment
            </button>
          </section>
        </div>
      </section>
      {showMockGame && (
        <div className="fixed inset-0 z-[10002] flex flex-col bg-[#071633]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/15 bg-[#08243a] px-4 py-3 sm:px-6">
            <div>
              <p
                className="keep-white text-[9px] font-black uppercase tracking-widest !text-cyan-200"
                style={{ color: "#a5f3fc" }}
              >
                Mock game · Practice only
              </p>
              <h2
                className="keep-white text-sm font-black !text-white"
                style={{ color: "#ffffff" }}
              >
                {gameName}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowMockGame(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-xs font-black !text-white"
              style={{ color: "#ffffff" }}
            >
              <X className="h-4 w-4" /> Back to instructions
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5">
            <div className="h-full w-full max-w-[1280px]">
              <ActualGameTutorialDemo preview={preview} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActualGameTutorialDemo({ preview }: { preview: any }) {
  const engineKey = preview.engine?.engineKey || "QUIZ_CHALLENGE";
  const sourceQuestion = preview.currentQuestion;
  const [mockRound, setMockRound] = useState(0);
  const [mockAttempt, setMockAttempt] = useState(1);
  const [mockComplete, setMockComplete] = useState(false);
  const advanceMock = () =>
    setMockRound((value) => {
      if (value >= 2) {
        setMockComplete(true);
        return value;
      }
      return value + 1;
    });
  const repeatMock = () => {
    setMockAttempt((value) => value + 1);
    setMockRound(0);
    setMockComplete(false);
  };
  const demoLabels =
    engineKey === "ADVENTURE_GAME"
      ? ["Forest path", "River path", "Mountain path", "Village path"]
      : engineKey === "RACING_GAME"
        ? ["Left lane", "Center lane", "Right lane", "Boost lane"]
        : ["Demo target A", "Demo target B", "Demo target C", "Demo target D"];
  const question = sourceQuestion
    ? {
        ...sourceQuestion,
        id: `${sourceQuestion.id}-mock-${mockRound}`,
        questionText: "Practice the controls",
        options: (sourceQuestion.options || []).map(
          (option: any, index: number) => ({
            ...option,
            optionText:
              demoLabels[(index + mockRound) % demoLabels.length] ||
              `Demo target ${index + 1}`,
          }),
        ),
      }
    : null;
  const options = question?.options || [];
  const common = {
    question,
    questionIndex: mockRound,
    questionCount: 3,
    configuration: preview.configuration,
    disabled: false,
    sound: false,
    onAnswer: async () => {
      window.setTimeout(advanceMock, 500);
    },
  };
  if (!question)
    return (
      <BuiltInVideoTutorial
        icon="🎮"
        steps={["Read the challenge.", "Choose the correct answer."]}
        engineKey={engineKey}
      />
    );

  let game: React.ReactNode;
  if (engineKey === "ADVENTURE_GAME") game = <AdventureGame {...common} />;
  else if (engineKey === "BOARD_GAME") game = <BoardGame {...common} />;
  else if (engineKey === "RACING_GAME") game = <RacingGame {...common} />;
  else if (engineKey === "DRAG_DROP") game = <DragDropGame {...common} />;
  else if (engineKey === "SORTING_GAME") game = <SortingGame {...common} />;
  else if (engineKey === "TREASURE_HUNT")
    game = <TreasureHuntGame {...common} />;
  else if (engineKey === "LOGIC_GAME")
    game = (
      <LogicGame
        key={question.id}
        question={question}
        questionIndex={mockRound}
        questionCount={3}
        disabled={false}
        sound={false}
        practiceOnly
        onAnswer={advanceMock}
      />
    );
  else if (engineKey === "BUILDING_GAME")
    game = (
      <BuildingGame
        key={question.id}
        options={options}
        questionIndex={mockRound}
        questionCount={3}
        disabled={false}
        sound={false}
        onAnswer={async () => {
          advanceMock();
        }}
        playSound={() => undefined}
      />
    );
  else if (engineKey === "FISHING_GAME")
    game = (
      <FishingSession
        options={options}
        questionIndex={mockRound}
        questionCount={3}
        disabled={false}
        sound={false}
        onAnswer={async () => {
          advanceMock();
        }}
        playSound={() => undefined}
      />
    );
  else if (engineKey === "MEMORY_MATCH" && question.memory)
    game = (
      <MemoryGame
        key={question.id}
        question={question}
        questionIndex={mockRound}
        questionCount={3}
        disabled={false}
        sound={false}
        onComplete={async () => {
          advanceMock();
        }}
      />
    );
  else if (engineKey === "MAZE" && preview.runtimeState?.maze) {
    const mockMaze = {
      ...preview.runtimeState.maze,
      challenges: (preview.runtimeState.maze.challenges || [])
        .slice(0, 3)
        .map((challenge: any, index: number) => ({
          ...challenge,
          index: index + 1,
        })),
    };
    game = (
      <MazeGame
        key={`${mockAttempt}-${mockRound}`}
        maze={mockMaze}
        seconds={60}
        disabled={false}
        sound={false}
        practiceOnly
        onProgress={async () => undefined}
        onChallenge={async () => undefined}
        onComplete={async () => {
          setMockComplete(true);
        }}
      />
    );
  } else if (engineKey === "BALLOON_POP")
    game = (
      <div
        key={mockRound}
        className="flex h-full min-h-0 flex-col overflow-hidden p-4 pt-12"
      >
        <h2 className="keep-white shrink-0 text-center text-lg font-black">
          Practice popping and tracking balloons
        </h2>
        <MiniGameOptions
          engineKey="BALLOON_POP"
          options={options}
          disabled={false}
          sound={false}
          onAnswer={advanceMock}
        />
      </div>
    );
  else
    return (
      <BuiltInVideoTutorial
        icon="🎮"
        steps={["Read the challenge.", "Choose the correct answer."]}
        engineKey={engineKey}
      />
    );

  return (
    <div className="relative h-full w-full">
      <GameMockViewport
        canvasHeight={
          engineKey === "MAZE"
            ? 1100
            : engineKey === "SORTING_GAME" || engineKey === "LOGIC_GAME"
              ? 900
              : 720
        }
      >
        {game}
      </GameMockViewport>
      {mockComplete && (
        <div className="absolute inset-0 z-50 grid place-items-center rounded-2xl bg-[#041728]/90 p-5 backdrop-blur-md">
          <section className="w-full max-w-sm rounded-3xl border border-white/30 bg-[#0b3045] p-7 text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
            <p
              className="mt-4 text-[10px] font-black uppercase tracking-widest !text-cyan-200"
              style={{ color: "#a5f3fc" }}
            >
              Mock attempt {mockAttempt} complete
            </p>
            <h3
              className="mt-2 text-2xl font-black !text-white"
              style={{ color: "#ffffff" }}
            >
              Practice completed
            </h3>
            <p
              className="mt-2 text-sm font-medium leading-5 !text-white"
              style={{ color: "#ffffff" }}
            >
              This practice was not scored or submitted. You can repeat it as
              many times as needed.
            </p>
            <button
              type="button"
              onClick={repeatMock}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-[#052438]"
            >
              <RotateCcw className="h-4 w-4" /> Repeat Mock Game
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function GameMockViewport({
  children,
  canvasHeight = 720,
}: {
  children: React.ReactNode;
  canvasHeight?: number;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resize = () => {
      const widthScale = viewport.clientWidth / 1280;
      const heightScale = viewport.clientHeight / canvasHeight;
      setScale(Math.max(0.1, Math.min(widthScale, heightScale) * 0.96));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [canvasHeight]);
  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-hidden rounded-2xl border border-white/25 bg-[#071633] shadow-2xl"
    >
      <div
        className="absolute left-1/2 top-1/2 w-[1280px] origin-center overflow-visible"
        style={{
          height: canvasHeight,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function defaultRuntimeTutorial(engineKey: string, gameName: string) {
  const tutorials: Record<
    string,
    { icon: string; description: string; steps: string[] }
  > = {
    ADVENTURE_GAME: {
      icon: "🧭",
      description:
        "Move the explorer to the location containing the correct answer at every checkpoint.",
      steps: [
        "Read the question shown at the top.",
        "Use the arrow controls to move the explorer.",
        "Move to the card containing the correct answer.",
        "Repeat until every checkpoint is complete.",
      ],
    },
    RACING_GAME: {
      icon: "🏎️",
      description:
        "Steer into the lane containing the correct answer and race to the finish.",
      steps: [
        "Read the track question before driving.",
        "Use Left/Right to select an answer lane.",
        "Accelerate into the selected lane.",
        "Answer every checkpoint to cross the finish.",
      ],
    },
    BOARD_GAME: {
      icon: "🎲",
      description:
        "Roll the die, move your token, and answer the board challenge correctly.",
      steps: [
        "Read the challenge for the current turn.",
        "Choose a lane, then press Roll.",
        "Select the correct answer at the encounter.",
        "Continue until your token reaches the finish.",
      ],
    },
    MAZE: {
      icon: "🧭",
      description:
        "Navigate open corridors, complete each marked challenge, and reach the exit.",
      steps: [
        "Use Arrow keys or WASD to move.",
        "Avoid walls and find a challenge marker.",
        "Choose the correct answer when prompted.",
        "Complete all markers, then enter the exit.",
      ],
    },
    MEMORY_MATCH: {
      icon: "🃏",
      description:
        "Memorize each answer card, then recall the position of the correct answer.",
      steps: [
        "Read the question before cards are hidden.",
        "Memorize each card's letter and position.",
        "Select the position holding the correct answer.",
        "Repeat for every memory challenge.",
      ],
    },
    TREASURE_HUNT: {
      icon: "🗺️",
      description:
        "Dig at a marked site, reveal its chest, and open the chest containing the correct answer.",
      steps: [
        "Read the clue shown on the captain's map.",
        "Click a marked site once to dig there.",
        "Click the revealed chest to choose its answer.",
        "Find the correct treasure in every expedition.",
      ],
    },
    SORTING_GAME: {
      icon: "🗂️",
      description:
        "Route exactly one correct option to My Answer and every other option to Other Choices.",
      steps: [
        "Read the mission prompt and all options.",
        "Move the correct option to My Answer.",
        "Move every remaining option to Other Choices.",
        "Check all items are routed to submit the shipment.",
      ],
    },
    LOGIC_GAME: {
      icon: "🧠",
      description:
        "Complete the displayed logic mission by manipulating its controls and selecting the valid result.",
      steps: [
        "Read the mission rule above the play area.",
        "Click or drag the available logic actions.",
        "Test the result against the mission rule.",
        "Place or select the action that completes the mission.",
      ],
    },
    FISHING_GAME: {
      icon: "🎣",
      description:
        "Position the boat and cast the hook toward the fish carrying the intended demo target.",
      steps: [
        "Watch the moving fish and their labels.",
        "Use Left/Right to position the boat.",
        "Aim so the hook lines up with a fish.",
        "Press Cast and reel the selected fish in.",
      ],
    },
    BUILDING_GAME: {
      icon: "🏗️",
      description:
        "Select and place blocks with the crane to learn the construction controls.",
      steps: [
        "Inspect the blocks in the toolbox.",
        "Click or drag a block to select it.",
        "Place the selected block in the construction zone.",
        "Continue placing blocks to build the structure.",
      ],
    },
    DRAG_DROP: {
      icon: "🧩",
      description:
        "Practice selecting, dragging, and releasing objects inside the highlighted target.",
      steps: [
        "Inspect the draggable demo objects.",
        "Press and hold the object you want to move.",
        "Drag it into the highlighted target zone.",
        "Release inside the zone to complete the move.",
      ],
    },
    BALLOON_POP: {
      icon: "🎈",
      description:
        "Track moving balloons and practice popping a selected demo target.",
      steps: [
        "Watch how the balloons move across the sky.",
        "Locate the balloon with your chosen demo label.",
        "Click or tap that balloon to pop it.",
        "Wait for the next balloon round and repeat.",
      ],
    },
  };
  const copy = tutorials[engineKey] || {
    icon: "🎮",
    description:
      "Complete every challenge accurately before the available time ends.",
    steps: [
      "Read the challenge carefully.",
      "Review every available choice.",
      "Select the best answer.",
      "Complete all remaining challenges.",
    ],
  };
  return {
    engineKey,
    icon: copy.icon,
    tutorialTitle: `How to Play ${gameName}`,
    tutorialDescription: copy.description,
    steps: copy.steps,
  };
}

function AdventureIntro({
  questionCount,
  onStart,
}: {
  questionCount: number;
  onStart: () => void;
}) {
  return (
    <div className="adventure-intro flex min-h-full items-center justify-center p-6 w-full">
      <div
        className="relative w-full max-w-lg rounded-[2rem] border border-white/20 bg-[#0c1f2d]/95 p-8 shadow-2xl backdrop-blur-xl text-center sm:p-10"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
      >
        {/* Card Inner Glow */}
        <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-b from-[#2dd4bf]/8 to-transparent opacity-60" />

        <div className="adventure-intro-compass" aria-hidden>
          <span>🧭</span>
          <i />
        </div>
        <p className="keep-white adventure-intro-kicker mb-1">
          Your journey is ready
        </p>
        <h1 className="keep-white mt-2 text-3xl font-black sm:text-4xl text-white">
          Begin the Adventure
        </h1>
        <p className="keep-white mx-auto mt-3.5 max-w-xs text-xs leading-5 opacity-75">
          Travel through the world, choose a path at every checkpoint, and
          complete all {questionCount} challenges before time runs out.
        </p>
        <div className="adventure-intro-stats my-5">
          <span>
            <b>{questionCount}</b> checkpoints
          </span>
          <span>
            <b>1</b> journey
          </span>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="runtime-start adventure-start-button keep-white"
        >
          <Play className="keep-white h-5 w-5" /> Start Adventure
        </button>
        <p className="keep-white mt-5 text-[10px] font-bold uppercase tracking-widest opacity-40">
          Fullscreen secure assessment
        </p>
      </div>
    </div>
  );
}
function GameIntro({
  engineKey,
  gameName,
  questionCount,
  onStart,
}: {
  engineKey: string;
  gameName: string;
  questionCount: number;
  onStart: () => void;
}) {
  type IntroTheme = {
    icon: string;
    title: string;
    copy: string;
    action: string;
    tag: string;
    decor: string[];
  };
  const themes: Record<string, IntroTheme> = {
    BALLOON_POP: {
      icon: "🎈",
      title: "The Sky Is Yours",
      copy: "Spot the right answer, follow its balloon, and pop it before it floats away.",
      action: "Lift Off",
      tag: "Pop • Score • Soar",
      decor: ["🎈", "☁️", "🎈", "✨", "☁️"],
    },
    BOARD_GAME: {
      icon: "🎲",
      title: "Roll Toward Victory",
      copy: "Choose your lane, roll the dice, and move your pawn toward the winning tile.",
      action: "Enter the Board",
      tag: "Choose • Roll • Advance",
      decor: ["◼", "◻", "♟️", "◻", "🏁"],
    },
    BUILDING_GAME: {
      icon: "🏗️",
      title: "Build Something Brilliant",
      copy: "Select the right materials and operate the crane to raise your tower floor by floor.",
      action: "Start Building",
      tag: "Choose • Lift • Construct",
      decor: ["⚠️", "🧱", "🏗️", "🧱", "⚙️"],
    },
    DRAG_DROP: {
      icon: "🧩",
      title: "Everything Has Its Place",
      copy: "Grab each item, inspect the targets, and drop every piece exactly where it belongs.",
      action: "Start Matching",
      tag: "Grab • Move • Match",
      decor: ["◆", "↗", "●", "↘", "■"],
    },
    FISHING_GAME: {
      icon: "🎣",
      title: "Cast for the Right Answer",
      copy: "Read the clue, watch the water, and reel in the fish carrying the best answer.",
      action: "Cast the Line",
      tag: "Aim • Cast • Reel",
      decor: ["🐟", "≈", "🐠", "≈", "🫧"],
    },
    LAB_SIMULATION: {
      icon: "🧪",
      title: "The Lab Is Live",
      copy: "Observe the evidence, test your ideas, and choose the right result for each experiment.",
      action: "Enter the Lab",
      tag: "Observe • Test • Discover",
      decor: ["⚗️", "·", "🧬", "·", "🔬"],
    },
    LOGIC_GAME: {
      icon: "🧠",
      title: "Crack the Pattern",
      copy: "Study every clue, connect the evidence, and solve the logic challenge step by step.",
      action: "Solve the Case",
      tag: "Inspect • Reason • Solve",
      decor: ["01", "◇", "?", "△", "10"],
    },
    MATCHING_GAME: {
      icon: "🔗",
      title: "Find the Connection",
      copy: "Compare both sides and link every prompt to its perfect partner.",
      action: "Make the Matches",
      tag: "Scan • Connect • Complete",
      decor: ["A", "↔", "B", "↔", "C"],
    },
    MAZE: {
      icon: "🧭",
      title: "Find Your Way Out",
      copy: "Navigate each turn, unlock checkpoints, and reach the exit with your lives intact.",
      action: "Enter the Maze",
      tag: "Explore • Unlock • Escape",
      decor: ["┏", "┛", "◆", "┓", "┗"],
    },
    MEMORY_MATCH: {
      icon: "🃏",
      title: "Trust Your Memory",
      copy: "Reveal the cards, remember their positions, and uncover every matching pair.",
      action: "Flip the First Card",
      tag: "Reveal • Remember • Pair",
      decor: ["?", "★", "?", "★", "?"],
    },
    PUZZLE: {
      icon: "🧩",
      title: "Complete the Picture",
      copy: "Examine the clues, position each piece, and bring the full solution together.",
      action: "Start the Puzzle",
      tag: "Inspect • Place • Complete",
      decor: ["◩", "◪", "◫", "◧", "◨"],
    },
    QUIZ_CHALLENGE: {
      icon: "⚡",
      title: "Power Up Your Knowledge",
      copy: "Think carefully, choose confidently, and build a winning answer streak.",
      action: "Start the Challenge",
      tag: "Think • Choose • Score",
      decor: ["✦", "A", "?", "B", "✦"],
    },
    RACING_GAME: {
      icon: "🏎️",
      title: "Race for the Finish",
      copy: "Pick the correct lane, hit the accelerator, and leave every challenge behind.",
      action: "Start Your Engine",
      tag: "Choose • Accelerate • Win",
      decor: ["🏁", "—", "🏎️", "—", "🏁"],
    },
    SENTENCE_BUILDER: {
      icon: "📝",
      title: "Build the Perfect Sentence",
      copy: "Arrange every word in the right order and make each sentence click into place.",
      action: "Start Writing",
      tag: "Read • Arrange • Refine",
      decor: ["“", "Aa", "→", "Bb", "”"],
    },
    SHOOTING_GAME: {
      icon: "🎯",
      title: "Lock Onto the Answer",
      copy: "Read fast, steady your aim, and hit only the target with the correct answer.",
      action: "Enter the Range",
      tag: "Focus • Aim • Hit",
      decor: ["◎", "·", "🎯", "·", "◎"],
    },
    SIMULATION_GAME: {
      icon: "🎛️",
      title: "Take Control",
      copy: "Adjust the controls, observe what changes, and guide the simulation to success.",
      action: "Run Simulation",
      tag: "Adjust • Observe • Decide",
      decor: ["◉", "⌁", "▥", "⌁", "◉"],
    },
    SORTING_GAME: {
      icon: "🗂️",
      title: "Sort It Out",
      copy: "Inspect every item and move it into the category where it truly belongs.",
      action: "Start Sorting",
      tag: "Inspect • Group • Clear",
      decor: ["A", "↓", "B", "↓", "C"],
    },
    STORY_GAME: {
      icon: "📖",
      title: "Your Story Begins Here",
      copy: "Follow the narrative, make thoughtful choices, and shape how the journey unfolds.",
      action: "Open the Story",
      tag: "Read • Choose • Continue",
      decor: ["✦", "📖", "☾", "🏰", "✦"],
    },
    STRATEGY_GAME: {
      icon: "♟️",
      title: "Plan Your Winning Move",
      copy: "Read the field, weigh every option, and choose the smartest path forward.",
      action: "Deploy Strategy",
      tag: "Assess • Plan • Execute",
      decor: ["♜", "□", "♟", "■", "♛"],
    },
    TREASURE_HUNT: {
      icon: "🗺️",
      title: "The Treasure Awaits",
      copy: "Follow the clues, choose the right chest, and collect the treasure hidden within.",
      action: "Begin the Hunt",
      tag: "Explore • Decode • Discover",
      decor: ["🏝️", "·", "✕", "·", "💎"],
    },
    WORD_GAME: {
      icon: "🔤",
      title: "Words at the Ready",
      copy: "Explore the letters, decode each clue, and choose the word that fits.",
      action: "Play With Words",
      tag: "Read • Decode • Answer",
      decor: ["A", "B", "C", "D", "E"],
    },
  };
  const theme = themes[engineKey] || {
    icon: "🎮",
    title: "Your Challenge Awaits",
    copy: "Complete every challenge carefully before time runs out.",
    action: "Start Game",
    tag: "Focus • Play • Achieve",
    decor: ["✦", "◆", "●", "◆", "✦"],
  };
  return (
    <div
      className={`game-intro game-intro-${engineKey.toLowerCase().replaceAll("_", "-")} py-6 text-center sm:py-10`}
    >
      <div className="game-intro-scene" aria-hidden>
        {theme.decor.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
      <div className="game-intro-content">
        {engineKey === "BALLOON_POP" ? (
          <div className="balloon-hero-mark" aria-hidden>
            <div className="balloon-hero-cloud cloud-left" />
            <div className="balloon-hero-cloud cloud-right" />
            <span className="hero-balloon balloon-one">🎈</span>
            <span className="hero-balloon balloon-two">🎈</span>
            <span className="hero-balloon balloon-three">🎈</span>
            <div className="balloon-hero-shine" />
          </div>
        ) : (
          <div className="themed-hero-mark" aria-hidden>
            <div className="themed-hero-orbit" />
            <span className="themed-hero-symbol">{theme.icon}</span>
            <span className="themed-hero-detail detail-one">
              {theme.decor[0]}
            </span>
            <span className="themed-hero-detail detail-two">
              {theme.decor[2]}
            </span>
            <span className="themed-hero-detail detail-three">
              {theme.decor[4]}
            </span>
            <div className="themed-hero-glint" />
          </div>
        )}
        <p className="keep-white game-intro-kicker">{gameName}</p>
        <h1 className="keep-white mt-2 text-3xl font-black sm:text-4xl">
          {theme.title}
        </h1>
        <p className="keep-white mx-auto mt-3 max-w-md text-xs leading-5 opacity-75">
          {theme.copy}
        </p>
        <div className="game-intro-meta">
          <span>
            <b>{questionCount}</b> challenges
          </span>
          <span>{theme.tag}</span>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="runtime-start adventure-start-button keep-white"
        >
          <Play className="keep-white h-5 w-5" /> {theme.action}
        </button>
        <p className="keep-white mt-4 text-[10px] font-bold uppercase tracking-widest opacity-50">
          Your timer begins when you start
        </p>
      </div>
    </div>
  );
}
function AdventureOptions({
  options,
  disabled,
  onAnswer,
  sound,
  questionIndex,
  questionCount,
}: {
  options: any[];
  disabled: boolean;
  onAnswer: (answer: string) => any;
  sound: boolean;
  questionIndex: number;
  questionCount: number;
}) {
  const [chosen, setChosen] = useState("");
  const choose = async (option: any) => {
    if (disabled || chosen) return;
    const key = option.id || option.optionKey;
    setChosen(key);
    if (sound) beep(520);
    try {
      await onAnswer(option.optionText);
    } catch {
      setChosen("");
    }
  };
  const progress = Math.max(
    4,
    Math.round(
      ((questionIndex + (chosen ? 1 : 0)) / Math.max(questionCount, 1)) * 100,
    ),
  );
  const chosenIndex = options.findIndex(
    (option) => (option.id || option.optionKey) === chosen,
  );
  const directions = [
    { icon: "↑", label: "North" },
    { icon: "→", label: "East" },
    { icon: "↓", label: "South" },
    { icon: "←", label: "West" },
  ];
  return (
    <div className={`adventure-stage mt-5 ${chosen ? "is-travelling" : ""}`}>
      <div
        className="adventure-mission-strip"
        aria-label={`Adventure progress ${questionIndex + 1} of ${questionCount}`}
      >
        <span>🧭 Checkpoint {Math.min(questionIndex + 1, questionCount)}</span>
        <div>
          <i style={{ width: `${progress}%` }} />
        </div>
        <span>{questionCount - questionIndex} remaining</span>
      </div>
      <p className="keep-white adventure-hint">
        Choose a direction at the crossroads
      </p>
      <div
        className={`adventure-crossroads ${chosenIndex >= 0 ? `travelling-direction-${chosenIndex + 1}` : ""}`}
        role="group"
        aria-label="Adventure directions"
      >
        <div className="crossroads-stars" aria-hidden>
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="crossroads-path path-vertical" aria-hidden />
        <div className="crossroads-path path-horizontal" aria-hidden />
        <div className="crossroads-center" aria-hidden>
          <div className="crossroads-compass">✦</div>
          <span>🧗</span>
        </div>
        {options.map((option, index) => {
          const key = option.id || option.optionKey;
          const direction = directions[index % directions.length];
          return (
            <button
              key={key}
              type="button"
              disabled={disabled || !!chosen}
              onClick={() => choose(option)}
              aria-label={`${direction.label}: ${option.optionText}`}
              className={`runtime-answer crossroads-choice direction-${index + 1} ${chosen === key ? "is-chosen" : chosen ? "is-fading" : ""}`}
              style={{ "--delay": `${index * 100}ms` } as React.CSSProperties}
            >
              <span className="crossroads-arrow" aria-hidden>
                {direction.icon}
              </span>
              <span className="crossroads-answer">{option.optionText}</span>
            </button>
          );
        })}
      </div>
      {chosen && (
        <div className="adventure-travel-flash">
          <span>Journey recorded — travelling onward…</span>
        </div>
      )}
    </div>
  );
}
function optionTheme(engineKey: string) {
  if (engineKey === "ADVENTURE_GAME")
    return {
      container: "mini-adventure",
      button: "mini-map rounded-2xl",
      icons: ["🗺️", "🧭", "⛰️", "🏕️"],
    };
  if (engineKey === "BALLOON_POP")
    return {
      container: "mini-balloons",
      button: "mini-balloon rounded-[50%]",
      icons: ["🎈", "🎈", "🎈", "🎈"],
    };
  if (engineKey === "BOARD_GAME")
    return {
      container: "mini-board",
      button: "mini-board-cell rounded-xl",
      icons: ["🎲", "♟️", "⭐", "🏁"],
    };
  if (engineKey === "BUILDING_GAME")
    return {
      container: "mini-building",
      button: "mini-block rounded-lg",
      icons: ["🧱", "🏗️", "🔨", "🏠"],
    };
  if (engineKey === "FISHING_GAME")
    return {
      container: "mini-fishing",
      button: "mini-fish rounded-full",
      icons: ["🐟", "🐠", "🐡", "🎣"],
    };
  if (engineKey === "LAB_SIMULATION")
    return {
      container: "mini-lab",
      button: "mini-beaker rounded-2xl",
      icons: ["🧪", "⚗️", "🔬", "🧬"],
    };
  if (engineKey === "LOGIC_GAME")
    return {
      container: "mini-logic",
      button: "mini-node rounded-2xl",
      icons: ["🧠", "🔷", "🔶", "💡"],
    };
  if (engineKey === "MATCHING_GAME")
    return {
      container: "mini-matching",
      button: "mini-match rounded-xl",
      icons: ["🔗", "🧩", "↔️", "✅"],
    };
  if (engineKey === "SHOOTING_GAME")
    return {
      container: "",
      button: "mini-target rounded-full",
      icons: ["🎯", "🎯", "🎯", "🎯"],
    };
  if (engineKey === "MEMORY_MATCH")
    return {
      container: "",
      button: "mini-memory rounded-xl",
      icons: ["🂠", "🂠", "🂠", "🂠"],
    };
  if (engineKey === "SEQUENCE_GAME")
    return {
      container: "",
      button: "rounded-xl text-left",
      icons: ["1️⃣", "2️⃣", "3️⃣", "4️⃣"],
    };
  if (engineKey === "MAZE")
    return {
      container: "",
      button: "mini-path rounded-xl",
      icons: ["⬅️", "⬆️", "➡️", "↗️"],
    };
  if (engineKey === "PUZZLE")
    return {
      container: "mini-puzzle",
      button: "mini-piece rounded-2xl",
      icons: ["🧩", "🔹", "🔸", "💠"],
    };
  if (engineKey === "RACING_GAME")
    return {
      container: "mini-race",
      button: "mini-lane rounded-xl",
      icons: ["🏎️", "🚙", "🏍️", "🚗"],
    };
  if (engineKey === "SENTENCE_BUILDER")
    return {
      container: "mini-sentence",
      button: "mini-word rounded-xl",
      icons: ["Aa", "Bb", "Cc", "Dd"],
    };
  if (engineKey === "SIMULATION_GAME")
    return {
      container: "mini-simulation",
      button: "mini-control rounded-2xl",
      icons: ["🎛️", "⚙️", "📊", "🔄"],
    };
  if (engineKey === "SORTING_GAME")
    return {
      container: "mini-sorting",
      button: "mini-bin rounded-2xl",
      icons: ["📥", "🗂️", "📦", "✅"],
    };
  if (engineKey === "STORY_GAME")
    return {
      container: "mini-story",
      button: "mini-story-page rounded-2xl",
      icons: ["📖", "🪄", "🏰", "🌟"],
    };
  if (engineKey === "STRATEGY_GAME")
    return {
      container: "mini-strategy",
      button: "mini-tactic rounded-2xl",
      icons: ["🛡️", "⚔️", "🏹", "♜"],
    };
  if (engineKey === "ENDLESS_RUNNER")
    return {
      container: "mini-runner",
      button: "mini-lane rounded-xl",
      icons: ["🏃", "🏃", "🏃", "🏃"],
    };
  if (engineKey === "TREASURE_HUNT")
    return {
      container: "",
      button: "mini-treasure rounded-xl",
      icons: ["🧰", "🧰", "🧰", "🧰"],
    };
  if (
    engineKey === "WORD_GAME" ||
    engineKey === "WORD_SEARCH" ||
    engineKey === "CROSSWORD"
  )
    return {
      container: "mini-words",
      button: "mini-word rounded-xl",
      icons: ["🔤", "🔡", "✏️", "📚"],
    };
  if (engineKey === "SPIN_WHEEL")
    return {
      container: "mini-wheel",
      button: "rounded-full",
      icons: ["①", "②", "③", "④"],
    };
  if (engineKey === "BASKETBALL_CHALLENGE")
    return {
      container: "",
      button: "mini-sports rounded-xl",
      icons: ["🏀", "🏀", "🏀", "🏀"],
    };
  if (engineKey === "FOOTBALL_GOAL_QUIZ")
    return {
      container: "",
      button: "mini-sports rounded-xl",
      icons: ["⚽", "⚽", "⚽", "⚽"],
    };
  return {
    container: "",
    button: "rounded-2xl text-left",
    icons: ["A", "B", "C", "D"],
  };
}
function gameInstruction(engineKey = "QUIZ_CHALLENGE") {
  const labels: Record<string, string> = {
    QUIZ_CHALLENGE: "Choose the answer",
    ADVENTURE_GAME: "Choose your next adventure path",
    BALLOON_POP: "Pop the correct balloon",
    BOARD_GAME: "Make the correct board move",
    BUILDING_GAME: "Choose the correct building block",
    DRAG_DROP: "Drag the answer to the target",
    FISHING_GAME: "Catch the correct answer",
    LAB_SIMULATION: "Choose the correct experiment result",
    LOGIC_GAME: "Solve the logic challenge",
    MATCHING_GAME: "Match the correct pair",
    MAZE: "Choose the correct path",
    MEMORY_MATCH: "Flip the correct card",
    PUZZLE: "Place the correct puzzle piece",
    RACING_GAME: "Race into the correct lane",
    SENTENCE_BUILDER: "Choose the correct sentence",
    SHOOTING_GAME: "Hit the correct target",
    SIMULATION_GAME: "Choose the correct control",
    SORTING_GAME: "Sort the answer into the correct group",
    STORY_GAME: "Choose what happens next",
    STRATEGY_GAME: "Choose the winning strategy",
    TREASURE_HUNT: "Open the correct chest",
    WORD_GAME: "Choose the correct word",
    WORD_SEARCH: "Find the correct word",
    CROSSWORD: "Solve the clue",
    SEQUENCE_GAME: "Choose the correct step",
    ENDLESS_RUNNER: "Run into the correct lane",
    SPIN_WHEEL: "Choose the winning section",
    BASKETBALL_CHALLENGE: "Shoot into the correct hoop",
    FOOTBALL_GOAL_QUIZ: "Score in the correct goal",
  };
  return labels[engineKey] || "Choose the answer";
}
function simpleQuestion(value: string) {
  const cleaned = value
    .replace(/^True or False:\s*/i, "Is this correct? ")
    .replace(/^According to the textbook,\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 150
    ? `${cleaned.slice(0, 147).replace(/\s+\S*$/, "")}…`
    : cleaned;
}
function beep(frequency: number) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.06;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  } catch {}
}
