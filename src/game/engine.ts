import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  DEFAULT_ENEMY_COUNT,
  DEFAULT_FOOD_COUNT,
  ENEMY_INITIAL_LENGTH,
  INITIAL_SNAKE_LENGTH,
  INITIAL_TICK_MS,
  MAX_ENEMY_COUNT,
  MAX_FOOD_COUNT,
  MIN_BASE_TICK_MS,
  MIN_ENEMY_COUNT,
  MIN_FOOD_COUNT,
  POWERUP_SPAWN_CHANCE,
  POWERUP_TTL_MS,
  SCORE_PER_SPEED_STEP,
  SPEED_STEP_MS
} from "./constants";
import { applyPowerUp, choosePowerUpType, cleanupExpiredEffects, isEffectActive } from "./powerups";
import { chance, createRng, pointToKey, randomEmptyCell } from "./random";
import type { Direction, EnemySnake, GameState, Point } from "./types";

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

const TURN_LEFT: Record<Direction, Direction> = {
  up: "left",
  left: "down",
  down: "right",
  right: "up"
};

const TURN_RIGHT: Record<Direction, Direction> = {
  up: "right",
  right: "down",
  down: "left",
  left: "up"
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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

function addPoints(set: Set<string>, points: Point[]): void {
  for (const point of points) set.add(pointToKey(point));
}

function collectEnemyOccupied(enemies: EnemySnake[]): Set<string> {
  const occupied = new Set<string>();
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    addPoints(occupied, enemy.snake);
  }
  return occupied;
}

function spawnOneFood(occupied: Set<string>, seed?: number): Point | null {
  const rng = typeof seed === "number" ? createRng(seed) : Math.random;
  return randomEmptyCell(BOARD_WIDTH, BOARD_HEIGHT, occupied, rng);
}

function createSnakeBody(head: Point, direction: Direction, length: number): Point[] {
  const reverse = OPPOSITE[direction];
  const body: Point[] = [];
  let cursor = head;
  body.push(cursor);
  for (let i = 1; i < length; i += 1) {
    cursor = movePoint(cursor, reverse);
    body.push(cursor);
  }
  return body;
}

function canPlaceSnake(snake: Point[], occupied: Set<string>): boolean {
  for (const segment of snake) {
    if (outOfBounds(segment) || occupied.has(pointToKey(segment))) return false;
  }
  return true;
}

function spawnEnemyByIndex(index: number, occupied: Set<string>, seed?: number): EnemySnake | null {
  const templates: Array<{ head: Point; direction: Direction; hue: number }> = [
    { head: { x: BOARD_WIDTH - 6, y: 5 }, direction: "left", hue: 210 },
    { head: { x: 5, y: BOARD_HEIGHT - 6 }, direction: "right", hue: 290 },
    { head: { x: BOARD_WIDTH - 6, y: BOARD_HEIGHT - 6 }, direction: "up", hue: 170 }
  ];

  const template = templates[index % templates.length];
  const templatedBody = createSnakeBody(template.head, template.direction, ENEMY_INITIAL_LENGTH);
  if (canPlaceSnake(templatedBody, occupied)) {
    addPoints(occupied, templatedBody);
    return {
      id: `enemy-${index + 1}`,
      snake: templatedBody,
      direction: template.direction,
      alive: true,
      hue: template.hue
    };
  }

  const rng = typeof seed === "number" ? createRng(seed + index) : Math.random;
  const directions: Direction[] = ["up", "right", "down", "left"];
  for (let tries = 0; tries < 40; tries += 1) {
    const head = randomEmptyCell(BOARD_WIDTH, BOARD_HEIGHT, occupied, rng);
    if (!head) return null;
    const direction = directions[Math.floor(rng() * directions.length)];
    const body = createSnakeBody(head, direction, ENEMY_INITIAL_LENGTH);
    if (canPlaceSnake(body, occupied)) {
      addPoints(occupied, body);
      return {
        id: `enemy-${index + 1}`,
        snake: body,
        direction,
        alive: true,
        hue: (200 + index * 70) % 360
      };
    }
  }
  return null;
}

function spawnEnemies(count: number, baseOccupied: Set<string>, seed?: number): EnemySnake[] {
  const enemies: EnemySnake[] = [];
  const occupied = new Set<string>(baseOccupied);
  for (let i = 0; i < count; i += 1) {
    const enemy = spawnEnemyByIndex(i, occupied, seed);
    if (enemy) enemies.push(enemy);
  }
  return enemies;
}

