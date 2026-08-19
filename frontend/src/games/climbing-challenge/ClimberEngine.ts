import { ClimberState, LimbState, ClimbingHold } from "./Types";

export class ClimberEngine {
  public state: ClimberState;

  constructor(x: number, y: number) {
    this.state = this.createInitialState(x, y);
  }

  private createInitialState(x: number, y: number): ClimberState {
    const limb = (lx: number, ly: number, id: string | null): LimbState => ({
      x: lx,
      y: ly,
      targetX: lx,
      targetY: ly,
      holdId: id,
      isMoving: false,
      moveTimer: 0,
      moveDuration: 22, // 22 frames transition (approx 0.35s)
      startX: lx,
      startY: ly,
    });

    return {
      x,
      y,
      targetX: x,
      targetY: y,
      isTransitioning: false,
      leftHand: limb(x - 60, y - 90, "start_lh"),
      rightHand: limb(x + 60, y - 90, "start_rh"),
      leftFoot: limb(x - 50, y + 90, "start_lf"),
      rightFoot: limb(x + 50, y + 90, "start_rf"),
      balance: 100,
      wobbleX: 0,
      wobbleY: 0,
      wobblePhase: 0,
      state: "idle",
    };
  }

  public reset(x: number, y: number) {
    this.state = this.createInitialState(x, y);
  }

  public tryReach(
    hold: ClimbingHold,
    limbKey: "leftHand" | "rightHand" | "leftFoot" | "rightFoot"
  ): boolean {
    const limb = this.state[limbKey];
    if (limb.isMoving || this.state.isTransitioning) return false;

    // Reach Limit Check: clicked hold distance from Torso center must be <= 150px
    const dx = hold.x - this.state.x;
    const dy = hold.y - this.state.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Arm/leg reach limits
    const limit = limbKey.includes("Hand") ? 240 : 220;
    if (dist > limit) return false;

    // Start reach animation
    limb.isMoving = true;
    limb.moveTimer = 0;
    limb.startX = limb.x;
    limb.startY = limb.y;
    limb.targetX = hold.x;
    limb.targetY = hold.y;
    limb.holdId = hold.id;

    this.state.state = "reaching";
    return true;
  }

  public update(holds: ClimbingHold[]) {
    // 1. Update Limb Reaches
    let anyLimbMoving = false;
    const limbs = ["leftHand", "rightHand", "leftFoot", "rightFoot"] as const;

    for (const key of limbs) {
      const limb = this.state[key];
      if (limb.isMoving) {
        limb.moveTimer++;
        const t = Math.min(1.0, limb.moveTimer / limb.moveDuration);
        
        // Quad ease out interpolation
        const ease = t * (2 - t);
        limb.x = limb.startX + (limb.targetX - limb.startX) * ease;
        limb.y = limb.startY + (limb.targetY - limb.startY) * ease;

        if (t >= 1.0) {
          limb.isMoving = false;
          // Torso center should start transitioning to align with new holds
          this.state.isTransitioning = true;
          this.state.state = "pulling";
        }
        anyLimbMoving = true;
      } else if (limb.holdId) {
        // If holding a hold that moves or disappears, lock to it
        const h = holds.find(hd => hd.id === limb.holdId);
        if (h && h.available) {
          limb.x = h.x;
          limb.y = h.y;
        } else {
          // Hold disappeared! Limb falls loose!
          limb.holdId = null;
        }
      }
    }

    // 1.5 Auto foot step-up / drag tracking
    const feet = ["leftFoot", "rightFoot"] as const;
    for (const key of feet) {
      const foot = this.state[key];
      const dx = foot.x - this.state.x;
      const dy = foot.y - this.state.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 185 && !foot.isMoving) {
        let bestHold: ClimbingHold | null = null;
        let minDist = Infinity;
        
        for (const h of holds) {
          if (!h.available) continue;
          if (h.y > this.state.y + 35) {
            const hdx = h.x - this.state.x;
            const hdy = h.y - this.state.y;
            const hdist = Math.sqrt(hdx * hdx + hdy * hdy);
            
            if (hdist <= 165) {
              const otherKey = key === "leftFoot" ? "rightFoot" : "leftFoot";
              if (this.state[otherKey].holdId !== h.id && hdist < minDist) {
                minDist = hdist;
                bestHold = h;
              }
            }
          }
        }
        
        if (bestHold) {
          foot.isMoving = true;
          foot.moveTimer = 0;
          foot.startX = foot.x;
          foot.startY = foot.y;
          foot.targetX = bestHold.x;
          foot.targetY = bestHold.y;
          foot.holdId = bestHold.id;
        } else {
          const angle = Math.atan2(dy, dx);
          foot.x = this.state.x + Math.cos(angle) * 165;
          foot.y = this.state.y + Math.sin(angle) * 165;
          foot.holdId = null;
        }
      }
    }

