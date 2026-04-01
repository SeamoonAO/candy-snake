import { describe, expect, it, vi } from "vitest";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  COMBO_WINDOW_MS,
  DEFAULT_ENEMY_COUNT,
  DEFAULT_FOOD_COUNT,
  INITIAL_TICK_MS,
  MIN_BASE_TICK_MS,
  TARGET_SEGMENTS_PER_RUN
} from "./constants";
import {
  createInitialState,
  setEnemyCount,
  setFoodCount,
  setGameMode,
  step,
  turn
} from "./engine";
import type { GameState } from "./types";

function runningState(base = createInitialState()): GameState {
  return { ...base, isPaused: false, isGameOver: false };
}

describe("engine", () => {
  it("creates valid initial state", () => {
    const state = createInitialState();
    expect(state.snake).toHaveLength(4);
    expect(state.score).toBe(0);
    expect(state.tickMs).toBe(INITIAL_TICK_MS);
    expect(state.isPaused).toBe(true);
    expect(state.powerUp).toBeNull();
    expect(state.foods).toHaveLength(DEFAULT_FOOD_COUNT);
    expect(state.enemies).toHaveLength(DEFAULT_ENEMY_COUNT);
    expect(state.comboMultiplier).toBe(1);
    expect(state.mode).toBe("endless");
  });

  it("blocks immediate reverse direction", () => {
    const state = createInitialState();
    const reversed = turn(state, "left");
    expect(reversed.queuedDirection).toBeNull();
    const allowed = turn(state, "up");
    expect(allowed.queuedDirection).toBe("up");
  });

  it("eats food, grows snake and increments score", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = createInitialState();
    const head = state.snake[0];
    const next = step(
      runningState({
        ...state,
        foods: [{ x: head.x + 1, y: head.y }, ...state.foods.slice(1)]
      }),
      1000
    );
    expect(next.score).toBe(1);
    expect(next.snake.length).toBe(state.snake.length + 1);
    vi.restoreAllMocks();
  });

  it("builds combo multiplier when foods are chained quickly", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = runningState(createInitialState());
    const head = state.snake[0];
    const first = step(
      {
        ...state,
        foods: [{ x: head.x + 1, y: head.y }, ...state.foods.slice(1)]
      },
      1000
    );
    const secondHead = first.snake[0];
    const second = step(
      {
        ...first,
        foods: [{ x: secondHead.x + 1, y: secondHead.y }, ...first.foods.slice(1)]
      },
      1000 + COMBO_WINDOW_MS - 50
    );

    expect(first.comboMultiplier).toBe(1);
    expect(second.comboMultiplier).toBe(2);
    expect(second.score).toBe(3);
    vi.restoreAllMocks();
  });

  it("resets combo after the combo window expires", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const first = runningState({
      ...createInitialState(),
      comboCount: 3,
      comboMultiplier: 3,
      comboExpiresAt: 1000
    });
    const next = step(first, 1000 + COMBO_WINDOW_MS + 1);
    expect(next.comboCount).toBe(0);
    expect(next.comboMultiplier).toBe(1);
    expect(next.comboExpiresAt).toBeNull();
    vi.restoreAllMocks();
  });

  it("applies score-based speed floor", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = runningState({
      ...createInitialState(),
      score: 200
    });
    const next = step(state, 1000);
    expect(next.tickMs).toBe(MIN_BASE_TICK_MS);
    vi.restoreAllMocks();
  });

  it("applies and expires timed effects", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = runningState({
      ...createInitialState(),
      effects: {
        shield: false,
        speedUpUntil: 1,
        slowDownUntil: 1,
        ghostWallUntil: 1,
        doubleScoreUntil: 1
      }
    });
    const next = step(state, 1000);
    expect(next.effects.speedUpUntil).toBeUndefined();
    expect(next.effects.slowDownUntil).toBeUndefined();
    expect(next.effects.ghostWallUntil).toBeUndefined();
    expect(next.effects.doubleScoreUntil).toBeUndefined();
    vi.restoreAllMocks();
  });

  it("applies speed up and slow down powerups", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const base = runningState(createInitialState());
    const head = base.snake[0];

    const speedUp = step(
      {
        ...base,
        powerUp: {
          type: "SPEED_UP",
          position: { x: head.x + 1, y: head.y },
          expiresAt: 6000
        }
      },
      1000
    );
    expect(speedUp.effects.speedUpUntil).toBe(7000);
    expect(speedUp.tickMs).toBeLessThan(INITIAL_TICK_MS);

    const slowDown = step(
      {
        ...base,
        powerUp: {
          type: "SLOW_DOWN",
          position: { x: head.x + 1, y: head.y },
          expiresAt: 6000
        }
      },
      1000
    );
    expect(slowDown.effects.slowDownUntil).toBe(7000);
    expect(slowDown.tickMs).toBeGreaterThan(INITIAL_TICK_MS);
    vi.restoreAllMocks();
  });

  it("supports ghost wall wrapping", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = runningState({
      ...createInitialState(),
      direction: "right",
      snake: [
        { x: BOARD_WIDTH - 1, y: 3 },
        { x: BOARD_WIDTH - 2, y: 3 },
        { x: BOARD_WIDTH - 3, y: 3 },
        { x: BOARD_WIDTH - 4, y: 3 }
      ],
      effects: {
        shield: false,
        ghostWallUntil: 9999
      }
    });
    const next = step(state, 1000);
    expect(next.snake[0]).toEqual({ x: 0, y: 3 });
    expect(next.isGameOver).toBe(false);
    vi.restoreAllMocks();
  });

  it("applies double score on food", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = runningState(createInitialState());
    const head = state.snake[0];
    const next = step(
      {
        ...state,
        foods: [{ x: head.x + 1, y: head.y }, ...state.foods.slice(1)],
        effects: {
          ...state.effects,
          doubleScoreUntil: 10_000
        }
      },
      1000
    );
    expect(next.score).toBe(2);
    vi.restoreAllMocks();
  });

  it("shorten powerup never shrinks below 3 segments", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = runningState({
      ...createInitialState(),
      snake: [
        { x: 8, y: 8 },
        { x: 7, y: 8 },
        { x: 6, y: 8 },
        { x: 5, y: 8 }
      ],
      direction: "right",
      powerUp: {
        type: "SHORTEN",
        position: { x: 9, y: 8 },
        expiresAt: 10_000
      }
    });
    const next = step(state, 1000);
    expect(next.snake.length).toBe(3);
    vi.restoreAllMocks();
  });

  it("shield consumes one fatal hit then game over on next", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = runningState({
      ...createInitialState(),
      snake: [
        { x: BOARD_WIDTH - 1, y: 5 },
        { x: BOARD_WIDTH - 2, y: 5 },
        { x: BOARD_WIDTH - 3, y: 5 },
        { x: BOARD_WIDTH - 4, y: 5 }
      ],
      direction: "right",
      effects: { shield: true }
    });
    const first = step(state, 1000);
    expect(first.isGameOver).toBe(false);
    expect(first.effects.shield).toBe(false);

    const second = step(first, 1010);
    expect(second.isGameOver).toBe(true);
    vi.restoreAllMocks();
  });

  it("hits wall without ghost and ends game", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = runningState({
      ...createInitialState(),
      snake: [
        { x: 0, y: BOARD_HEIGHT - 1 },
        { x: 1, y: BOARD_HEIGHT - 1 },
        { x: 2, y: BOARD_HEIGHT - 1 },
        { x: 3, y: BOARD_HEIGHT - 1 }
      ],
      direction: "left"
    });
    const next = step(state, 1000);
    expect(next.isGameOver).toBe(true);
    vi.restoreAllMocks();
  });

  it("supports runtime food count adjustment", () => {
    const state = createInitialState();
    const more = setFoodCount(state, 10);
    expect(more.foodCount).toBe(10);
    expect(more.foods).toHaveLength(10);

    const less = setFoodCount(more, 2);
    expect(less.foodCount).toBe(2);
    expect(less.foods).toHaveLength(2);
  });

  it("supports runtime enemy count adjustment", () => {
    const state = createInitialState();
    const triple = setEnemyCount(state, 3);
    expect(triple.enemyCount).toBe(3);
    expect(triple.enemies.filter((enemy) => enemy.alive).length).toBe(3);
    expect(new Set(triple.enemies.map((enemy) => enemy.personality)).size).toBe(3);
  });

  it("enables adventure mode with obstacle maps", () => {
    const state = setGameMode(createInitialState(), "adventure", 1);
    expect(state.mode).toBe("adventure");
    expect(state.obstacles.length).toBeGreaterThan(0);
    expect(state.currentLevel).toBe(1);
  });

  it("initializes adventure runs with segment state and dash skill", () => {
    const state = setGameMode(createInitialState(), "adventure", 1);

    expect(state.run.segmentIndex).toBe(1);
    expect(state.run.phase).toBe("segment");
    expect(state.run.upgradeDraft).toBeNull();
    expect(state.activeSkill.type).toBe("dash");
    expect(state.activeSkill.charges).toBe(1);
    expect(state.summary).toBeNull();
  });

  it("keeps adventure segment metadata stable before progression is implemented", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const base = setGameMode(createInitialState(), "adventure", 1);
    const state = runningState({
      ...base,
      score: 11,
      foods: [{ x: base.snake[0].x + 1, y: base.snake[0].y }, ...base.foods.slice(1)]
    });
    const next = step(state, 1000);
    expect(next.currentLevel).toBe(1);
    expect(next.levelGoal).toBe(TARGET_SEGMENTS_PER_RUN);
    expect(next.run.segmentIndex).toBe(1);
    expect(next.obstacles.length).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it("treats obstacles as fatal collisions", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = runningState({
      ...createInitialState(),
      obstacles: [{ x: 17, y: 16 }],
      snake: [
        { x: 16, y: 16 },
        { x: 15, y: 16 },
        { x: 14, y: 16 },
        { x: 13, y: 16 }
      ],
      direction: "right"
    });
    const next = step(state, 1000);
    expect(next.isGameOver).toBe(true);
    vi.restoreAllMocks();
  });
});
