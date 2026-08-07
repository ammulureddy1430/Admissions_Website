import type { Direction, TrackPiece } from "./Types";
const directions: Direction[] = ["N", "E", "S", "W"];
export class TrackRotationEngine {
  rotate(piece: TrackPiece): TrackPiece { return { ...piece, rotation: (piece.rotation + 1) % 4 }; }
  connections(piece: TrackPiece) { return piece.baseConnections.map(direction => directions[(directions.indexOf(direction) + piece.rotation) % 4]); }
  isAligned(piece: TrackPiece) {
    const actual = this.connections(piece);
    const expected = this.connections({ ...piece, rotation: piece.correctRotation });
    return actual.every(direction => expected.includes(direction));
  }
}
