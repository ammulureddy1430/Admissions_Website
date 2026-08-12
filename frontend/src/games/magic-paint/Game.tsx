"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { MagicPaintEngine, MAGIC_PAINT_DURATION_SECONDS } from "./GameEngine";
import { scoreMagicPaint } from "./ScoringEngine";
import type { MagicPaintScores, PaintObject, PaintObjectId } from "./Types";
import "./Game.css";
import "./Premium.css";

const BASE_COLORS = ["#ff4f64", "#19c37d", "#3b82f6", "#ffd229", "#9b5de5", "#ff8a34", "#16c1c8"];
const shuffle = <T,>(values:T[]) => [...values].sort(()=>Math.random()-.5);
export default function MagicPaintGame({ disabled=false, durationSeconds=MAGIC_PAINT_DURATION_SECONDS, maxRounds=5, onComplete, onProgress }:{disabled?:boolean;sound?:boolean;durationSeconds?:number;maxRounds?:number;onComplete:(metrics:MagicPaintScores)=>void|Promise<void>;onProgress?:(metrics:MagicPaintScores)=>void|Promise<void>}) {
  const [engine] = useState(()=>new MagicPaintEngine()); const [object,setObject]=useState(()=>engine.next());
  const [palette,setPalette]=useState(()=>shuffle(BASE_COLORS).slice(0,5)); const [color,setColor]=useState(""); const [painted,setPainted]=useState<Record<string,string>>({}); const [completed,setCompleted]=useState(false); const [seconds,setSeconds]=useState(durationSeconds);
  const metrics=useRef(engine.emptyMetrics()); const objectStarted=useRef(0); const gameStarted=useRef(0); const interactions=useRef(0); const finished=useRef(false); const completeRef=useRef(onComplete); const progressRef=useRef(onProgress);
  useEffect(()=>{objectStarted.current=performance.now();gameStarted.current=objectStarted.current},[]); useEffect(()=>{completeRef.current=onComplete},[onComplete]); useEffect(()=>{progressRef.current=onProgress},[onProgress]);
  const finish=useCallback(async()=>{if(finished.current)return;finished.current=true;metrics.current.elapsedSeconds=durationSeconds-seconds;await completeRef.current(scoreMagicPaint(metrics.current))},[durationSeconds,seconds]);
  useEffect(()=>{if(disabled||finished.current)return;const id=window.setInterval(()=>setSeconds(v=>Math.max(0,v-1)),1000);return()=>clearInterval(id)},[disabled]); useEffect(()=>{if(!seconds)void finish()},[seconds,finish]);
  const paint=(part:string,eventTime:number)=>{if(disabled||completed||!color||!object.parts.includes(part))return;interactions.current++;if(!metrics.current.colorsUsed.includes(color))metrics.current.colorsUsed.push(color);setPainted(current=>{
    const next={...current,[part]:color}; if(object.parts.every(id=>next[id])){setCompleted(true);metrics.current.objectsCompleted++;metrics.current.animationTriggerSuccess++;metrics.current.interactionsPerObject.push(interactions.current);metrics.current.completionTimes.push(eventTime-objectStarted.current);metrics.current.elapsedSeconds=Math.max(0,Math.round((eventTime-gameStarted.current)/1000));void progressRef.current?.(scoreMagicPaint(metrics.current));window.setTimeout(()=>{if(metrics.current.objectsCompleted>=maxRounds){metrics.current.endReason="ROUNDS_COMPLETED";void finish();return}const nextObject=engine.next();setObject(nextObject);setPalette(shuffle(BASE_COLORS).slice(0,5));setColor("");setPainted({});setCompleted(false);interactions.current=0;objectStarted.current=eventTime+900},900)} return next})};
  return <div className={`magic-paint ${color?"has-color":""} ${completed?`is-complete object-${object.id}`:""}`} role="application" aria-label="Magic Paint creativity assessment">
    <div className="mp-sky"><i/><i/><i/><b/><b/></div><div className="mp-splats" aria-hidden><i/><i/><i/><i/><i/></div><div className="mp-progress">{Array.from({length:5},(_,i)=><i key={i} className={i<object.difficulty?"on":""}/>)}</div><div className="mp-timer"><Timer/><strong>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,"0")}</strong></div>
    <div className="mp-stage"><div className="mp-canvas-top" aria-hidden><span>✦</span><div>{object.parts.map(part=><i key={part} className={painted[part]?"done":""}/>)}</div><b>🖌️</b></div><ObjectSvg object={object} painted={painted} onPaint={paint}/>{completed&&<div className="mp-magic" aria-hidden>{Array.from({length:10},(_,i)=><i key={i}/>)}</div>}<i className="mp-tape left"/><i className="mp-tape right"/></div>
    <div className="mp-palette" aria-label="Paint colors"><span className="mp-palette-icon" aria-hidden>🎨</span>{palette.map(value=><button key={value} type="button" disabled={disabled||completed} aria-label="Select paint color" onClick={()=>setColor(value)} className={color===value?"selected":""} style={{"--paint":value} as React.CSSProperties}><i/></button>)}</div>
  </div>;
}