    // 2. Torso weight shifting (pulling state)
    if (this.state.isTransitioning) {
      // Find average centroid of all active holds
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      for (const key of limbs) {
        const limb = this.state[key];
        if (limb.holdId) {
          const h = holds.find(hd => hd.id === limb.holdId);
          if (h && h.available) {
            sumX += h.x;
            sumY += h.y;
            count++;
          }
        }
      }

      if (count > 0) {
        // Torso should target the centroid of active holds (with vertical offset for hands vs feet)
        this.state.targetX = sumX / count;
        // Torso center sits below handholds, above footholds: sit in vertical center
        this.state.targetY = sumY / count - 5;
      }

      const dx = this.state.targetX - this.state.x;
      const dy = this.state.targetY - this.state.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        // Shift body weight at speed 3px/frame
        this.state.x += (dx / dist) * 2.5;
        this.state.y += (dy / dist) * 2.5;
      } else {
        this.state.isTransitioning = false;
        this.state.state = "idle";
      }
    }

    // 3. Balance model (Wobble & Extensions check)
    let looseLimbs = 0;
    let maxExtSq = 0;

    for (const key of limbs) {
      const limb = this.state[key];
      if (!limb.holdId) {
        looseLimbs++;
      } else {
        const dx = limb.x - this.state.x;
        const dy = limb.y - this.state.y;
        const extSq = dx * dx + dy * dy;
        if (extSq > maxExtSq) maxExtSq = extSq;
      }
    }

    // Base balance drops if extended (> 120px) or holding by only 1-2 points
    const maxExtension = Math.sqrt(maxExtSq);
    let targetBalance = 100;

    if (maxExtension > 220) {
      targetBalance -= (maxExtension - 220) * 1.5;
    }
    if (looseLimbs >= 2) {
      targetBalance -= 45;
    }

    targetBalance = Math.max(0, targetBalance);

    // Smoothly update balance state
    this.state.balance += (targetBalance - this.state.balance) * 0.1;

    // Apply wobble if balance drops below 75
    if (this.state.balance < 75) {
      this.state.state = this.state.balance < 40 ? "wobbling" : "recovering";
      this.state.wobblePhase += 0.12;
      const intensity = (75 - this.state.balance) * 0.45;
      this.state.wobbleX = intensity * Math.sin(this.state.wobblePhase);
      this.state.wobbleY = intensity * 0.5 * Math.cos(this.state.wobblePhase * 1.4);
    } else {
      this.state.wobbleX = 0;
      this.state.wobbleY = 0;
    }
  }

  // Get joint coordinates for visual mapping/rendering
  public getJoints(): Record<string, { x: number; y: number }> {
    // Add wobble to rendered body segments
    const wx = this.state.wobbleX;
    const wy = this.state.wobbleY;

    const tx = this.state.x + wx;
    const ty = this.state.y + wy;

    const shoulderY = ty - 35;
    const hipY = ty + 35;

    const neck = { x: tx, y: ty - 45 };
    const head = { x: tx, y: ty - 60 };

    const lShoulder = { x: tx - 25, y: shoulderY };
    const rShoulder = { x: tx + 25, y: shoulderY };

    const lHip = { x: tx - 20, y: hipY };
    const rHip = { x: tx + 20, y: hipY };

    // kinematic joints for Elbows and Knees (bend outwards)
    const solveJoint = (jointA: { x: number; y: number }, jointB: { x: number; y: number }, bendLeft: boolean) => {
      const mx = (jointA.x + jointB.x) / 2;
      const my = (jointA.y + jointB.y) / 2;
      
      const dx = jointB.x - jointA.x;
      const dy = jointB.y - jointA.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      
      // Total limb length is 120px
      const maxL = 120; 
      const h = Math.sqrt(Math.max(0, (maxL * maxL) / 4 - (d * d) / 4));
      
      // Normal direction vector
      const nx = -dy / (d || 1);
      const ny = dx / (d || 1);
      const sign = bendLeft ? -1 : 1;

      return {
        x: mx + h * nx * sign,
        y: my + h * ny * sign + 5, // slightly down/inwards
      };
    };

    const lHand = { x: this.state.leftHand.x, y: this.state.leftHand.y };
    const rHand = { x: this.state.rightHand.x, y: this.state.rightHand.y };
    const lFoot = { x: this.state.leftFoot.x, y: this.state.leftFoot.y };
    const rFoot = { x: this.state.rightFoot.x, y: this.state.rightFoot.y };

    const lElbow = solveJoint(lShoulder, lHand, true);
    const rElbow = solveJoint(rShoulder, rHand, false);

    const lKnee = solveJoint(lHip, lFoot, true);
    const rKnee = solveJoint(rHip, rFoot, false);

    return {
      head,
      neck,
      torsoCenter: { x: tx, y: ty },
      lShoulder,
      rShoulder,
      lElbow,
      rElbow,
      lHand,
      rHand,
      lHip,
      rHip,
      lKnee,
      rKnee,
      lFoot,
      rFoot,
    };
  }
}
