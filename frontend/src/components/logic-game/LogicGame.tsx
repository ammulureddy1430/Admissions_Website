"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brain,
  CircleDot,
  GitBranch,
  Power,
  Shapes,
  Star,
} from "lucide-react";
import "./LogicGame.css";

type Question = { id: string };
type GameAction = { label: string; value: string };
type LogicMission = {
  type: string;
  title: string;
  board: string;
  instruction: string;
  actions: GameAction[];
  correctAction: string;
  explanation: string;
};

const MISSIONS: LogicMission[] = [
  {
    type: "Number machine",
    title: "Power the sequence machine",
    board: "2 → 4 → 8 → 16 → ?",
    instruction: "Choose the machine operation that continues the same rule.",
    actions: [
      { label: "Add 2", value: "add-2" },
      { label: "Double", value: "double" },
      { label: "Add 8", value: "add-8" },
    ],
    correctAction: "double",
    explanation: "The machine doubles every number, producing 32.",
  },
  {
    type: "Sequence builder",
    title: "Place the first person",
    board: "Maya is before Ravi • Ravi is before Noor",
    instruction: "Move the person who must be first onto the starting tile.",
    actions: [
      { label: "Move Noor", value: "noor" },
      { label: "Move Ravi", value: "ravi" },
      { label: "Move Maya", value: "maya" },
    ],
    correctAction: "maya",
    explanation: "Maya must be first because she is before Ravi, who is before Noor.",
  },
  {
    type: "Deduction circuit",
    title: "Complete the logic connection",
    board: "Every key → Metal • This object → Key",
    instruction: "Connect the object to the property that must be true.",
    actions: [
      { label: "Connect to Wood", value: "wood" },
      { label: "Connect to Metal", value: "metal" },
      { label: "Connect to Glass", value: "glass" },
    ],
    correctAction: "metal",
    explanation: "Every key is metal, so an object identified as a key must be metal.",
  },
  {
    type: "Sorting station",
    title: "Move the object that breaks the group",
    board: "△ Triangle • □ Square • ○ Circle • ◼ Cube",
    instruction: "Move the 3D object out of the 2D-shape group.",
    actions: [
      { label: "Move Triangle", value: "triangle" },
      { label: "Move Circle", value: "circle" },
      { label: "Move Cube", value: "cube" },
    ],
    correctAction: "cube",
    explanation: "The cube is three-dimensional; the other shapes are flat.",
  },
  {
    type: "Pattern constructor",
    title: "Build the next pattern",
    board: "●  →  ●●  →  ●●●  →  ?",
    instruction: "Apply the operation that extends the pattern correctly.",
    actions: [
      { label: "Remove one dot", value: "remove" },
      { label: "Add one dot", value: "add-one" },
      { label: "Double all dots", value: "double-dots" },
    ],
    correctAction: "add-one",
    explanation: "The pattern grows by exactly one dot at every step.",
  },
  {
    type: "Power circuit",
    title: "Make the lamp glow",
    board: "The lamp works only when the switch is ON",
    instruction: "Operate the circuit so the lamp can glow.",
    actions: [
      { label: "Switch OFF", value: "off" },
      { label: "Remove power", value: "remove-power" },
      { label: "Switch ON", value: "on" },
    ],
    correctAction: "on",
    explanation: "Turning the switch ON completes the circuit and powers the lamp.",
  },
];

const PRACTICE_MISSION: LogicMission = {
  type: "Control practice",
  title: "Practice moving a module",
  board: "Drag any demo module into the practice machine",
  instruction: "This is only a controls demo. Choose any module and drag it into the target.",
  actions: [
    { label: "Demo module A", value: "practice-a" },
    { label: "Demo module B", value: "practice-b" },
    { label: "Demo module C", value: "practice-c" },
  ],
  correctAction: "practice-a",
  explanation: "Practice modules are not scored.",
};

