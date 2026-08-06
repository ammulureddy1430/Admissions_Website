# Game registration

All playable game implementations belong under `src/games/<game-slug>/`. A game
folder may contain `Game.tsx`, `GameEngine.ts`, `Assets/`, `Sounds/`, `Styles/`,
`Types/`, and `Utils/`. Existing engines are exposed through `GameRegistry.ts`
while they are incrementally moved from `src/components`.

Register the same stable `componentName` in the backend `game.catalog.ts`. On
backend startup that catalog is automatically synchronized to the master
`games` table. The Games Library and assessment selector both consume the API,
so neither page needs game-specific edits.
