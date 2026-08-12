"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnalyticsService } from "./AnalyticsService";
import { now, wait } from "./AnimationController";
import { DifficultyManager } from "./DifficultyManager";
import { GameEngine } from "./GameEngine";
import { InteractionController } from "./InteractionController";
import { ScenarioGenerator } from "./ScenarioGenerator";
import { ScenarioManager } from "./ScenarioManager";
import { SoundManager } from "./SoundManager";
import { TOOL_VISUALS } from "./ToolManager";
import type { RescueMissionScores, RescuePhase, RescueRawMetrics, RescueScenario, RescueTool } from "./Types";
import "./RescueMissionGame.css";

export const RESCUE_MISSION_DURATION_SECONDS = 120;
export const RESCUE_MISSION_TOTAL_ROUNDS = 4;
const freshMetrics = (duration:number):RescueRawMetrics => ({ age_group:"4–5 Years",missions_started:0,missions_completed:0,successful_rescues:0,unsuccessful_actions:0,total_actions:0,efficient_solutions:0,strategy_changes:0,successful_strategy_changes:0,scenario_types_completed:[],decision_times:[],solution_times:[],highest_difficulty:1,elapsed_seconds:0,duration_seconds:duration,started_at:new Date().toISOString(),completed_at:"" });

export default function RescueMissionGame({disabled=false,sound=true,durationSeconds=RESCUE_MISSION_DURATION_SECONDS,maxRounds=RESCUE_MISSION_TOTAL_ROUNDS,onComplete}:{disabled?:boolean;sound?:boolean;durationSeconds?:number;maxRounds?:number;onComplete:(metrics:RescueMissionScores)=>void|Promise<void>}){
  const generator=useRef(new ScenarioGenerator()); const scenarios=useRef(new ScenarioManager()); const difficulty=useRef(new DifficultyManager()); const interaction=useRef(new InteractionController());
  const sounds=useRef(new SoundManager(sound)); const analytics=useRef(new AnalyticsService(onComplete)); const metrics=useRef(freshMetrics(durationSeconds));
  const startedAt=useRef(0); const missionAt=useRef(0); const firstActionAt=useRef(0); const finished=useRef(false); const failedSinceProgress=useRef(false); const previousTool=useRef<RescueTool|null>(null); const actionCount=useRef(0); const usedScenes=useRef<RescueScenario["scene"][]>([]);
  const [phase,setPhase]=useState<RescuePhase>("ready"); const [seconds,setSeconds]=useState(durationSeconds); const [scenario,setScenario]=useState<RescueScenario>(()=>new ScenarioGenerator().next(1)); const [step,setStep]=useState(0); const [selected,setSelected]=useState<RescueTool|null>(null); const [resolvedSteps,setResolvedSteps]=useState(0); const [result,setResult]=useState<RescueMissionScores|null>(null);
  const [actionStage,setActionStage]=useState<"idle"|"walking"|"using"|"rescuing"|"returning">("idle");
  useEffect(()=>{sounds.current.setEnabled(sound)},[sound]); useEffect(()=>{analytics.current=new AnalyticsService(onComplete)},[onComplete]);

  const elapsed=useCallback(()=>startedAt.current?(now()-startedAt.current)/1000:0,[]);
  const finish=useCallback(async()=>{if(finished.current)return;finished.current=true;metrics.current.elapsed_seconds=Math.min(durationSeconds,elapsed());metrics.current.completed_at=new Date().toISOString();const scores=new GameEngine().finish(metrics.current);setResult(scores);setPhase("complete");await analytics.current.save(scores)},[durationSeconds,elapsed]);
  useEffect(()=>{if(phase!=="playing"&&phase!=="acting"&&phase!=="celebrating")return;const timer=window.setInterval(()=>{const remaining=Math.max(0,durationSeconds-Math.floor(elapsed()));setSeconds(remaining);if(remaining===0)void finish()},200);return()=>window.clearInterval(timer)},[durationSeconds,elapsed,finish,phase]);

  const loadMission=useCallback((previous?:RescueScenario)=>{const level=difficulty.current.level(elapsed(),metrics.current.missions_completed);const next=generator.current.next(level,previous?.scene,usedScenes.current);usedScenes.current.push(next.scene);metrics.current.missions_started+=1;metrics.current.highest_difficulty=Math.max(metrics.current.highest_difficulty,level);missionAt.current=now();firstActionAt.current=now();failedSinceProgress.current=false;previousTool.current=null;actionCount.current=0;setStep(0);setResolvedSteps(0);setSelected(null);setActionStage("idle");setScenario(next);setPhase("playing");window.setTimeout(()=>sounds.current.speak(`${next.title}. ${next.instruction}`),350)},[elapsed]);
  const start=()=>{if(disabled)return;metrics.current=freshMetrics(durationSeconds);usedScenes.current=[];startedAt.current=now();finished.current=false;setSeconds(durationSeconds);setResult(null);loadMission()};

  const choose=async(tool:RescueTool)=>{if(disabled||phase!=="playing")return;setPhase("acting");setSelected(tool);setActionStage("walking");actionCount.current+=1;metrics.current.total_actions+=1;if(actionCount.current===1)metrics.current.decision_times.push(Math.round(now()-firstActionAt.current));
    const changed=interaction.current.strategyChanged(previousTool.current,tool,failedSinceProgress.current);if(changed)metrics.current.strategy_changes+=1;previousTool.current=tool;sounds.current.move();await wait(700);if(finished.current)return;setActionStage("using");
    if(!scenarios.current.solves(scenario,step,tool)){metrics.current.unsuccessful_actions+=1;failedSinceProgress.current=true;sounds.current.interact();await wait(850);setActionStage("returning");await wait(650);if(finished.current)return;if(metrics.current.missions_started>=maxRounds){await finish();return}loadMission(scenario);return}
    if(changed)metrics.current.successful_strategy_changes+=1;setResolvedSteps(value=>value+1);sounds.current.interact();await wait(scenario.scene==="door"?900:1250);if(finished.current)return;
    if(scenario.scene==="door"||scenario.scene==="water"||scenario.scene==="pit"){setActionStage("rescuing");await wait(scenario.scene==="water"?1350:1050);if(finished.current)return}
    const nextStep=step+1;
    if(!scenarios.current.isComplete(scenario,nextStep)){setStep(nextStep);failedSinceProgress.current=false;previousTool.current=null;setSelected(null);setActionStage("idle");setPhase("playing");return}
    metrics.current.missions_completed+=1;metrics.current.successful_rescues+=1;if(actionCount.current===scenario.steps.length)metrics.current.efficient_solutions+=1;metrics.current.solution_times.push(Math.round(now()-missionAt.current));metrics.current.scenario_types_completed.push(scenario.scene);setActionStage("returning");setPhase("celebrating");sounds.current.celebrate();await wait(2100);if(finished.current)return;if(metrics.current.missions_started>=maxRounds){await finish();return}loadMission(scenario)
  };
  const progress=Math.max(0,Math.min(100,(durationSeconds-seconds)/durationSeconds*100));
  return <main className={`rescue-game theme-${scenario.theme} phase-${phase} stage-${actionStage}`}>
    <div className="rescue-sky"><i/><i/><span>☀️</span></div><div className="rescue-hills"><i/><i/><i/></div><div className="rescue-sparkles">✦　·　✦　·　✦</div>
    <header className="rescue-hud"><div className="rescue-progress"><span>{scenario.level}</span><div><i style={{width:`${progress}%`}}/></div></div><div className="rescue-timer"><span>◷</span><b>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</b></div></header>
    {phase!=="ready"&&phase!=="complete"&&<div className="rescue-mission-card"><span>{scenario.character}</span><div><strong>{scenario.title}</strong><p>{scenario.instruction}</p></div><button type="button" onClick={()=>sounds.current.speak(`${scenario.title}. ${scenario.instruction}`)} aria-label="Hear mission instructions">🔊</button></div>}
    <section className={`rescue-scene scene-${scenario.scene} resolved-${resolvedSteps}`} aria-label="Interactive rescue scene">
      <div className="rescue-ground"/><div className="rescue-house"><i/><span>🏠</span></div><div className="rescue-tree"><span>🌳</span></div><div className="rescue-pit"><i/></div><div className="rescue-water">〰 〰 〰</div><div className="rescue-platform"><i/></div><div className="rescue-door"><span>▥</span><i/></div><div className="rescue-barrier"><i/><i/><i/></div><div className="rescue-target"><span>{scenario.character}</span></div><div className="rescue-home" aria-hidden><span className="care-tent"><i>✚</i></span><span className="care-bed">🐾</span></div>
      <div className={`rescue-helper ${selected?"walking":""}`} aria-hidden><span className="helper-head"><i/><b>•‿•</b></span><span className="helper-helmet"><i>✦</i></span><span className="helper-body"><i/></span><span className="helper-arm"/><span className="helper-feet"/>{phase==="celebrating"&&<span className="helper-rescue-friend">{scenario.character}</span>}</div>
      {selected&&(actionStage==="walking"||actionStage==="using")&&<div className={`rescue-action action-${selected} ${scenario.steps[step]?.tool===selected?"useful":"explore"}`}><span>{TOOL_VISUALS[selected].icon}</span><strong>{TOOL_VISUALS[selected].label}</strong></div>}
      {resolvedSteps>0&&scenario.steps.slice(0,resolvedSteps).map((item,index)=><div key={index} className={`rescue-placed placed-${item.tool}`}>{TOOL_VISUALS[item.tool].icon}</div>)}
      {phase==="celebrating"&&<div className="rescue-celebrate"><span>{scenario.character}</span><i>✦</i><i>✦</i><i>✦</i></div>}
    </section>
    <nav className="rescue-tools" aria-label="Rescue tools">{scenario.tools.map(tool=><button key={tool} type="button" disabled={disabled||phase!=="playing"} className={`${selected===tool?"selected":""} tool-${tool}`} onClick={()=>void choose(tool)} aria-label={TOOL_VISUALS[tool].aria}><span>{TOOL_VISUALS[tool].icon}</span><strong>{TOOL_VISUALS[tool].label}</strong><i/></button>)}</nav>
    {phase==="ready"&&<div className="rescue-overlay"><div className="rescue-intro"><div className="rescue-demo"><span className="demo-friend">🐱</span><span className="demo-tool">🪜</span><span className="demo-helper">🧑‍🚒</span><i>→</i></div><button type="button" onClick={start} aria-label="Start Rescue Mission">▶</button><div className="rescue-dots"><i/><i/><i/></div></div></div>}
    {phase==="complete"&&<div className="rescue-overlay"><div className="rescue-finish"><span>🌟</span><div><b>{result?.missions_completed??0}</b><i>🐾</i></div><div><b>{Math.round(result?.overall_score??0)}</b><i>★</i></div></div></div>}
  </main>
}
