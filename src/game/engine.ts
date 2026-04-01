import {
  ADVENTURE_COLLAPSE_TICK_MULTIPLIER,
  ADVENTURE_LEVEL_TICK_STEP,
  ADVENTURE_LEVEL_GOALS,
  ADVENTURE_MIN_LEVEL_TICK_MULTIPLIER,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  COMBO_WINDOW_MS,
  COLLAPSE_START_SEGMENT,
  DASH_COOLDOWN_MS,
  DASH_INITIAL_CHARGES,
  DASH_MAX_CHARGES,
  DEFAULT_ENEMY_COUNT,
  DEFAULT_FOOD_COUNT,
  ELITE_SEGMENT_INTERVAL,
  ENEMY_INITIAL_LENGTH,
  INITIAL_SNAKE_LENGTH,
  INITIAL_TICK_MS,
  MAX_COMBO_MULTIPLIER,
  MAX_ENEMY_COUNT,
  MAX_FOOD_COUNT,
  MIN_BASE_TICK_MS,
  MIN_ENEMY_COUNT,
  MIN_FOOD_COUNT,
  POWERUP_SPAWN_CHANCE,
  POWERUP_TTL_MS,
  SEGMENT_DURATION_MS,
  SCORE_PER_SPEED_STEP,
  SPEED_STEP_MS,
  TARGET_SEGMENTS_PER_RUN
} from "./constants";
import { applyPowerUp, choosePowerUpType, cleanupExpiredEffects, isEffectActive } from "./powerups";
import { chance, createRng, pointToKey, randomEmptyCell } from "./random";
import { activateDash, tickDashRecovery } from "./skills";
import { applyUpgradeChoice, buildUpgradeOffers } from "./upgrades";
import type {
  ActiveSkillState,
  BuildModifiers,
  Direction,
  EnemyPersonality,
  EnemySnake,
  GameMode,
  GameState,
  Point,
  RogueliteRunState,
  RunSummary,
  UpgradeDraft
} from "./types";

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

const ENEMY_PERSONALITIES: EnemyPersonality[] = ["greedy", "hunter", "careful"];
const ENEMY_MOVE_CADENCE: Record<EnemyPersonality, number> = {
  greedy: 2,
  hunter: 3,
  careful: 2
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
  let tick = state.mode === "adventure" ? INITIAL_TICK_MS : computeBaseTickMs(state.score);
  if (isEffectActive(state.effects.speedUpUntil, now)) tick *= 0.75;
  if (isEffectActive(state.effects.slowDownUntil, now)) tick *= 1.35;
  if (state.mode === "adventure") {
    tick *= Math.max(
      ADVENTURE_MIN_LEVEL_TICK_MULTIPLIER,
      1 - (state.currentLevel - 1) * ADVENTURE_LEVEL_TICK_STEP
    );
    if (state.run.collapseStarted) tick *= ADVENTURE_COLLAPSE_TICK_MULTIPLIER;
  }
  tick -= state.build.tickMsBonusMs;
  return Math.max(40, Math.round(tick));
}

function addPoints(set: Set<string>, points: Point[]): void {
  for (const point of points) set.add(pointToKey(point));
}

function createObstacleSet(obstacles: Point[]): Set<string> {
  return new Set(obstacles.map(pointToKey));
}

function sanitizeObstacles(obstacles: Point[], occupiedPoints: Point[]): Point[] {
  const occupied = new Set(occupiedPoints.map(pointToKey));
  return obstacles.filter((point) => !occupied.has(pointToKey(point)));
}

