export type Point = { x: number; y: number };

export type Direction = "up" | "down" | "left" | "right";

export type EnemyPersonality = "greedy" | "hunter" | "careful";

export type GameMode = "endless" | "adventure";

export type PowerUpType =
  | "SPEED_UP"
  | "SLOW_DOWN"
  | "GHOST_WALL"
  | "DOUBLE_SCORE"
  | "SHORTEN"
  | "SHIELD";

export type RelicId = "HONEY_FANG" | "GUARDIAN_SHELL" | "WAYFINDER_SIGIL" | "CALM_FEATHER";

export interface PowerUpInstance {
  type: PowerUpType;
  position: Point;
  expiresAt: number;
}

export interface ActiveEffects {
  speedUpUntil?: number;
  slowDownUntil?: number;
  ghostWallUntil?: number;
  doubleScoreUntil?: number;
  shield: boolean;
}

export interface EnemySnake {
  id: string;
  snake: Point[];
  direction: Direction;
  alive: boolean;
  hue: number;
  personality: EnemyPersonality;
}

export interface GameState {
  snake: Point[];
  enemies: EnemySnake[];
  direction: Direction;
  queuedDirection: Direction | null;
  foods: Point[];
  foodCount: number;
  enemyCount: number;
  mode: GameMode;
  currentLevel: number;
  levelGoal: number;
  obstacles: Point[];
  powerUp: PowerUpInstance | null;
  relics: RelicId[];
  effects: ActiveEffects;
  score: number;
  comboCount: number;
  comboMultiplier: number;
  comboExpiresAt: number | null;
  bestScore: number;
  gamesPlayed: number;
  tickMs: number;
  isPaused: boolean;
  isGameOver: boolean;
}
