import type { LightColor } from "./Types";

const wait = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

export async function playLightSequence(
  sequence: LightColor[],
  glowMs: number,
  gapMs: number,
  activate: (color: LightColor | null) => void,
  playSound: (color: LightColor) => void,
  cancelled: () => boolean,
) {
  await wait(700);
  for (const color of sequence) {
    if (cancelled()) return;
    activate(color);
    playSound(color);
    await wait(glowMs);
    activate(null);
    await wait(gapMs);
  }
}