function buildObstaclePattern(level: number): Point[] {
  const midX = Math.floor(BOARD_WIDTH / 2);
  const midY = Math.floor(BOARD_HEIGHT / 2);
  const pattern = ((level - 1) % 4) + 1;
  const points: Point[] = [];

  if (pattern === 1) {
    for (let y = 7; y < BOARD_HEIGHT - 7; y += 1) {
      if (Math.abs(y - midY) <= 2) continue;
      points.push({ x: 8, y }, { x: BOARD_WIDTH - 9, y });
    }
  }

  if (pattern === 2) {
    for (let x = 6; x < BOARD_WIDTH - 6; x += 1) {
      if (Math.abs(x - midX) <= 2) continue;
      points.push({ x, y: 8 }, { x, y: BOARD_HEIGHT - 9 });
    }
    for (let y = 10; y < BOARD_HEIGHT - 10; y += 1) {
      if (Math.abs(y - midY) <= 3) continue;
      points.push({ x: midX, y });
    }
  }

  if (pattern === 3) {
    for (let offset = 0; offset < 10; offset += 1) {
      if (offset === 4 || offset === 5) continue;
      points.push({ x: 6 + offset, y: 6 + offset });
      points.push({ x: BOARD_WIDTH - 7 - offset, y: 6 + offset });
      points.push({ x: 6 + offset, y: BOARD_HEIGHT - 7 - offset });
      points.push({ x: BOARD_WIDTH - 7 - offset, y: BOARD_HEIGHT - 7 - offset });
    }
  }

  if (pattern === 4) {
    for (let x = 9; x < BOARD_WIDTH - 9; x += 1) {
      if (Math.abs(x - midX) <= 2) continue;
      points.push({ x, y: midY - 4 }, { x, y: midY + 4 });
    }
    for (let y = 9; y < BOARD_HEIGHT - 9; y += 1) {
      if (Math.abs(y - midY) <= 2) continue;
      points.push({ x: midX - 6, y }, { x: midX + 6, y });
    }
  }

  return points;
}

function getLevelGoal(level: number): number {
  if (level <= ADVENTURE_LEVEL_GOALS.length) return ADVENTURE_LEVEL_GOALS[level - 1];
  const lastGoal = ADVENTURE_LEVEL_GOALS[ADVENTURE_LEVEL_GOALS.length - 1];
  return lastGoal + (level - ADVENTURE_LEVEL_GOALS.length) * 28;
}

function getLevelForScore(score: number): { level: number; goal: number } {
  let level = 1;
  while (score >= getLevelGoal(level)) level += 1;
  return { level, goal: getLevelGoal(level) };
}

function createLevelState(mode: GameMode, score: number): Pick<GameState, "currentLevel" | "levelGoal" | "obstacles"> {
  if (mode === "endless") {
    return {
      currentLevel: 1,
      levelGoal: getLevelGoal(1),
      obstacles: []
    };
  }
  const { level, goal } = getLevelForScore(score);
  return {
    currentLevel: level,
    levelGoal: goal,
    obstacles: buildObstaclePattern(level)
  };
}

function createRunState(seed = 0): RogueliteRunState {
  const segmentIndex = 1;
  return {
    seed,
    rollCursor: 0,
    segmentIndex,
    segmentEndsAt: null,
    phase: "segment",
    eliteSegment: segmentIndex % ELITE_SEGMENT_INTERVAL === 0,
    collapseStarted: segmentIndex >= COLLAPSE_START_SEGMENT,
    upgradeDraft: null,
    chosenUpgradeIds: [],
    highestCombo: 0
  };
}

function createRunSeed(): number {
  const seed = Math.floor(Math.random() * 0x7fffffff);
  return seed > 0 ? seed : 1;
}

function resolveRunSeed(seed?: number, fallbackSeed?: number): number {
  if (typeof seed === "number" && seed > 0) return seed;
  if (typeof fallbackSeed === "number" && fallbackSeed > 0) return fallbackSeed;
  return createRunSeed();
}

function createBuildModifiers(): BuildModifiers {
  return {
    comboWindowBonusMs: 0,
    dashDistanceBonus: 0,
    tickMsBonusMs: 0,
    canSwallowShorterEnemies: false,
    hasPhaseScales: false
  };
}

