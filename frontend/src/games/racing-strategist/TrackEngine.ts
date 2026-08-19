import { TrackData } from "./Levels";
import { TrackSegment } from "./Types";

export class TrackEngine {
  public currentTrack: TrackData;
  public width = 400; // Total canvas width

  constructor(track: TrackData) {
    this.currentTrack = track;
  }

  public setTrack(track: TrackData) {
    this.currentTrack = track;
  }

  // Find the track segment containing y
  public getSegmentAt(y: number): TrackSegment | null {
    const segment = this.currentTrack.segments.find(
      (seg) => y >= seg.yStart && y < seg.yEnd
    );
    return segment || null;
  }

  // Query track center, width and boundaries at (x, y)
  // Returns left boundary, right boundary, central divider bounds (if split)
  public getRoadBoundsAt(x: number, y: number): {
    left: number;
    right: number;
    inDivider: boolean;
    roadCenter: number;
    roadWidth: number;
    type: "normal" | "split" | "shortcut" | "wet" | "finish";
  } {
    const segment = this.getSegmentAt(y);
    if (!segment) {
      // Default fallback
      return { left: 50, right: 350, inDivider: false, roadCenter: 200, roadWidth: 300, type: "normal" };
    }

    if (segment.type === "split" || segment.type === "shortcut") {
      const leftForkX = segment.leftForkCenterX || 110;
      const rightForkX = segment.rightForkCenterX || 290;
      const forkW = segment.forkWidth || 80;

      // Transition length is 200 track units (matching the visual drawing)
      const transitionHeight = Math.min(200, (segment.yEnd - segment.yStart) * 0.35);
      const isInsideTransition = y < segment.yStart + transitionHeight;

      let currentLeftCenter = leftForkX;
      let currentLeftWidth = forkW;
      let currentRightCenter = rightForkX;
      let currentRightWidth = forkW;

      if (isInsideTransition) {
        const t = (y - segment.yStart) / transitionHeight;
        
        // Left road parameters interpolate from left half of normal road (center 155, width 90) to leftForkX, forkW
        currentLeftCenter = 155 + (leftForkX - 155) * t;
        currentLeftWidth = 90 + (forkW - 90) * t;

        // Right road parameters interpolate from right half of normal road (center 245, width 90) to rightForkX, forkW
        currentRightCenter = 245 + (rightForkX - 245) * t;
        currentRightWidth = 90 + (forkW - 90) * t;
      }

      const splitMid = (currentLeftCenter + currentRightCenter) / 2;
      const isLeft = x < splitMid;

      const roadCenter = isLeft ? currentLeftCenter : currentRightCenter;
      const roadWidth = isLeft ? currentLeftWidth : currentRightWidth;

      const left = roadCenter - roadWidth / 2;
      const right = roadCenter + roadWidth / 2;

      // Divider zone is the grass section in the middle of two forks
      const dividerLeft = currentLeftCenter + currentLeftWidth / 2;
      const dividerRight = currentRightCenter - currentRightWidth / 2;
      const inDivider = x > dividerLeft && x < dividerRight;

      return {
        left,
        right,
        inDivider,
        roadCenter,
        roadWidth,
        type: segment.type,
      };
    } else {
      const left = segment.centerX - segment.width / 2;
      const right = segment.centerX + segment.width / 2;
      return {
        left,
        right,
        inDivider: false,
        roadCenter: segment.centerX,
        roadWidth: segment.width,
        type: segment.type,
      };
    }
  }

  // Check if track is wet at y
  public isWetAt(y: number): boolean {
    const seg = this.getSegmentAt(y);
    return seg ? seg.type === "wet" : false;
  }

  // Helper to determine if a route was chosen
  // 1 = left, 2 = right, 0 = none/undecided
  public getChosenRoute(x: number, y: number): number {
    const segment = this.getSegmentAt(y);
    if (!segment || (segment.type !== "split" && segment.type !== "shortcut")) {
      return 0;
    }
    const leftForkX = segment.leftForkCenterX || 110;
    const rightForkX = segment.rightForkCenterX || 290;
    const splitMid = (leftForkX + rightForkX) / 2;
    return x < splitMid ? 1 : 2;
  }
}
