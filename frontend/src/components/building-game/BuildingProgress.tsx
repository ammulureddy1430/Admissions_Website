import { Box } from "lucide-react";

export function BuildingProgress({ current, total, placing }: { current: number; total: number; placing: boolean }) {
  const percent = Math.max(4, Math.round((current / Math.max(total, 1)) * 100));
  return (
    <div className="building-game-progress" aria-label={`Building floor ${current + 1} of ${total}`}>
      <span><Box /> Floor {current + 1} of {total}</span>
      <div><i style={{ width: `${percent}%` }} /></div>
      <strong>{placing ? "Crane placing block…" : "Build the next floor"}</strong>
    </div>
  );
}
