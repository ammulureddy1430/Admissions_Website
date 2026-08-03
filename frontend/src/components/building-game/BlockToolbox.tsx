import { BuildingBlock } from "./BuildingBlock";
import { optionIdentity, type BuildingOption } from "./GameRenderer";

export function BlockToolbox({
  options,
  selectedId,
  disabled,
  placing,
  draggingId,
  onDragStart,
  onDragEnd,
  dropBounds,
  onSelect,
  onPlace,
}: {
  options: BuildingOption[];
  selectedId: string;
  disabled: boolean;
  placing: boolean;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  dropBounds: DOMRect | null;
  onSelect: (option: BuildingOption) => void;
  onPlace: (option: BuildingOption) => void;
}) {
  return (
    <div className="real-block-toolbox" aria-label="Construction block toolbox">
      <div className="toolbox-track" aria-hidden><i /><i /><i /><i /><i /><i /></div>
      {options.map((option, index) => (
        <BuildingBlock
          key={optionIdentity(option)}
          option={option}
          index={index}
          selected={selectedId === optionIdentity(option)}
          disabled={disabled}
          placing={placing}
          isDragging={draggingId === optionIdentity(option)}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          dropBounds={dropBounds}
          onSelect={onSelect}
          onPlace={onPlace}
        />
      ))}
    </div>
  );
}