function createActiveSkillState(): ActiveSkillState {
  return {
    type: "dash",
    charges: DASH_INITIAL_CHARGES,
    maxCharges: DASH_MAX_CHARGES,
    cooldownMs: DASH_COOLDOWN_MS,
    recoveryEndsAt: null,
    invulnerableUntil: null
  };
}

function pruneTailHazards(state: GameState, now: number): GameState {
  const tailHazards = state.tailHazards.filter((hazard) => hazard.expiresAt > now);
  return tailHazards.length === state.tailHazards.length ? state : { ...state, tailHazards };
}

function createRogueliteScaffolding(seed?: number): Pick<
  GameState,
  "run" | "build" | "tailHazards" | "activeSkill" | "summary"
> {
  return {
    run: createRunState(seed ?? 0),
    build: createBuildModifiers(),
    tailHazards: [],
    activeSkill: createActiveSkillState(),
    summary: null
  };
}

function beginAdventureRun(now: number, seed = 1): RogueliteRunState {
  return {
    ...createRunState(seed),
    segmentEndsAt: now + SEGMENT_DURATION_MS
  };
}

function collectEnemyOccupied(enemies: EnemySnake[]): Set<string> {
  const occupied = new Set<string>();
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    addPoints(occupied, enemy.snake);
  }
  return occupied;
}

