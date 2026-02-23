export type Point = { x: number; y: number };

export type Direction = "up" | "down" | "left" | "right";

export type PowerUpType =
  | "SPEED_UP"
  | "SLOW_DOWN"
  | "GHOST_WALL"
  | "DOUBLE_SCORE"
  | "SHORTEN"
  | "SHIELD";

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
}

export interface GameState {
  snake: Point[];
  enemies: EnemySnake[];
  direction: Direction;
  queuedDirection: Direction | null;
  foods: Point[];
  foodCount: number;
  enemyCount: number;
  powerUp: PowerUpInstance | null;
  effects: ActiveEffects;
  score: number;
  bestScore: number;
  gamesPlayed: number;
  tickMs: number;
  isPaused: boolean;
  isGameOver: boolean;
}
