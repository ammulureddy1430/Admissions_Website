"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, HelpCircle, Sparkles, Trophy } from "lucide-react";

type ShapeItem = { shape: string; color: string; size?: number; label?: string } | null;
type MatrixCell = { shape: string; color: string; rotation: number } | null;
type OddItem = { id: string; shape: string; color: string; animation: string; isOdd: boolean };
type BlockItem = { id: string; height: number; color: string; value: number };

type PuzzleData = {
  type: "PATTERN_RECOGNITION" | "MATRIX_REASONING" | "SHAPE_SEQUENCE" | "ODD_ONE_OUT" | "BLOCK_ARRANGEMENT";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  instruction: string;
  pattern?: ShapeItem[];
  emptyIndex?: number;
  matrix?: MatrixCell[];
  correctOrder?: string[];
  shuffled?: any[];
  items?: OddItem[];
  options: string[];
  correctAnswer: string;
};

export function LogicGame({
  question,
  request,
  sound,
  questionIndex,
  questionCount,
  onAnswer,
  disabled,
}: {
  question: any;
  request: (path: string, init?: RequestInit) => Promise<any>;
  sound: boolean;
  questionIndex: number;
  questionCount: number;
  onAnswer: (answer: string) => void;
  disabled: boolean;
}) {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draggedVal, setDraggedVal] = useState<string>("");
  const [sequenceItems, setSequenceItems] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [wrongEffect, setWrongEffect] = useState(false);
  const [solved, setSolved] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiParticles = useRef<any[]>([]);
  const animationFrameId = useRef<number | null>(null);

  const puzzleTypes = ["PATTERN_RECOGNITION", "SHAPE_SEQUENCE", "ODD_ONE_OUT", "BLOCK_ARRANGEMENT"];
  const currentType = puzzleTypes[questionIndex % puzzleTypes.length];
  const difficulty = question.difficulty || "MEDIUM";

  // Web Audio Synth for premium sound effects
  const playSoundEffect = (type: "success" | "wrong" | "click") => {
    if (!sound) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24); // G5
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === "wrong") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      }
    } catch (e) {
      console.warn("Audio Context failed to play sound:", e);
    }
  };

  // Confetti Physics engine
  const startConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 500;

    confettiParticles.current = Array.from({ length: 90 }, () => ({
      x: canvas.width / 2,
      y: canvas.height - 30,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 12 - 8,
      r: Math.random() * 6 + 4,
      color: ["#f43f5e", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"][Math.floor(Math.random() * 6)],
      alpha: 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
    }));

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      confettiParticles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.98; // drag
        p.alpha -= 0.014;
        p.rotation += p.rotationSpeed;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
          ctx.restore();
        }
      });

      if (alive) {
        animationFrameId.current = requestAnimationFrame(loop);
      }
    };
    loop();
  };

  useEffect(() => {
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const generateLocalFallback = (type: string, diff: string): PuzzleData => {
    const colors = ["#f43f5e", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];
    const shapes = ["circle", "square", "triangle", "diamond", "star", "hexagon"];

    const fisherYatesShuffle = (array: any[]) => {
      let shuffled = [...array];
      let attempts = 0;
      while (attempts < 15) {
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const isSorted = shuffled.every((val, index) => val.id === array[index].id);
        if (!isSorted) break;
        attempts++;
      }
      return shuffled;
    };

    if (type === "PATTERN_RECOGNITION") {
      const len = diff === "EASY" ? 4 : 6;
      const patternShapes = [];
      const itemA = { shape: shapes[Math.floor(Math.random() * shapes.length)], color: colors[0] };
      const itemB = { shape: shapes[Math.floor(Math.random() * shapes.length)], color: colors[1] };
      while (itemB.shape === itemA.shape && itemB.color === itemA.color) {
        itemB.shape = shapes[Math.floor(Math.random() * shapes.length)];
        itemB.color = colors[Math.floor(Math.random() * colors.length)];
      }

      for (let i = 0; i < len; i++) {
        patternShapes.push(i % 2 === 0 ? { ...itemA } : { ...itemB });
      }

      const emptyIndex = len - 1;
      const correctItem = { ...patternShapes[emptyIndex] } as ShapeItem;
      patternShapes[emptyIndex] = null;

      const candidates = [correctItem];
      while (candidates.length < 4) {
        const item = {
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          color: colors[Math.floor(Math.random() * colors.length)]
        };
        if (!candidates.some(c => c && c.shape === item.shape && c.color === item.color)) {
          candidates.push(item);
        }
      }
      // Shuffle candidates
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      return {
        type: "PATTERN_RECOGNITION",
        difficulty: diff as any,
        instruction: "Complete the visual pattern by dragging the correct shape into the empty position.",
        pattern: patternShapes,
        emptyIndex,
        options: candidates.map(c => c ? `${c.shape}:${c.color}` : ""),
        correctAnswer: correctItem ? `${correctItem.shape}:${correctItem.color}` : ""
      };
    } else if (type === "SHAPE_SEQUENCE") {
      const baseShape = shapes[Math.floor(Math.random() * shapes.length)];
      const baseColor = colors[Math.floor(Math.random() * colors.length)];
      const count = diff === "EASY" ? 3 : diff === "MEDIUM" ? 4 : 5;
      const sequence = [];
      for (let i = 0; i < count; i++) {
        sequence.push({ id: `item_${i}`, shape: baseShape, color: baseColor, size: 40 + i * 20, label: `Size ${i + 1}` });
      }
      const shuffled = fisherYatesShuffle(sequence);

      return {
        type: "SHAPE_SEQUENCE",
        difficulty: diff as any,
        instruction: "Arrange shuffled shapes into the correct logical sequence (ascending size) using drag-and-drop.",
        correctOrder: sequence.map(s => s.id),
        shuffled,
        options: ["sorted_sequence"],
        correctAnswer: "sorted_sequence"
      };
    } else if (type === "ODD_ONE_OUT") {
      const count = diff === "EASY" ? 3 : diff === "MEDIUM" ? 4 : 5;
      const baseShape = shapes[Math.floor(Math.random() * shapes.length)];
      const baseColor = colors[Math.floor(Math.random() * colors.length)];
      const oddShape = shapes[(shapes.indexOf(baseShape) + 1) % shapes.length];
      const items = [];
      const oddIndex = Math.floor(Math.random() * count);
      for (let i = 0; i < count; i++) {
        if (i === oddIndex) {
          items.push({ id: `item_${i}`, shape: oddShape, color: baseColor, animation: "spin", isOdd: true });
        } else {
          items.push({ id: `item_${i}`, shape: baseShape, color: baseColor, animation: "float", isOdd: false });
        }
      }

      return {
        type: "ODD_ONE_OUT",
        difficulty: diff as any,
        instruction: "Identify and tap the item that does not belong in the group.",
        items,
        options: items.map(i => i.id),
        correctAnswer: `item_${oddIndex}`
      };
    } else {
      const count = diff === "EASY" ? 3 : diff === "MEDIUM" ? 4 : 5;
      const blocksList = [];
      for (let i = 0; i < count; i++) {
        blocksList.push({ id: `block_${i}`, height: 50 + i * 30, color: colors[i % colors.length], value: i + 1 });
      }
      const shuffled = fisherYatesShuffle(blocksList);

      return {
        type: "BLOCK_ARRANGEMENT",
        difficulty: diff as any,
        instruction: "Rearrange blocks in ascending order of their heights.",
        correctOrder: blocksList.map(b => b.id),
        shuffled,
        options: ["sorted_blocks"],
        correctAnswer: "sorted_blocks"
      };
    }
  };

  useEffect(() => {
    let active = true;
    const fetchPuzzle = async () => {
      setLoading(true);
      setError("");
      setSolved(false);
      try {
        const query = `Generate a logic puzzle of type: "${currentType}" with difficulty: "${difficulty}"`;
        const res = await request("ai/chat", {
          method: "POST",
          body: JSON.stringify({ message: query })
        });
        if (!active) return;
        if (res && res.response) {
          const parsed = JSON.parse(res.response);
          if (parsed.type !== currentType) {
            throw new Error(`AI returned type "${parsed.type}" instead of requested "${currentType}"`);
          }
          setPuzzle(parsed);
          if (parsed.type === "SHAPE_SEQUENCE") {
            setSequenceItems(parsed.shuffled);
          } else if (parsed.type === "BLOCK_ARRANGEMENT") {
            setBlocks(parsed.shuffled);
          }
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        if (!active) return;
        console.warn("AI generation failed, fallback to procedural:", err);
        const fallback = generateLocalFallback(currentType, difficulty);
        setPuzzle(fallback);
        if (fallback.type === "SHAPE_SEQUENCE") {
          setSequenceItems(fallback.shuffled || []);
        } else if (fallback.type === "BLOCK_ARRANGEMENT") {
          setBlocks(fallback.shuffled || []);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchPuzzle();
    return () => {
      active = false;
    };
  }, [questionIndex]);

  const renderShape = (shape: string, color: string) => {
    const safeColor = color.replace('#', '');
    switch (shape) {
      case "circle":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            <defs>
              <radialGradient id={`grad-circle-${safeColor}`} cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
                <stop offset="35%" stopColor={color} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="42" fill={`url(#grad-circle-${safeColor})`} />
            <circle cx="50" cy="50" r="42" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />
          </svg>
        );
      case "square":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            <defs>
              <linearGradient id={`grad-square-${safeColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                <stop offset="30%" stopColor={color} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <rect x="12" y="12" width="76" height="76" rx="16" fill={`url(#grad-square-${safeColor})`} />
            <rect x="12" y="12" width="76" height="76" rx="16" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />
          </svg>
        );
      case "triangle":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            <defs>
              <linearGradient id={`grad-triangle-${safeColor}`} x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                <stop offset="40%" stopColor={color} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <polygon points="50,10 92,85 8,85" fill={`url(#grad-triangle-${safeColor})`} />
            <polygon points="50,10 92,85 8,85" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />
          </svg>
        );
      case "diamond":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            <defs>
              <linearGradient id={`grad-diamond-${safeColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                <stop offset="35%" stopColor={color} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <polygon points="50,8 92,50 50,92 8,50" fill={`url(#grad-diamond-${safeColor})`} />
            <polygon points="50,8 92,50 50,92 8,50" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />
          </svg>
        );
      case "star":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            <defs>
              <radialGradient id={`grad-star-${safeColor}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
                <stop offset="60%" stopColor={color} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0.4} />
              </radialGradient>
            </defs>
            <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill={`url(#grad-star-${safeColor})`} />
            <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />
          </svg>
        );
      case "hexagon":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            <defs>
              <linearGradient id={`grad-hex-${safeColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                <stop offset="35%" stopColor={color} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <polygon points="50,6 92,28 92,72 50,94 8,72 8,28" fill={`url(#grad-hex-${safeColor})`} />
            <polygon points="50,6 92,28 92,72 50,94 8,72 8,28" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleCorrectSubmission = () => {
    setSolved(true);
    playSoundEffect("success");
    onAnswer(question.correctAnswer);
  };

  const handleWrongSubmission = () => {
    playSoundEffect("wrong");
    setWrongEffect(true);
    setTimeout(() => {
      setWrongEffect(false);
      if (puzzle?.type === "PATTERN_RECOGNITION" || puzzle?.type === "ODD_ONE_OUT") {
        const wrongOpt = question.options?.find((o: any) => o.optionText?.trim().toLowerCase() !== question.correctAnswer?.trim().toLowerCase());
        const wrongAnswerText = wrongOpt ? wrongOpt.optionText : "incorrect";
        onAnswer(wrongAnswerText);
      }
    }, 500);
  };

  const checkPatternDrop = (dropped: string) => {
    if (disabled || solved) return;
    if (dropped === puzzle?.correctAnswer) {
      handleCorrectSubmission();
    } else {
      handleWrongSubmission();
    }
  };

  // Reorder for Shape Sequence
  const handleSeqDragStart = (idx: number) => {
    if (disabled || solved) return;
    setDraggedIdx(idx);
    playSoundEffect("click");
  };

  const handleSeqDragEnter = (idx: number) => {
    if (disabled || solved || draggedIdx === null || draggedIdx === idx) return;
    const newItems = [...sequenceItems];
    const temp = newItems[draggedIdx];
    newItems[draggedIdx] = newItems[idx];
    newItems[idx] = temp;
    setDraggedIdx(idx);
    setSequenceItems(newItems);
  };

  const handleSeqDragEnd = () => {
    setDraggedIdx(null);
    const currentOrderIds = sequenceItems.map(item => item.id);
    const correctOrderIds = puzzle?.correctOrder || [];
    if (JSON.stringify(currentOrderIds) === JSON.stringify(correctOrderIds)) {
      handleCorrectSubmission();
    }
  };

  // Reorder for Block Arrangement
  const handleBlockDragStart = (idx: number) => {
    if (disabled || solved) return;
    setDraggedIdx(idx);
    playSoundEffect("click");
  };

  const handleBlockDragEnter = (idx: number) => {
    if (disabled || solved || draggedIdx === null || draggedIdx === idx) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[draggedIdx];
    newBlocks[draggedIdx] = newBlocks[idx];
    newBlocks[idx] = temp;
    setDraggedIdx(idx);
    setBlocks(newBlocks);
  };

  const handleBlockDragEnd = () => {
    setDraggedIdx(null);
    const currentOrderIds = blocks.map(b => b.id);
    const correctOrderIds = puzzle?.correctOrder || [];
    if (JSON.stringify(currentOrderIds) === JSON.stringify(correctOrderIds)) {
      handleCorrectSubmission();
    }
  };

  const handleSeqTap = (idx: number) => {
    if (disabled || solved) return;
    if (selectedIdx === null) {
      setSelectedIdx(idx);
      playSoundEffect("click");
    } else {
      if (selectedIdx !== idx) {
        const newItems = [...sequenceItems];
        const temp = newItems[selectedIdx];
        newItems[selectedIdx] = newItems[idx];
        newItems[idx] = temp;
        setSequenceItems(newItems);
        playSoundEffect("click");
        const currentOrderIds = newItems.map(item => item.id);
        const correctOrderIds = puzzle?.correctOrder || [];
        if (JSON.stringify(currentOrderIds) === JSON.stringify(correctOrderIds)) {
          handleCorrectSubmission();
        }
      }
      setSelectedIdx(null);
    }
  };

  const handleBlockTap = (idx: number) => {
    if (disabled || solved) return;
    if (selectedBlockIdx === null) {
      setSelectedBlockIdx(idx);
      playSoundEffect("click");
    } else {
      if (selectedBlockIdx !== idx) {
        const newBlocks = [...blocks];
        const temp = newBlocks[selectedBlockIdx];
        newBlocks[selectedBlockIdx] = newBlocks[idx];
        newBlocks[idx] = temp;
        setBlocks(newBlocks);
        playSoundEffect("click");
        const currentOrderIds = newBlocks.map(b => b.id);
        const correctOrderIds = puzzle?.correctOrder || [];
        if (JSON.stringify(currentOrderIds) === JSON.stringify(correctOrderIds)) {
          handleCorrectSubmission();
        }
      }
      setSelectedBlockIdx(null);
    }
  };

  // Odd One Out tap handler
  const handleOddTap = (item: OddItem) => {
    if (disabled || solved) return;
    if (item.isOdd) {
      handleCorrectSubmission();
    } else {
      handleWrongSubmission();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="h-10 w-10 rounded-full border-4 border-cyan-400 border-t-transparent"
        />
        <p className="text-xs font-bold text-slate-300 animate-pulse">Generating logic challenge…</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center overflow-hidden w-full">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-40 h-full w-full" />

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} className="absolute left-10 top-10 h-32 w-32 rounded-full bg-cyan-500/5 blur-xl" />
        <motion.div animate={{ y: [0, 30, 0], scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }} className="absolute right-12 bottom-12 h-44 w-44 rounded-full bg-violet-500/5 blur-xl" />
      </div>

      <header className="mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">
          <Sparkles className="h-3 w-3 animate-pulse text-cyan-400" /> LOGIC CHALLENGE
        </span>
        <h2 className="keep-white mt-3 text-base font-bold tracking-tight text-slate-100" style={{ color: "#f1f5f9" }}>{puzzle?.instruction}</h2>
      </header>

      <motion.div
        animate={wrongEffect ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="relative flex min-h-[340px] w-full items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-8 backdrop-blur-md"
      >
        {puzzle?.type === "PATTERN_RECOGNITION" && (
          <div className="flex flex-col items-center space-y-8 w-full">
            <p className="keep-white text-[10px] uppercase font-black tracking-widest text-cyan-400/80" style={{ color: "#67e8f9" }}>Drag a shape or tap a shape then tap the question mark</p>
            <div className="flex items-center justify-center gap-4 rounded-2xl bg-black/35 p-5 border border-white/5 shadow-inner">
              {puzzle.pattern?.map((p, idx) => (
                <div
                  key={idx}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => checkPatternDrop(e.dataTransfer.getData("text"))}
                  onClick={() => {
                    if (p === null && selectedOption) {
                      checkPatternDrop(selectedOption);
                      setSelectedOption(null);
                    }
                  }}
                  className={`relative flex h-20 w-20 items-center justify-center rounded-2xl border transition-all cursor-pointer ${
                    p === null
                      ? "border-cyan-400 bg-cyan-400/15 shadow-[0_0_20px_rgba(103,232,249,0.3)] animate-pulse"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {p ? (
                    <div className="w-14 h-14">{renderShape(p.shape, p.color)}</div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <HelpCircle className="h-7 w-7 text-cyan-400" />
                      <span className="keep-white text-[8px] font-black tracking-widest text-cyan-400/70 mt-1">PLACE</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-5 mt-4 p-4 rounded-2xl bg-white/5 border border-white/5">
              {puzzle.options.map((opt, idx) => {
                const [shape, color] = opt.split(":");
                return (
                  <motion.div
                    key={idx}
                    draggable
                    onDragStart={(e: any) => {
                      e.dataTransfer.setData("text", opt);
                      setDraggedVal(opt);
                    }}
                    onClick={() => {
                      if (disabled || solved) return;
                      setSelectedOption(opt);
                      playSoundEffect("click");
                    }}
                    whileHover={{ scale: 1.15, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className={`flex h-16 w-16 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-b from-white/15 to-white/5 shadow-lg border hover:shadow-cyan-500/10 hover:shadow-xl transition-all ${
                      selectedOption === opt ? "border-cyan-400 ring-4 ring-cyan-400/50 scale-105" : "border-white/10"
                    }`}
                  >
                    <div className="w-12 h-12">{renderShape(shape, color)}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {puzzle?.type === "SHAPE_SEQUENCE" && (
          <div className="flex flex-col items-center space-y-6 w-full">
            <p className="keep-white text-[10px] uppercase font-black tracking-widest text-cyan-400/80" style={{ color: "#67e8f9" }}>Drag shapes or tap two shapes to swap them</p>
            <div className="flex items-center justify-center gap-6 p-6 rounded-3xl bg-black/40 border border-white/10 shadow-2xl relative min-h-[160px]">
              {sequenceItems.map((item, idx) => (
                <motion.div
                  key={item.id}
                  draggable
                  onDragStart={() => handleSeqDragStart(idx)}
                  onDragEnter={() => handleSeqDragEnter(idx)}
                  onDragEnd={handleSeqDragEnd}
                  onClick={() => handleSeqTap(idx)}
                  whileHover={{ scale: 1.08 }}
                  className={`flex h-28 w-28 cursor-pointer items-center justify-center rounded-2xl border transition-all relative ${
                    draggedIdx === idx || selectedIdx === idx
                      ? "border-cyan-400 bg-cyan-400/20 ring-4 ring-cyan-400/50 shadow-[0_0_20px_rgba(103,232,249,0.3)] scale-105"
                      : "border-white/15 bg-white/5 hover:border-cyan-400/40 hover:bg-white/10"
                  }`}
                >
                  <div style={{ width: `${item.size}px`, height: `${item.size}px` }} className="transition-all flex items-center justify-center p-2">
                    {renderShape(item.shape, item.color)}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {puzzle?.type === "ODD_ONE_OUT" && (
          <div className="flex flex-col items-center space-y-6 w-full">
            <p className="keep-white text-[10px] uppercase font-black tracking-widest text-cyan-400/80 animate-pulse" style={{ color: "#67e8f9" }}>Tap the object that does not belong in the group</p>
            <div className="flex items-center justify-center gap-6 p-6 rounded-3xl bg-black/35 border border-white/10 shadow-2xl backdrop-blur-xl">
              {puzzle.items?.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => handleOddTap(item)}
                  whileHover={{ scale: 1.12, y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.5)", borderColor: "rgba(103,232,249,0.4)" }}
                  whileTap={{ scale: 0.92 }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.5 + Math.random() * 0.5,
                    ease: "easeInOut"
                  }}
                  className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-white/12 to-white/4 p-4 hover:shadow-cyan-500/20 focus:outline-none cursor-pointer transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-cyan-400/5 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300" />
                  <div className="z-10 w-16 h-16">
                    {renderShape(item.shape, item.color)}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {puzzle?.type === "BLOCK_ARRANGEMENT" && (
          <div className="flex flex-col items-center space-y-6 w-full">
            <p className="keep-white text-[10px] uppercase font-black tracking-widest text-cyan-400/80" style={{ color: "#67e8f9" }}>Drag blocks or tap two blocks to swap them</p>
            <div className="flex h-64 items-end justify-center gap-4 rounded-3xl bg-black/45 p-6 border border-white/10 min-w-[320px] shadow-2xl relative">
              {/* Pedestal grid lines */}
              <div className="absolute inset-x-0 bottom-0 top-6 border-b border-dashed border-white/5 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 top-20 border-b border-dashed border-white/5 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 top-36 border-b border-dashed border-white/5 pointer-events-none" />

              {blocks.map((block, idx) => (
                <motion.div
                  key={block.id}
                  draggable
                  onDragStart={() => handleBlockDragStart(idx)}
                  onDragEnter={() => handleBlockDragEnter(idx)}
                  onDragEnd={handleBlockDragEnd}
                  onClick={() => handleBlockTap(idx)}
                  whileHover={{ scale: 1.05, y: -4 }}
                  className={`w-14 cursor-pointer rounded-t-2xl transition-all flex flex-col justify-between border-t border-x relative group ${
                    draggedIdx === idx || selectedBlockIdx === idx
                      ? "border-cyan-400 ring-4 ring-cyan-400/50 shadow-[0_0_25px_rgba(103,232,249,0.4)]"
                      : "border-white/20"
                  }`}
                  style={{
                    height: `${block.height + 40}px`,
                    background: `linear-gradient(to top, ${block.color}cc, ${block.color})`,
                    boxShadow: `0 10px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`
                  }}
                >
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-white/25 rounded-t-2xl opacity-75" />
                  <div className="absolute inset-y-0 left-0 w-1 bg-white/10" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