function createOccupiedBase(state: Pick<GameState, "snake" | "enemies" | "powerUp" | "obstacles">): Set<string> {
  const occupied = new Set<string>(state.snake.map(pointToKey));
  addPoints(occupied, state.enemies.filter((enemy) => enemy.alive).flatMap((enemy) => enemy.snake));
  addPoints(occupied, state.obstacles);
  if (state.powerUp) occupied.add(pointToKey(state.powerUp.position));
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

function getEnemyPersonality(index: number): EnemyPersonality {
  return ENEMY_PERSONALITIES[index % ENEMY_PERSONALITIES.length];
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
      hue: template.hue,
      personality: getEnemyPersonality(index)
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
        hue: (200 + index * 70) % 360,
        personality: getEnemyPersonality(index)
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

function nearestDistance(point: Point, targets: Point[]): number {
  let best = Infinity;
  for (const target of targets) {
    const distance = Math.abs(target.x - point.x) + Math.abs(target.y - point.y);
    if (distance < best) best = distance;
  }
  return best;
}

function openNeighborCount(point: Point, occupied: Set<string>): number {
  let free = 0;
  (Object.keys(DIRECTION_VECTORS) as Direction[]).forEach((direction) => {
    const neighbor = movePoint(point, direction);
    if (!outOfBounds(neighbor) && !occupied.has(pointToKey(neighbor))) free += 1;
  });
  return free;
}

function chooseEnemyDirection(
  enemy: EnemySnake,
  foods: Point[],
  playerSnake: Point[],
  occupiedByOtherEnemies: Set<string>,
  obstacleSet: Set<string>
): Direction {
  const head = enemy.snake[0];
  const playerHead = playerSnake[0];
  const playerOccupied = new Set(playerSnake.map(pointToKey));
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
      obstacleSet.has(pointToKey(nextHead)) ||
      playerOccupied.has(pointToKey(nextHead)) ||
      occupiedByOtherEnemies.has(pointToKey(nextHead)) ||
      ownSet.has(pointToKey(nextHead));

    if (blocked) continue;

    const totalOccupied = new Set<string>(playerOccupied);
    addPoints(totalOccupied, foods);
    addPoints(totalOccupied, enemy.snake);
    for (const key of occupiedByOtherEnemies) totalOccupied.add(key);
    for (const key of obstacleSet) totalOccupied.add(key);

    const foodDistance = nearestDistance(nextHead, foods);
    const playerDistance = Math.abs(nextHead.x - playerHead.x) + Math.abs(nextHead.y - playerHead.y);
    const freeNeighbors = openNeighborCount(nextHead, totalOccupied);
    const edgeDistance = Math.min(
      nextHead.x,
      BOARD_WIDTH - 1 - nextHead.x,
      nextHead.y,
      BOARD_HEIGHT - 1 - nextHead.y
    );

    let score = foodDistance;
    if (enemy.personality === "hunter") {
      score = playerDistance * 1.1 + foodDistance * 0.55 - freeNeighbors * 0.3;
    }
    if (enemy.personality === "careful") {
      score = foodDistance * 0.9 - freeNeighbors * 1.45 - edgeDistance * 0.4;
    }

    if (score < bestScore) {
      bestScore = score;
      bestDirection = direction;
    }
  }

  return bestDirection;
}

function shouldEnemyAdvance(enemy: EnemySnake, now: number): boolean {
  const cadence = ENEMY_MOVE_CADENCE[enemy.personality];
  if (cadence <= 1) return true;
  return Math.floor(now / INITIAL_TICK_MS) % cadence !== 0;
}

function normalizeCombo(state: GameState, now: number): Pick<GameState, "comboCount" | "comboMultiplier" | "comboExpiresAt"> {
  if (!state.comboExpiresAt || now <= state.comboExpiresAt) {
    return {
      comboCount: state.comboCount,
      comboMultiplier: state.comboCount > 0 ? state.comboMultiplier : 1,
      comboExpiresAt: state.comboExpiresAt
    };
  }
  return {
    comboCount: 0,
    comboMultiplier: 1,
    comboExpiresAt: null
  };
}

function getComboMultiplier(comboCount: number): number {
  return Math.min(MAX_COMBO_MULTIPLIER, Math.max(1, comboCount));
}

function shouldOpenDraft(state: GameState, now: number): boolean {
  return (
    state.mode === "adventure" &&
    state.run.phase === "segment" &&
    state.run.segmentEndsAt !== null &&
    now >= state.run.segmentEndsAt
  );
}

function createDraft(state: GameState, _now: number): { draft: UpgradeDraft; run: RogueliteRunState } {
  const source: UpgradeDraft["source"] = state.run.eliteSegment
    ? "elite"
    : state.run.collapseStarted
      ? "collapseBonus"
      : "normal";
  const { run } = buildUpgradeOffers(
    {
      ...state,
      run: {
        ...state.run,
        phase: "draft",
        upgradeDraft: null
      }
    },
    source
  );
  const draft = run.upgradeDraft ?? {
    offeredIds: [],
    source
  };

  return {
    draft,
    run: {
      ...run,
      phase: "draft",
      segmentEndsAt: null,
      upgradeDraft: draft
    }
  };
}

function advanceRunSegment(run: RogueliteRunState, now: number): RogueliteRunState {
  const segmentIndex = run.segmentIndex + 1;
  return {
    ...run,
    segmentIndex,
    segmentEndsAt: now + SEGMENT_DURATION_MS,
    phase: "segment",
    eliteSegment: segmentIndex % ELITE_SEGMENT_INTERVAL === 0,
    collapseStarted: segmentIndex >= COLLAPSE_START_SEGMENT,
    upgradeDraft: null
  };
}

function buildRunSummary(state: GameState): RunSummary {
  const segmentReached = Math.max(1, state.run.segmentIndex);
  return {
    segmentReached,
    clearedSegments: Math.max(0, segmentReached - 1),
    score: state.score,
    highestCombo: Math.max(state.run.highestCombo, state.comboCount),
    chosenUpgradeIds: [...state.run.chosenUpgradeIds]
  };
}

function getAdventurePressureProfile(run: RogueliteRunState): {
  level: number;
  goalLabel: number;
  obstacleTheme: Point[];
  enemyProfile: EnemyPersonality[];
} {
  const level = Math.max(1, run.segmentIndex);
  const obstacleLevel = run.collapseStarted ? level + 2 : run.eliteSegment ? level + 1 : level;
  let enemyProfile: EnemyPersonality[] = ["greedy"];

  if (level >= 3) enemyProfile = ["greedy", "hunter"];
  if (run.eliteSegment) enemyProfile = ["hunter", "careful"];
  if (level >= 6) enemyProfile = ["greedy", "hunter", "careful"];
  if (run.collapseStarted) enemyProfile = ["hunter", "greedy", "careful"];

  return {
    level,
    goalLabel: Math.min(TARGET_SEGMENTS_PER_RUN, level + 1),
    obstacleTheme: buildObstaclePattern(obstacleLevel),
    enemyProfile
  };
}

function syncAdventureBoardState(state: GameState, now: number): GameState {
  if (state.mode !== "adventure") return state;

  const profile = getAdventurePressureProfile(state.run);
  const desiredEnemyCount = clamp(state.enemyCount, MIN_ENEMY_COUNT, MAX_ENEMY_COUNT);
  const desiredEnemyProfile = Array.from({ length: desiredEnemyCount }, (_, index) => {
    return profile.enemyProfile[index % profile.enemyProfile.length] ?? getEnemyPersonality(index);
  });
  const safeObstacles = sanitizeObstacles(profile.obstacleTheme, [
    ...state.snake,
    ...state.foods,
    ...state.enemies.flatMap((enemy) => enemy.snake),
    ...(state.powerUp ? [state.powerUp.position] : [])
  ]);
  const occupied = new Set<string>(state.snake.map(pointToKey));
  addPoints(occupied, safeObstacles);

  const currentEnemies = state.enemies.filter((enemy) => enemy.alive).slice(0, desiredEnemyCount);
  addPoints(occupied, currentEnemies.flatMap((enemy) => enemy.snake));

  const missing = desiredEnemyCount - currentEnemies.length;
  const extraEnemies: EnemySnake[] = [];
  for (let index = 0; index < missing; index += 1) {
    const extra = spawnEnemyByIndex(
      currentEnemies.length + index,
      occupied,
      state.run.seed + profile.level + index
    );
    if (!extra) continue;
    extraEnemies.push(extra);
  }
  const enemies = [...currentEnemies, ...extraEnemies].slice(0, desiredEnemyCount).map((enemy, index) => ({
    ...enemy,
    id: `enemy-${index + 1}`,
    personality: desiredEnemyProfile[index] ?? getEnemyPersonality(index)
  }));

  const normalized = withBoardState(
    {
      ...state,
      currentLevel: profile.level,
      levelGoal: profile.goalLabel,
      obstacles: safeObstacles,
      enemies
    },
    {},
    state.run.seed + profile.level
  );

  return {
    ...normalized,
    tickMs: computeTickMs(normalized, now)
  };
}

function syncFoodsToBoard(state: GameState, seed?: number): Point[] {
  const occupied = createOccupiedBase(state);
  return fillFoods(state.foods, state.foodCount, occupied, seed);
}

function withBoardState(state: GameState, updates: Partial<GameState>, seed?: number): GameState {
  const merged = { ...state, ...updates };
  const foods = syncFoodsToBoard(merged, seed);
  return { ...merged, foods };
}

export function createInitialState(seed?: number): GameState {
  const midX = Math.floor(BOARD_WIDTH / 2);
  const midY = Math.floor(BOARD_HEIGHT / 2);
  const snake: Point[] = Array.from({ length: INITIAL_SNAKE_LENGTH }, (_, i) => ({
    x: midX - i,
    y: midY
  }));

  const mode: GameMode = "endless";
  const runSeed = resolveRunSeed(seed);
  const levelState = createLevelState(mode, 0);
  const roguelite = createRogueliteScaffolding(runSeed);
  const playerOccupied = new Set<string>(snake.map(pointToKey));
  addPoints(playerOccupied, levelState.obstacles);
  const enemyCount = DEFAULT_ENEMY_COUNT;
  const foodCount = DEFAULT_FOOD_COUNT;
  const enemies = spawnEnemies(enemyCount, playerOccupied, runSeed);
  const occupiedForFoods = new Set<string>(playerOccupied);
  addPoints(occupiedForFoods, enemies.flatMap((enemy) => enemy.snake));
  const foods = fillFoods([], foodCount, occupiedForFoods, runSeed);

  return {
    snake,
    enemies,
    direction: "right",
    queuedDirection: null,
    foods,
    foodCount,
    enemyCount,
    mode,
    currentLevel: levelState.currentLevel,
    levelGoal: levelState.levelGoal,
    obstacles: levelState.obstacles,
    powerUp: null,
    effects: {
      shield: false
    },
    score: 0,
    comboCount: 0,
    comboMultiplier: 1,
    comboExpiresAt: null,
    ...roguelite,
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
  return withBoardState(state, { foodCount }, seed);
}

export function setEnemyCount(state: GameState, nextCount: number, seed?: number): GameState {
  const enemyCount = clamp(nextCount, MIN_ENEMY_COUNT, MAX_ENEMY_COUNT);
  const current = state.enemies.filter((enemy) => enemy.alive).slice(0, enemyCount);
  const occupied = new Set<string>(state.snake.map(pointToKey));
  addPoints(occupied, state.obstacles);
  addPoints(occupied, current.flatMap((enemy) => enemy.snake));
  const missing = enemyCount - current.length;
  const extra = missing > 0 ? spawnEnemies(missing, occupied, seed) : [];
  const merged = [...current, ...extra].map((enemy, index) => ({
    ...enemy,
    id: `enemy-${index + 1}`,
    hue: enemy.hue,
    personality: getEnemyPersonality(index)
  }));

  return withBoardState(
    state,
    {
      enemyCount,
      enemies: merged
    },
    seed
  );
}

export function setGameMode(state: GameState, mode: GameMode, seed?: number): GameState {
  if (state.mode === mode) return state;
  const runSeed = resolveRunSeed(seed, state.run.seed);
  const roguelite = createRogueliteScaffolding(runSeed);

  if (mode === "adventure") {
    return syncAdventureBoardState(
      {
        ...state,
        ...roguelite,
        mode,
        run: {
          ...beginAdventureRun(0, runSeed),
          segmentEndsAt: null
        },
        powerUp: null
      },
      0
    );
  }

  const levelState = createLevelState(mode, state.score);
  const safeObstacles = sanitizeObstacles(levelState.obstacles, [
    ...state.snake,
    ...state.foods,
    ...state.enemies.flatMap((enemy) => enemy.snake),
    ...(state.powerUp ? [state.powerUp.position] : [])
  ]);
  const occupied = new Set<string>(state.snake.map(pointToKey));
  addPoints(occupied, safeObstacles);
  const enemies = spawnEnemies(state.enemyCount, occupied, runSeed);
  const next = {
    ...state,
    ...roguelite,
    mode,
    currentLevel: levelState.currentLevel,
    levelGoal: levelState.levelGoal,
    obstacles: safeObstacles,
    enemies,
    powerUp: null
  };
  return withBoardState(next, {}, runSeed);
}

export function chooseUpgrade(state: GameState, upgradeId: string, now: number): GameState {
  if (state.mode !== "adventure" || state.run.phase !== "draft" || !state.run.upgradeDraft) {
    return state;
  }

  const upgraded = applyUpgradeChoice(state, upgradeId);
  if (upgraded === state) return state;

  return syncAdventureBoardState(
    {
      ...upgraded,
      run: advanceRunSegment(upgraded.run, now)
    },
    now
  );
}

export function useActiveSkill(state: GameState, now: number): GameState {
  if (state.activeSkill.type !== "dash") return state;
  const next = activateDash(state, now);
  if (!state.isGameOver && next.isGameOver && next.mode === "adventure" && next.summary === state.summary) {
    return {
      ...next,
      summary: buildRunSummary(next)
    };
  }
  return next;
}

export function restart(state: GameState, seed?: number): GameState {
  const runSeed = resolveRunSeed(seed, state.run.seed);
  const fresh = createInitialState(runSeed);
  const withMode = setGameMode(fresh, state.mode, runSeed);
  const withFoodSetting = setFoodCount(withMode, state.foodCount, runSeed);
  const withEnemySetting = setEnemyCount(withFoodSetting, state.enemyCount, runSeed);
  return {
    ...withEnemySetting,
    bestScore: state.bestScore,
    gamesPlayed: state.gamesPlayed
  };
}

export function step(state: GameState, now: number): GameState {
  const activeState =
    state.mode === "adventure" &&
    state.run.phase === "segment" &&
    state.run.segmentEndsAt === null
      ? syncAdventureBoardState(
          {
            ...state,
            run: {
              ...state.run,
              segmentEndsAt: beginAdventureRun(now, state.run.seed).segmentEndsAt
            }
          },
          now
        )
      : state;

  state = pruneTailHazards({
    ...activeState,
    activeSkill: tickDashRecovery(activeState.activeSkill, now)
  }, now);

  if (state.isGameOver || state.isPaused) return state;
  if (state.mode === "adventure" && state.run.phase === "draft") return state;
  if (shouldOpenDraft(state, now)) {
    const { run } = createDraft(state, now);
    const drafted = {
      ...state,
      run
    };
    return {
      ...drafted,
      tickMs: computeTickMs(drafted, now)
    };
  }

  const comboState = normalizeCombo(state, now);
  const effects = cleanupExpiredEffects(state.effects, now);
  const collisionRun = {
    ...state.run,
    highestCombo: Math.max(state.run.highestCombo, comboState.comboCount)
  };
  const moveDirection = state.queuedDirection ?? state.direction;
  const currentHead = state.snake[0];
  const ghostWallOn = isEffectActive(effects.ghostWallUntil, now);
  const initialNextHead = movePoint(currentHead, moveDirection);
  const nextHead = ghostWallOn ? wrapPoint(initialNextHead) : initialNextHead;
  const hitWall = outOfBounds(initialNextHead) && !ghostWallOn;
  const obstacleSet = createObstacleSet(state.obstacles);

  const enemyOccupied = collectEnemyOccupied(state.enemies);
  const eatenFoodIndex = state.foods.findIndex((food) => samePoint(nextHead, food));
  const isEating = eatenFoodIndex >= 0;
  const futureBody = isEating ? state.snake : state.snake.slice(0, -1);
  const hitSelf = futureBody.some((segment) => samePoint(segment, nextHead));
  const hitEnemy = enemyOccupied.has(pointToKey(nextHead));
  const hitObstacle = obstacleSet.has(pointToKey(nextHead));
  const fatalCollision = hitWall || hitSelf || hitEnemy || hitObstacle;
  const dashInvulnerable =
    state.activeSkill.invulnerableUntil !== null && now < state.activeSkill.invulnerableUntil;

  if (fatalCollision) {
    if (dashInvulnerable) {
      return {
        ...state,
        ...comboState,
        run: collisionRun,
        direction: moveDirection,
        queuedDirection: null,
        effects,
        tickMs: computeTickMs({ ...state, ...comboState, effects, run: collisionRun }, now)
      };
    }
    if (effects.shield) {
      return {
        ...state,
        ...comboState,
        run: collisionRun,
        direction: moveDirection,
        queuedDirection: null,
        effects: { ...effects, shield: false },
        tickMs: computeTickMs({ ...state, ...comboState, effects, run: collisionRun }, now)
      };
    }
    const gameOverState: GameState = {
      ...state,
      ...comboState,
      run: collisionRun,
      direction: moveDirection,
      queuedDirection: null,
      effects,
      isGameOver: true,
      isPaused: true,
      tickMs: computeTickMs({ ...state, ...comboState, effects, run: collisionRun }, now),
      summary: state.mode === "adventure" ? buildRunSummary({ ...state, ...comboState, run: collisionRun }) : null
    };
    return gameOverState;
  }

  let nextSnake = [nextHead, ...state.snake];
  let nextScore = state.score;
  let nextFoods = [...state.foods];
  let nextComboCount = comboState.comboCount;
  let nextComboMultiplier = comboState.comboMultiplier;
  let nextComboExpiresAt = comboState.comboExpiresAt;

  if (isEating) {
    nextComboCount = comboState.comboCount > 0 ? comboState.comboCount + 1 : 1;
    nextComboMultiplier = getComboMultiplier(nextComboCount);
    nextComboExpiresAt = now + COMBO_WINDOW_MS;
    const doubled = isEffectActive(effects.doubleScoreUntil, now) ? 2 : 1;
    nextScore += doubled * nextComboMultiplier;
  } else {
    nextSnake.pop();
  }

  let nextRun: RogueliteRunState = {
    ...state.run,
    highestCombo: Math.max(state.run.highestCombo, nextComboCount)
  };

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

  const boardPressure =
    state.mode === "adventure"
      ? {
          currentLevel: state.currentLevel,
          levelGoal: state.levelGoal,
          obstacles: state.obstacles
        }
      : createLevelState(state.mode, nextScore);
  const safeObstacles = sanitizeObstacles(boardPressure.obstacles, [
    ...nextSnake,
    ...nextFoods,
    ...state.enemies.flatMap((enemy) => enemy.snake),
    ...(nextPowerUp ? [nextPowerUp.position] : [])
  ]);
  const safeObstacleSet = createObstacleSet(safeObstacles);
  const playerOccupied = new Set<string>(nextSnake.map(pointToKey));
  addPoints(playerOccupied, safeObstacles);

  if (isEating) {
    addPoints(playerOccupied, state.enemies.filter((enemy) => enemy.alive).flatMap((enemy) => enemy.snake));
    if (nextPowerUp) playerOccupied.add(pointToKey(nextPowerUp.position));
    nextFoods = refillFoodAt(nextFoods, eatenFoodIndex, playerOccupied, now + 10);
  }

  const movedEnemies: EnemySnake[] = [];
  for (let index = 0; index < state.enemies.length; index += 1) {
    const enemy = state.enemies[index];
    if (!enemy.alive) continue;
    if (!shouldEnemyAdvance(enemy, now + index)) {
      movedEnemies.push(enemy);
      continue;
    }

    const otherEnemies = new Set<string>();
    addPoints(otherEnemies, safeObstacles);
    for (let j = 0; j < state.enemies.length; j += 1) {
      if (j === index) continue;
      const other = state.enemies[j];
      if (other.alive) addPoints(otherEnemies, other.snake);
    }
    addPoints(otherEnemies, movedEnemies.flatMap((item) => item.snake));

    const direction = chooseEnemyDirection(
      enemy,
      nextFoods,
      nextSnake,
      otherEnemies,
      safeObstacleSet
    );
    const enemyNextHead = movePoint(enemy.snake[0], direction);
    const enemyFoodIndex = nextFoods.findIndex((food) => samePoint(food, enemyNextHead));
    const enemyWillEat = enemyFoodIndex >= 0;
    const ownBody = enemyWillEat ? enemy.snake : enemy.snake.slice(0, -1);
    const ownSet = new Set<string>(ownBody.map(pointToKey));
    const enemyBlocked =
      outOfBounds(enemyNextHead) ||
      safeObstacleSet.has(pointToKey(enemyNextHead)) ||
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
    addPoints(occupied, safeObstacles);
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
    comboCount: nextComboCount,
    comboMultiplier: nextComboMultiplier,
    comboExpiresAt: nextComboExpiresAt,
    run: nextRun,
    bestScore: nextBestScore,
    currentLevel: boardPressure.currentLevel,
    levelGoal: boardPressure.levelGoal,
    obstacles: safeObstacles
  };

  const normalized = withBoardState(interim, {}, now + 100);
  if (state.mode === "adventure") {
    return syncAdventureBoardState(normalized, now);
  }

  return {
    ...normalized,
    tickMs: computeTickMs(normalized, now)
  };
}
