"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grab, Map, RotateCw, Sparkles, Wrench, X } from "lucide-react";
import "./DragDropGame.css";

type Option={id?:string;optionKey?:string;optionText:string;imageUrl?:string|null};
type Question={id:string;questionText:string;options?:Option[];imageUrl?:string|null};
type Mode="SCENE"|"ASSEMBLE"|"REPAIR"|"CONNECT"|"WORKSPACE"|"ROOM"|"TREASURE"|"COOK"|"ROBOT"|"BRIDGE";
const MODES:Mode[]=["SCENE","ASSEMBLE","REPAIR","CONNECT","WORKSPACE","ROOM","TREASURE","COOK","ROBOT","BRIDGE"];
const COPY:Record<Mode,[string,string,string,string,string]>={
 SCENE:["World Builder","Complete the living scene","Place object","🌳","🧑‍🎨"],
 ASSEMBLE:["Assembly Studio","Install the missing piece","Assemble","🧩","🧑‍🔧"],
 REPAIR:["Machine Rescue","Repair the broken machine","Power machine","⚙️","👩‍🔧"],
 CONNECT:["Link Laboratory","Complete the energy link","Connect","🔗","🧑‍🔬"],
 WORKSPACE:["Maker Workshop","Organize the workbench","Lock placement","🛠️","👷"],
 ROOM:["Room Designer","Finish the interactive room","Finish room","🛋️","🧑‍🎨"],
 TREASURE:["Treasure Workshop","Fit an artifact into the chest","Seal chest","🗝️","🏴‍☠️"],
 COOK:["Wonder Kitchen","Add an ingredient to the recipe","Start cooking","🥣","🧑‍🍳"],
 ROBOT:["Robot Assembly","Install the robot's logic module","Activate robot","🤖","🧑‍🚀"],
 BRIDGE:["Bridge Constructor","Install the final bridge section","Build bridge","🌉","🧗"]
};

