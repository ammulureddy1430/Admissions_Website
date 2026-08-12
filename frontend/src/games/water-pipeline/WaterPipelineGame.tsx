"use client";
/* eslint-disable react-hooks/purity, react-hooks/refs */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnalyticsService } from "./AnalyticsService";
import { AnimationController } from "./AnimationController";
import { DifficultyManager } from "./DifficultyManager";
import { GameEngine } from "./GameEngine";
import { PipelineGenerator } from "./PipelineGenerator";
import { SoundManager } from "./SoundManager";
import { WaterFlowEngine } from "./WaterFlowEngine";
import type { PipelineLayout, PipelineRawMetrics, WaterPipelineMetrics } from "./Types";
import "./WaterPipelineGame.css";
import "./WaterPipelinePremium.css";
import "./WaterPipelineFlow.css";
import "./WaterPipelineAlignment.css";
import "./WaterPipelineOutlet.css";
import "./WaterPipelineVisibility.css";
import "./WaterPipelineRealFlow.css";
import "./WaterPipelinePipeShells.css";
import "./WaterPipelineLargePipes.css";
import "./WaterPipelineStart.css";
import "./WaterPipelineSlowFlow.css";

export const WATER_PIPELINE_DURATION_SECONDS = 120;

type Props = { disabled?: boolean; sound?: boolean; durationSeconds?: number; maxRounds?: number; practiceOnly?: boolean; onComplete: (metrics: WaterPipelineMetrics) => void | Promise<void> };

