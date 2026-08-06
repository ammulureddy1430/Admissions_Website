import type { LightColor } from "../Types";

const COLORS: LightColor[] = ["red", "green", "blue", "yellow"];

export function randomSequence(length: number): LightColor[] {
  const safeLength = Math.min(length, COLORS.length);
  const values = new Uint32Array(safeLength);
  if (typeof window !== "undefined" && window.crypto)
    window.crypto.getRandomValues(values);
  else
    for (let index = 0; index < length; index += 1)
      values[index] = Math.floor(Math.random() * 0xffffffff);

  const sequence: LightColor[] = [];
  const available = [...COLORS];
  values.forEach((value) => {
    const selectedIndex = value % available.length;
    sequence.push(available[selectedIndex]);
    available.splice(selectedIndex, 1);
  });
  return sequence;
}
