import { LevelConfig } from './Types';


export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: 'Learn the Rule',
    mode: 'color',
    allowedColors: ['red', 'blue'],
    allowedShapes: ['circle'],
    speed: 0.8,
    spawnInterval: 4500,
    trialsPerRule: 5,
    ruleDisplayDuration: -1,
    hasShifts: false,
    hasDistractors: false,
    distractorFrequency: 0,
  },
  {
    level: 2,
    name: 'Rule Shift Challenge',
    mode: 'color',
    allowedColors: ['red', 'blue'],
    allowedShapes: ['circle', 'triangle'],
    speed: 1.0,
    spawnInterval: 4200,
    trialsPerRule: 8,
    ruleDisplayDuration: -1,
    hasShifts: true,
    hasDistractors: false,
    distractorFrequency: 0,
  },
];