function fillFoods(
  existing: Point[],
  desiredCount: number,
  occupiedBase: Set<string>,
  seed?: number
): Point[] {
  const occupied = new Set<string>(occupiedBase);
  const foods: Point[] = [];

  for (const food of existing) {
    const key = pointToKey(food);
    if (foods.length >= desiredCount) break;
    if (!occupied.has(key)) {
      foods.push(food);
      occupied.add(key);
    }
  }

  for (let i = foods.length; i < desiredCount; i += 1) {
    const generated = spawnOneFood(occupied, typeof seed === "number" ? seed + i : undefined);
    if (!generated) break;
    foods.push(generated);
    occupied.add(pointToKey(generated));
  }

  if (foods.length === 0) foods.push({ x: 0, y: 0 });
  return foods;
}

function refillFoodAt(
  foods: Point[],
  index: number,
  occupiedBase: Set<string>,
  seed?: number
): Point[] {
  const nextFoods = [...foods];
  const occupied = new Set<string>(occupiedBase);
  for (let i = 0; i < nextFoods.length; i += 1) {
    if (i !== index) occupied.add(pointToKey(nextFoods[i]));
  }
  const replacement = spawnOneFood(occupied, seed);
  if (replacement) nextFoods[index] = replacement;
  return nextFoods;
}

function nearestFoodDistance(point: Point, foods: Point[]): number {
  let best = Infinity;
  for (const food of foods) {
    const distance = Math.abs(food.x - point.x) + Math.abs(food.y - point.y);
    if (distance < best) best = distance;
  }
  return best;
}

function chooseEnemyDirection(
  enemy: EnemySnake,
  foods: Point[],
  occupiedByPlayer: Set<string>,
  occupiedByOtherEnemies: Set<string>
): Direction {
  const head = enemy.snake[0];
  const priority: Direction[] = [
    enemy.direction,
    TURN_LEFT[enemy.direction],
    TURN_RIGHT[enemy.direction],
    OPPOSITE[enemy.direction]
  ];

  let bestDirection = enemy.direction;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const direction of priority) {
    const nextHead = movePoint(head, direction);
    const willEat = foods.some((food) => samePoint(food, nextHead));
    const ownBody = willEat ? enemy.snake : enemy.snake.slice(0, -1);
    const ownSet = new Set<string>(ownBody.map(pointToKey));
    const blocked =
      outOfBounds(nextHead) ||
      occupiedByPlayer.has(pointToKey(nextHead)) ||
      occupiedByOtherEnemies.has(pointToKey(nextHead)) ||
      ownSet.has(pointToKey(nextHead));

    if (blocked) continue;

    const score = nearestFoodDistance(nextHead, foods);
    if (score < bestScore) {
      bestScore = score;
      bestDirection = direction;
    }
  }

  return bestDirection;
}

