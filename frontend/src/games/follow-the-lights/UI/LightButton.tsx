import type { LightColor } from "../Types";

export function LightButton({
  color,
  active,
  disabled,
  ready,
  onPress,
}: {
  color: LightColor;
  active: boolean;
  disabled: boolean;
  ready: boolean;
  onPress: (color: LightColor) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${color} light`}
      onPointerDown={() => onPress(color)}
      className={`follow-light follow-light-${color} ${active ? "is-active" : ""} ${ready ? "is-ready" : ""} disabled:cursor-default`}
    />
  );
}
