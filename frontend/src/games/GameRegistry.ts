import type { RegisteredGameComponent } from "./types";

const registeredGames: RegisteredGameComponent[] = [];

export function registerGame(game: RegisteredGameComponent) {
  if (
    !registeredGames.some((item) => item.componentName === game.componentName)
  )
    registeredGames.push(game);
  return game;
}

registerGame({
  componentName: "ADVENTURE_GAME",
  load: () =>
    import("@/components/adventure-game/AdventureGame").then((module) => ({
      default: module.AdventureGame,
    })),
});
registerGame({
  componentName: "BOARD_GAME",
  load: () =>
    import("@/components/board-game/BoardGame").then((module) => ({
      default: module.BoardGame,
    })),
});
registerGame({
  componentName: "BUILDING_GAME",
  load: () =>
    import("@/components/building-game/BuildingGame").then((module) => ({
      default: module.BuildingGame,
    })),
});
registerGame({
  componentName: "DRAG_DROP",
  load: () =>
    import("@/components/drag-drop-game/DragDropGame").then((module) => ({
      default: module.DragDropGame,
    })),
});
registerGame({
  componentName: "FISHING_GAME",
  load: () =>
    import("@/components/fishing-game/FishingGame").then((module) => ({
      default: module.FishingGame,
    })),
});
registerGame({
  componentName: "LOGIC_GAME",
  load: () =>
    import("@/components/logic-game/LogicGame").then((module) => ({
      default: module.LogicGame,
    })),
});
registerGame({
  componentName: "MATCHING_GAME",
  load: () =>
    import("@/components/matching-game/MatchingGame").then((module) => ({
      default: module.MatchingGame,
    })),
});
registerGame({
  componentName: "MAZE",
  load: () =>
    import("@/components/maze-game/MazeGame").then((module) => ({
      default: module.MazeGame,
    })),
});
registerGame({
  componentName: "MEMORY_MATCH",
  load: () =>
    import("@/components/memory-game/MemoryGame").then((module) => ({
      default: module.MemoryGame,
    })),
});
registerGame({
  componentName: "FOLLOW_THE_LIGHTS",
  load: () => import("./follow-the-lights/Game"),
});
registerGame({
  componentName: "BALL_STACK",
  load: () => import("./ball-stack/Game"),
});
registerGame({
  componentName: "SOUND_DETECTIVE",
  load: () => import("./sound-detective/Game"),
});
registerGame({
  componentName: "COLOR_PATH",
  load: () => import("./color-path/Game"),
});
registerGame({
  componentName: "MAGIC_PAINT",
  load: () => import("./magic-paint/Game"),
});
registerGame({
  componentName: "TRAIN_TRACK_BUILDER",
  load: () => import("./train-track-builder/Game"),
});
registerGame({
  componentName: "PACKAGE_SORTER",
  load: () => import("./package-sorter/Game"),
});
registerGame({
  componentName: "MAGIC_TRAIN",
  load: () => import("./magic-train/Game"),
});

registerGame({
  componentName: "RESCUE_MISSION",
  load: () => import("./rescue-mission/Game"),
});
registerGame({
  componentName: "PARKING_ESCAPE",
  load: () => import("./parking-escape/Game"),
});
registerGame({
  componentName: "WATER_PIPELINE",
  load: () => import("./water-pipeline/Game"),
});
registerGame({
  componentName: "PATTERN_MATRIX",
  load: () => import("./pattern-matrix/Game"),
});
registerGame({
  componentName: "CATCH_THE_TARGET",
  load: () => import("./catch-the-target/Game"),
});
registerGame({
  componentName: "MENTAL_ROTATION",
  load: () => import("./mental-rotation/Game"),
});
registerGame({
  componentName: "WATER_JUGS",
  load: () => import("./water-jugs/Game"),
});
registerGame({
  componentName: "TANGRAM_BUILDER",
  load: () => import("./tangram-builder/Game"),
});
registerGame({
  componentName: "SOKOBAN",
  load: () => import("./sokoban/Game"),
});
registerGame({
  componentName: "COLOR_SHIFT",
  load: () => import("./color-shift/Game"),
});
registerGame({
  componentName: "AIR_HOCKEY_CHALLENGE",
  load: () => import("./air-hockey-challenge/Game"),
});
registerGame({
  componentName: "MEMORY_MARKET",
  load: () => import("./memory-market/Game"),
});
registerGame({
  componentName: "AIRPORT_CONTROLLER",
  load: () => import("./airport-controller/Game"),
});
registerGame({
  componentName: "RULE_SHIFT_CHALLENGE",
  load: () => import("./rule-shift-challenge/Game"),
});
registerGame({ componentName: "MINI_GOLF_CHALLENGE", load: () => import("./mini-golf/Game") });
registerGame({
  componentName: "RACING_STRATEGIST",
  load: () => import("./racing-strategist/Game"),
});

registerGame({
  componentName: "NUMBER_BUILDER",
  load: () => import("./number-builder/Game"),
});
registerGame({
  componentName: "BALL_SORT",
  load: () => import("./ball-sort/Game"),
});
registerGame({
  componentName: "RED_LIGHT_GREEN_LIGHT",
  load: () => import("./red-light-green-light/Game"),
});
registerGame({
  componentName: "RACING_GAME",
  load: () =>
    import("@/components/racing-game/RacingGame").then((module) => ({
      default: module.RacingGame,
    })),
});
registerGame({
  componentName: "SORTING_GAME",
  load: () =>
    import("@/components/sorting-game/SortingGame").then((module) => ({
      default: module.SortingGame,
    })),
});
registerGame({
  componentName: "TREASURE_HUNT",
  load: () =>
    import("@/components/treasure-hunt-game/TreasureHuntGame").then(
      (module) => ({ default: module.TreasureHuntGame }),
    ),
});

export const GameRegistry = {
  all: () => [...registeredGames],
  get: (componentName: string) =>
    registeredGames.find((game) => game.componentName === componentName),
};
