import { Opponent } from "./Types";
import { TrackEngine } from "./TrackEngine";

export class OpponentEngine {
  public opponents: Opponent[] = [];

  constructor(opponents: Opponent[]) {
    this.opponents = opponents.map((opp) => ({ ...opp }));
  }

  public update(trackEngine: TrackEngine) {
    for (const opp of this.opponents) {
      // AI drives forward along Y
      opp.y += opp.speed;

      // Query road boundaries at current Y
      const bounds = trackEngine.getRoadBoundsAt(opp.x, opp.y);
      let targetX = bounds.roadCenter;

      if (bounds.type === "split" || bounds.type === "shortcut") {
        const seg = trackEngine.getSegmentAt(opp.y);
        const leftForkX = seg?.leftForkCenterX || 110;
        const rightForkX = seg?.rightForkCenterX || 290;

        // Commit to a fork based on starting lane
        if (opp.lane === 1) {
          targetX = leftForkX;
        } else if (opp.lane === 3) {
          targetX = rightForkX;
        } else {
          // Fallback based on ID parity
          targetX = opp.id.indexOf("1") !== -1 ? leftForkX : rightForkX;
        }
      } else {
        // Normal 3-lane road
        const laneSpan = bounds.roadWidth / 3;
        if (opp.lane === 1) {
          targetX = bounds.roadCenter - laneSpan;
        } else if (opp.lane === 3) {
          targetX = bounds.roadCenter + laneSpan;
        } else {
          targetX = bounds.roadCenter;
        }
      }

      // Smoothly steer opponent laterally
      opp.x += (targetX - opp.x) * 0.08;
    }
  }

  public reset(opponents: Opponent[]) {
    this.opponents = opponents.map((opp) => ({ ...opp }));
  }
}