export function createInitialState(seed?: number): GameState {
  const midX = Math.floor(BOARD_WIDTH / 2);
  const midY = Math.floor(BOARD_HEIGHT / 2);
  const snake: Point[] = Array.from({ length: INITIAL_SNAKE_LENGTH }, (_, i) => ({
    x: midX - i,
    y: midY
  }));

  const playerOccupied = new Set<string>(snake.map(pointToKey));
  const enemyCount = DEFAULT_ENEMY_COUNT;
  const foodCount = DEFAULT_FOOD_COUNT;
  const enemies = spawnEnemies(enemyCount, playerOccupied, seed);
  const occupiedForFoods = new Set<string>(playerOccupied);
  addPoints(occupiedForFoods, enemies.flatMap((enemy) => enemy.snake));
  const foods = fillFoods([], foodCount, occupiedForFoods, seed);

  return {
    snake,
    enemies,
    direction: "right",
    queuedDirection: null,
    foods,
    foodCount,
    enemyCount,
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

export function setFoodCount(state: GameState, nextCount: number, seed?: number): GameState {
  const foodCount = clamp(nextCount, MIN_FOOD_COUNT, MAX_FOOD_COUNT);
  const occupied = new Set<string>(state.snake.map(pointToKey));
  addPoints(occupied, state.enemies.filter((enemy) => enemy.alive).flatMap((enemy) => enemy.snake));
  if (state.powerUp) occupied.add(pointToKey(state.powerUp.position));
  const foods = fillFoods(state.foods, foodCount, occupied, seed);
  return { ...state, foodCount, foods };
}

export function setEnemyCount(state: GameState, nextCount: number, seed?: number): GameState {
  const enemyCount = clamp(nextCount, MIN_ENEMY_COUNT, MAX_ENEMY_COUNT);
  const current = state.enemies.filter((enemy) => enemy.alive).slice(0, enemyCount);
  const occupied = new Set<string>(state.snake.map(pointToKey));
  addPoints(occupied, current.flatMap((enemy) => enemy.snake));
  const missing = enemyCount - current.length;
  const extra = missing > 0 ? spawnEnemies(missing, occupied, seed) : [];
  const merged = [...current, ...extra].map((enemy, index) => ({
    ...enemy,
    id: `enemy-${index + 1}`
  }));

  const occupiedForFoods = new Set<string>(state.snake.map(pointToKey));
  addPoints(occupiedForFoods, merged.flatMap((enemy) => enemy.snake));
  if (state.powerUp) occupiedForFoods.add(pointToKey(state.powerUp.position));
  const foods = fillFoods(state.foods, state.foodCount, occupiedForFoods, seed);

  return {
    ...state,
    enemyCount,
    enemies: merged,
    foods
  };
}

export function restart(state: GameState, seed?: number): GameState {
  const fresh = createInitialState(seed);
  const withFoodSetting = setFoodCount(fresh, state.foodCount, seed);
  const withEnemySetting = setEnemyCount(withFoodSetting, state.enemyCount, seed);
  return {
    ...withEnemySetting,
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

  const enemyOccupied = collectEnemyOccupied(state.enemies);
  const eatenFoodIndex = state.foods.findIndex((food) => samePoint(nextHead, food));
  const isEating = eatenFoodIndex >= 0;
  const futureBody = isEating ? state.snake : state.snake.slice(0, -1);
  const hitSelf = futureBody.some((segment) => samePoint(segment, nextHead));
  const hitEnemy = enemyOccupied.has(pointToKey(nextHead));
  const fatalCollision = hitWall || hitSelf || hitEnemy;

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
  let nextFoods = [...state.foods];

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

  if (isEating) {
    const occupied = new Set<string>(nextSnake.map(pointToKey));
    addPoints(occupied, state.enemies.filter((enemy) => enemy.alive).flatMap((enemy) => enemy.snake));
    if (nextPowerUp) occupied.add(pointToKey(nextPowerUp.position));
    nextFoods = refillFoodAt(nextFoods, eatenFoodIndex, occupied, now + 10);
  }

  const playerOccupied = new Set<string>(nextSnake.map(pointToKey));
  const movedEnemies: EnemySnake[] = [];
  for (let index = 0; index < state.enemies.length; index += 1) {
    const enemy = state.enemies[index];
    if (!enemy.alive) continue;

    const otherEnemies = new Set<string>();
    for (let j = 0; j < state.enemies.length; j += 1) {
      if (j === index) continue;
      const other = state.enemies[j];
      if (other.alive) addPoints(otherEnemies, other.snake);
    }
    addPoints(otherEnemies, movedEnemies.flatMap((item) => item.snake));

    const direction = chooseEnemyDirection(enemy, nextFoods, playerOccupied, otherEnemies);
    const enemyNextHead = movePoint(enemy.snake[0], direction);
    const enemyFoodIndex = nextFoods.findIndex((food) => samePoint(food, enemyNextHead));
    const enemyWillEat = enemyFoodIndex >= 0;
    const ownBody = enemyWillEat ? enemy.snake : enemy.snake.slice(0, -1);
    const ownSet = new Set<string>(ownBody.map(pointToKey));
    const enemyBlocked =
      outOfBounds(enemyNextHead) ||
      playerOccupied.has(pointToKey(enemyNextHead)) ||
      otherEnemies.has(pointToKey(enemyNextHead)) ||
      ownSet.has(pointToKey(enemyNextHead));

    if (enemyBlocked) {
      const occupied = new Set<string>(playerOccupied);
      addPoints(occupied, movedEnemies.flatMap((item) => item.snake));
      addPoints(
        occupied,
        state.enemies
          .filter((_, j) => j !== index)
          .flatMap((item) => item.snake)
      );
      const respawn = spawnEnemyByIndex(index, occupied, now + index * 31);
      if (respawn) movedEnemies.push(respawn);
      continue;
    }

    const nextEnemySnake = [enemyNextHead, ...enemy.snake];
    if (!enemyWillEat) nextEnemySnake.pop();
    const updatedEnemy: EnemySnake = {
      ...enemy,
      direction,
      snake: nextEnemySnake,
      alive: true
    };
    movedEnemies.push(updatedEnemy);

    if (enemyWillEat) {
      const occupied = new Set<string>(playerOccupied);
      addPoints(occupied, movedEnemies.flatMap((item) => item.snake));
      for (let j = index + 1; j < state.enemies.length; j += 1) {
        if (state.enemies[j].alive) addPoints(occupied, state.enemies[j].snake);
      }
      if (nextPowerUp) occupied.add(pointToKey(nextPowerUp.position));
      nextFoods = refillFoodAt(nextFoods, enemyFoodIndex, occupied, now + 50 + index);
    }
  }

  if (!nextPowerUp && chance(POWERUP_SPAWN_CHANCE)) {
    const occupied = new Set<string>(nextSnake.map(pointToKey));
    addPoints(occupied, movedEnemies.flatMap((enemy) => enemy.snake));
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
    enemies: movedEnemies,
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
