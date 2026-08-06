export function burstParticles(x: number, y: number, color: string) {
  return Array.from({ length: 10 }, (_, index) => ({ id: `${Date.now()}-${index}`, x, y, color, angle: index * 36 + Math.random() * 16, distance: 28 + Math.random() * 34 }));
}
