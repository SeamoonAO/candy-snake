import type { PowerUpType } from "./types";

export const BOARD_WIDTH = 32;
export const BOARD_HEIGHT = 32;
export const INITIAL_SNAKE_LENGTH = 4;
export const ENEMY_INITIAL_LENGTH = 4;

export const MIN_FOOD_COUNT = 1;
export const MAX_FOOD_COUNT = 12;
export const DEFAULT_FOOD_COUNT = 5;

export const MIN_ENEMY_COUNT = 1;
export const MAX_ENEMY_COUNT = 3;
export const DEFAULT_ENEMY_COUNT = 1;

export const INITIAL_TICK_MS = 150;
export const SCORE_PER_SPEED_STEP = 5;
export const SPEED_STEP_MS = 5;
export const MIN_BASE_TICK_MS = 75;

export const POWERUP_SPAWN_CHANCE = 0.08;
export const POWERUP_TTL_MS = 8_000;

export const POWERUP_WEIGHTS: Record<PowerUpType, number> = {
  SPEED_UP: 20,
  SLOW_DOWN: 20,
  GHOST_WALL: 15,
  DOUBLE_SCORE: 20,
  SHORTEN: 15,
  SHIELD: 10
};

export const POWERUP_DURATION_MS: Partial<Record<PowerUpType, number>> = {
  SPEED_UP: 6_000,
  SLOW_DOWN: 6_000,
  GHOST_WALL: 8_000,
  DOUBLE_SCORE: 10_000
};
