export type Point = { x: number; y: number };
export type Bounds = { left: number; right: number; top: number; bottom: number };

export const BLOCK_SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 28,
  mass: 0.72,
};

export function isInsideDropZone(point: Point, bounds: Bounds | null) {
  if (!bounds) return false;
  const padding = 26;
  return point.x >= bounds.left - padding
    && point.x <= bounds.right + padding
    && point.y >= bounds.top - padding
    && point.y <= bounds.bottom + padding;
}

export function dragRotation(offsetX: number) {
  return Math.max(-10, Math.min(10, offsetX / 22));
}

export function blockColor(index: number) {
  return ["red", "blue", "yellow", "green"][index % 4];
}
