import type { ComponentType } from "react";

export type GameComponentProps = Record<string, unknown>;

export type RegisteredGameComponent = {
  componentName: string;
  // Game engines have intentionally different runtime props.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load: () => Promise<{ default: ComponentType<any> }>;
};
