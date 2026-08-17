import type { TangramLevel, TangramPieceState, TangramSlot } from "./Types";

// Assessment-friendly snapping: reward recognizing the correct location and
// orientation without requiring pixel-perfect motor control.
export const POSITION_TOLERANCE = 22;
export const ROTATION_TOLERANCE = 50;

export const normalizeRotation = (rotation: number) =>
  ((rotation % 360) + 360) % 360;

export const rotationDistance = (a: number, b: number) => {
  const distance = Math.abs(normalizeRotation(a) - normalizeRotation(b));
  return Math.min(distance, 360 - distance);
};

export const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export function createPieces(level: TangramLevel): TangramPieceState[] {
  const count = level.pieces.length;
  const columns = count <= 4 ? count : Math.ceil(count / 2);
  return level.pieces.map((definition, index) => {
    const row = count <= 4 ? 0 : Math.floor(index / columns);
    const rowStart = row * columns;
    const rowCount = Math.min(columns, count - rowStart);
    const column = index - rowStart;
    return {
      ...definition,
      x: rowCount === 1 ? 50 : 15 + (column * 70) / (rowCount - 1),
      y: count <= 2 ? 79 : count <= 4 ? 82 : row === 0 ? 75 : 89,
      // Easy assessment sequence: the first two rounds start upright; the
      // final round introduces only one small 45-degree rotation task.
      rotation: level.difficulty < 3 || index !== 2 ? 0 : 45,
      placed: false,
      moveCount: 0,
      rotationCount: 0,
      placementAttempts: 0,
      repositionCount: 0,
      travel: 0,
    };
  });
}

export const slotFor = (level: TangramLevel, pieceId: string) =>
  level.slots.find((slot) => slot.pieceId === pieceId);

export const isNearSlot = (piece: TangramPieceState, slot: TangramSlot) =>
  distance(piece, slot) <= POSITION_TOLERANCE &&
  rotationDistance(piece.rotation, slot.rotation) <= ROTATION_TOLERANCE;

type Bounds = { left: number; right: number; top: number; bottom: number };
const boundsFor = (piece: TangramPieceState): Bounds => ({
  left: piece.x - piece.width / 2,
  right: piece.x + piece.width / 2,
  top: piece.y - piece.height / 2,
  bottom: piece.y + piece.height / 2,
});

export function hasSignificantOverlap(
  candidate: TangramPieceState,
  pieces: TangramPieceState[],
) {
  const a = boundsFor(candidate);
  return pieces.some((piece) => {
    if (piece.id === candidate.id || !piece.placed) return false;
    const b = boundsFor(piece);
    const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const overlap = overlapWidth * overlapHeight;
    const smallerArea = Math.min(candidate.width * candidate.height, piece.width * piece.height);
    return smallerArea > 0 && overlap / smallerArea > 0.46;
  });
}

export function settlePiece(
  pieces: TangramPieceState[],
  level: TangramLevel,
  pieceId: string,
) {
  const slot = slotFor(level, pieceId);
  if (!slot) return pieces;
  return pieces.map((piece) => {
    if (piece.id !== pieceId) return piece;
    const attempted = { ...piece, placementAttempts: piece.placementAttempts + 1 };
    if (!isNearSlot(attempted, slot)) return { ...attempted, placed: false };
    const accepted = {
      ...attempted,
      placed: true,
    };
    // Assessment mode preserves the child's exact final position. The hidden
    // engine accepts a reasonable motor-control margin without visibly snapping
    // the piece or revealing the authored answer.
    return accepted;
  });
}

export const puzzleCompleted = (pieces: TangramPieceState[], level: TangramLevel) =>
  pieces.length === level.slots.length && pieces.every((piece) => piece.placed);

export const clampPosition = (value: number) => Math.max(4, Math.min(96, value));
