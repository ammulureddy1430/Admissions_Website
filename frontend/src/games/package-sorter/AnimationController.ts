export interface Particle {
  id: string;
  x: number; // percentage
  y: number; // percentage
  color: string;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export interface FlyingPackage {
  id: string;
  icon: string;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetTruckId: number;
  progress: number; // 0 to 1
}

export class AnimationController {
  createSortingBurst(x: number, y: number, colorHex: string): Particle[] {
    const list: Particle[] = [];
    // Colors for the particles (success color + accent sparks)
    const palettes = [colorHex, "#ffffff", "#ffd700", "#00ffff", "#ff007f"];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      list.push({
        id: Math.random().toString(36).substring(2, 9),
        x,
        y,
        color: palettes[Math.floor(Math.random() * palettes.length)],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8, // slight upward force
        size: 4 + Math.random() * 6,
        alpha: 1,
      });
    }
    return list;
  }

  updateParticles(particles: Particle[]): Particle[] {
    return particles
      .map((p) => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.05, // gravity effect
        alpha: p.alpha - 0.025,
      }))
      .filter((p) => p.alpha > 0);
  }
}
