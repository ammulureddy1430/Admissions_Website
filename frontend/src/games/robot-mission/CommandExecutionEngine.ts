import type { Command, Direction, Mission, Point } from "./Types";
const same = (a: Point, b?: Point) => Boolean(b && a.x === b.x && a.y === b.y);
export function executeCommand(position: Point, direction: Direction, command: Command, mission: Mission, collected: boolean, activated: boolean) {
  if (command === "LEFT") return { position, direction: ((direction + 3) % 4) as Direction, collected, activated };
  if (command === "RIGHT") return { position, direction: ((direction + 1) % 4) as Direction, collected, activated };
  if (command === "COLLECT") return { position, direction, collected: collected || same(position, mission.object), activated };
  if (command === "ACTIVATE") return { position, direction, collected, activated: activated || same(position, mission.station) };
  const delta = [[0, -1], [1, 0], [0, 1], [-1, 0]][direction];
  const next = { x: position.x + delta[0], y: position.y + delta[1] };
  const blocked = next.x < 0 || next.x > 6 || next.y < 0 || next.y > 3 || mission.obstacles.some((item) => same(item, next));
  return { position: blocked ? position : next, direction, collected, activated };
}
export const missionAchieved = (mission: Mission, position: Point, collected: boolean, activated: boolean) => same(position, mission.target) && (!mission.object || collected) && (!mission.station || activated);
