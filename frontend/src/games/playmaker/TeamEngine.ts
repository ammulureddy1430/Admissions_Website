import { TeammateState } from "./Types";

export class TeamEngine {
  public states: TeammateState[] = [];

  public speedMultiplier = 1.0;

  constructor() {}

  public reset(routes: string[], speedMultiplier = 1.0) {
    this.speedMultiplier = speedMultiplier;
    this.states = routes.map((route, i) => {
      // Set initial positions based on route
      let x = 200;
      let y = 300;

      if (route.includes("left")) {
        x = 180;
        y = 350;
      } else if (route.includes("right")) {
        x = 620;
        y = 350;
      } else if (route === "cross_court_fast") {
        x = 100;
        y = 250;
      } else if (route === "backdoor_cut") {
        x = 220;
        y = 220;
      } else if (route === "fade_corner") {
        x = 400;
        y = 280;
      } else if (route === "baseline_cut") {
        x = 100;
        y = 80;
      }

      return {
        id: `teammate_${i}`,
        name: `Teammate ${String.fromCharCode(65 + i)}`,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 16,
        speed: (i === 0 ? 3.0 : 2.5) * speedMultiplier,
        routeType: route,
        routeIndex: 0,
        targetX: x,
        targetY: y,
        isHoldingBall: false,
        stateTimer: 0,
      };
    });
  }

  public update(
    ballCarrierId: string | null,
    playerX: number,
    playerY: number,
    onTeammatePass: (fromTm: TeammateState, toX: number, toY: number) => void
  ) {
    for (const tm of this.states) {
      tm.isHoldingBall = ballCarrierId === tm.id;

      if (tm.isHoldingBall) {
        tm.vx = 0;
        tm.vy = 0;
        continue;
      }

      // Normal movement along cutting routes
      tm.stateTimer = 0;
      this.updateRoute(tm);

      // Move teammate towards current target
      const dx = tm.targetX - tm.x;
      const dy = tm.targetY - tm.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        tm.vx = (dx / dist) * tm.speed;
        tm.vy = (dy / dist) * tm.speed;
        tm.x += tm.vx;
        tm.y += tm.vy;
      } else {
        tm.vx = 0;
        tm.vy = 0;
        // Proceed to next point on route
        tm.routeIndex++;
      }
    }
  }

  private updateRoute(tm: TeammateState) {
    const route = tm.routeType;
    const idx = tm.routeIndex;

    switch (route) {
      case "wing_cut_left": {
        // Cut towards hoop (400, 100), fade back to wing (150, 400)
        const targets = [
          { x: 150, y: 400 },
          { x: 280, y: 220 },
          { x: 380, y: 120 }, // Cut to basket
          { x: 150, y: 180 }, // Fade to corner
          { x: 150, y: 400 }, // Reset to wing
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        break;
      }

      case "wing_cut_right": {
        // Cut towards hoop (400, 100), fade back to wing (650, 400)
        const targets = [
          { x: 650, y: 400 },
          { x: 520, y: 220 },
          { x: 420, y: 120 }, // Cut to basket
          { x: 650, y: 180 }, // Fade to corner
          { x: 650, y: 400 }, // Reset to wing
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        break;
      }

      case "cross_court_fast": {
        // Run side to side
        const targets = [
          { x: 100, y: 250 },
          { x: 700, y: 250 },
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        tm.speed = 3.8 * this.speedMultiplier; // Faster cutting speed
        break;
      }

      case "post_up_right": {
        // Cut inside the paint, stand and post up, move out
        const targets = [
          { x: 620, y: 350 },
          { x: 480, y: 200 }, // Cut into post
          { x: 480, y: 200 }, // Stand in post (triggered by incrementing routeIndex)
          { x: 680, y: 140 }, // Fade out to corner
          { x: 650, y: 380 },
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        break;
      }

      case "v_cut_left": {
        // Hard v-cut: fake inside, sprint out
        const targets = [
          { x: 220, y: 380 },
          { x: 380, y: 180 }, // Fake cut inside paint
          { x: 120, y: 160 }, // Sprint out to corner (wide open window!)
          { x: 180, y: 350 },
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        break;
      }

      case "curl_cut_right": {
        // Curl around screen
        const targets = [
          { x: 600, y: 380 },
          { x: 450, y: 280 },
          { x: 380, y: 150 }, // Cut near rim
          { x: 500, y: 110 },
          { x: 620, y: 350 },
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        break;
      }

      case "loop_left": {
        const targets = [
          { x: 180, y: 400 },
          { x: 120, y: 280 },
          { x: 250, y: 180 },
          { x: 320, y: 320 },
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        break;
      }

      case "loop_right": {
        const targets = [
          { x: 620, y: 400 },
          { x: 680, y: 280 },
          { x: 550, y: 180 },
          { x: 480, y: 320 },
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        break;
      }

      case "backdoor_cut": {
        // Stand still, then cut hard backdoor
        const targets = [
          { x: 250, y: 250 }, // Stand
          { x: 250, y: 250 }, // Stand
          { x: 380, y: 90 },  // Explode to rim
          { x: 120, y: 120 }, // Exit to corner
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        tm.speed = (idx % targets.length === 2 ? 4.2 : 2.5) * this.speedMultiplier; // Explode!
        break;
      }

      case "fade_corner": {
        const targets = [
          { x: 400, y: 280 },
          { x: 500, y: 200 },
          { x: 720, y: 110 }, // Fade to corner
          { x: 580, y: 380 },
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        break;
      }

      case "baseline_cut": {
        const targets = [
          { x: 100, y: 80 },
          { x: 700, y: 80 },
          { x: 700, y: 150 },
          { x: 100, y: 150 },
        ];
        const pt = targets[idx % targets.length];
        tm.targetX = pt.x;
        tm.targetY = pt.y;
        break;
      }

      default: {
        tm.targetX = 400;
        tm.targetY = 300;
        break;
      }
    }
  }
}
