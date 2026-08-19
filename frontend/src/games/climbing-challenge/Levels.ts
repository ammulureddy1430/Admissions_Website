import { LevelData, ClimbingHold } from "./Types";

function generateHoldsForLevel(id: number, height: number, difficulty: number, type: string): ClimbingHold[] {
  const holds: ClimbingHold[] = [];
  
  // Starting holds for hands and feet
  holds.push({ id: `start_lf`, x: 330, y: height - 100, size: 24, type: "large", available: true });
  holds.push({ id: `start_rf`, x: 470, y: height - 100, size: 24, type: "large", available: true });
  holds.push({ id: `start_lh`, x: 340, y: height - 210, size: 20, type: "medium", available: true });
  holds.push({ id: `start_rh`, x: 460, y: height - 210, size: 20, type: "medium", available: true });

  const numRows = Math.floor((height - 350) / 115);
  for (let r = 0; r < numRows; r++) {
    const rowY = height - 310 - r * 115;
    
    if (type === "beginner") {
      // Solid central columns with close spacing
      const offset = (r % 2 === 0) ? -45 : 45;
      holds.push({ id: `hold_${r}_0`, x: 400 + offset, y: rowY, size: 22, type: "large", available: true });
    }
    else {
      // Route choice: slightly tougher, left vs right options
      holds.push({ id: `hold_${r}_L`, x: 250 + Math.sin(r * 1.5) * 35, y: rowY, size: 22, type: "large", available: true });
      holds.push({ id: `hold_${r}_R`, x: 550 + Math.cos(r * 1.5) * 35, y: rowY, size: 18, type: "medium", available: true });
    }
  }

  // Top finishing hold
  holds.push({ id: `finish`, x: 400, y: 130, size: 28, type: "large", available: true });

  return holds;
}

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: "Round 1: Beginner Wall",
    height: 900,
    targetY: 150,
    holds: generateHoldsForLevel(1, 900, 1, "beginner"),
    difficulty: 1,
    description: "Learn reach, hold grabbing, and motor sequencing.",
  },
];
