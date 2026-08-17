import type { SokobanLevel } from "./Types";

// Original, compact levels designed for this assessment. Symbols are internal only.
export const SOKOBAN_LEVELS: SokobanLevel[] = [
  { id: 1, difficulty: 1, optimalMoves: 1, map: ["#####", "#@$.#", "#####"] },
  {
    id: 2,
    difficulty: 2,
    optimalMoves: 3,
    map: ["######", "#    #", "# @$ #", "#  . #", "######"],
  },
  {
    id: 3,
    difficulty: 3,
    optimalMoves: 8,
    map: ["#######", "#  .  #", "#  $  #", "#@ $ .#", "#     #", "#######"],
  },
  {
    id: 4,
    difficulty: 4,
    optimalMoves: 7,
    map: ["#######", "# . . #", "# $ $ #", "#  @  #", "#######"],
  },
  {
    id: 5,
    difficulty: 5,
    optimalMoves: 12,
    map: ["########", "# . . .#", "# $ $ $#", "#   @  #", "########"],
  },
  {
    id: 6,
    difficulty: 6,
    optimalMoves: 10,
    map: [
      "########",
      "# .  . #",
      "# $  $ #",
      "#  ##  #",
      "#  @   #",
      "########",
    ],
  },
];