const BADGE_COLORS = ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function DragDropGame({question,questionIndex,questionCount,configuration,disabled,sound,onAnswer}:{question:Question;questionIndex:number;questionCount:number;configuration?:Record<string,unknown>;disabled:boolean;sound:boolean;onAnswer:(answer:string)=>unknown}){
 const options=useMemo(()=>question.options||[],[question.options]),mode=chooseMode(question.id,questionIndex,configuration),copy=COPY[mode];
 const [installed,setInstalled]=useState(""),[dragging,setDragging]=useState(""),[hovering,setHovering]=useState(false),[activating,setActivating]=useState(false);
 const submitted=useRef(false);

 useEffect(()=>{
   setInstalled("");
   setDragging("");
   setHovering(false);
   setActivating(false);
   submitted.current=false;
 },[question.id]);

 const play=useCallback((frequency:number,duration=.1)=>{
   if(!sound)return;
   try{
     const C=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
     if(!C)return;
     const c=new C(),o=c.createOscillator(),g=c.createGain();
     o.frequency.value=frequency;
     g.gain.setValueAtTime(.035,c.currentTime);
     g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);
     o.connect(g).connect(c.destination);
     o.start();
     o.stop(c.currentTime+duration);
     o.addEventListener("ended",()=>void c.close(),{once:true});
   }catch{}
 },[sound]);

 const install=useCallback((key:string)=>{
   if(disabled||activating) return;
   setInstalled(key);
   setDragging("");
   setHovering(false);
   play(480);
 },[activating,disabled,play]);

 const uninstall=useCallback(()=>{
   if(disabled||activating) return;
   setInstalled("");
   play(300);
 },[activating,disabled,play]);

 const activate=()=>{
   if(!installed||disabled||activating||submitted.current)return;
   const option=options.find(x=>keyOf(x)===installed);
   if(!option)return;
   submitted.current=true;
   setActivating(true);
   
   // Interactive rising tone chime sound
   if(sound){
     play(520, 0.15);
     window.setTimeout(() => play(650, 0.15), 100);
     window.setTimeout(() => play(780, 0.25), 200);
   }
   
   window.setTimeout(()=>void onAnswer(option.optionText),questionIndex+1===questionCount?1200:720);
 };

 const chosen=options.find(x=>keyOf(x)===installed);

 return (
   <div className={`drag-world drag-mode-${mode.toLowerCase()} ${activating?"is-activating":""}`}>
     {/* Ambient Background Glow */}
     <div className="drag-environment" aria-hidden>
       <div className="bg-glow bg-glow-1"></div>
       <div className="bg-glow bg-glow-2"></div>
     </div>

     {/* Floating Header HUD */}
     <div className="drag-hud">
       <div className="hud-pill game-mode">
         <span className="mode-emoji">{copy[3]}</span>
         <span>
           <small>{copy[0]}</small>
           <b>{copy[1]}</b>
         </span>
       </div>
       <div className="hud-pill question-progress">
         <Map />
         <span>
           <small>Progress</small>
           <b>{questionIndex+1} / {questionCount}</b>
         </span>
       </div>
     </div>

     {/* Main Game Workbench Layout */}
     <div className="drag-workbench-container">
       
       {/* Question & Target Drop Zone Card */}
       <div className="question-zone-card">
         <div className="question-header">
           <span className="sparkle-tag"><Sparkles /> CHALLENGE</span>
           <h1 className="question-text">{question.questionText}</h1>
           {question.imageUrl && (
             <div className="question-image-wrapper">
               <img src={question.imageUrl} className="question-image" alt="Question illustration" />
             </div>
           )}
         </div>

         {/* Target Answer Slot */}
         <div className="answer-slot-section">
           <div
             data-build-target
             onDragOver={(e) => { e.preventDefault(); }}
             onDragEnter={(e) => { e.preventDefault(); setHovering(true); }}
             onDragLeave={() => { setHovering(false); }}
             onDrop={(e) => {
               e.preventDefault();
               const key = e.dataTransfer.getData("text/plain");
               if (key) install(key);
               setHovering(false);
             }}
             className={`drag-socket-new ${hovering ? "is-hovered" : ""} ${chosen ? "has-part" : ""}`}
           >
             {chosen ? (
               <div className="selected-answer-card">
                 <div className="selected-badge" style={{ backgroundColor: BADGE_COLORS[options.indexOf(chosen) % BADGE_COLORS.length] }}>
                   {chosen.optionKey || String.fromCharCode(65 + options.indexOf(chosen))}
                 </div>
                 <span className="selected-text">{chosen.optionText}</span>
                 <button type="button" className="clear-selection-btn" onClick={(e) => { e.stopPropagation(); uninstall(); }} aria-label="Clear selection">
                   <X size={16} />
                 </button>
               </div>
             ) : (
               <div className="empty-slot-content">
                 <Wrench className="wrench-icon" />
                 <b>Drag answer card here</b>
                 <small>or simply tap an option below</small>
               </div>
             )}
           </div>
         </div>

         {/* Submit Action */}
         <div className="submit-action-section">
           <button
             type="button"
             className="submit-lock-btn"
             disabled={!installed || disabled || activating}
             onClick={activate}
           >
             <RotateCw className={activating ? "animate-spin" : ""} />
             <span>
               <small>Confirm Choice</small>
               <b>{activating ? "Locking in..." : "LOCK IN ANSWER"}</b>
             </span>
           </button>
         </div>
       </div>

       {/* Options Tray Grid */}
       <div className="options-tray-section">
         <h3 className="options-tray-title">Select the correct card:</h3>
         <div className="options-grid">
           {options.map((option, index) => {
             const key = keyOf(option);
             const isInstalledInSocket = installed === key;
             const isBeingDragged = dragging === key;
             const color = BADGE_COLORS[index % BADGE_COLORS.length];

             return (
               <button
                 type="button"
                 key={key}
                 draggable={!disabled && !activating}
                 onDragStart={(e) => {
                   e.dataTransfer.setData("text/plain", key);
                   setDragging(key);
                   play(240, 0.05);
                 }}
                 onDragEnd={() => {
                   setDragging("");
                 }}
                 disabled={disabled || activating}
                 className={`option-card-new ${isInstalledInSocket ? "is-installed" : ""} ${isBeingDragged ? "is-dragging" : ""}`}
                 style={{ "--accent-color": color } as React.CSSProperties}
                 onClick={() => {
                   if (isInstalledInSocket) {
                     uninstall();
                   } else {
                     install(key);
                   }
                 }}
               >
                 <div className="option-card-inner">
                   <div className="option-letter-badge" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}80` }}>
                     {option.optionKey || String.fromCharCode(65 + index)}
                   </div>
                   <div className="option-text-content">
                     <b>{option.optionText}</b>
                   </div>
                   {option.imageUrl && <img src={option.imageUrl} className="option-card-img" alt="" />}
                   <Grab className="grab-icon animate-pulse" />
                 </div>
               </button>
             );
           })}
         </div>
       </div>
     </div>

     {/* Interactive footer instructions */}
     <div className="drag-footer-new">
       <span><Grab size={12} /> Drag or Tap Card</span>
       <span className="dot-divider">•</span>
       <span><Wrench size={12} /> Slot It In</span>
       <span className="dot-divider">•</span>
       <span><Sparkles size={12} /> Lock In Answer</span>
     </div>

     {/* Launching / Activation overlay */}
     {activating && (
       <div className="drag-activation-new" aria-hidden>
         <div className="scan-line"></div>
         <Sparkles className="success-sparkle" />
         <div className="particle-burst">
           {Array.from({length:24},(_,i)=><i key={i} style={{"--burst":i} as React.CSSProperties}/>)}
         </div>
       </div>
     )}
   </div>
 );
}
function keyOf(o:Option){return o.id||o.optionKey||o.optionText}
function chooseMode(id:string,index:number,c?:Record<string,unknown>):Mode{const configured=String(c?.dragDropMode||c?.gameMode||"").toUpperCase(),selected=MODES.find(m=>configured.includes(m)),hash=[...id].reduce((s,x)=>s+x.charCodeAt(0),0);return selected||MODES[(hash+index)%MODES.length]}
