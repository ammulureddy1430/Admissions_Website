export type RegisteredGame = {
  name: string;
  slug: string;
  description: string;
  category: string;
  ageGroup: string;
  difficulty: string;
  durationSeconds: number;
  thumbnail: string;
  componentName: string;
  gameType: string;
  templateCode: string;
  cognitiveSkill: string;
};

// Adding a game here is the only backend registration step. GamesService
// synchronizes this catalog into the master `games` table on application start.
// Every registered game must use one of the supported age-group labels.
export const GAME_CATALOG: RegisteredGame[] = [
  { name: 'Adventure Dash', slug: 'adventure-dash', description: 'A real-time adventure game with responsive navigation and live interactions.', category: 'Adventure', ageGroup: '7–9 Years', difficulty: 'MEDIUM', durationSeconds: 900, thumbnail: '/games/adventure-dash.svg', componentName: 'ADVENTURE_GAME', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-ADVENTURE', cognitiveSkill: 'Decision Making' },
  { name: 'Airport Controller', slug: 'airport-controller', description: 'A live routing game with fast object sorting and responsive controls.', category: 'Simulation', ageGroup: '9–11 Years', difficulty: 'MEDIUM', durationSeconds: 720, thumbnail: '/games/airport-controller.svg', componentName: 'SORTING_GAME', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-SORTING', cognitiveSkill: 'Classification' },
  { name: 'Balloon Popper', slug: 'balloon-popper', description: 'A fast real-time balloon interaction game.', category: 'Arcade', ageGroup: '4–5 Years', difficulty: 'MEDIUM', durationSeconds: 600, thumbnail: '/games/balloon-popper.svg', componentName: 'BALLOON_POP', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-BALLOON', cognitiveSkill: 'Processing Speed' },
  { name: 'Ball Stack', slug: 'ball-stack', description: 'A precision stacking assessment measuring hand-eye coordination, fine motor control, concentration, and timing.', category: 'Hand-Eye Coordination', ageGroup: '3–4 Years', difficulty: 'EASY', durationSeconds: 90, thumbnail: '/games/ball-stack.svg', componentName: 'BALL_STACK', gameType: 'REAL_TIME', templateCode: 'GT-BUILDING', cognitiveSkill: 'Hand-Eye Coordination & Fine Motor Skills' },
  { name: 'Color Path', slug: 'color-path', description: 'A real-time cognitive assessment of visual recognition and observation through color-guided path choices.', category: 'Visual Recognition', ageGroup: '3–4 Years', difficulty: 'EASY', durationSeconds: 60, thumbnail: '/games/color-path.svg', componentName: 'COLOR_PATH', gameType: 'REAL_TIME', templateCode: 'GT-COLOR-PATH', cognitiveSkill: 'Visual Recognition & Observation' },
  { name: 'Board Game Arena', slug: 'board-game-arena', description: 'An interactive real-time board game experience.', category: 'Board', ageGroup: '7–9 Years', difficulty: 'MEDIUM', durationSeconds: 900, thumbnail: '/games/board-game-arena.svg', componentName: 'BOARD_GAME', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-BOARD', cognitiveSkill: 'Strategic Thinking' },
  { name: 'Bridge Builder', slug: 'bridge-builder', description: 'A hands-on building game with physics-based interactions.', category: 'Building', ageGroup: '9–11 Years', difficulty: 'MEDIUM', durationSeconds: 900, thumbnail: '/games/bridge-builder.svg', componentName: 'BUILDING_GAME', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-BUILDING', cognitiveSkill: 'Spatial Reasoning' },
  { name: 'Factory Automation', slug: 'factory-automation', description: 'A real-time factory workflow and matching game.', category: 'Simulation', ageGroup: '11–13 Years', difficulty: 'MEDIUM', durationSeconds: 720, thumbnail: '/games/factory-automation.svg', componentName: 'MATCHING_GAME', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-DRAGDROP', cognitiveSkill: 'Pattern Recognition' },
  { name: 'Fishing Master', slug: 'fishing-master', description: 'A responsive fishing game with live movement and timing.', category: 'Arcade', ageGroup: '5–7 Years', difficulty: 'MEDIUM', durationSeconds: 600, thumbnail: '/games/fishing-master.svg', componentName: 'FISHING_GAME', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-FISHING', cognitiveSkill: 'Selective Attention' },
  { name: 'Follow the Lights', slug: 'follow-the-lights', description: 'A real-time light sequence game with sound and touch interactions.', category: 'Memory', ageGroup: '3–4 Years', difficulty: 'EASY', durationSeconds: 120, thumbnail: '/games/follow-the-lights.svg', componentName: 'FOLLOW_THE_LIGHTS', gameType: 'REAL_TIME', templateCode: 'GT-MEMORY', cognitiveSkill: 'Working Memory' },
  { name: 'Math Racer', slug: 'math-racer', description: 'A live racing game with responsive steering and progression.', category: 'Racing', ageGroup: '7–9 Years', difficulty: 'MEDIUM', durationSeconds: 720, thumbnail: '/games/math-racer.svg', componentName: 'RACING_GAME', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-RACING', cognitiveSkill: 'Numerical Fluency' },
  { name: 'Maze Dash', slug: 'maze-dash', description: 'A real-time maze navigation game.', category: 'Maze', ageGroup: '5–7 Years', difficulty: 'MEDIUM', durationSeconds: 900, thumbnail: '/games/maze-dash.svg', componentName: 'MAZE', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-MAZE', cognitiveSkill: 'Planning' },
  { name: 'Robot Programming', slug: 'robot-programming', description: 'A live logic game based on programmable movement and sequences.', category: 'Logic', ageGroup: '11–13 Years', difficulty: 'MEDIUM', durationSeconds: 900, thumbnail: '/games/robot-programming.svg', componentName: 'LOGIC_GAME', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-LOGIC', cognitiveSkill: 'Logical Reasoning' },
  { name: 'Treasure Hunt Adventure', slug: 'treasure-hunt-adventure', description: 'An interactive treasure hunt with live exploration.', category: 'Adventure', ageGroup: '7–9 Years', difficulty: 'MEDIUM', durationSeconds: 900, thumbnail: '/games/treasure-hunt-adventure.svg', componentName: 'TREASURE_HUNT', gameType: 'ASSESSMENT_ENGINE', templateCode: 'GT-TREASURE', cognitiveSkill: 'Problem Solving' },
  { name: 'Sound Detective', slug: 'sound-detective', description: 'An auditory recognition assessment game where children listen and identify matching objects or animals.', category: 'Auditory Recognition', ageGroup: '3–4 Years', difficulty: 'EASY', durationSeconds: 120, thumbnail: '/games/sound-detective.svg', componentName: 'SOUND_DETECTIVE', gameType: 'REAL_TIME', templateCode: 'GT-SOUND', cognitiveSkill: 'Auditory Recognition & Listening' },
];
