import type { Direction, TrackKind, TrackPiece, TrackPuzzle } from "./Types";
const opposite: Record<Direction, Direction> = { N: "S", E: "W", S: "N", W: "E" };
const direction = (from: {row:number;col:number}, to: {row:number;col:number}): Direction => to.row < from.row ? "N" : to.row > from.row ? "S" : to.col > from.col ? "E" : "W";
const compass: Direction[] = ["N", "E", "S", "W"];
const rotationFor = (base: Direction[], wanted: Direction[]) => [0,1,2,3].find(rotation => {
  const rotated = base.map(value => compass[(compass.indexOf(value) + rotation) % compass.length]);
  return wanted.every(direction => rotated.includes(direction));
}) ?? 0;
export class TrackGenerator {
  create(round: number): TrackPuzzle {
    const difficulty = Math.min(4, round); const cols = 5 + difficulty; const rows = 3;
    const route = this.route(cols, difficulty); const pieces = route.map((cell, index) => this.piece(cell, route, index, difficulty, round));
    if (pieces.every(piece => piece.rotation === piece.correctRotation)) {
      const piece = pieces[Math.floor(Math.random() * pieces.length)];
      piece.rotation = (piece.correctRotation + 1) % 4;
    }
    return { id: round, difficulty, rows, cols, pieces, route, train: { row: route[0].row, col: -1 }, station: { row: route.at(-1)!.row, col: cols } };
  }
  private route(cols: number, round: number) {
    const designs: Record<number, Array<{ row: number; col: number }>> = {
      // Round 1: climb once near the middle.
      1: [{ row: 2, col: 0 }, { row: 2, col: 2 }, { row: 0, col: 2 }, { row: 0, col: cols - 1 }],
      // Round 2: descend early, then take the lower line.
      2: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 2, col: 2 }, { row: 2, col: cols - 1 }],
      // Round 3: a deep zigzag across the play area.
      3: [{ row: 0, col: 0 }, { row: 0, col: 3 }, { row: 2, col: 3 }, { row: 2, col: cols - 3 }, { row: 0, col: cols - 3 }, { row: 0, col: cols - 1 }],
      // Round 4: the longest switchback with three climbs/descents.
      4: [{ row: 2, col: 0 }, { row: 2, col: 2 }, { row: 0, col: 2 }, { row: 0, col: 5 }, { row: 2, col: 5 }, { row: 2, col: cols - 1 }],
    };
    const waypoints = designs[round] ?? designs[4];
    const cells = [waypoints[0]];
    for (const target of waypoints.slice(1)) {
      const current = cells.at(-1)!;
      const rowStep = Math.sign(target.row - current.row);
      const colStep = Math.sign(target.col - current.col);
      for (let row = current.row + rowStep; rowStep && row !== target.row + rowStep; row += rowStep) cells.push({ row, col: current.col });
      const verticalEnd = cells.at(-1)!;
      for (let col = verticalEnd.col + colStep; colStep && col !== target.col + colStep; col += colStep) cells.push({ row: target.row, col });
    }
    return cells;
  }
  private piece(cell:{row:number;col:number}, route:Array<{row:number;col:number}>, index:number, difficulty:number, seed:number): TrackPiece {
    const incoming:Direction = index === 0 ? "W" : opposite[direction(route[index-1],cell)]; const outgoing:Direction = index === route.length-1 ? "E" : direction(cell,route[index+1]);
    const curved = incoming !== opposite[outgoing]; let kind:TrackKind = curved ? "curve" : "straight";
    if(difficulty>=4 && !curved && index===Math.floor(route.length*.7)) kind="switch";
    // The CSS curve at rotation 0 visually exits on the east and south edges.
    // Keep the logical endpoints identical to what the player sees.
    const base:Direction[] = curved ? ["E","S"] : ["W","E"]; const wanted:Direction[] = [incoming,outgoing]; const correctRotation=rotationFor(base,wanted);
    let rotation=Math.floor(Math.random()*4); if((seed+index)%3===0) rotation=correctRotation;
    return {id:`track-${seed}-${index}`,row:cell.row,col:cell.col,kind,baseConnections:base,correctRotation,rotation};
  }
}
