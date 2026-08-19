"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MISSING_TROPHY_CASE } from "./Cases";
import { scoreDetectiveInvestigation } from "./ScoringEngine";
import { DetectiveMetrics, EvidenceItem } from "./Types";
import "./DetectiveInvestigationGame.css";

type Props = {
  disabled?: boolean;
  remainingSeconds: number;
  practiceOnly?: boolean;
  onComplete: (metrics: DetectiveMetrics) => void | Promise<void>;
  onBack?: () => void;
};

type Nearby = { kind: "evidence"; item: EvidenceItem } | { kind: "npc"; id: string; name: string } | { kind: "board" } | null;

export default function DetectiveInvestigationGame({ disabled = false, remainingSeconds, practiceOnly = false, onComplete, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const playerRef = useRef({ x: 400, y: 500, direction: 0, moving: false });
  const keysRef = useRef<Record<string, boolean>>({});
  const touchRef = useRef({ x: 0, y: 0 });
  const destinationRef = useRef<{ x: number; y: number } | null>(null);
  const npcsRef = useRef(MISSING_TROPHY_CASE.npcs.map((npc) => ({ ...npc, x: npc.path[0].x, y: npc.path[0].y, pathIndex: 1 })));
  const startedAtRef = useRef(0);
  const doneRef = useRef(false);
  const endingRef = useRef(false);
  const nearbyRef = useRef<Nearby>(null);
  const nearbyKeyRef = useRef("");
  const discoveredRef = useRef(new Set<string>());
  const inspectedRef = useRef(new Set<string>());
  const interviewedRef = useRef(new Set<string>());
  const approachedRef = useRef(new Set<string>());
  const zonesRef = useRef(new Map<string, number>());
  const eventObservedRef = useRef(new Set<string>());
  const decisionTimesRef = useRef<number[]>([]);
  const lastInteractionRef = useRef(0);
  const boardInteractionsRef = useRef(0);
  const hypothesesRef = useRef(0);
  const hypothesisChangesRef = useRef(0);
  const validConnectionsRef = useRef(0);
  const invalidConnectionsRef = useRef(0);
  const contradictionRef = useRef(0);
  const completeRef = useRef(onComplete);

  const [started, setStarted] = useState(false);
  const [nearby, setNearby] = useState<Nearby>(null);
  const [collected, setCollected] = useState<string[]>([]);
  const [inspection, setInspection] = useState<{ title: string; icon: string; text: string } | null>(null);
  const [dialogue, setDialogue] = useState<{ name: string; text: string } | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [chain, setChain] = useState<string[]>([]);
  const [localSeconds, setLocalSeconds] = useState(remainingSeconds || 120);

  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);

  const finish = useCallback((status = "COMPLETED") => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    const elapsed = Math.max(1, Math.round((performance.now() - startedAtRef.current) / 1000));
    const relevant = MISSING_TROPHY_CASE.evidence.filter((item) => item.quality === "relevant");
    const relevantFound = relevant.filter((item) => discoveredRef.current.has(item.id)).length;
    const revisits = [...zonesRef.current.values()].filter((visits) => visits > 1).length;
    const decisionTimes = decisionTimesRef.current;
    const raw = {
      sessionDuration: elapsed,
      locationsVisited: zonesRef.current.size,
      locationsRevisited: revisits,
      objectsInspected: inspectedRef.current.size,
      objectsIgnored: Math.max(0, MISSING_TROPHY_CASE.evidence.length - inspectedRef.current.size),
      npcsApproached: approachedRef.current.size,
      npcsInterviewed: interviewedRef.current.size,
      evidenceDiscovered: discoveredRef.current.size,
      evidenceInspected: inspectedRef.current.size,
      relevantEvidenceDiscovered: relevantFound,
      irrelevantEvidenceCollected: MISSING_TROPHY_CASE.evidence.filter((item) => item.quality === "irrelevant" && discoveredRef.current.has(item.id)).length,
      relevantEvidenceIgnored: Math.max(0, relevant.length - relevantFound),
      evidenceConnections: Math.max(0, chain.length - 1),
      validEvidenceConnections: validConnectionsRef.current,
      invalidEvidenceConnections: invalidConnectionsRef.current,
      eventObservations: eventObservedRef.current.size,
      importantEventObservations: eventObservedRef.current.size,
      missedImportantEvents: Math.max(0, 2 - eventObservedRef.current.size),
      timelineInformationObserved: ["camera", "keycard"].filter((id) => inspectedRef.current.has(id)).length,
      contradictionsObserved: contradictionRef.current,
      hypothesesFormed: hypothesesRef.current,
      hypothesisChanges: hypothesisChangesRef.current,
      caseBoardInteractions: boardInteractionsRef.current,
      caseResolution: chain.includes("camera") && chain.includes("keycard") && chain.includes("tracks") ? 100 : chain.length >= 3 ? 55 : 0,
      explorationEfficiency: Math.round(relevantFound / Math.max(1, inspectedRef.current.size) * 100),
      informationFiltering: Math.round(relevantFound / Math.max(1, discoveredRef.current.size) * 100),
      averageDecisionTime: decisionTimes.length ? Number((decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length).toFixed(2)) : elapsed,
      beginningPerformance: Math.min(100, discoveredRef.current.size * 16),
      middlePerformance: Math.min(100, inspectedRef.current.size * 14 + interviewedRef.current.size * 8),
      endingPerformance: chain.length >= 3 ? 90 : chain.length * 24,
      highestDifficulty: 1,
      completionStatus: status,
    };
    void completeRef.current(scoreDetectiveInvestigation(raw));
  }, [chain]);

  useEffect(() => {
    if (!started || !practiceOnly || disabled) return;
    const id = window.setInterval(() => setLocalSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [started, practiceOnly, disabled]);

  useEffect(() => {
    if (started && ((practiceOnly && localSeconds <= 0) || (!practiceOnly && remainingSeconds <= 0))) {
      endingRef.current = true;
      finish("TIME_COMPLETED");
    }
  }, [started, practiceOnly, localSeconds, remainingSeconds, finish]);

  const interact = useCallback(() => {
    if (!started || disabled || doneRef.current || inspection || dialogue || boardOpen) return;
    const target = nearbyRef.current;
    if (!target) return;
    const now = performance.now();
    if (lastInteractionRef.current) decisionTimesRef.current.push((now - lastInteractionRef.current) / 1000);
    lastInteractionRef.current = now;
    if (target.kind === "evidence") {
      const item = target.item;
      discoveredRef.current.add(item.id);
      inspectedRef.current.add(item.id);
      setCollected((current) => current.includes(item.id) ? current : [...current, item.id]);
      setInspection({ title: item.label, icon: item.icon, text: item.description });
    } else if (target.kind === "npc") {
      const npc = MISSING_TROPHY_CASE.npcs.find((candidate) => candidate.id === target.id);
      if (!npc) return;
      const wasInterviewed = interviewedRef.current.has(npc.id);
      interviewedRef.current.add(npc.id);
      if (npc.contradiction && wasInterviewed) contradictionRef.current = 1;
      const line = npc.dialogue[wasInterviewed ? 1 : 0];
      setDialogue({ name: npc.name, text: line });
    } else {
      boardInteractionsRef.current++;
      setBoardOpen(true);
    }
  }, [started, disabled, inspection, dialogue, boardOpen]);

  useEffect(() => {
    if (!started) return;
    const down = (event: KeyboardEvent) => {
      keysRef.current[event.key.toLowerCase()] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(event.key.toLowerCase())) event.preventDefault();
      if (event.key.toLowerCase() === "e" || event.key === " ") interact();
    };
    const up = (event: KeyboardEvent) => { keysRef.current[event.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [started, interact]);

  useEffect(() => {
    if (!started || disabled || doneRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    startedAtRef.current = performance.now();
    lastInteractionRef.current = startedAtRef.current;
    let previous = performance.now();

    const loop = (now: number) => {
      if (doneRef.current || endingRef.current) return;
      const dt = Math.min(.035, (now - previous) / 1000);
      previous = now;
      const player = playerRef.current;
      let mx = touchRef.current.x;
      let my = touchRef.current.y;
      if (keysRef.current.a || keysRef.current.arrowleft) mx -= 1;
      if (keysRef.current.d || keysRef.current.arrowright) mx += 1;
      if (keysRef.current.w || keysRef.current.arrowup) my -= 1;
      if (keysRef.current.s || keysRef.current.arrowdown) my += 1;
      const destination = destinationRef.current;
      if (!mx && !my && destination) {
        const dx = destination.x - player.x;
        const dy = destination.y - player.y;
        if (Math.hypot(dx, dy) < 7) destinationRef.current = null;
        else { mx = dx; my = dy; }
      }
      const length = Math.hypot(mx, my);
      player.moving = length > 0;
      if (length) {
        player.x = Math.max(26, Math.min(774, player.x + mx / length * 125 * dt));
        player.y = Math.max(44, Math.min(536, player.y + my / length * 125 * dt));
        player.direction = Math.atan2(my, mx);
      }

      for (const npc of npcsRef.current) {
        const target = npc.path[npc.pathIndex];
        const dx = target.x - npc.x;
        const dy = target.y - npc.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 3) npc.pathIndex = (npc.pathIndex + 1) % npc.path.length;
        else { npc.x += dx / distance * npc.speed * dt; npc.y += dy / distance * npc.speed * dt; }
      }

      const zone = player.x < 320 ? (player.y < 300 ? "Office" : "Gallery") : player.x > 480 ? (player.y < 300 ? "Trophy Room" : "Storage") : "Hallway";
      if (!zonesRef.current.has(zone)) zonesRef.current.set(zone, 1);

      let found: Nearby = null;
      let closest = 92;
      for (const item of MISSING_TROPHY_CASE.evidence) {
        const distance = Math.hypot(player.x - item.x, player.y - item.y);
        if (distance < closest) { closest = distance; found = { kind: "evidence", item }; }
      }
      for (const npc of npcsRef.current) {
        const distance = Math.hypot(player.x - npc.x, player.y - npc.y);
        if (distance < closest) { closest = distance; found = { kind: "npc", id: npc.id, name: npc.name }; approachedRef.current.add(npc.id); }
      }
      if (Math.hypot(player.x - 400, player.y - 72) < closest) found = { kind: "board" };
      const nearbyKey = found ? found.kind === "evidence" ? `e-${found.item.id}` : found.kind === "npc" ? `n-${found.id}` : "board" : "";
      nearbyRef.current = found;
      if (nearbyKey !== nearbyKeyRef.current) { nearbyKeyRef.current = nearbyKey; setNearby(found); }

      const elapsed = (now - startedAtRef.current) / 1000;
      if (elapsed >= 8 && elapsed <= 13 && Math.hypot(player.x - 540, player.y - 285) < 235) eventObservedRef.current.add("trolley-crossing");
      if (elapsed >= 18 && elapsed <= 23 && Math.hypot(player.x - 650, player.y - 180) < 225) eventObservedRef.current.add("camera-flicker");

      ctx.clearRect(0, 0, 800, 560);
      const bg = ctx.createLinearGradient(0, 0, 800, 560); bg.addColorStop(0, "#111827"); bg.addColorStop(1, "#07111f"); ctx.fillStyle = bg; ctx.fillRect(0, 0, 800, 560);
      const rooms = [
        { x: 18, y: 28, w: 292, h: 250, name: "ADMIN OFFICE", color: "#153047" },
        { x: 18, y: 294, w: 292, h: 246, name: "SCHOOL GALLERY", color: "#30264b" },
        { x: 490, y: 28, w: 292, h: 250, name: "TROPHY ROOM", color: "#3b2e19" },
        { x: 490, y: 294, w: 292, h: 246, name: "STORAGE", color: "#173b35" },
      ];
      for (const room of rooms) { ctx.fillStyle = room.color; ctx.fillRect(room.x, room.y, room.w, room.h); ctx.strokeStyle = "#64748b"; ctx.lineWidth = 3; ctx.strokeRect(room.x, room.y, room.w, room.h); ctx.fillStyle = "rgba(255,255,255,.65)"; ctx.font = "700 11px Inter"; ctx.fillText(room.name, room.x + 14, room.y + 21); }
      ctx.fillStyle = "#1e293b"; ctx.fillRect(320, 28, 160, 512); ctx.fillStyle = "#94a3b8"; ctx.font = "700 10px Inter"; ctx.fillText("MAIN HALL", 369, 526);
      ctx.strokeStyle = "rgba(148,163,184,.22)"; ctx.setLineDash([12, 14]); ctx.beginPath(); ctx.moveTo(400, 110); ctx.lineTo(400, 505); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = elapsed > 15 ? "#166534" : "#7f1d1d"; ctx.fillRect(474, 235, 12, 70); ctx.fillStyle = "#e2e8f0"; ctx.font = "9px Inter"; ctx.fillText(elapsed > 15 ? "OPEN" : "SERVICE DOOR", 434, 230);
      ctx.fillStyle = "#5b3716"; ctx.fillRect(350, 43, 100, 48); ctx.strokeStyle = "#fbbf24"; ctx.strokeRect(350, 43, 100, 48); ctx.fillStyle = "#fde68a"; ctx.font = "700 10px Inter"; ctx.fillText("CASE BOARD", 366, 70);
      ctx.fillStyle = "#713f12"; ctx.fillRect(598, 132, 120, 76); ctx.strokeStyle = "#facc15"; ctx.lineWidth = 3; ctx.strokeRect(598, 132, 120, 76); ctx.fillStyle = "#f8fafc"; ctx.font = "700 10px Inter"; ctx.fillText("EMPTY DISPLAY", 616, 173);
      for (const item of MISSING_TROPHY_CASE.evidence) {
        ctx.globalAlpha = inspectedRef.current.has(item.id) ? .42 : 1;
        ctx.fillStyle = "rgba(15,23,42,.94)"; ctx.beginPath(); ctx.arc(item.x, item.y, 28, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#facc15"; ctx.lineWidth = 3.5; ctx.stroke(); ctx.font = "27px serif"; ctx.textAlign = "center"; ctx.fillText(item.icon, item.x, item.y + 10); ctx.fillStyle = "#ffffff"; ctx.font = "800 10px Inter"; ctx.fillText(item.label, item.x, item.y + 45); ctx.textAlign = "left"; ctx.globalAlpha = 1;
      }
      for (const npc of npcsRef.current) {
        ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(npc.x + 4, npc.y + 13, 13, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = npc.color; ctx.beginPath(); ctx.arc(npc.x, npc.y, 13, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#f2c6a0"; ctx.beginPath(); ctx.arc(npc.x, npc.y - 13, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "700 9px Inter"; ctx.textAlign = "center"; ctx.fillText(npc.name, npc.x, npc.y + 31); ctx.textAlign = "left";
      }
      ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.direction + Math.PI / 2); ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(4, 12, 14, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#0ea5e9"; ctx.beginPath(); ctx.roundRect(-12, -14, 24, 34, 7); ctx.fill(); ctx.fillStyle = "#f2c6a0"; ctx.beginPath(); ctx.arc(0, -20, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(0, -22, 10, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#facc15"; ctx.fillRect(-15, 14, 30, 4); ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, disabled]);

  const addToChain = (id: string) => {
    boardInteractionsRef.current++;
    setChain((current) => {
      if (current.includes(id)) return current;
      if (current.length > 0) {
        const previous = MISSING_TROPHY_CASE.evidence.find(
          (item) => item.id === current[current.length - 1],
        ) as EvidenceItem | undefined;
        if (previous?.relatedEvidence.includes(id)) validConnectionsRef.current++;
        else invalidConnectionsRef.current++;
      }
      if (current.length >= 2) {
        if (hypothesesRef.current === 0) hypothesesRef.current = 1;
        else hypothesisChangesRef.current++;
      }
      return [...current.slice(-2), id];
    });
  };

  const timer = practiceOnly ? localSeconds : remainingSeconds;
  return <main className="detective-game">
    <header className="detective-hud"><div><b>🕵️ DETECTIVE INVESTIGATION</b><span>{MISSING_TROPHY_CASE.title}</span></div><div className="detective-time"><small>TIME REMAINING</small><strong>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</strong></div></header>
    <section className="detective-stage">
      <canvas ref={canvasRef} width={800} height={560} onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (800 / rect.width);
        const y = (event.clientY - rect.top) * (560 / rect.height);
        const clue = MISSING_TROPHY_CASE.evidence.find((item) => Math.hypot(item.x - x, item.y - y) <= 48);
        if (clue) {
          discoveredRef.current.add(clue.id);
          inspectedRef.current.add(clue.id);
          setCollected((current) => current.includes(clue.id) ? current : [...current, clue.id]);
          setInspection({ title: clue.label, icon: clue.icon, text: clue.description });
          return;
        }
        destinationRef.current = { x, y };
      }} />
      {!started && <div className="detective-cover"><div className="detective-brief"><span>VERY EASY CASE</span><h1>Find the missing trophy</h1><p>Tap the three large yellow clues: camera, trolley marks, and Storage record. Then open the Case Board and tap the three notes.</p><div className="detective-brief-grid"><span>1. Tap 3 yellow clues</span><span>2. Open Case Board</span><span>3. Tap 3 notes</span></div><button onClick={() => setStarted(true)}>START</button></div></div>}
      {started && nearby && !inspection && !dialogue && !boardOpen && <button className="detective-interact" onClick={interact}>{nearby.kind === "evidence" ? nearby.item.action : nearby.kind === "npc" ? `Talk to ${nearby.name}` : "Open case board"}<kbd>E</kbd></button>}
      {started && !inspection && !dialogue && !boardOpen && <button className="detective-board-shortcut" onClick={() => { boardInteractionsRef.current++; setBoardOpen(true); }}>📌 CASE BOARD<span>{collected.length}/3 clues found</span></button>}
      {inspection && <div className="detective-modal"><div><span className="evidence-big">{inspection.icon}</span><small>FIELD OBSERVATION</small><h2>{inspection.title}</h2><p>{inspection.text}</p><button onClick={() => setInspection(null)}>Return to investigation</button></div></div>}
      {dialogue && <div className="detective-dialogue"><strong>{dialogue.name}</strong><p>“{dialogue.text}”</p><button onClick={() => setDialogue(null)}>Continue</button></div>}
      {boardOpen && <div className="case-board"><div className="case-board-head"><div><small>CASE BOARD</small><h2>What happened to the trophy?</h2><p>Tap three notes that explain where it went.</p></div><button onClick={() => setBoardOpen(false)}>×</button></div><div className="case-chain">{[0,1,2].map((index) => <div key={index} className="chain-slot" onDragOver={(event) => event.preventDefault()} onDrop={(event) => addToChain(event.dataTransfer.getData("text/evidence"))}>{chain[index] ? <span>{MISSING_TROPHY_CASE.evidence.find((item) => item.id === chain[index])?.icon}<b>{MISSING_TROPHY_CASE.evidence.find((item) => item.id === chain[index])?.label}</b></span> : <em>Choose a note</em>}</div>)}</div><div className="evidence-tray">{collected.map((id) => { const item = MISSING_TROPHY_CASE.evidence.find((candidate) => candidate.id === id)!; return <button key={id} draggable onDragStart={(event) => event.dataTransfer.setData("text/evidence", id)} onClick={() => addToChain(id)}><span>{item.icon}</span>{item.label}</button>; })}{collected.length === 0 && <p>Inspect objects first. Your notes will appear here.</p>}</div><div className="case-board-actions"><button onClick={() => setChain([])}>Clear</button><button disabled={chain.length < 3} onClick={() => finish("CASE_FILED")}>FINISH CASE</button></div></div>}
      {onBack && <button className="detective-exit" onClick={onBack}>Exit</button>}
    </section>
  </main>;
}
