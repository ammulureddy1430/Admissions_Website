"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Sparkles, Trophy } from "lucide-react";

type MatchingItem = {
  id: string;
  content: string;
  type: "icon" | "text" | "shape" | "pattern" | "shadow";
  color: string;
};

type PuzzleData = {
  type: "MATCH_IMAGE_IMAGE" | "MATCH_IMAGE_WORD" | "MATCH_WORD_WORD" | "MATCH_SHAPE_SHADOW" | "MATCH_PATTERN";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  instruction: string;
  pairs: Array<{
    id: string;
    left: string;
    right: string;
    leftType: string;
    rightType: string;
    leftColor: string;
    rightColor: string;
  }>;
  leftItems: MatchingItem[];
  rightItems: MatchingItem[];
  correctAnswer: string;
};

export function MatchingGame({
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
  const [solved, setSolved] = useState(false);
  const [wrongEffectId, setWrongEffectId] = useState<string | null>(null);

  // Gameplay state
  const [leftPool, setLeftPool] = useState<MatchingItem[]>([]);
  const [rightPool, setRightPool] = useState<MatchingItem[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<MatchingItem | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiParticles = useRef<any[]>([]);
  const animationFrameId = useRef<number | null>(null);

  const matchingTypes = ["MATCH_IMAGE_IMAGE", "MATCH_IMAGE_WORD", "MATCH_WORD_WORD", "MATCH_SHAPE_SHADOW", "MATCH_PATTERN"];
  const currentType = matchingTypes[questionIndex % matchingTypes.length];
  const difficulty = question.difficulty || "MEDIUM";

  // Synthesize sound effects
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
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else if (type === "wrong") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === "click") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      }
    } catch (e) {
      console.warn("Audio Context sound failed:", e);
    }
  };

  // Confetti Completion celebration
  const startConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 500;

    confettiParticles.current = Array.from({ length: 80 }, () => ({
      x: canvas.width / 2,
      y: canvas.height - 35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 7,
      r: Math.random() * 5 + 3,
      color: ["#f43f5e", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"][Math.floor(Math.random() * 6)],
      alpha: 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8
    }));

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      confettiParticles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.vx *= 0.98;
        p.alpha -= 0.015;
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

  // Local definition dictionary and procedural parsing for database options
  const getDefinition = (word: string): string => {
    const dict: Record<string, string> = {
      family: "Group of related people",
      equivalent: "Equal in value or meaning",
      fractions: "Numerical parts of a whole",
      same: "Identical or not different",
      dog: "An animal that barks",
      cat: "A small domesticated mammal",
      car: "A road vehicle with four wheels",
      tree: "A tall woody perennial plant",
      star: "A glowing celestial body",
      moon: "A natural satellite of Earth",
      sun: "The star at the center",
      happy: "Feeling pleasure or contentment",
      hot: "Having a high temperature",
      cold: "Having a low temperature",
      big: "Large in size or extent",
      small: "Size that is less than average",
      fast: "Moving or capable of moving at high speed",
      slow: "Moving or operating at a low speed",
      doctor: "A qualified practitioner of medicine",
      hospital: "An institution for medical treatment",
      teacher: "A person who teaches students",
      school: "An institution for educating children",
      chef: "A professional cook",
      kitchen: "A room where food is prepared",
      fire: "Combustion producing flame",
      ice: "Frozen water",
      bird: "A warm-blooded egg-laying vertebrate",
      fish: "A limbless cold-blooded vertebrate",
      swim: "Propel oneself through water",
      fly: "Move through the air using wings"
    };
    const key = word.trim().toLowerCase();
    return dict[key] || `Concept related to "${word}"`;
  };

  const getProceduralLeftItem = (desc: string): string => {
    const low = desc.toLowerCase();
    if (low.includes("fruit") || low.includes("tree") || low.includes("apple")) return "Apple";
    if (low.includes("swim") || low.includes("fish") || low.includes("water") || low.includes("aquatic")) return "Fish";
    if (low.includes("key") || low.includes("lock") || low.includes("secure")) return "Key";
    if (low.includes("write") || low.includes("pencil") || low.includes("paper")) return "Pencil";
    if (low.includes("sun") || low.includes("star") || low.includes("shine")) return "Sun";
    if (low.includes("moon") || low.includes("night") || low.includes("satellite")) return "Moon";
    if (low.includes("dog") || low.includes("bark") || low.includes("canine")) return "Dog";
    if (low.includes("cat") || low.includes("meow") || low.includes("feline")) return "Cat";
    if (low.includes("car") || low.includes("vehicle") || low.includes("drive")) return "Car";
    if (low.includes("happy") || low.includes("joy")) return "Happy";
    if (low.includes("hot") || low.includes("heat") || low.includes("fire")) return "Hot";
    if (low.includes("cold") || low.includes("ice") || low.includes("freeze")) return "Cold";
    if (low.includes("big") || low.includes("large") || low.includes("giant")) return "Big";
    if (low.includes("small") || low.includes("little") || low.includes("tiny")) return "Small";
    if (low.includes("fast") || low.includes("speed") || low.includes("quick")) return "Fast";
    if (low.includes("slow") || low.includes("crawl")) return "Slow";
    if (low.includes("doctor") || low.includes("medical") || low.includes("hospital")) return "Doctor";
    if (low.includes("teacher") || low.includes("school") || low.includes("study")) return "Teacher";
    if (low.includes("chef") || low.includes("kitchen") || low.includes("cook")) return "Chef";
    
    // Fallback: extract the first two words capitalized
    const words = desc.split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1));
    return words.join(" ");
  };

  const generateLocalFallback = (type: string, diff: string, dbQuestion: any): PuzzleData => {
    const colors = ["#f43f5e", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];
    const count = diff === "EASY" ? 3 : diff === "MEDIUM" ? 4 : 5;

    const fisherYatesShuffle = (array: any[]) => {
      let shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    let pairs: any[] = [];
    let instruction = "";

    // Parse options from database question
    const optionsTextList = (dbQuestion.options || []).map((o: any) => o.optionText).filter(Boolean);
    const matchMatch = (dbQuestion.questionText || "").match(/Match\s+['"]?([^'"]+)['"]?\s+with/i);
    const extractedLeftItem = matchMatch ? matchMatch[1] : null;

    if (extractedLeftItem && optionsTextList.length > 0) {
      instruction = `Match the item "${extractedLeftItem}" and remaining items with their correct description.`;
      
      // Match correct item to correct answer
      pairs.push({
        id: "pair_correct",
        left: extractedLeftItem,
        right: dbQuestion.correctAnswer,
        leftType: "text",
        rightType: "text",
        leftColor: colors[0],
        rightColor: "#ffffff"
      });

      // Match remaining options
      const remainingOptions = optionsTextList.filter((t: string) => t !== dbQuestion.correctAnswer);
      remainingOptions.slice(0, count - 1).forEach((opt: string, idx: number) => {
        pairs.push({
          id: `pair_${idx}`,
          left: getProceduralLeftItem(opt),
          right: opt,
          leftType: "text",
          rightType: "text",
          leftColor: colors[(idx + 1) % colors.length],
          rightColor: "#ffffff"
        });
      });
    } else if (optionsTextList.length > 0) {
      // General MCQ Question fallback: Left options matched to definition/synonym targets
      instruction = "Match each option vocabulary word with its definition.";
      optionsTextList.slice(0, count).forEach((opt: string, idx: number) => {
        pairs.push({
          id: opt === dbQuestion.correctAnswer ? "pair_correct" : `pair_${idx}`,
          left: opt,
          right: getDefinition(opt),
          leftType: "text",
          rightType: "text",
          leftColor: colors[idx % colors.length],
          rightColor: "#ffffff"
        });
      });
    } else {
      // Complete hardcoded fallback if no database question options exist
      instruction = "Match the related word pairs.";
      const pool = [
        { left: "Happy", right: "Joyful" },
        { left: "Hot", right: "Cold" },
        { left: "Big", right: "Small" },
        { left: "Fast", right: "Slow" },
        { left: "Doctor", right: "Hospital" }
      ];
      const selected = fisherYatesShuffle(pool).slice(0, count);
      pairs = selected.map((item, idx) => ({
        id: `pair_${idx}`,
        left: item.left,
        right: item.right,
        leftType: "text",
        rightType: "text",
        leftColor: colors[idx % colors.length],
        rightColor: "#ffffff"
      }));
    }

    const leftItems = pairs.map(p => ({ id: p.id, content: p.left, type: p.leftType as any, color: p.leftColor }));
    const rightItems = pairs.map(p => ({ id: p.id, content: p.right, type: p.rightType as any, color: p.rightColor }));

    return {
      type: type as any,
      difficulty: diff as any,
      instruction,
      pairs,
      leftItems: fisherYatesShuffle(leftItems),
      rightItems: fisherYatesShuffle(rightItems),
      correctAnswer: "pair_correct"
    };
  };

  // Fetch puzzle from Google AI or fallback
  useEffect(() => {
    let active = true;
    const fetchPuzzle = async () => {
      setLoading(true);
      setError("");
      setSolved(false);
      setAssignments({});
      setSelectedLeft(null);
      try {
        const optionsTextList = (question.options || []).map((o: any) => o.optionText).filter(Boolean);
        const matchMatch = (question.questionText || "").match(/Match\s+['"]?([^'"]+)['"]?\s+with/i);
        const extractedLeftItem = matchMatch ? matchMatch[1] : null;

        let query = "";
        if (extractedLeftItem && optionsTextList.length > 0) {
          query = `Generate a matching puzzle of type: "${currentType}" with difficulty: "${difficulty}". The correct pair MUST be left item: "${extractedLeftItem}" matching description: "${question.correctAnswer}". The other target descriptions MUST be: ${JSON.stringify(optionsTextList.filter((t: string) => t !== question.correctAnswer))}. Please generate the corresponding left-side matching items for these remaining target descriptions. Return ONLY a valid JSON object matching the format: { "type": "...", "difficulty": "...", "instruction": "...", "pairs": [ { "id": "...", "left": "...", "right": "...", "leftType": "icon" | "text" | "shape" | "pattern", "rightType": "icon" | "text" | "shadow" | "shape", "leftColor": "...", "rightColor": "..." } ], "leftItems": [ ... ], "rightItems": [ ... ] } and do NOT wrap in markdown code blocks.`;
        } else if (optionsTextList.length > 0) {
          query = `Generate a matching puzzle of type: "${currentType}" with difficulty: "${difficulty}" where the left-side items are the vocabulary options: ${JSON.stringify(optionsTextList)}. Please generate corresponding right-side target definitions or related concepts. Return ONLY a valid JSON object matching the format: { "type": "...", "difficulty": "...", "instruction": "...", "pairs": [ { "id": "...", "left": "...", "right": "...", "leftType": "icon" | "text" | "shape" | "pattern", "rightType": "icon" | "text" | "shadow" | "shape", "leftColor": "...", "rightColor": "..." } ], "leftItems": [ ... ], "rightItems": [ ... ] } and do NOT wrap in markdown code blocks.`;
        } else {
          query = `Generate a matching puzzle of type: "${currentType}" with difficulty: "${difficulty}" based on the context/topic: "${question.questionText}". The matching pairs should be educational and relevant. Return ONLY a valid JSON object matching the format: { "type": "...", "difficulty": "...", "instruction": "...", "pairs": [ { "id": "...", "left": "...", "right": "...", "leftType": "icon" | "text" | "shape" | "pattern", "rightType": "icon" | "text" | "shadow" | "shape", "leftColor": "...", "rightColor": "..." } ], "leftItems": [ ... ], "rightItems": [ ... ] } and do NOT wrap in markdown code blocks.`;
        }

        const res = await request("ai/chat", {
          method: "POST",
          body: JSON.stringify({ message: query })
        });
        if (!active) return;
        if (res && res.response) {
          const parsed = JSON.parse(res.response);
          if (parsed.type !== currentType) {
            throw new Error(`AI returned matching type "${parsed.type}" instead of requested "${currentType}"`);
          }
          setPuzzle(parsed);
          setLeftPool(parsed.leftItems || []);
          setRightPool(parsed.rightItems || []);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        if (!active) return;
        console.warn("AI generation failed, fallback to procedural:", err);
        const fallback = generateLocalFallback(currentType, difficulty, question);
        setPuzzle(fallback);
        setLeftPool(fallback.leftItems || []);
        setRightPool(fallback.rightItems || []);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchPuzzle();
    return () => {
      active = false;
    };
  }, [questionIndex]);

  // Premium Glossy Vector render utilities
  const renderShape = (shape: string, color: string, isShadow = false) => {
    const safeColor = color.replace("#", "");
    const fillColor = isShadow ? "#1e293b" : color;
    switch (shape) {
      case "circle":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            {!isShadow && (
              <defs>
                <radialGradient id={`grad-match-circle-${safeColor}`} cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
                  <stop offset="35%" stopColor={color} />
                  <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
                </radialGradient>
              </defs>
            )}
            <circle cx="50" cy="50" r="42" fill={isShadow ? fillColor : `url(#grad-match-circle-${safeColor})`} />
            {!isShadow && <circle cx="50" cy="50" r="42" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />}
          </svg>
        );
      case "square":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            {!isShadow && (
              <defs>
                <linearGradient id={`grad-match-square-${safeColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                  <stop offset="30%" stopColor={color} />
                  <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
                </linearGradient>
              </defs>
            )}
            <rect x="12" y="12" width="76" height="76" rx="16" fill={isShadow ? fillColor : `url(#grad-match-square-${safeColor})`} />
            {!isShadow && <rect x="12" y="12" width="76" height="76" rx="16" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />}
          </svg>
        );
      case "triangle":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            {!isShadow && (
              <defs>
                <linearGradient id={`grad-match-triangle-${safeColor}`} x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                  <stop offset="40%" stopColor={color} />
                  <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
                </linearGradient>
              </defs>
            )}
            <polygon points="50,10 92,85 8,85" fill={isShadow ? fillColor : `url(#grad-match-triangle-${safeColor})`} />
            {!isShadow && <polygon points="50,10 92,85 8,85" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />}
          </svg>
        );
      case "diamond":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            {!isShadow && (
              <defs>
                <linearGradient id={`grad-match-diamond-${safeColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                  <stop offset="35%" stopColor={color} />
                  <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
                </linearGradient>
              </defs>
            )}
            <polygon points="50,8 92,50 50,92 8,50" fill={isShadow ? fillColor : `url(#grad-match-diamond-${safeColor})`} />
            {!isShadow && <polygon points="50,8 92,50 50,92 8,50" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />}
          </svg>
        );
      case "star":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            {!isShadow && (
              <defs>
                <radialGradient id={`grad-match-star-${safeColor}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
                  <stop offset="60%" stopColor={color} />
                  <stop offset="100%" stopColor="#000000" stopOpacity={0.4} />
                </radialGradient>
              </defs>
            )}
            <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill={isShadow ? fillColor : `url(#grad-match-star-${safeColor})`} />
            {!isShadow && <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />}
          </svg>
        );
      case "hexagon":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
            {!isShadow && (
              <defs>
                <linearGradient id={`grad-match-hex-${safeColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                  <stop offset="35%" stopColor={color} />
                  <stop offset="100%" stopColor="#000000" stopOpacity={0.45} />
                </linearGradient>
              </defs>
            )}
            <polygon points="50,6 92,28 92,72 50,94 8,72 8,28" fill={isShadow ? fillColor : `url(#grad-match-hex-${safeColor})`} />
            {!isShadow && <polygon points="50,6 92,28 92,72 50,94 8,72 8,28" stroke="white" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />}
          </svg>
        );
      default:
        return null;
    }
  };

  const renderIcon = (name: string, color: string) => {
    switch (name) {
      case "apple":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <path d="M12 2C11.5 2 10 3.5 10 5C10 5.2 10.1 5.4 10.2 5.6C8.5 6.2 7 7.8 7 10C7 13.5 9 16 12 16C15 16 17 13.5 17 10C17 7.8 15.5 6.2 13.8 5.6C13.9 5.4 14 5.2 14 5C14 3.5 12.5 2 12 2Z" fill={color} />
            <path d="M12 6C11 6 9.5 7 9.5 8.5C9.5 9 10 9.5 10.5 9.5C11 9.5 11.5 8.5 12.5 8.5C13.5 8.5 14.5 9 14.5 10C14.5 11 13 12 12 12C11.5 12 11 12.5 11 13C11 13.5 11.5 14 12 14C14 14 16.5 12.5 16.5 10C16.5 7.5 14 6 12 6Z" fill="#ffffff" opacity={0.25} />
            <path d="M12 2C12 2 13 1 14 2C15 3 13.5 4.5 12.5 4.5" stroke="#10b981" strokeWidth={2} strokeLinecap="round" fill="none" />
          </svg>
        );
      case "tree":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <polygon points="12,2 4,14 8,14 3,19 21,19 16,14 20,14" fill={color} />
            <rect x="10" y="19" width="4" height="4" fill="#78350f" />
          </svg>
        );
      case "fish":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <path d="M2,12C2,9 6,6 12,6C17,6 20,9 22,12C20,15 17,18 12,18C6,18 2,15 2,12Z" fill={color} />
            <polygon points="2,12 6,8 6,16" fill={color} />
            <circle cx="17" cy="10" r="1" fill="#ffffff" />
          </svg>
        );
      case "water":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <path d="M2,15 C5,12 7,12 10,15 C13,18 15,18 18,15 C20,13 22,13 24,15" stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />
            <path d="M2,9 C5,6 7,6 10,9 C13,12 15,12 18,9 C20,7 22,7 24,9" stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.6} />
          </svg>
        );
      case "key":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <circle cx="6" cy="12" r="4" stroke={color} strokeWidth={3} fill="none" />
            <line x1="10" y1="12" x2="22" y2="12" stroke={color} strokeWidth={3} />
            <line x1="18" y1="12" x2="18" y2="16" stroke={color} strokeWidth={3} />
            <line x1="21" y1="12" x2="21" y2="15" stroke={color} strokeWidth={3} />
          </svg>
        );
      case "lock":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <rect x="5" y="10" width="14" height="11" rx="2" fill={color} />
            <path d="M8,10V6a4,4 0 0,1 8,0V10" stroke={color} strokeWidth={3} fill="none" />
            <circle cx="12" cy="15" r="2" fill="#111827" />
          </svg>
        );
      case "pencil":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <path d="M3,17.25V21H6.75L17.81,9.94L14.06,6.19L3,17.25Z" fill={color} />
            <polygon points="3,17.25 3,21 6.75,21" fill="#f59e0b" />
            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04Z" fill={color} />
          </svg>
        );
      case "paper":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <rect x="4" y="2" width="16" height="20" rx="2" fill={color} />
            <line x1="7" y1="6" x2="17" y2="6" stroke="#ffffff" strokeWidth={2} opacity={0.6} />
            <line x1="7" y1="11" x2="17" y2="11" stroke="#ffffff" strokeWidth={2} opacity={0.6} />
            <line x1="7" y1="16" x2="13" y2="16" stroke="#ffffff" strokeWidth={2} opacity={0.6} />
          </svg>
        );
      case "sun":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md animate-[spin_20s_linear_infinite]">
            <circle cx="12" cy="12" r="5" fill={color} />
            <path d="M12,1v2 M12,21v2 M1,12h2 M21,12h2 M4.22,4.22l1.42,1.42 M18.36,18.36l1.42,1.42 M1,12 M23,12 M4.22,19.78l1.42,-1.42 M18.36,5.64l1.42,-1.42" stroke={color} strokeWidth={2} strokeLinecap="round" />
          </svg>
        );
      case "cloud":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <path d="M19.35,10.04C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.04C2.34,8.36 0,10.91 0,14C0,17.31 2.69,20 6,20H19C21.76,20 24,17.76 24,15C24,12.36 21.95,10.22 19.35,10.04Z" fill={color} />
          </svg>
        );
      case "moon":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <path d="M12.3,2a10,10 0 0,0-1.9,19.8,10,10 0 0,1-4.9-18.7,10,10 0 0,0 6.8-1.1Z" fill={color} />
          </svg>
        );
      case "star":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill={color} />
          </svg>
        );
      case "dog":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <path d="M12,4C9,4 6,6 6,10C6,14 9,18 12,18C15,18 18,14 18,10C18,6 15,4 12,4Z" fill={color} />
            <path d="M4,9c0,0-2,3-1,6s4,2 4,2" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
            <path d="M20,9c0,0 2,3 1,6s-4,2-4,2" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
            <circle cx="10" cy="9" r="1" fill="#ffffff" />
            <circle cx="14" cy="9" r="1" fill="#ffffff" />
            <polygon points="11,12 13,12 12,13.5" fill="#ffffff" />
          </svg>
        );
      case "cat":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <path d="M12,5C8,5 5,8 5,12C5,16 8,19 12,19C16,19 19,16 19,12C19,8 16,5 12,5Z" fill={color} />
            <polygon points="5,8 2,2 8,5" fill={color} />
            <polygon points="19,8 22,2 16,5" fill={color} />
            <circle cx="9" cy="11" r="1" fill="#ffffff" />
            <circle cx="15" cy="11" r="1" fill="#ffffff" />
            <line x1="3" y1="13" x2="8" y2="14" stroke="#ffffff" strokeWidth={1} />
            <line x1="21" y1="13" x2="16" y2="14" stroke="#ffffff" strokeWidth={1} />
          </svg>
        );
      case "car":
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-md">
            <path d="M18.92,6.01C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6.01L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6.01Z" fill={color} />
            <circle cx="7.5" cy="16.5" r="1.5" fill="#ffffff" />
            <circle cx="16.5" cy="16.5" r="1.5" fill="#ffffff" />
            <rect x="6" y="9" width="12" height="3" fill="#ffffff" opacity={0.3} />
          </svg>
        );
      default:
        return <HelpCircle className="w-full h-full text-slate-400" />;
    }
  };

  const renderItemMedia = (content: string, type: string, color: string) => {
    if (type === "text") {
      return (
        <span className="keep-white text-xs font-extrabold tracking-wide text-slate-100" style={{ color: "#f1f5f9" }}>
          {content}
        </span>
      );
    }
    if (type === "shape") {
      return renderShape(content, color);
    }
    if (type === "shadow") {
      return renderShape(content, color, true);
    }
    if (type === "icon") {
      return renderIcon(content, color);
    }
    if (type === "pattern") {
      const parts = content.split(":");
      return (
        <div className="flex items-center gap-1">
          {parts.map((p, i) => (
            <div key={i} className="h-6 w-6">
              {renderShape(p, color)}
            </div>
          ))}
          <span className="keep-white text-[10px] font-black text-cyan-400 animate-pulse ml-1">➔ ?</span>
        </div>
      );
    }
    return null;
  };

  // Drag and Drop Match confirmation logic
  const handleItemDrop = (draggedId: string, targetId: string) => {
    if (disabled || solved) return;
    
    // Play sound on placement
    playSoundEffect("click");

    const newAssigns = { ...assignments };
    // If the left item was already assigned to another target, remove it
    Object.keys(newAssigns).forEach(k => {
      if (newAssigns[k] === draggedId) {
        delete newAssigns[k];
      }
    });
    // Set the new assignment
    newAssigns[targetId] = draggedId;
    setAssignments(newAssigns);

    // Check if ALL slots are filled
    const totalPairs = puzzle?.pairs.length || 0;
    if (Object.keys(newAssigns).length === totalPairs) {
      // Evaluate result: does every assigned left item match the correct pair?
      const isAllCorrect = Object.entries(newAssigns).every(([rId, lId]) => rId === lId);
      setSolved(true);
      if (isAllCorrect) {
        playSoundEffect("success");
        startConfetti();
      } else {
        playSoundEffect("wrong");
      }
      // Submit result to server after a short delay
      setTimeout(() => {
        if (isAllCorrect) {
          onAnswer(question.correctAnswer);
        } else {
          const wrongOpt = question.options?.find((o: any) => o.optionText?.trim().toLowerCase() !== question.correctAnswer?.trim().toLowerCase());
          onAnswer(wrongOpt ? wrongOpt.optionText : "incorrect");
        }
      }, 1000);
    }
  };

  // Tap-to-swap/Match Fallback
  const handleLeftSelect = (item: MatchingItem) => {
    const isAssigned = Object.values(assignments).includes(item.id);
    if (disabled || solved || isAssigned) return;
    playSoundEffect("click");
    setSelectedLeft(item);
  };

  const handleRightSelect = (item: MatchingItem) => {
    if (disabled || solved) return;
    
    // If we click on an already assigned slot, unassign it (return left item to pool)
    if (assignments[item.id]) {
      const newAssigns = { ...assignments };
      delete newAssigns[item.id];
      setAssignments(newAssigns);
      playSoundEffect("click");
      setSelectedLeft(null);
      return;
    }

    if (!selectedLeft) return;
    handleItemDrop(selectedLeft.id, item.id);
    setSelectedLeft(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="h-10 w-10 rounded-full border-4 border-cyan-400 border-t-transparent"
        />
        <p className="text-xs font-bold text-slate-300 animate-pulse">Generating matching challenge…</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center overflow-hidden w-full">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-50 h-full w-full" />

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} className="absolute left-10 top-10 h-32 w-32 rounded-full bg-cyan-500/5 blur-xl" />
        <motion.div animate={{ y: [0, 30, 0], scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }} className="absolute right-12 bottom-12 h-44 w-44 rounded-full bg-violet-500/5 blur-xl" />
      </div>

      <header className="mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300">
          <Sparkles className="h-3 w-3 animate-pulse text-cyan-400" /> MATCHING ZONE
        </span>
        <h2 className="keep-white mt-3 text-base font-bold tracking-tight text-slate-100" style={{ color: "#f1f5f9" }}>{puzzle?.instruction}</h2>
      </header>

      <div className="relative grid grid-cols-2 gap-12 w-full max-w-2xl px-6 min-h-[320px]">
        {/* Left Drag options */}
        <div className="flex flex-col gap-4">
          <p className="keep-white text-[9px] uppercase font-black tracking-widest text-slate-400 text-center mb-1">Drag or Select</p>
          <AnimatePresence>
            {leftPool.filter(item => !Object.values(assignments).includes(item.id)).map((item) => {
              const isSelected = selectedLeft?.id === item.id;
              const isShaking = wrongEffectId === item.id;

              return (
                <motion.div
                  key={item.id}
                  draggable={true}
                  onDragStart={(e: any) => {
                    e.dataTransfer.setData("text", item.id);
                    playSoundEffect("click");
                  }}
                  onClick={() => handleLeftSelect(item)}
                  whileHover={{ scale: 1.05, y: -2, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  animate={
                    isShaking
                      ? { x: [-8, 8, -8, 8, 0] }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={{ duration: isShaking ? 0.4 : 0.2 }}
                  className={`flex h-16 w-full items-center justify-center rounded-2xl border p-3 cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-400/20 ring-4 ring-cyan-400/30 shadow-[0_0_20px_rgba(103,232,249,0.3)]"
                      : "border-white/10 bg-gradient-to-b from-white/10 to-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="h-10 w-full flex items-center justify-center">
                    {renderItemMedia(item.content, item.type, item.color)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Right drop targets */}
        <div className="flex flex-col gap-4">
          <p className="keep-white text-[9px] uppercase font-black tracking-widest text-slate-400 text-center mb-1">Target Match</p>
          {rightPool.map((item) => {
            const assignedLeftId = assignments[item.id];
            const assignedLeft = leftPool.find(l => l.id === assignedLeftId);
            const isAssigned = !!assignedLeftId;

            return (
              <div
                key={item.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const draggedId = e.dataTransfer.getData("text");
                  handleItemDrop(draggedId, item.id);
                }}
                onClick={() => handleRightSelect(item)}
                className={`relative flex h-16 w-full items-center justify-between rounded-2xl border p-3 transition-all duration-300 ${
                  isAssigned
                    ? "border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "border-white/10 bg-black/30 hover:border-cyan-500/30"
                }`}
              >
                {/* Target Content (Right Side) */}
                <div className="flex-1 flex items-center justify-center h-10">
                  {renderItemMedia(item.content, item.type, item.color)}
                </div>

                {/* Plug socket connection */}
                <div className="w-1.5 h-6 rounded-full bg-white/10 mx-2" />

                {/* Left side matching socket */}
                <div
                  className={`flex h-10 w-24 items-center justify-center rounded-xl border border-dashed transition-all ${
                    isAssigned
                      ? "border-cyan-400/50 bg-cyan-400/15"
                      : "border-white/20 bg-white/5 animate-pulse"
                  }`}
                >
                  {isAssigned && assignedLeft ? (
                    <div className="h-8 w-full flex items-center justify-center">
                      {renderItemMedia(assignedLeft.content, assignedLeft.type, assignedLeft.color)}
                    </div>
                  ) : (
                    <span className="keep-white text-[8px] font-black tracking-widest text-slate-500">DROP HERE</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
