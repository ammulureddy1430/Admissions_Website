import type { TangramLevel, TangramPieceDefinition } from "./Types";

const COLORS = ["#ff7b54", "#ffd166", "#48cae4", "#7bd389", "#a78bfa", "#f472b6", "#38bdf8"];
const SHAPES = {
  triangle: "0,100 50,0 100,100",
  square: "0,0 100,0 100,100 0,100",
  parallelogram: "25,0 100,0 75,100 0,100",
  diamond: "50,0 100,50 50,100 0,50",
  rectangle: "0,0 100,0 100,100 0,100",
  polygon: "15,0 85,0 100,55 65,100 0,75",
} as const;

const piece = (
  id: string,
  type: keyof typeof SHAPES,
  width: number,
  height: number,
  colorIndex: number,
): TangramPieceDefinition => ({ id, type, points: SHAPES[type], width, height, color: COLORS[colorIndex] });

// Original silhouettes assembled from the exact slots below. Adjacent pieces share
// a fill with no strokes in the target, so individual solution outlines stay hidden.
export const TANGRAM_LEVELS: TangramLevel[] = [
  {
    id: 1,
    difficulty: 1,
    pieces: [piece("roof", "triangle", 32, 20, 0), piece("body", "square", 26, 26, 1)],
    slots: [
      { pieceId: "roof", x: 50, y: 42, targetOffsetY: -39, rotation: 0 },
      { pieceId: "body", x: 50, y: 58, targetOffsetY: 39, rotation: 0 },
    ],
  },
  {
    id: 2,
    difficulty: 2,
    pieces: [piece("tree-top", "triangle", 30, 29, 3), piece("trunk", "rectangle", 10, 23, 1)],
    slots: [
      { pieceId: "tree-top", x: 50, y: 41, targetOffsetY: -54, rotation: 0 },
      { pieceId: "trunk", x: 50, y: 59, targetOffsetY: 34, rotation: 0 },
    ],
  },
  {
    id: 3,
    difficulty: 3,
    pieces: [piece("nose", "triangle", 20, 17, 0), piece("body", "rectangle", 18, 29, 2), piece("flame", "diamond", 10, 12, 1)],
    slots: [
      { pieceId: "nose", x: 50, y: 38, targetOffsetY: -59, rotation: 0 },
      { pieceId: "body", x: 50, y: 49, targetOffsetY: 19, rotation: 0 },
      { pieceId: "flame", x: 50, y: 59, targetOffsetY: 88, rotation: 0 },
    ],
  },
];
