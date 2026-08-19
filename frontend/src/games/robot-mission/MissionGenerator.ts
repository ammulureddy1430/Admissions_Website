import type { Mission } from "./Types";

const missions: Mission[] = [
  { id: 1, level: 1, start: { x: 1, y: 2 }, direction: 1, target: { x: 4, y: 2 }, obstacles: [], maxCommands: 3 },
  { id: 2, level: 2, start: { x: 1, y: 3 }, direction: 0, target: { x: 3, y: 1 }, object: { x: 1, y: 1 }, obstacles: [], maxCommands: 6 },
  { id: 3, level: 3, start: { x: 1, y: 3 }, direction: 1, target: { x: 5, y: 1 }, obstacles: [{ x: 3, y: 3 }, { x: 3, y: 2 }], maxCommands: 8 },
  { id: 4, level: 4, start: { x: 1, y: 1 }, direction: 2, target: { x: 5, y: 3 }, object: { x: 1, y: 3 }, obstacles: [{ x: 3, y: 2 }], maxCommands: 9 },
  { id: 5, level: 5, start: { x: 1, y: 3 }, direction: 0, target: { x: 5, y: 1 }, station: { x: 3, y: 1 }, obstacles: [{ x: 2, y: 2 }, { x: 4, y: 2 }], maxCommands: 10 },
  { id: 6, level: 6, start: { x: 0, y: 3 }, direction: 0, target: { x: 6, y: 0 }, object: { x: 2, y: 1 }, obstacles: [{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 1 }], maxCommands: 12 },
  { id: 7, level: 7, start: { x: 0, y: 3 }, direction: 1, target: { x: 6, y: 0 }, station: { x: 5, y: 2 }, obstacles: [{ x: 2, y: 3 }, { x: 2, y: 2 }, { x: 4, y: 1 }], maxCommands: 14 },
];
export const MissionGenerator = { get: (index: number) => missions[index % missions.length], count: missions.length };
