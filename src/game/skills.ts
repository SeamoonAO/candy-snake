import { BOARD_HEIGHT, BOARD_WIDTH, DASH_DISTANCE } from "./constants";
import { pointToKey } from "./random";
import type { ActiveSkillState, Direction, EnemySnake, GameState, Point, TailHazard } from "./types";

const DIRECTION_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const DASH_ARMOR_INVULNERABLE_MS = 500;
const SHADOW_TAIL_DURATION_MS = 1_500;

function movePoint(point: Point, direction: Direction): Point {
  const vector = DIRECTION_VECTORS[direction];
  return { x: point.x + vector.x, y: point.y + vector.y };
}

function outOfBounds(point: Point): boolean {
  return point.x < 0 || point.x >= BOARD_WIDTH || point.y < 0 || point.y >= BOARD_HEIGHT;
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function hasChosenUpgrade(state: GameState, upgradeId: string): boolean {
  return state.run.chosenUpgradeIds.includes(upgradeId);
}

function findEnemyHeadAt(enemies: EnemySnake[], point: Point): EnemySnake | undefined {
  return enemies.find((enemy) => enemy.alive && samePoint(enemy.snake[0], point));
}

function hasEnemyOccupancyAt(enemies: EnemySnake[], point: Point, removedEnemyIds: Set<string>): boolean {
  return enemies.some(
    (enemy) =>
      enemy.alive &&
      !removedEnemyIds.has(enemy.id) &&
      enemy.snake.some((segment) => samePoint(segment, point))
  );
}

function buildDashedSnake(snake: Point[], path: Point[]): Point[] {
  return [...path.slice().reverse(), ...snake].slice(0, snake.length);
}

function createTailHazards(state: GameState, path: Point[], now: number): TailHazard[] {
  if (!hasChosenUpgrade(state, "shadow-tail")) {
    return state.tailHazards.filter((hazard) => hazard.expiresAt > now);
  }

  const activeHazards = state.tailHazards.filter((hazard) => hazard.expiresAt > now);
  const nextHazards = path.map((position) => ({
    position,
    expiresAt: now + SHADOW_TAIL_DURATION_MS
  }));

  return [...activeHazards, ...nextHazards];
}

function createRecoveryState(skill: ActiveSkillState, now: number): ActiveSkillState {
  const charges = skill.charges - 1;
  return {
    ...skill,
    charges,
    recoveryEndsAt:
      charges < skill.maxCharges && skill.recoveryEndsAt === null ? now + skill.cooldownMs : skill.recoveryEndsAt
  };
}

function createFatalDashState(state: GameState, skill: ActiveSkillState, now: number): GameState {
  return {
    ...state,
    activeSkill: createRecoveryState(skill, now),
    isGameOver: true,
    isPaused: true
  };
}

export function getDashPath(head: Point, direction: Direction, distance: number): Point[] {
  const path: Point[] = [];
  let cursor = head;

  for (let index = 0; index < distance; index += 1) {
    cursor = movePoint(cursor, direction);
    path.push(cursor);
  }

  return path;
}

export function tickDashRecovery(skill: ActiveSkillState, now: number): ActiveSkillState {
  const invulnerableUntil =
    skill.invulnerableUntil !== null && now >= skill.invulnerableUntil ? null : skill.invulnerableUntil;

  if (skill.charges >= skill.maxCharges) {
    return {
      ...skill,
      recoveryEndsAt: null,
      invulnerableUntil
    };
  }

  if (skill.recoveryEndsAt === null) {
    return {
      ...skill,
      invulnerableUntil
    };
  }

  let charges = skill.charges;
  let recoveryEndsAt = skill.recoveryEndsAt;
  while (recoveryEndsAt !== null && now >= recoveryEndsAt && charges < skill.maxCharges) {
    charges += 1;
    recoveryEndsAt = charges < skill.maxCharges ? recoveryEndsAt + skill.cooldownMs : null;
  }

  return {
    ...skill,
    charges,
    recoveryEndsAt,
    invulnerableUntil
  };
}

export function activateDash(state: GameState, now: number): GameState {
  if (
    state.mode !== "adventure" ||
    state.run.phase === "draft" ||
    state.isPaused ||
    state.isGameOver ||
    state.activeSkill.type !== "dash"
  ) {
    return state;
  }

  const recoveredSkill = tickDashRecovery(state.activeSkill, now);
  if (recoveredSkill.charges <= 0) {
    return {
      ...state,
      activeSkill: recoveredSkill,
      tailHazards: state.tailHazards.filter((hazard) => hazard.expiresAt > now)
    };
  }

  const dashDistance = DASH_DISTANCE + state.build.dashDistanceBonus;
  const dashPath = getDashPath(state.snake[0], state.direction, dashDistance);
  const obstacleKeys = new Set(state.obstacles.map(pointToKey));
  const selfKeys = new Set(state.snake.slice(0, -1).map(pointToKey));
  const removedEnemyIds = new Set<string>();
  let phaseScalesUsed = false;

  for (const cell of dashPath) {
    if (outOfBounds(cell) || selfKeys.has(pointToKey(cell))) {
      return createFatalDashState(state, recoveredSkill, now);
    }

    const enemyHead = findEnemyHeadAt(state.enemies, cell);
    if (
      enemyHead &&
      state.build.canSwallowShorterEnemies &&
      state.snake.length > enemyHead.snake.length
    ) {
      removedEnemyIds.add(enemyHead.id);
      continue;
    }

    const blockedByEnemy = hasEnemyOccupancyAt(state.enemies, cell, removedEnemyIds);
    const blockedByObstacle = obstacleKeys.has(pointToKey(cell));
    if (blockedByEnemy || blockedByObstacle) {
      if (state.build.hasPhaseScales && !phaseScalesUsed) {
        phaseScalesUsed = true;
        continue;
      }
      return createFatalDashState(state, recoveredSkill, now);
    }
  }

  return {
    ...state,
    snake: buildDashedSnake(state.snake, dashPath),
    enemies: state.enemies.map((enemy) =>
      removedEnemyIds.has(enemy.id)
        ? {
            ...enemy,
            alive: false,
            snake: []
          }
        : enemy
    ),
    queuedDirection: null,
    tailHazards: createTailHazards(state, dashPath, now),
    activeSkill: {
      ...createRecoveryState(recoveredSkill, now),
      invulnerableUntil: hasChosenUpgrade(state, "dash-armor")
        ? now + DASH_ARMOR_INVULNERABLE_MS
        : recoveredSkill.invulnerableUntil
    }
  };
}
