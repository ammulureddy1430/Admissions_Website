"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { Backpack, DoorOpen, Eye, Footprints, KeyRound, LockKeyhole, Map, Save, Search, Sparkles, Star } from "lucide-react";
import "./LogicGame.css";

type Option={id?:string;optionKey?:string;optionText:string;imageUrl?:string|null};
type Question={id:string;questionText:string;options?:Option[];imageUrl?:string|null};
type Phase="SEARCH"|"UNLOCK"|"ESCAPE";
const ROOMS=[
 ["temple","Ancient Temple","🏛️","🔥"],["library","Wizard Library","📚","✨"],["space","Space Station","🚀","⚡"],
 ["pirate","Pirate Ship","🏴‍☠️","🌊"],["pyramid","Egyptian Pyramid","𓂀","🔥"],["laboratory","Secret Laboratory","🧪","⚡"],
 ["frozen","Frozen Castle","❄️","🌨️"],["volcano","Volcano Base","🌋","🔥"],["factory","Robot Factory","🤖","⚙️"],
 ["alien","Alien Planet","👽","🪐"],["detective","Detective Office","🕵️","🌧️"],["haunted","Haunted Mansion","🏚️","🕯️"]
] as const;
const PUZZLES=["Hidden Key Hunt","Ancient Lock","Power Circuit","Mirror Laser","Library Code","Treasure Map","Crystal Alignment","Control Panel","Safe Combination","Gear Rotation","Ancient Scroll","Robot Activation"];
const HOTSPOTS=[
 {name:"Old drawer",icon:"🗄️",item:"Brass key"},{name:"Wall painting",icon:"🖼️",item:"Coded symbol"},
 {name:"Moving crate",icon:"📦",item:"Puzzle piece"},{name:"Stone statue",icon:"🗿",item:"Magic stone"},
 {name:"Antique clock",icon:"🕰️",item:"Clock hand"},{name:"Dusty books",icon:"📚",item:"Torn note"},
 {name:"Desk lamp",icon:"🪔",item:"Glass lens"},{name:"Old globe",icon:"🌍",item:"Map fragment"}
];

