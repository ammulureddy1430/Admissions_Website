import type { Level } from "./Types";
export const LEVELS: Level[] = [
  {
    stage: 1,
    puckSpeed: 230,
    opponentSpeed: 210,
    reactionDelay: 360,
    variation: 0.08,
  },
  {
    stage: 2,
    puckSpeed: 245,
    opponentSpeed: 220,
    reactionDelay: 330,
    variation: 0.1,
  },
  {
    stage: 3,
    puckSpeed: 260,
    opponentSpeed: 230,
    reactionDelay: 300,
    variation: 0.12,
  },
  {
    stage: 4,
    puckSpeed: 275,
    opponentSpeed: 240,
    reactionDelay: 280,
    variation: 0.15,
  },
  {
    stage: 5,
    puckSpeed: 290,
    opponentSpeed: 250,
    reactionDelay: 260,
    variation: 0.17,
  },
  {
    stage: 6,
    puckSpeed: 305,
    opponentSpeed: 260,
    reactionDelay: 240,
    variation: 0.19,
  },
  {
    stage: 7,
    puckSpeed: 320,
    opponentSpeed: 270,
    reactionDelay: 220,
    variation: 0.21,
  },
];
export const levelAt = (ms: number) =>
  LEVELS[Math.min(6, Math.floor(ms / 17000))];
