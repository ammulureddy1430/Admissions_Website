"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Hand, Timer } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { RoomDesignerAnalyticsService } from "./AnalyticsService";
import bedImage from "./Assets/generated/bed.png";
import bookshelfImage from "./Assets/generated/bookshelf.png";
import chairImage from "./Assets/generated/chair.png";
import lampImage from "./Assets/generated/lamp.png";
import plantImage from "./Assets/generated/plant.png";
import tableImage from "./Assets/generated/table.png";
import teddyImage from "./Assets/generated/teddy.png";
import toyboxImage from "./Assets/generated/toybox.png";
import { wait } from "./AnimationController";
import {
  RoomDesignerEngine,
  ROOM_DESIGNER_DURATION_SECONDS,
  ROOM_DESIGNER_MAX_ROOMS,
} from "./GameEngine";
import { MemoryPhaseController } from "./MemoryPhaseController";
import { scoreRoomDesigner } from "./ScoringEngine";
import { SoundManager } from "./SoundManager";
import type {
  Furniture,
  Point,
  RoomDesignerScores,
  RoomPhase,
  RoomRawMetrics,
  RoomRound,
} from "./Types";
import "./RoomDesignerGame.css";

const emptyMetrics = (): RoomRawMetrics => ({
  age_group: "4–5 Years",
  total_rooms: 0,
  completed_rooms: 0,
  objects_presented: 0,
  objects_correctly_placed: 0,
  incorrect_placements: 0,
  placement_times: [],
  completion_times: [],
  object_movement_counts: [],
  highest_room_level: 1,
  started_at: new Date().toISOString(),
  completed_at: "",
});

const FURNITURE_IMAGES: Record<Furniture["kind"], StaticImageData> = {
  bed: bedImage,
  table: tableImage,
  chair: chairImage,
  lamp: lampImage,
  toybox: toyboxImage,
  bookshelf: bookshelfImage,
  teddy: teddyImage,
  plant: plantImage,
};

function FurnitureView({ item }: { item: Furniture }) {
  return (
    <div
      className={`rd-furniture ${item.kind} ${item.size}`}
      style={
        {
          "--furniture": item.color,
          rotate: `${item.rotation}deg`,
        } as React.CSSProperties
      }
    >
      <Image
        src={FURNITURE_IMAGES[item.kind]}
        alt=""
        fill
        sizes="140px"
        draggable={false}
      />
      <i className="rd-object-shadow" />
    </div>
  );
}

