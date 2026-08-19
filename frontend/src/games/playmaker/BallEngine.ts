import { BallState, PlayerState, TeammateState, DefenderState } from "./Types";

export class BallEngine {
  public state: BallState;

  constructor(x: number, y: number) {
    this.state = {
      x,
      y,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 8,
      carrierId: "player",
      targetX: null,
      targetY: null,
      isTraveling: false,
      travelTime: 0,
      maxTravelTime: 0,
    };
  }

  public reset(x: number, y: number) {
    this.state.x = x;
    this.state.y = y;
    this.state.z = 0;
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.vz = 0;
    this.state.carrierId = "player";
    this.state.targetX = null;
    this.state.targetY = null;
    this.state.isTraveling = false;
    this.state.travelTime = 0;
    this.state.maxTravelTime = 0;
    delete this.state.passStartX;
    delete this.state.passStartY;
    delete this.state.isShot;
  }

  public startPass(fromX: number, fromY: number, targetX: number, targetY: number, speed = 8.5, isShot = false) {
    this.state.carrierId = null;
    this.state.isTraveling = true;
    this.state.isShot = isShot;
    this.state.x = fromX;
    this.state.y = fromY;
    this.state.passStartX = fromX;
    this.state.passStartY = fromY;
    this.state.targetX = targetX;
    this.state.targetY = targetY;

    const dx = targetX - fromX;
    const dy = targetY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.state.maxTravelTime = Math.max(10, Math.round(dist / speed));
    this.state.travelTime = 0;
    this.state.vx = dx / this.state.maxTravelTime;
    this.state.vy = dy / this.state.maxTravelTime;
  }

  public update(
    player: PlayerState,
    teammates: TeammateState[],
    defenders: DefenderState[],
    onIntercept: (defender: DefenderState) => void,
    onCatch: (teammate: TeammateState) => void,
    onCatchPlayer: () => void,
    onOutOfBounds: () => void,
    onScore?: () => void
  ) {
    // If the ball is carried, lock its position to the carrier
    if (this.state.carrierId === "player") {
      this.state.x = player.x;
      this.state.y = player.y;
      this.state.z = 0;
      return;
    } else if (this.state.carrierId) {
      const tm = teammates.find((t) => t.id === this.state.carrierId);
      if (tm) {
        this.state.x = tm.x;
        this.state.y = tm.y;
        this.state.z = 0;
        return;
      }
    }

    // If traveling, update position
    if (this.state.isTraveling) {
      this.state.travelTime++;
      this.state.x += this.state.vx;
      this.state.y += this.state.vy;

      const ratio = this.state.travelTime / this.state.maxTravelTime;
      const maxHeight = this.state.isShot ? 50 : 35; // Higher arc for shots
      this.state.z = maxHeight * Math.sin(Math.PI * ratio);

      if (this.state.isShot) {
        if (this.state.travelTime >= this.state.maxTravelTime) {
          this.state.isTraveling = false;
          if (onScore) onScore();
        }
        return;
      }

      // 1. Check Out of Bounds
      if (this.state.x < 50 || this.state.x > 750 || this.state.y < 60 || this.state.y > 540) {
        this.state.isTraveling = false;
        onOutOfBounds();
        return;
      }

      // 2. Check Interceptions by Defenders
      // ONLY check defenders if ball is low (z < 18) OR if defender is close to start/end points
      for (const def of defenders) {
        const dx = this.state.x - def.x;
        const dy = this.state.y - def.y;
        const distSq = dx * dx + dy * dy;
        const catchRadius = def.radius + this.state.radius + 6;

        if (distSq < catchRadius * catchRadius) {
          const passStartX = this.state.passStartX ?? this.state.x;
          const passStartY = this.state.passStartY ?? this.state.y;
          const targetX = this.state.targetX ?? this.state.x;
          const targetY = this.state.targetY ?? this.state.y;

          const distToStartSq = (def.x - passStartX) * (def.x - passStartX) + (def.y - passStartY) * (def.y - passStartY);
          const distToEndSq = (def.x - targetX) * (def.x - targetX) + (def.y - targetY) * (def.y - targetY);

          const nearStartOrEnd = distToStartSq < 40 * 40 || distToEndSq < 40 * 40;

          if (this.state.z < 18 || nearStartOrEnd) {
            this.state.isTraveling = false;
            this.state.carrierId = null;
            onIntercept(def);
            return;
          }
        }
      }

      // 3. Check Catch by Teammates or Player
      if (ratio >= 0.9) {
        // Near the destination. Check if target or any teammate catches it.
        for (const tm of teammates) {
          const dx = this.state.x - tm.x;
          const dy = this.state.y - tm.y;
          const distSq = dx * dx + dy * dy;
          const catchRadius = tm.radius + this.state.radius + 12; // slightly larger catching radius

          if (distSq < catchRadius * catchRadius) {
            this.state.isTraveling = false;
            this.state.carrierId = tm.id;
            onCatch(tm);
            return;
          }
        }

        // Playmaker can also catch the ball if passed back
        const pDx = this.state.x - player.x;
        const pDy = this.state.y - player.y;
        const pDistSq = pDx * pDx + pDy * pDy;
        const pCatchRadius = player.radius + this.state.radius + 12;

        if (pDistSq < pCatchRadius * pCatchRadius) {
          this.state.isTraveling = false;
          this.state.carrierId = "player";
          onCatchPlayer();
          return;
        }
      }

      // 4. End of travel (if no catch or intercept)
      if (this.state.travelTime >= this.state.maxTravelTime) {
        this.state.isTraveling = false;
        // Loose ball checks: who is closest to grab it?
        let closestCarrier: string | null = null;
        let minDistSq = Infinity;

        for (const tm of teammates) {
          const dx = this.state.x - tm.x;
          const dy = this.state.y - tm.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistSq) {
            minDistSq = distSq;
            closestCarrier = tm.id;
          }
        }

        const pDx = this.state.x - player.x;
        const pDy = this.state.y - player.y;
        const pDistSq = pDx * pDx + pDy * pDy;
        if (pDistSq < minDistSq) {
          minDistSq = pDistSq;
          closestCarrier = "player";
        }

        // Grab ball if within 50px, otherwise out of bounds
        if (minDistSq < 50 * 50) {
          this.state.carrierId = closestCarrier;
          if (closestCarrier === "player") {
            onCatchPlayer();
          } else {
            const tm = teammates.find((t) => t.id === closestCarrier);
            if (tm) onCatch(tm);
          }
        } else {
          onOutOfBounds();
        }
      }
    }
  }
}