export function LogicGame({question,sound,questionIndex,questionCount,onAnswer,disabled}:{question:Question;request?:(path:string,init?:RequestInit)=>Promise<unknown>;sound:boolean;questionIndex:number;questionCount:number;onAnswer:(answer:string)=>void;disabled:boolean}){
 const options=question.options||[],room=roomFor(question.id),puzzle=PUZZLES[questionIndex%PUZZLES.length];
 const [found,setFound]=useState<string[]>([]),[opened,setOpened]=useState<string[]>([]),[phase,setPhase]=useState<Phase>("SEARCH"),[selected,setSelected]=useState(""),[player,setPlayer]=useState({x:50,y:83}),[moving,setMoving]=useState(false);
 const submitted=useRef(false),need=Math.min(3,HOTSPOTS.length);
 const play=useCallback((frequency:number,duration=.1)=>{if(!sound)return;try{const C=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.frequency.value=frequency;g.gain.setValueAtTime(.03,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+duration);o.addEventListener("ended",()=>void c.close(),{once:true})}catch{}},[sound]);
 const inspect=(index:number)=>{if(disabled||phase!=="SEARCH")return;const spot=HOTSPOTS[index],id=`spot-${index}`;setPlayer(spotPoint(index));setMoving(true);window.setTimeout(()=>setMoving(false),450);if(opened.includes(id))return;setOpened(x=>[...x,id]);play(310+index*55);window.setTimeout(()=>{setFound(current=>{const next=[...current,spot.item];if(next.length>=need)setPhase("UNLOCK");return next});play(610)},380)};
 const choose=(option:Option,index:number)=>{if(disabled||phase!=="UNLOCK")return;setSelected(keyOf(option));setPlayer({x:72,y:61});setMoving(true);play(520+index*35);window.setTimeout(()=>{setMoving(false);setPhase("ESCAPE")},550)};
 const escape=()=>{if(disabled||phase!=="ESCAPE"||submitted.current)return;const answer=options.find(x=>keyOf(x)===selected);if(!answer)return;submitted.current=true;setPlayer({x:88,y:66});setMoving(true);play(820,.3);window.setTimeout(()=>onAnswer(answer.optionText),questionIndex+1===questionCount?1400:900)};
 const particles=useMemo(()=>Array.from({length:24},(_,i)=>i),[]);
 return <div className={`escape-room room-${room[0]} phase-${phase.toLowerCase()}`}>
  <div className="escape-atmosphere" aria-hidden><div className="escape-window"><i/><i/><i/></div><div className="escape-walls"/><div className="escape-floor"/><div className="escape-light">{room[3]}</div><div className="escape-dust">{particles.map(i=><i key={i} style={{"--dust":i} as React.CSSProperties}/>)}</div></div>
  <div className="escape-hud"><div><Map/><span><small>Escape room</small><b>{room[1]}</b></span></div><div><LockKeyhole/><span><small>Mission</small><b>{puzzle}</b></span></div><div><Star/><span><small>Room</small><b>{questionIndex+1} / {questionCount}</b></span></div></div>
  <div className="escape-room-scene">
   <div className="escape-inscription"><span>{room[2]} Discovered inscription</span><p>{question.questionText}</p>{question.imageUrl&&<img src={question.imageUrl} alt=""/>}</div>
   <div className="escape-door"><div className="escape-door-frame"><i/><b>EXIT</b><span>🚪</span></div><div className="escape-door-lock">{phase==="SEARCH"?<LockKeyhole/>:phase==="UNLOCK"?<KeyRound/>:<DoorOpen/>}</div></div>
   <div className="escape-hotspots">{HOTSPOTS.map((spot,index)=>{const id=`spot-${index}`,isOpen=opened.includes(id);return <button type="button" key={id} disabled={disabled||phase!=="SEARCH"} onClick={()=>inspect(index)} className={`escape-hotspot hotspot-${index+1} ${isOpen?"is-open":""}`}><span>{spot.icon}</span><b>{spot.name}</b><small>{isOpen?"Searched":"Inspect"}</small>{!isOpen&&<Eye/>}</button>})}</div>
   <div className="escape-console">
    <header><span>{phase==="SEARCH"?"🔒":phase==="UNLOCK"?"🔐":"🔓"}</span><div><small>{phase==="SEARCH"?"Mechanism sealed":phase==="UNLOCK"?"Lock mechanism active":"Exit unlocked"}</small><b>{phase==="SEARCH"?`Find ${need-found.length} more room item${need-found.length===1?"":"s"}`:phase==="UNLOCK"?"Insert one discovered symbol":"Use the door to escape"}</b></div></header>
    {phase==="UNLOCK"&&<div className="escape-options">{options.map((option,index)=><button type="button" key={keyOf(option)} onClick={()=>choose(option,index)} disabled={disabled}><i>{option.optionKey||String.fromCharCode(65+index)}</i>{option.imageUrl&&<img src={option.imageUrl} alt=""/>}<b>{option.optionText}</b><span>{symbolFor(index)}</span></button>)}</div>}
    {phase==="ESCAPE"&&<button type="button" className="escape-lever" onClick={escape} disabled={disabled}><KeyRound/><span><small>Key inserted</small><b>Turn key and escape</b></span></button>}
   </div>
   <div className={`escape-player ${moving?"is-moving":""}`} style={{left:`${player.x}%`,top:`${player.y}%`}}><span>🕵️</span><em>🔦</em><i/></div>
  </div>
  <div className="escape-inventory"><header><Backpack/><span><small>Inventory</small><b>{found.length} / {need} clues</b></span></header>{found.map((item,index)=><i key={item}><span>{["🗝️","🔣","🧩","💎","🕰️","📜","🔍","🗺️"][index]}</span><b>{item}</b></i>)}{found.length===0&&<p><Search/> Search the room</p>}</div>
  <div className="escape-controls"><span><Footprints/> Click objects to explore</span><i/><span><Save/> Autosaved</span><i/><span>{questionCount-questionIndex} rooms remaining</span></div>
  {phase==="ESCAPE"&&selected&&<div className="escape-door-glow" aria-hidden><Sparkles/></div>}
 </div>
}
function keyOf(o:Option){return o.id||o.optionKey||o.optionText}
function roomFor(id:string){return ROOMS[[...id].reduce((s,c)=>s+c.charCodeAt(0),0)%ROOMS.length]}
function spotPoint(index:number){return [{x:12,y:73},{x:27,y:38},{x:48,y:78},{x:74,y:46},{x:14,y:49},{x:72,y:72},{x:75,y:27},{x:25,y:68}][index]}
function symbolFor(index:number){return ["◈","⌘","△","◎"][index%4]}