export default function RoomDesignerGame({
  disabled = false,
  sound = true,
  durationSeconds = ROOM_DESIGNER_DURATION_SECONDS,
  onComplete,
}: {
  disabled?: boolean;
  sound?: boolean;
  durationSeconds?: number;
  onComplete: (metrics: RoomDesignerScores) => void | Promise<void>;
}) {
  const engine = useRef(new RoomDesignerEngine());
  const phases = useRef(new MemoryPhaseController());
  const sounds = useRef<SoundManager | undefined>(undefined);
  const analytics = useRef(new RoomDesignerAnalyticsService(onComplete));
  const roomRef = useRef<HTMLDivElement>(null);
  const metrics = useRef(emptyMetrics());
  const cancelled = useRef(false);
  const finished = useRef(false);
  const started = useRef(false);
  const roundStartedAt = useRef(0);
  const placementStartedAt = useRef(0);
  const movements = useRef<Record<string, number>>({});
  const [round, setRound] = useState<RoomRound>(() =>
    new RoomDesignerEngine().round(),
  );
  const [phase, setPhase] = useState<RoomPhase>("tutorial");
  const [positions, setPositions] = useState<Record<string, Point>>({});
  const [trayOrder, setTrayOrder] = useState<Furniture[]>([]);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const [seconds, setSeconds] = useState(durationSeconds);

  useEffect(() => {
    cancelled.current = false;
    sounds.current = new SoundManager(sound);
    return () => {
      cancelled.current = true;
      sounds.current?.dispose();
    };
  }, [sound]);
  useEffect(() => {
    analytics.current = new RoomDesignerAnalyticsService(onComplete);
  }, [onComplete]);
  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    cancelled.current = true;
    metrics.current.completed_at = new Date().toISOString();
    setPhase("complete");
    await analytics.current.save(scoreRoomDesigner(metrics.current));
  }, []);
  const playRound = useCallback(async (next: RoomRound) => {
    if (finished.current) return;
    setRound(next);
    setPositions({});
    const reversed = [...next.objects].reverse();
    setTrayOrder(
      reversed.length === 2 ? reversed : [...reversed.slice(1), reversed[0]],
    );
    setDrag(null);
    setPhase("observe");
    movements.current = {};
    metrics.current.total_rooms += 1;
    metrics.current.objects_presented += next.objects.length;
    metrics.current.highest_room_level = Math.max(
      metrics.current.highest_room_level,
      next.level,
    );
    roundStartedAt.current = performance.now();
    const watched = await phases.current.observe(
      next.observationMs,
      () => cancelled.current,
    );
    if (!watched) return;
    setPhase("clearing");
    const cleared = await phases.current.clear(() => cancelled.current);
    if (!cleared) return;
    placementStartedAt.current = performance.now();
    setPhase("rebuild");
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
    const timer = window.setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [disabled, phase]);
  useEffect(() => {
    if (seconds === 0) void finish();
  }, [seconds, finish]);

  const release = async (clientX: number, clientY: number) => {
    if (!drag || phase !== "rebuild") return;
    const rect = roomRef.current?.getBoundingClientRect();
    const item = round.objects.find((object) => object.id === drag.id);
    setDrag(null);
    if (
      !rect ||
      !item ||
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    )
      return;
    const dropPoint = {
      x: Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(12, Math.min(88, ((clientY - rect.top) / rect.height) * 100)),
    };
    const occupiedTargets = Object.entries(positions)
      .filter(([objectId]) => objectId !== item.id)
      .map(([, position]) => position);
    const availableTargets = round.objects
      .map((object) => object.target)
      .filter(
        (target) =>
          !occupiedTargets.some(
            (position) =>
              Math.abs(position.x - target.x) < 0.1 &&
              Math.abs(position.y - target.y) < 0.1,
          ),
      );
    const point = availableTargets.reduce((closest, target) =>
      Math.hypot(target.x - dropPoint.x, target.y - dropPoint.y) <
      Math.hypot(closest.x - dropPoint.x, closest.y - dropPoint.y)
        ? target
        : closest,
    );
    movements.current[item.id] = (movements.current[item.id] || 0) + 1;
    sounds.current?.place();
    const next = { ...positions, [item.id]: point };
    setPositions(next);
    if (Object.keys(next).length !== round.objects.length) return;
    metrics.current.completed_rooms += 1;
    metrics.current.placement_times.push(
      Math.round(
        (performance.now() - placementStartedAt.current) / round.objects.length,
      ),
    );
    metrics.current.completion_times.push(
      Math.round(performance.now() - roundStartedAt.current),
    );
    for (const object of round.objects) {
      if (engine.current.placement.isAccurate(object, next[object.id]))
        metrics.current.objects_correctly_placed += 1;
      else metrics.current.incorrect_placements += 1;
      metrics.current.object_movement_counts.push(
        movements.current[object.id] || 1,
      );
    }
    setPhase("transition");
    sounds.current?.complete();
    await wait(1050);
    if (cancelled.current) return;
    if (metrics.current.completed_rooms >= ROOM_DESIGNER_MAX_ROOMS) {
      await finish();
      return;
    }
    engine.current.advance();
    await playRound(engine.current.round());
  };
  const beginDrag = (event: React.PointerEvent, item: Furniture) => {
    if (phase !== "rebuild" || disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    sounds.current?.move();
    setDrag({ id: item.id, x: event.clientX, y: event.clientY });
  };
  const progress = Math.min(
    100,
    ((durationSeconds - seconds) / durationSeconds) * 100,
  );
  const occupiedSlots = new Set(
    Object.values(positions).map((position) => `${position.x}:${position.y}`),
  );
  return (
    <main
      className={`room-designer-world theme-${round.theme}`}
      onPointerMove={(event) =>
        drag && setDrag({ ...drag, x: event.clientX, y: event.clientY })
      }
      onPointerUp={(event) => void release(event.clientX, event.clientY)}
      onPointerCancel={() => setDrag(null)}
    >
      <div className="rd-light" />
      <div className="rd-clouds">
        <i />
        <i />
      </div>
      <header className={`rd-hud ${phase === "tutorial" ? "hidden" : ""}`}>
        <div className="rd-level">
          <span>{round.level}</span>
          <div>
            {Array.from({ length: ROOM_DESIGNER_MAX_ROOMS }, (_, i) => (
              <i key={i} className={i < round.level ? "active" : ""} />
            ))}
          </div>
        </div>
        <div className="rd-phase" aria-hidden>
          {phase === "observe" ? <Eye /> : <Hand />}
        </div>
        <div className="rd-timer">
          <Timer />
          <strong>
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </strong>
        </div>
      </header>
      <div className="rd-progress">
        <i style={{ width: `${progress}%` }} />
      </div>
      <section
        ref={roomRef}
        className={`rd-room ${phase}`}
        aria-label="Interactive room"
      >
        <div className="rd-window">
          <span />
          <i />
          <i />
        </div>
        <div className="rd-rug" />
        <div className="rd-wall-art">
          <i />
          <i />
        </div>
        <div className="rd-sparkles">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
        {phase === "rebuild" &&
          round.objects.map((item) => {
            const occupied = occupiedSlots.has(
              `${item.target.x}:${item.target.y}`,
            );
            return (
              <div
                key={`slot-${item.id}`}
                className={`rd-placement-zone ${occupied ? "occupied" : ""}`}
                style={{ left: `${item.target.x}%`, top: `${item.target.y}%` }}
                aria-hidden
              >
                <span>{occupied ? "" : "＋"}</span>
              </div>
            );
          })}
        {phase === "observe" &&
          round.objects.map((item) => (
            <div
              key={item.id}
              className="rd-room-object observed"
              style={{ left: `${item.target.x}%`, top: `${item.target.y}%` }}
            >
              <FurnitureView item={item} />
            </div>
          ))}
        {phase === "rebuild" &&
          round.objects
            .filter((item) => positions[item.id])
            .map((item) => (
              <button
                key={item.id}
                className={`rd-room-object placed ${drag?.id === item.id ? "dragging" : ""}`}
                style={{
                  left: `${positions[item.id].x}%`,
                  top: `${positions[item.id].y}%`,
                }}
                onPointerDown={(event) => beginDrag(event, item)}
                aria-label={`Move ${item.kind}`}
              >
                <FurnitureView item={item} />
              </button>
            ))}
        {phase === "clearing" && (
          <div className="rd-curtain">
            <i />
            <i />
          </div>
        )}
        {phase === "rebuild" &&
          Object.keys(positions).length === 0 &&
          !drag && (
            <div className="rd-first-drag-cue" aria-hidden>
              <Hand />
              <span>Drag furniture into the room</span>
              <i>↑</i>
            </div>
          )}
      </section>
      <section
        className={`rd-tray ${phase === "rebuild" ? "visible" : ""}`}
        aria-label="Furniture choices"
      >
        {trayOrder
          .filter((item) => !positions[item.id])
          .map((item) => (
            <button
              key={item.id}
              className={drag?.id === item.id ? "dragging" : ""}
              onPointerDown={(event) => beginDrag(event, item)}
              aria-label={`Place ${item.kind}`}
            >
              <FurnitureView item={item} />
            </button>
          ))}
      </section>
      {drag &&
        (() => {
          const item = round.objects.find((object) => object.id === drag.id);
          return item ? (
            <div
              className="rd-drag-ghost"
              style={{ left: drag.x, top: drag.y }}
            >
              <FurnitureView item={item} />
            </div>
          ) : null;
        })()}
      {phase === "transition" && (
        <div className="rd-transition" aria-hidden>
          <span>✨</span>
          <span>🏠</span>
          <span>✨</span>
        </div>
      )}
      {phase === "complete" && (
        <div className="rd-complete" aria-hidden>
          <span>🏡</span>
          <i />
          <i />
          <i />
        </div>
      )}
      {phase === "tutorial" && (
        <section
          className="rd-tutorial"
          role="dialog"
          aria-label="How to play Room Designer"
        >
          <div className="rd-tutorial-card">
            <div className="rd-tutorial-heading">
              <span>✨</span>
              <h2>Room Designer</h2>
              <span>✨</span>
            </div>
            <div className="rd-tutorial-steps">
              <div>
                <b>1</b>
                <div className="rd-demo-room furnished">
                  <span>🛏️</span>
                  <span>🪴</span>
                  <span>🧸</span>
                </div>
                <strong>Look at the room</strong>
              </div>
              <div>
                <b>2</b>
                <div className="rd-demo-room empty">
                  <Eye />
                </div>
                <strong>Remember each place</strong>
              </div>
              <div>
                <b>3</b>
                <div className="rd-demo-drag">
                  <span>🪑</span>
                  <i>➜</i>
                  <div>🏠</div>
                </div>
                <strong>Drag everything back</strong>
              </div>
            </div>
            <button type="button" onClick={beginGame}>
              <span>▶</span> Start
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
