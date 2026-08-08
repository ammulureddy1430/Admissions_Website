import type { RoomDesignerScores, RoomRawMetrics } from "./Types";
const pct = (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));
const avg = (a: number[]) =>
  a.length ? Math.round(a.reduce((s, n) => s + n, 0) / a.length) : 0;
export function scoreRoomDesigner(raw: RoomRawMetrics): RoomDesignerScores {
  const object_placement_accuracy = pct(
    raw.objects_presented
      ? (raw.objects_correctly_placed / raw.objects_presented) * 100
      : 0,
  );
  const completion_percentage = pct(
    raw.total_rooms ? (raw.completed_rooms / raw.total_rooms) * 100 : 0,
  );
  const difficulty = pct((raw.highest_room_level / 3) * 100);
  const average_object_movement_count =
    Math.round((avg(raw.object_movement_counts) / 10) * 10) / 10;
  const efficiency = pct(
    100 - Math.max(0, average_object_movement_count - 1) * 18,
  );
  const visual_memory_score = pct(
    object_placement_accuracy * 0.78 + difficulty * 0.22,
  );
  const planning_score = pct(
    efficiency * 0.48 +
      completion_percentage * 0.32 +
      object_placement_accuracy * 0.2,
  );
  const {
    placement_times,
    completion_times,
    object_movement_counts,
    ...stored
  } = raw;
  void object_movement_counts;
  return {
    ...stored,
    average_placement_time: avg(placement_times),
    average_completion_time: avg(completion_times),
    average_object_movement_count,
    object_placement_accuracy,
    visual_memory_score,
    planning_score,
    completion_percentage,
    overall_score: pct((visual_memory_score + planning_score) / 2),
    completionStatus: raw.completed_at ? "COMPLETED" : "PARTIAL",
  };
}