function ObjectSvg({object,painted,onPaint}:{object:PaintObject;painted:Record<string,string>;onPaint:(id:string,time:number)=>void}) {
  const region=(id:string,shape:React.ReactNode)=><g key={id} className={`mp-region ${painted[id]?"painted":""} ${object.parts.includes(id)?"enabled":"disabled"}`} style={{"--fill":painted[id]||"#fff"} as React.CSSProperties} onClick={e=>onPaint(id,e.timeStamp)}>{shape}</g>;
  return <svg className="mp-object" viewBox="0 0 400 340" aria-label="Black and white object to paint">{renderObject(object.id,region)}</svg>;
}
function renderObject(id:PaintObjectId,r:(id:string,node:React.ReactNode)=>React.ReactNode){switch(id){
  case"butterfly":return <>{r("leftWing",<path d="M190 155C120 55 35 65 65 170c18 62 82 54 125 13Z"/>)}{r("rightWing",<path d="M210 155c70-100 155-90 125 15-18 62-82 54-125 13Z"/>)}{r("leftDot",<circle cx="112" cy="139" r="24"/>)}{r("rightDot",<circle cx="288" cy="139" r="24"/>)}{r("body",<><ellipse cx="200" cy="180" rx="22" ry="82"/><path d="M194 103c-18-30-33-25-42-17M206 103c18-30 33-25 42-17"/></>)}</>;
  case"flower":return <>{r("petal1",<ellipse cx="200" cy="90" rx="43" ry="67"/>)}{r("petal2",<ellipse cx="270" cy="155" rx="43" ry="67" transform="rotate(70 270 155)"/>)}{r("petal3",<ellipse cx="130" cy="155" rx="43" ry="67" transform="rotate(-70 130 155)"/>)}{r("petal4",<ellipse cx="200" cy="215" rx="52" ry="63"/>)}{r("center",<circle cx="200" cy="155" r="48"/>)}{r("leaf",<path d="M204 245v75M204 278c50-42 91-28 95-22-19 38-60 45-95 22Z"/>)}</>;
  case"fish":return <>{r("body",<ellipse cx="190" cy="170" rx="125" ry="82"/>)}{r("tail",<path d="M305 155l72-62-8 77 8 77-72-62Z"/>)}{r("topFin",<path d="M150 94c25-64 77-70 91-45l-12 55Z"/>)}{r("bottomFin",<path d="M158 240c24 45 66 50 82 22l-15-35Z"/>)}{r("spot",<circle cx="177" cy="170" r="35"/>)}{r("eye",<circle cx="103" cy="145" r="15"/>)}</>;
  case"balloon":return <>
    <g className="mp-balloon-ropes"><path d="M105 199 177 286M185 171l-8 115M285 199l-60 87M210 258l15 28"/></g>
    {r("balloon1",<><ellipse cx="105" cy="125" rx="51" ry="70"/><ellipse className="mp-balloon-highlight" cx="87" cy="101" rx="12" ry="22" transform="rotate(28 87 101)"/><path d="m100 194h10l-5 10Z"/></>)}
    {r("balloon2",<><ellipse cx="185" cy="95" rx="54" ry="72"/><ellipse className="mp-balloon-highlight" cx="165" cy="69" rx="13" ry="23" transform="rotate(28 165 69)"/><path d="m180 166h10l-5 11Z"/></>)}
    {r("balloon3",<><ellipse cx="285" cy="125" rx="51" ry="70"/><ellipse className="mp-balloon-highlight" cx="267" cy="101" rx="12" ry="22" transform="rotate(28 267 101)"/><path d="m280 194h10l-5 10Z"/></>)}
    {r("balloon4",<><ellipse cx="210" cy="185" rx="53" ry="70"/><ellipse className="mp-balloon-highlight" cx="191" cy="161" rx="12" ry="22" transform="rotate(28 191 161)"/><path d="m205 254h10l-5 11Z"/></>)}
    {r("basket",<path d="M166 284h68l-9 44h-50Z"/>)}
  </>;
  case"apple":return <>{r("fruit",<path d="M201 106c-73-55-143 9-125 106 16 85 78 119 125 80 47 39 109 5 125-80 18-97-52-161-125-106Z"/>)}{r("leaf",<path d="M204 101c23-61 84-66 112-33-25 48-78 62-112 33Z"/>)}{r("shine",<path d="M125 151c10-24 28-37 49-42"/>)}{r("stem",<path d="M199 108c-8-45 5-73 18-88"/>)}</>;
  case"star":return <>{r("top",<path d="M200 25l37 108-37 28-37-28Z"/>)}{r("left",<path d="M163 133 47 137l90 70 45-18Z"/>)}{r("right",<path d="m237 133 116 4-90 70-45-18Z"/>)}{r("bottomLeft",<path d="m137 207-31 111 94-67v-90Z"/>)}{r("bottomRight",<path d="m263 207 31 111-94-67v-90Z"/>)}{r("center",<circle cx="200" cy="184" r="46"/>)}</>;
}}
