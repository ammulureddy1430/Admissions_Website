import { PlayerState } from "./Types";

export class PlayerEngine {
  public state: PlayerState;

  constructor(x: number, y: number) {
    this.state = {
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 16,
      speed: 4.5,
    };
  }

  public reset(x: number, y: number) {
    this.state.x = x;
    this.state.y = y;
    this.state.vx = 0;
    this.state.vy = 0;
  }

  public update(keysPressed: Record<string, boolean>) {
    const left = keysPressed["arrowleft"] || keysPressed["a"];
    const right = keysPressed["arrowright"] || keysPressed["d"];
    const up = keysPressed["arrowup"] || keysPressed["w"];
    const down = keysPressed["arrowdown"] || keysPressed["s"];

    let dx = 0;
    let dy = 0;

    if (left) dx = -1;
    if (right) dx = 1;
    if (up) dy = -1;
    if (down) dy = 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    this.state.vx = dx * this.state.speed;
    this.state.vy = dy * this.state.speed;

    this.state.x += this.state.vx;
    this.state.y += this.state.vy;

    // Keep player inside court boundaries
    const minX = 50 + this.state.radius;
    const maxX = 750 - this.state.radius;
    const minY = 60 + this.state.radius;
    const maxY = 540 - this.state.radius;

    if (this.state.x < minX) this.state.x = minX;
    if (this.state.x > maxX) this.state.x = maxX;
    if (this.state.y < minY) this.state.y = minY;
    if (this.state.y > maxY) this.state.y = maxY;
  }
}
