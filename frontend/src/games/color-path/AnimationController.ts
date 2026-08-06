export const jumpTransform = (from: { x: number; y: number }, to: { x: number; y: number }) => ({ "--jump-x": `${to.x - from.x}vw`, "--jump-y": `${to.y - from.y}vh` } as React.CSSProperties);