export function LogicGame({
  question,
  sound,
  questionIndex,
  questionCount,
  onAnswer,
  disabled,
  practiceOnly = false,
}: {
  question: Question;
  request?: (path: string, init?: RequestInit) => Promise<unknown>;
  sound: boolean;
  questionIndex: number;
  questionCount: number;
  onAnswer: (answer: string) => void;
  disabled: boolean;
  practiceOnly?: boolean;
}) {
  const mission = practiceOnly ? PRACTICE_MISSION : MISSIONS[questionIndex % MISSIONS.length];
  const [action, setAction] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [draggedAction, setDraggedAction] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [targetActive, setTargetActive] = useState(false);
  const [dragPoint, setDragPoint] = useState({ x: 0, y: 0 });
  const advancingRef = useRef(false);
  const draggedActionRef = useRef("");
  const activePointerIdRef = useRef<number | null>(null);
  const dropTargetRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);

  const play = useCallback(
    (frequency: number) => {
      if (!sound) return;
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextClass) return;
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.035, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.2);
        oscillator.addEventListener("ended", () => void context.close(), {
          once: true,
        });
      } catch {}
    },
    [sound],
  );

  const operate = (selectedAction: string) => {
    if (disabled || advancingRef.current) return;
    advancingRef.current = true;
    setAction(selectedAction);
    setSelectedModule("");
    setAdvancing(true);
    const correct = practiceOnly || selectedAction === mission.correctAction;
    play(correct ? 760 : 240);
    window.setTimeout(
      () =>
        onAnswer(
          correct
            ? "__LOGIC_MISSION_CORRECT__"
            : "__LOGIC_MISSION_WRONG__",
        ),
      450,
    );
  };

  const moveDraggedModule = (x: number, y: number) => {
    const arena = arenaRef.current?.getBoundingClientRect();
    setDragPoint({
      x: arena && arena.width
        ? (x - arena.left) * (arenaRef.current!.offsetWidth / arena.width)
        : x,
      y: arena && arena.height
        ? (y - arena.top) * (arenaRef.current!.offsetHeight / arena.height)
        : y,
    });
    const target = dropTargetRef.current?.getBoundingClientRect();
    setTargetActive(Boolean(
      target
      && x >= target.left
      && x <= target.right
      && y >= target.top
      && y <= target.bottom
    ));
  };

  const releaseDraggedModule = (x: number, y: number, pointerAction?: string) => {
    const selectedAction = pointerAction || draggedActionRef.current;
    const target = dropTargetRef.current?.getBoundingClientRect();
    const droppedInside = Boolean(
      target
      && x >= target.left
      && x <= target.right
      && y >= target.top
      && y <= target.bottom
    );
    setDraggedAction("");
    draggedActionRef.current = "";
    setTargetActive(false);
    if (selectedAction && droppedInside) operate(selectedAction);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (
        draggedActionRef.current
        && activePointerIdRef.current === event.pointerId
      ) {
        event.preventDefault();
        moveDraggedModule(event.clientX, event.clientY);
      }
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (
        draggedActionRef.current
        && activePointerIdRef.current === event.pointerId
      ) {
        releaseDraggedModule(event.clientX, event.clientY);
        activePointerIdRef.current = null;
      }
    };
    const handlePointerCancel = (event: PointerEvent) => {
      if (activePointerIdRef.current !== event.pointerId) return;
      activePointerIdRef.current = null;
      draggedActionRef.current = "";
      setDraggedAction("");
      setTargetActive(false);
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  });

  return (
    <div className="logic-lab" data-question-id={question.id}>
      <div className="logic-lab-grid" aria-hidden="true" />
      <header className="logic-lab-header">
        <div>
          <Brain />
          <span>
            <small>Logic Lab</small>
            <b>Play • Reason • Solve</b>
          </span>
        </div>
        <div className="logic-lab-room">
          <Star /> {practiceOnly ? `Practice Question ${questionIndex + 1} of ${questionCount}` : `Mission ${questionIndex + 1} of ${questionCount}`}
        </div>
      </header>

      <main className="logic-lab-main">
        <section className="logic-board logic-mission-board">
          <div className="logic-board-type">
            <MissionIcon index={questionIndex} /> {mission.type}
          </div>
          <h2>{mission.title}</h2>
          <div className="logic-clue logic-machine-display">
            <div className="logic-machine-status">
              <span><i /> Machine online</span>
              <span>Find the rule</span>
            </div>
            {practiceOnly ? (
              <div className="logic-practice-display" aria-label={mission.board}>
                <span>◆</span>
                <b>Any demo module</b>
                <em>→</em>
                <strong>Practice machine</strong>
              </div>
            ) : questionIndex % MISSIONS.length === 0 ? (
              <div className="logic-sequence-flow" aria-label={mission.board}>
                {["2", "4", "8", "16"].map((number, index) => (
                  <span key={number}>
                    <b>{number}</b>
                    <i>× ?</i>
                    {index < 3 && <em>→</em>}
                  </span>
                ))}
                <span className="is-missing"><b>?</b><i>Output</i></span>
              </div>
            ) : (
              <>
                <small>Mission board</small>
                <b>{mission.board}</b>
              </>
            )}
          </div>
          <p className="logic-game-instruction">{mission.instruction}</p>

          {practiceOnly && (
            <div className="logic-practice-question" role="status" aria-live="polite">
              <span>{questionIndex + 1}</span>
              <div>
                <small>Practice Question {questionIndex + 1} of {questionCount}</small>
                <b>Drag any one module into the glowing machine box.</b>
              </div>
            </div>
          )}

          <div ref={arenaRef} className="logic-live-arena">
            <div className="logic-arena-heading">
              <span><Power /> Power modules</span>
              <small>Drag a module to the machine</small>
            </div>
            <div className="logic-arena-track" aria-hidden="true"><i /><i /><i /></div>
            <div className="logic-moving-pieces">
              {mission.actions.map((gameAction, index) => (
                <button
                  type="button"
                  draggable={false}
                  key={gameAction.value}
                  onPointerDown={(event) => {
                    if (disabled || advancing) return;
                    event.preventDefault();
                    activePointerIdRef.current = event.pointerId;
                    draggedActionRef.current = gameAction.value;
                    setDraggedAction(gameAction.value);
                    setSelectedModule(gameAction.value);
                    moveDraggedModule(event.clientX, event.clientY);
                  }}
                  disabled={disabled || advancing}
                  onClick={() => {
                    if (!advancing) setSelectedModule(gameAction.value);
                  }}
                  className={`${action === gameAction.value || selectedModule === gameAction.value ? "is-selected" : ""} ${draggedAction === gameAction.value ? "is-dragging" : ""}`}
                  style={{ "--piece-index": index } as React.CSSProperties}
                >
                  <span>{actionSymbol(gameAction.value)}</span>
                  <b>{gameAction.label}<small>Power module</small></b>
                </button>
              ))}
            </div>
            <div className="logic-flow-arrow" aria-hidden="true">➜</div>
            <div
              ref={dropTargetRef}
              role="button"
              tabIndex={disabled || advancing ? -1 : 0}
              aria-label={selectedModule ? "Install selected module" : "Select a module first"}
              onClick={() => selectedModule && operate(selectedModule)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && selectedModule) {
                  event.preventDefault();
                  operate(selectedModule);
                }
              }}
              className={`logic-drop-target ${targetActive || selectedModule ? "is-active" : ""}`}
            >
              <strong className="logic-drop-callout">
                {targetActive ? "RELEASE NOW" : selectedModule ? "TAP TO INSTALL" : "DROP HERE"}
              </strong>
              <span>{practiceOnly ? "🎮" : targetSymbol(questionIndex)}</span>
              <small>Install module</small>
              <b>{practiceOnly ? "PRACTICE MACHINE" : targetLabel(questionIndex)}</b>
            </div>
            {draggedAction && (
              <div
                className="logic-drag-ghost"
                style={{ left: dragPoint.x, top: dragPoint.y }}
                aria-hidden="true"
              >
                <span>{actionSymbol(draggedAction)}</span>
                <b>{mission.actions.find(item => item.value === draggedAction)?.label}</b>
              </div>
            )}
            <p className="logic-touch-help"><b>How to play:</b> Press and hold a module, move it onto the glowing DROP HERE box, then release. You can also tap a module, then tap the box.</p>
          </div>

          {advancing && <p className="logic-advancing">{practiceOnly ? "Practice action complete…" : "Loading next mission…"}</p>}
        </section>
      </main>
    </div>
  );
}

function MissionIcon({ index }: { index: number }) {
  const icons = [CircleDot, GitBranch, Brain, Shapes, CircleDot, Power];
  const Icon = icons[index % icons.length];
  return <Icon />;
}

function actionSymbol(value: string) {
  const symbols: Record<string, string> = {
    "add-2": "+2", double: "×2", "add-8": "+8",
    noor: "👧", ravi: "👦", maya: "👩",
    wood: "🪵", metal: "🔩", glass: "💎",
    triangle: "△", circle: "○", cube: "⬢",
    remove: "−●", "add-one": "+●", "double-dots": "×●",
    off: "OFF", "remove-power": "⚡", on: "ON",
  };
  return symbols[value] || "◆";
}

function targetLabel(index: number) {
  return ["NUMBER MACHINE", "START TILE", "LOGIC OUTPUT", "3D ZONE", "NEXT SLOT", "POWER PORT"][index % 6];
}

function targetSymbol(index: number) {
  return ["⚙️", "🏁", "🔗", "📦", "◌", "💡"][index % 6];
}
