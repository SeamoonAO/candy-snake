import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  FOOD_COUNT,
  INITIAL_SNAKE_LENGTH,
  INITIAL_TICK_MS,
  MIN_BASE_TICK_MS,
  POWERUP_SPAWN_CHANCE,
  POWERUP_TTL_MS,
  SCORE_PER_SPEED_STEP,
  SPEED_STEP_MS
} from "./constants";
import { applyPowerUp, choosePowerUpType, cleanupExpiredEffects, isEffectActive } from "./powerups";
import { chance, createRng, pointToKey, randomEmptyCell } from "./random";
import type { Direction, GameState, Point } from "./types";

const DIRECTION_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function movePoint(point: Point, direction: Direction): Point {
  const vector = DIRECTION_VECTORS[direction];
  return { x: point.x + vector.x, y: point.y + vector.y };
}

function outOfBounds(point: Point): boolean {
  return point.x < 0 || point.x >= BOARD_WIDTH || point.y < 0 || point.y >= BOARD_HEIGHT;
}

function wrapPoint(point: Point): Point {
  return {
    x: (point.x + BOARD_WIDTH) % BOARD_WIDTH,
    y: (point.y + BOARD_HEIGHT) % BOARD_HEIGHT
  };
}

function computeBaseTickMs(score: number): number {
  const reduced = INITIAL_TICK_MS - Math.floor(score / SCORE_PER_SPEED_STEP) * SPEED_STEP_MS;
  return Math.max(MIN_BASE_TICK_MS, reduced);
}

function computeTickMs(state: GameState, now: number): number {
  let tick = computeBaseTickMs(state.score);
  if (isEffectActive(state.effects.speedUpUntil, now)) tick *= 0.75;
  if (isEffectActive(state.effects.slowDownUntil, now)) tick *= 1.35;
  return Math.max(40, Math.round(tick));
}

function spawnOneFood(
  occupied: Set<string>,
  seed?: number
): Point | null {
  const rng = typeof seed === "number" ? createRng(seed) : Math.random;
  return randomEmptyCell(BOARD_WIDTH, BOARD_HEIGHT, occupied, rng);
}

function findSpawnableFoods(
  snake: Point[],
  powerUp: GameState["powerUp"],
  count: number,
  seed?: number
): Point[] {
  const occupied = new Set<string>(snake.map(pointToKey));
  if (powerUp) occupied.add(pointToKey(powerUp.position));
  const foods: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    const food = spawnOneFood(occupied, typeof seed === "number" ? seed + i : undefined);
    if (!food) break;
    foods.push(food);
    occupied.add(pointToKey(food));
  }
  if (foods.length === 0) foods.push({ x: 0, y: 0 });
  return foods;
}

export function createInitialState(seed?: number): GameState {
  const midX = Math.floor(BOARD_WIDTH / 2);
  const midY = Math.floor(BOARD_HEIGHT / 2);
  const snake: Point[] = Array.from({ length: INITIAL_SNAKE_LENGTH }, (_, i) => ({
    x: midX - i,
    y: midY
  }));
  const foods = findSpawnableFoods(snake, null, FOOD_COUNT, seed);
  return {
    snake,
    direction: "right",
    queuedDirection: null,
    foods,
    powerUp: null,
    effects: {
      shield: false
    },
    score: 0,
    bestScore: 0,
    gamesPlayed: 0,
    tickMs: INITIAL_TICK_MS,
    isPaused: true,
    isGameOver: false
  };
}

export function turn(state: GameState, next: Direction): GameState {
  if (state.isGameOver) return state;
  const anchor = state.queuedDirection ?? state.direction;
  if (OPPOSITE[anchor] === next) return state;
  return { ...state, queuedDirection: next };
}

export function togglePause(state: GameState): GameState {
  if (state.isGameOver) return state;
  return { ...state, isPaused: !state.isPaused };
}

export function restart(state: GameState, seed?: number): GameState {
  const fresh = createInitialState(seed);
  return {
    ...fresh,
    bestScore: state.bestScore,
    gamesPlayed: state.gamesPlayed
  };
}

