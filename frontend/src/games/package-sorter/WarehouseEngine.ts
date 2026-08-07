import type { Truck } from "./Types";

export interface TruckPosition {
  id: number;
  x: number; // percentage
  y: number; // percentage
}

export class WarehouseEngine {
  getBeltPath() {
    return {
      startX: 5,   // start of conveyor percentage
      endX: 95,    // end of conveyor percentage
      y: 40,       // vertical alignment percentage
    };
  }

  getTruckPositions(count: number): TruckPosition[] {
    // Arrange delivery trucks at the bottom of the warehouse.
    const positions: TruckPosition[] = [];
    const spacing = 100 / (count + 1);
    for (let i = 0; i < count; i++) {
      positions.push({
        id: i,
        x: spacing * (i + 1),
        y: 78,
      });
    }
    return positions;
  }
}