export default function WaterPipelineGame({ disabled = false, sound = true, durationSeconds = WATER_PIPELINE_DURATION_SECONDS, maxRounds = 4, practiceOnly = false, onComplete }: Props) {
  const generator = useRef(new PipelineGenerator());
  const flow = useRef(new WaterFlowEngine());
  const audio = useRef(new SoundManager(sound));
  const animation = useRef(new AnimationController());
  const difficulty = useRef(new DifficultyManager());
  const levelStarted = useRef(Date.now());
  const done = useRef(false);
  const initial = useRef(practiceOnly ? generator.current.generatePractice() : generator.current.generate(1));
  const [layout, setLayout] = useState<PipelineLayout>(initial.current);
  const [seconds, setSeconds] = useState(durationSeconds);
  const [wet, setWet] = useState<string[]>([]);
  const [flowing, setFlowing] = useState(false);
  const [outletFlowing, setOutletFlowing] = useState(false);
  const [gardenWatered, setGardenWatered] = useState(false);
  const [outletPath, setOutletPath] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [result, setResult] = useState<WaterPipelineMetrics | null>(null);
  const worldRef = useRef<HTMLElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);
  const tubRef = useRef<HTMLDivElement>(null);
  const raw = useRef<PipelineRawMetrics>({ age_group: "5–7 Years", levels_started: 1, levels_completed: 0, pipes_rotated: 0, successful_connections: 0, failed_connections: 0, completed_pipelines: 0, highest_level: 1, started_at: new Date().toISOString(), solution_times: [], optimal_rotations: initial.current.optimalRotations });

  const finish = useCallback(async () => {
    if (done.current) return;
    done.current = true;
    const metrics = new GameEngine().finish(raw.current);
    setResult(metrics);
    await new AnalyticsService(onComplete).save(metrics);
  }, [onComplete]);

  useEffect(() => {
    if (disabled || done.current || maxRounds === 1) return;
    const timer = window.setInterval(() => setSeconds(value => {
      if (value <= 1) { window.clearInterval(timer); void finish(); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [disabled, finish, maxRounds]);

  useLayoutEffect(() => {
    const alignOutlet = () => {
      const world = worldRef.current?.getBoundingClientRect();
      const outlet = destinationRef.current?.getBoundingClientRect();
      const tub = tubRef.current?.getBoundingClientRect();
      if (!world || !outlet || !tub) return;
      const startX = outlet.right - world.left - 5;
      const startY = outlet.top + outlet.height / 2 - world.top;
      const endX = tub.left - world.left + 18;
      const endY = tub.top + tub.height * .42 - world.top;
      const bendX = startX + Math.max(22, (endX - startX) * .48);
      setOutletPath(`M ${startX} ${startY} H ${bendX} V ${endY} H ${endX}`);
    };
    alignOutlet();
    const observer = new ResizeObserver(alignOutlet);
    if (worldRef.current) observer.observe(worldRef.current);
    window.addEventListener("resize", alignOutlet);
    return () => { observer.disconnect(); window.removeEventListener("resize", alignOutlet); };
  }, [layout]);

  const rotate = (id: string) => {
    if (disabled || flowing || done.current) return;
    const next: PipelineLayout = { ...layout, pieces: layout.pieces.map(piece => piece.id === id ? { ...piece, rotation: ((piece.rotation + 1) % 4) as 0 | 1 | 2 | 3 } : piece) };
    raw.current.pipes_rotated++;
    audio.current.play("rotate");
    setLayout(next);
    setWet([]);
  };

  const startWater = async () => {
    if (disabled || flowing || done.current) return;
    const evaluation = flow.current.evaluate(layout);
    setFlowing(true);
    setWet([]);
    audio.current.play("flow");
    raw.current.successful_connections += evaluation.connections;
    raw.current.failed_connections += Math.max(0, layout.pieces.length - 1 - evaluation.connections);
    for (let index = 0; index < evaluation.wet.length; index++) {
      await animation.current.delay(700);
      setWet(evaluation.wet.slice(0, index + 1));
    }
    if (evaluation.complete) {
      setOutletFlowing(true);
      await animation.current.delay(1400);
      setGardenWatered(true);
      await animation.current.delay(700);
      raw.current.completed_pipelines++;
      setCelebrating(true);
      audio.current.play("finish");
    } else {
      await animation.current.delay(1100);
      if (maxRounds === 1) {
        setWet([]);
        setFlowing(false);
        return;
      }
    }
    raw.current.levels_completed++;
    raw.current.solution_times.push((Date.now() - levelStarted.current) / 1000);
    await animation.current.delay(evaluation.complete ? 900 : 450);
    if (raw.current.levels_completed >= maxRounds || difficulty.current.isFinal(layout.level)) { await finish(); return; }
    const level = difficulty.current.next(layout.level);
    const fresh = generator.current.generate(level);
    raw.current.levels_started++;
    raw.current.highest_level = level;
    raw.current.optimal_rotations += fresh.optimalRotations;
    levelStarted.current = Date.now();
    setLayout(fresh); setWet([]); setFlowing(false); setOutletFlowing(false); setGardenWatered(false); setCelebrating(false);
  };

  const boardStyle = { "--cols": layout.cols, "--rows": layout.rows, "--source-y": layout.source.y, "--destination-y": layout.destination.y } as React.CSSProperties;
  return <main className="pipeline-game">
    <div className="pipeline-bubbles">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
    <header className="pipeline-hud">
      <div className="pipeline-level"><small>WATER PIPELINE</small>{maxRounds > 1 && <><b>LEVEL {layout.level} <em>OF 4</em></b><span><i style={{ width: `${layout.level / 4 * 100}%` }} /></span></>}</div>
      <div className="pipeline-goal"><span>💧</span><div><b>MAKE WATER REACH THE GARDEN</b><small>Tap a pipe to rotate it</small></div><em>🌻</em></div>
      {maxRounds > 1 && <div className="pipeline-timer">◷ <b>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</b></div>}
    </header>
    <section ref={worldRef} className={`pipeline-world rows-${layout.rows}`}>
      <div className="water-tower"><div className="tank"><i /><b>WATER TANK</b><span className="tank-water" /></div><div className="tower-legs" /><div className="tank-riser" /><div className="tank-valve">●</div></div>
      <div className="tank-feed"><i className={flowing ? "active" : ""} /></div>
      <div className="pipeline-board" style={boardStyle}>
        <div className="board-title"><span>START</span><b>TURN THE PIPE PIECES</b><span>GARDEN</span></div>
        {Array.from({ length: layout.cols * layout.rows }, (_, i) => <div className="pipe-cell" key={`cell-${i}`} />)}
        {layout.pieces.map(piece => <button key={piece.id} type="button" aria-label={`${piece.kind} pipe; tap to rotate`} className={`pipe-piece ${piece.kind} ${wet.includes(piece.id) ? "wet" : ""}`} style={{ "--x": piece.x, "--y": piece.y, "--rotation": `${piece.rotation * 90}deg` } as React.CSSProperties} onClick={() => rotate(piece.id)}><span className="pipe-shape"><i /><i /><i /><i /><b /></span><span className="turn-ring">↻</span>{wet.includes(piece.id) && <em className="water-pulse" />}</button>)}
        <div className="source-port"><b>💧</b></div><div ref={destinationRef} className="destination-port"><b>➜</b></div>
      </div>
      <div className="garden-feed-placeholder" />
      <div className={`pipeline-garden ${gardenWatered ? "watered" : ""}`}><div ref={tubRef} className="fountain"><i /><span>💦</span></div><div className="flowers">🌷 🌻 🌼</div><small>GARDEN</small></div>
      {outletPath && <svg className={`measured-outlet ${outletFlowing ? "active" : ""}`} aria-hidden><path className="outlet-shell" d={outletPath}/><path className="outlet-core" d={outletPath}/><path className="outlet-water" d={outletPath}/></svg>}
    </section>
    <div className="pipeline-actions"><div className="pipeline-caption"><span>↻</span><div><b>SET THE PIPES</b><small>Rotate first, then start the water once</small></div></div><button type="button" className="pipeline-start" disabled={disabled || flowing || done.current} onClick={() => void startWater()}><span>▶</span><b>START WATER</b></button></div>
    {celebrating && <div className="pipeline-splash"><i>💧</i><i>✨</i><i>💧</i></div>}
    {result && <div className="pipeline-finish"><div><span>⛲</span><h2>Water journey complete</h2><p>{result.completed_pipelines} pipelines reached the garden</p></div></div>}
  </main>;
}
