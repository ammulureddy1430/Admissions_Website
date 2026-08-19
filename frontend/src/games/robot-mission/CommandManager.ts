import type { Command } from "./Types";
export const CommandManager = { add: (sequence: Command[], command: Command, limit: number) => sequence.length < limit ? [...sequence, command] : sequence, undo: (sequence: Command[]) => sequence.slice(0, -1), clear: () => [] as Command[] };
