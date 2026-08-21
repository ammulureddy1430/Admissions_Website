# Walkthrough - Quick Switch Cognitive Flexibility Game

I have completed the implementation of the new real-time game-based assessment: **Quick Switch — Cognitive Flexibility**.

## Changes Made

### 1. Game Module Files (Frontend)
- Created [`Types.ts`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/games/quick-switch/Types.ts) to define TypeScript configurations for orbs, particles, rules, and scoring metrics.
- Created [`Game.tsx`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/games/quick-switch/Game.tsx) to export components to the registry.
- Created [`SoundSynth.ts`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/games/quick-switch/SoundSynth.ts) containing a Web Audio synthesizer for correct ding, wrong thud, shift chime, and movement sounds.
- Created [`ScoringEngine.ts`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/games/quick-switch/ScoringEngine.ts) to map raw clicks/collisions into cognitive flexibility sub-scores (0-100 scale).
- Created [`QuickSwitchGame.tsx`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/games/quick-switch/QuickSwitchGame.tsx) containing player movement physics, virtual directional joystick, Canvas rendering loops, color/shape orb spawning, rule timeline transitions, and error logs (including perseverative errors).
- Created [`QuickSwitchGame.css`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/games/quick-switch/QuickSwitchGame.css) containing interactive layout stylings, star fields, and hud styling.

### 2. Registry & Player Integration (Frontend)
- Registered the component in [`GameRegistry.ts`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/games/GameRegistry.ts).
- Integrated rendering in [`game-runtime-player.tsx`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/components/game-runtime-player.tsx).
- Configured card graphics, preview renders, and gradients in [admin games view](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/app/admin/games/page.tsx).
- Added description detail to [admin assessments view](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/app/admin/assessments/page.tsx).

### 3. Catalog & Completion Handlers (Backend)
- Sync-registered in [`game.catalog.ts`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/backend/src/modules/games/game.catalog.ts) for age group `'13–16 Years'`.
- Hooked completion payload parsing, validation, database updates, and events in [`game-runtime.service.ts`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/backend/src/modules/game-runtime/game-runtime.service.ts).
- Synced scoring logs in [`games.service.ts`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/backend/src/modules/games/games.service.ts) and [`game-play.service.ts`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/backend/src/modules/game-play/game-play.service.ts).

---

## Verification & Testing

### 1. Automated Tests
I added a full unit test suite in [`QuickSwitchEngine.test.ts`](file:///Users/ammulureddy143/Documents/Admissions_Website-main/frontend/src/games/quick-switch/QuickSwitchEngine.test.ts) covering:
- Rule targets and collectible checks.
- Collision intersections.
- Shifting/perseverative errors detection.
- Score evaluations.

All tests passed successfully:
```bash
npx tsx --test frontend/src/games/quick-switch/QuickSwitchEngine.test.ts
# tests 4
# pass 4
# fail 0
```

### 2. Manual Verification
> [!NOTE]
> The automated browser validation was skipped because the system Playwright browser driver is currently unavailable for mac-arm64 (Playwright server returned 404).

You can manually verify by running the application:
1. Open the Admin Games library page at [http://localhost:3000/admin/games](http://localhost:3000/admin/games) in your browser.
2. Select the **13–16 Years** age filter. Verify that the **Quick Switch — Cognitive Flexibility** card appears.
3. Switch the filter to **11–13 Years** or others, and confirm it is correctly hidden.
4. Click on **Quick Switch** and select **Preview** to load the game.
5. Control your ship in the arena using W/A/S/D or Arrow keys. Ensure you collect items matching the top target and avoid hazards.
6. Verify that when the rule changes (flash visual + audio transition), visual target guidelines show temporarily, old correct items become hazardous, and perseverative errors register properly in the final score logs.
