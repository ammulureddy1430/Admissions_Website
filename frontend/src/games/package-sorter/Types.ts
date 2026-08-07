export interface Package {
  id: string;
  color: string;
  icon: string;
  name: string;
  progress: number; // 0 to 100 (conveyor path)
  spawnTime: number; // timestamp
  decisionTime: number | null; // time taken to sort in ms
}

export interface Truck {
  id: number;
  color: string;
  icon: string;
  name: string;
  hex: string;
  bgColor: string;
}

export interface PackageSorterScores {
  roundsPlayed: number;
  packagesSorted: number;
  correctDeliveries: number;
  incorrectDeliveries: number;
  averageDecisionTime: number;
  highestDifficulty: number;
  completionPercentage: number;
  overallScore: number;
  completionStatus: "COMPLETED" | "PARTIAL";
  elapsedSeconds: number;
  organizationScore: number;
  decisionMakingScore: number;
}

export interface GameMetrics {
  roundsPlayed: number;
  packagesSorted: number;
  correctDeliveries: number;
  incorrectDeliveries: number;
  decisionTimes: number[]; // stored for averaging
  highestDifficulty: number;
}
