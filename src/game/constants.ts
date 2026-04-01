import type { PowerUpType, UpgradeDraftSource } from "./types";

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
export const ADVENTURE_LEVEL_TICK_STEP = 0.05;
export const ADVENTURE_MIN_LEVEL_TICK_MULTIPLIER = 0.76;
export const ADVENTURE_COLLAPSE_TICK_MULTIPLIER = 0.88;
export const COMBO_WINDOW_MS = 3_500;
export const MAX_COMBO_MULTIPLIER = 5;
export const SEGMENT_DURATION_MS = 35_000;
export const TARGET_SEGMENTS_PER_RUN = 14;
export const ELITE_SEGMENT_INTERVAL = 3;
export const COLLAPSE_START_SEGMENT = 9;
export const DASH_INITIAL_CHARGES = 1;
export const DASH_MAX_CHARGES = 1;
export const DASH_COOLDOWN_MS = 9_000;
export const DASH_DISTANCE = 3;
export const UPGRADE_OFFER_COUNT = 3;
export const UPGRADE_CATALOG_MIN_SIZE = 18;
export const UPGRADE_CATALOG_MAX_SIZE = 24;
export const UPGRADE_COMBO_WINDOW_STEP_MS = 400;
export const UPGRADE_DASH_COOLDOWN_STEP_MS = 1_200;
export const UPGRADE_MIN_DASH_COOLDOWN_MS = 3_000;
export const UPGRADE_RISK_SCORE_BONUS = 15;
export const UPGRADE_RISK_TICK_BONUS_MS = 8;

export const UPGRADE_RARITY_WEIGHTS: Record<
  UpgradeDraftSource,
  Record<"common" | "skill" | "mutation" | "risk", number>
> = {
  normal: {
    common: 10,
    skill: 4,
    mutation: 3,
    risk: 2
  },
  elite: {
    common: 4,
    skill: 7,
    mutation: 7,
    risk: 3
  },
  collapseBonus: {
    common: 5,
    skill: 5,
    mutation: 4,
    risk: 1
  }
};

export const POWERUP_SPAWN_CHANCE = 0.08;
export const POWERUP_TTL_MS = 8_000;

export const ADVENTURE_LEVEL_GOALS = [12, 28, 48, 72];

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
