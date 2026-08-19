import { DefenderState, PlayerState, TeammateState } from "./Types";

export class DefenderEngine {
  public states: DefenderState[] = [];

  constructor() {}

  public reset(count: number, guardIds: string[], speedMultiplier = 1.0) {
    this.states = [];
    for (let i = 0; i < count; i++) {
      // Position them near the paint/mid-court initially
      const x = 300 + i * 100;
      const y = 200 + (i % 2) * 50;

      this.states.push({
        id: `defender_${i}`,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 16,
        speed: 2.1 * speedMultiplier,
        targetX: x,
        targetY: y,
        guardingId: guardIds[i] || "player",
        cheatFactorX: 0,
        cheatFactorY: 0,
      });
    }
  }

  public update(
    carrierX: number,
    carrierY: number,
    player: PlayerState,
    teammates: TeammateState[],
    ballIsTraveling: boolean,
    ballX: number,
    ballY: number,
    cheatingTargets: Record<string, number> // Map teammate ID to cheat magnitude
  ) {
    const hoopX = 400;
    const hoopY = 100;

    // Sort teammates by distance to ball carrier
    const sortedTeammates = [...teammates].sort((a, b) => {
      const distASq = (a.x - carrierX) * (a.x - carrierX) + (a.y - carrierY) * (a.y - carrierY);
      const distBSq = (b.x - carrierX) * (b.x - carrierX) + (b.y - carrierY) * (b.y - carrierY);
      return distASq - distBSq;
    });

    for (let idx = 0; idx < this.states.length; idx++) {
      const def = this.states[idx];

      // Dynamically distribute defenders to guard closest teammates
      if (sortedTeammates[idx]) {
        def.guardingId = sortedTeammates[idx].id;
      } else {
        def.guardingId = "player";
      }

      // Apply Cheat Factors based on player strategy adaptation
      if (cheatingTargets[def.guardingId] !== undefined) {
        // Shift defender closer to the teammate they are guarding, and directly in the passing lane
        const mag = cheatingTargets[def.guardingId]; // 0 to 1
        def.cheatFactorX = mag * 0.8;
        def.cheatFactorY = mag * 0.8;
      } else {
        def.cheatFactorX = 0;
        def.cheatFactorY = 0;
      }

      // Calculate Target Position
      if (ballIsTraveling) {
        // React to the ball: sprint towards the ball's trajectory to attempt interception!
        def.targetX = ballX;
        def.targetY = ballY;
      } else if (def.guardingId === "player") {
        // Guarding the playmaker: stand between the playmaker and the hoop
        def.targetX = player.x * 0.75 + hoopX * 0.25;
        def.targetY = player.y * 0.75 + hoopY * 0.25;
      } else {
        // Guarding a teammate: stand between the ball carrier and the teammate
        const tm = teammates.find((t) => t.id === def.guardingId);
        if (tm) {
          // Shading factor: stands 65% of the way towards the teammate, but shifting
          // directly in the passing lane if cheating
          const shade = 0.65 - def.cheatFactorX * 0.25; // shade closer to the carrier to intercept early!
          def.targetX = tm.x * shade + carrierX * (1 - shade);
          def.targetY = tm.y * shade + carrierY * (1 - shade);

          // If cheating, move even tighter to the teammate to shut down space
          if (def.cheatFactorX > 0) {
            const laneDx = tm.x - carrierX;
            const laneDy = tm.y - carrierY;
            const laneLen = Math.sqrt(laneDx * laneDx + laneDy * laneDy);
            if (laneLen > 0) {
              // Offset slightly towards the pass vector
              def.targetX += (laneDx / laneLen) * (def.cheatFactorX * 15);
              def.targetY += (laneDy / laneLen) * (def.cheatFactorY * 15);
            }
          }
        } else {
          // Fallback to paint defense
          def.targetX = hoopX;
          def.targetY = hoopY + 120;
        }
      }

      // Move towards target
      const dx = def.targetX - def.x;
      const dy = def.targetY - def.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        // If ball is traveling, defenders sprint 1.25x faster to make interceptions dynamic!
        const currentSpeed = ballIsTraveling ? def.speed * 1.25 : def.speed;
        def.vx = (dx / dist) * currentSpeed;
        def.vy = (dy / dist) * currentSpeed;
        def.x += def.vx;
        def.y += def.vy;
      } else {
        def.vx = 0;
        def.vy = 0;
      }
    }
  }
}
