import { TrackSegment, Obstacle, Opponent } from "./Types";

export interface TrackData {
  id: number;
  name: string;
  length: number;
  roadWidth: number;
  segments: TrackSegment[];
  obstacles: Obstacle[];
  opponents: Opponent[];
}

export const TRACKS: TrackData[] = [
  {
    id: 1,
    name: "Track 1: Overtake Challenge",
    length: 2000,
    roadWidth: 180,
    segments: [
      { yStart: 0, yEnd: 1800, centerX: 200, width: 180, type: "normal", laneCount: 3 },
      { yStart: 1800, yEnd: 2000, centerX: 200, width: 180, type: "finish", laneCount: 3 }
    ],
    // Obstacles placed as oncoming hazards in the lanes where the player tries to overtake
    obstacles: [
      {
        id: "t1_obs_1",
        x: 140, // Left lane (lane 1)
        y: 950, // Placed right in front when overtaking AI 1 (at y=800)
        width: 25,
        height: 25,
        type: "debris",
        vx: 0,
        avoided: false,
        collided: false
      },
      {
        id: "t1_obs_2",
        x: 260, // Right lane (lane 3)
        y: 1100,
        width: 25,
        height: 25,
        type: "debris",
        vx: 0,
        avoided: false,
        collided: false
      },
      {
        id: "t1_obs_3",
        x: 200, // Middle lane (lane 2)
        y: 1450, // Hazard placed right after AI 2 (at y=1300)
        width: 25,
        height: 25,
        type: "debris",
        vx: 0,
        avoided: false,
        collided: false
      }
    ],
    // Slow AI vehicles that must be overtaken
    opponents: [
      {
        id: "t1_ai_1",
        x: 200, // Middle lane (lane 2)
        y: 700,
        speed: 1.3,
        lane: 2,
        targetLane: 2,
        laneOffset: 0,
        width: 24,
        height: 40,
        color: "#3b82f6",
        isOvertaken: false,
        isCollided: false,
        waitTracked: false
      },
      {
        id: "t1_ai_2",
        x: 140, // Left lane (lane 1)
        y: 1300,
        speed: 1.4,
        lane: 1,
        targetLane: 1,
        laneOffset: 0,
        width: 24,
        height: 40,
        color: "#10b981",
        isOvertaken: false,
        isCollided: false,
        waitTracked: false
      }
    ]
  },
  {
    id: 2,
    name: "Track 2: Strategic Splits",
    length: 2500,
    roadWidth: 180,
    segments: [
      { yStart: 0, yEnd: 600, centerX: 200, width: 180, type: "normal", laneCount: 3 },
      {
        yStart: 600,
        yEnd: 1800,
        centerX: 200,
        width: 180,
        type: "split",
        leftForkCenterX: 110,
        rightForkCenterX: 290,
        forkWidth: 80,
        laneCount: 2
      },
      { yStart: 1800, yEnd: 2300, centerX: 200, width: 180, type: "normal", laneCount: 3 },
      { yStart: 2300, yEnd: 2500, centerX: 200, width: 180, type: "finish", laneCount: 3 }
    ],
    // Obstacles scattered across route choices
    obstacles: [
      {
        id: "t2_obs_1",
        x: 100, // On left fork (risky path)
        y: 1000,
        width: 25,
        height: 25,
        type: "debris",
        vx: 0,
        avoided: false,
        collided: false
      },
      {
        id: "t2_obs_2",
        x: 120, // On left fork (risky path)
        y: 1400,
        width: 25,
        height: 25,
        type: "debris",
        vx: 0,
        avoided: false,
        collided: false
      },
      {
        id: "t2_obs_3",
        x: 280, // On right fork (safe path, but blocked right after AI opponent)
        y: 1500,
        width: 25,
        height: 25,
        type: "debris",
        vx: 0,
        avoided: false,
        collided: false
      }
    ],
    opponents: [
      {
        id: "t2_ai_1",
        x: 200, // Middle lane before split
        y: 400,
        speed: 1.5,
        lane: 2,
        targetLane: 2,
        laneOffset: 0,
        width: 24,
        height: 40,
        color: "#a855f7",
        isOvertaken: false,
        isCollided: false,
        waitTracked: false
      },
      {
        id: "t2_ai_2",
        x: 290, // Right fork
        y: 1250,
        speed: 1.4,
        lane: 3,
        targetLane: 3,
        laneOffset: 0,
        width: 24,
        height: 40,
        color: "#f59e0b",
        isOvertaken: false,
        isCollided: false,
        waitTracked: false
      }
    ]
  }
];
