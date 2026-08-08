export type RoomTheme = "bedroom" | "playroom" | "study" | "garden";
export type RoomPhase =
  "tutorial" | "observe" | "clearing" | "rebuild" | "transition" | "complete";
export type FurnitureKind =
  | "bed"
  | "table"
  | "chair"
  | "lamp"
  | "toybox"
  | "bookshelf"
  | "teddy"
  | "plant";
export type Point = { x: number; y: number };
export type Furniture = {
  id: string;
  kind: FurnitureKind;
  token: string;
  color: string;
  target: Point;
  size: "large" | "medium" | "small";
  rotation: number;
};
export type RoomRound = {
  level: number;
  theme: RoomTheme;
  objects: Furniture[];
  observationMs: number;
};
export type RoomRawMetrics = {
  student_id?: string;
  assessment_id?: string;
  game_id?: string;
  age_group: "4–5 Years";
  total_rooms: number;
  completed_rooms: number;
  objects_presented: number;
  objects_correctly_placed: number;
  incorrect_placements: number;
  placement_times: number[];
  completion_times: number[];
  object_movement_counts: number[];
  highest_room_level: number;
  started_at: string;
  completed_at: string;
};
export type RoomDesignerScores = Omit<
  RoomRawMetrics,
  "placement_times" | "completion_times" | "object_movement_counts"
> & {
  average_placement_time: number;
  average_completion_time: number;
  average_object_movement_count: number;
  object_placement_accuracy: number;
  visual_memory_score: number;
  planning_score: number;
  completion_percentage: number;
  overall_score: number;
  completionStatus: "COMPLETED" | "PARTIAL";
};