export function step(state: GameState, now: number): GameState {
  if (state.isGameOver || state.isPaused) return state;

  const effects = cleanupExpiredEffects(state.effects, now);
  const moveDirection = state.queuedDirection ?? state.direction;
  const currentHead = state.snake[0];
  const ghostWallOn = isEffectActive(effects.ghostWallUntil, now);
  const initialNextHead = movePoint(currentHead, moveDirection);
  const nextHead = ghostWallOn ? wrapPoint(initialNextHead) : initialNextHead;
  const hitWall = outOfBounds(initialNextHead) && !ghostWallOn;

  const eatenFoodIndex = state.foods.findIndex((food) => samePoint(nextHead, food));
  const isEating = eatenFoodIndex >= 0;
  const futureBody = isEating ? state.snake : state.snake.slice(0, -1);
  const hitSelf = futureBody.some((segment) => samePoint(segment, nextHead));
  const fatalCollision = hitWall || hitSelf;

  if (fatalCollision) {
    if (effects.shield) {
      return {
        ...state,
        direction: moveDirection,
        queuedDirection: null,
        effects: { ...effects, shield: false },
        tickMs: computeTickMs({ ...state, effects }, now)
      };
    }
    return {
      ...state,
      direction: moveDirection,
      queuedDirection: null,
      effects,
      isGameOver: true,
      isPaused: true,
      tickMs: computeTickMs({ ...state, effects }, now)
    };
  }

  let nextSnake = [nextHead, ...state.snake];
  let nextScore = state.score;

  if (isEating) {
    const doubled = isEffectActive(effects.doubleScoreUntil, now);
    nextScore += doubled ? 2 : 1;
  } else {
    nextSnake.pop();
  }

  let nextPowerUp = state.powerUp && state.powerUp.expiresAt > now ? state.powerUp : null;
  let nextEffects = effects;

  if (nextPowerUp && samePoint(nextHead, nextPowerUp.position)) {
    const applied = applyPowerUp(nextEffects, nextPowerUp.type, now);
    nextEffects = applied.effects;
    if (applied.shortenBy > 0) {
      const targetLength = Math.max(3, nextSnake.length - applied.shortenBy);
      nextSnake = nextSnake.slice(0, targetLength);
    }
    nextPowerUp = null;
  }

  const nextFoods = [...state.foods];
  if (isEating) {
    const occupied = new Set<string>(nextSnake.map(pointToKey));
    if (nextPowerUp) occupied.add(pointToKey(nextPowerUp.position));
    for (const food of nextFoods) occupied.add(pointToKey(food));
    const eaten = nextFoods[eatenFoodIndex];
    occupied.delete(pointToKey(eaten));
    const replacement = randomEmptyCell(BOARD_WIDTH, BOARD_HEIGHT, occupied);
    if (replacement) {
      nextFoods[eatenFoodIndex] = replacement;
    } else {
      nextFoods[eatenFoodIndex] = eaten;
    }
  }

  if (!nextPowerUp && chance(POWERUP_SPAWN_CHANCE)) {
    const occupied = new Set<string>(nextSnake.map(pointToKey));
    for (const food of nextFoods) occupied.add(pointToKey(food));
    const position = randomEmptyCell(BOARD_WIDTH, BOARD_HEIGHT, occupied);
    if (position) {
      nextPowerUp = {
        type: choosePowerUpType(),
        position,
        expiresAt: now + POWERUP_TTL_MS
      };
    }
  }

  const nextBestScore = Math.max(state.bestScore, nextScore);
  const interim: GameState = {
    ...state,
    snake: nextSnake,
    direction: moveDirection,
    queuedDirection: null,
    effects: nextEffects,
    powerUp: nextPowerUp,
    foods: nextFoods,
    score: nextScore,
    bestScore: nextBestScore
  };

  return {
    ...interim,
    tickMs: computeTickMs(interim, now)
  };
}
