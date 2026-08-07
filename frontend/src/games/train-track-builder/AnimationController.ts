export const trainPosition = (row: number, col: number, rows: number, cols: number) => ({
  left: col < 0
    ? "-2%"
    : col >= cols
      ? `${((cols + .675) / (cols + 1.35)) * 100}%`
      : `${((col + .5) / (cols + 1.35)) * 100}%`,
  top: `${((row + .5) / rows) * 100}%`,
} as React.CSSProperties);
