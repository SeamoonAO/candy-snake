import { describe, expect, it, vi } from "vitest";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  COMBO_WINDOW_MS,
  DEFAULT_ENEMY_COUNT,
  DEFAULT_FOOD_COUNT,
  INITIAL_TICK_MS,
  MIN_BASE_TICK_MS
} from "./constants";
import {
  chooseUpgrade,
  createInitialState,
  restart,
  setEnemyCount,
  setFoodCount,
  setGameMode,
  step,
  turn,
  useActiveSkill
} from "./engine";
import type { GameState } from "./types";

function runningState(base = createInitialState()): GameState {
  return { ...base, isPaused: false, isGameOver: false };
}

function makeAdventureState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...setGameMode(createInitialState(), "adventure", 1),
    isPaused: false,
    ...overrides
  };
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

  it("keeps endless mode out of upgrade drafts even if run timing data is present", () => {
    const state = runningState({
      ...createInitialState(5),
      run: {
        ...createInitialState(5).run,
        segmentEndsAt: 1000
      }
    });

    const next = step(state, 1001);

    expect(next.mode).toBe("endless");
    expect(next.run.phase).toBe("segment");
    expect(next.run.upgradeDraft).toBeNull();
  });

  it("preserves the configured enemy count when switching to adventure", () => {
    const state = setEnemyCount(createInitialState(), 3);
    const next = setGameMode(state, "adventure", 1);

    expect(next.enemyCount).toBe(3);
    expect(next.enemies.filter((enemy) => enemy.alive)).toHaveLength(3);
  });

  it("opens an upgrade draft when an adventure segment ends without advancing the board", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const base = makeAdventureState();
    const state = makeAdventureState({
      snake: [
        { x: 12, y: 12 },
        { x: 11, y: 12 },
        { x: 10, y: 12 },
        { x: 9, y: 12 }
      ],
      direction: "right",
      enemies: [],
      foods: [{ x: 2, y: 2 }],
      run: { ...base.run, segmentEndsAt: 1000 }
    });

    const next = step(state, 1001);

    expect(next.isPaused).toBe(false);
    expect(next.run.phase).toBe("draft");
    expect(next.run.upgradeDraft?.offeredIds).toHaveLength(3);
    expect(next.snake).toEqual(state.snake);
    expect(next.enemies).toEqual(state.enemies);
    expect(next.score).toBe(state.score);
    vi.restoreAllMocks();
  });

  it("stores a build summary when the run ends", () => {
    const base = makeAdventureState();
    const next = step(
      makeAdventureState({
        run: {
          ...base.run,
          chosenUpgradeIds: ["combo-window-up"],
          segmentIndex: 4
        },
        snake: [
          { x: 31, y: 16 },
          { x: 30, y: 16 },
          { x: 29, y: 16 },
          { x: 28, y: 16 }
        ],
        direction: "right"
      }),
      1000
    );

    expect(next.summary?.segmentReached).toBeGreaterThan(0);
    expect(next.summary?.chosenUpgradeIds).toContain("combo-window-up");
  });

  it("clears hidden pause state when choosing an adventure upgrade", () => {
    const base = makeAdventureState();
    const state = makeAdventureState({
      isPaused: true,
      run: {
        ...base.run,
        phase: "draft",
        upgradeDraft: {
          offeredIds: ["combo-window-up", "sugar-debt", "dash-line"],
          source: "normal"
        }
      }
    });

    const next = chooseUpgrade(state, "combo-window-up", 1000);

    expect(next.run.phase).toBe("segment");
    expect(next.run.upgradeDraft).toBeNull();
    expect(next.isPaused).toBe(false);
    expect(next.run.chosenUpgradeIds).toContain("combo-window-up");
  });

  it("uses collapse bonus rewards on non-elite collapse drafts", () => {
    const base = makeAdventureState();
    const state = makeAdventureState({
      run: {
        ...base.run,
        segmentIndex: 10,
        segmentEndsAt: 1000,
        phase: "segment",
        eliteSegment: false,
        collapseStarted: true,
        upgradeDraft: null
      }
    });

    const next = step(state, 1001);

    expect(next.run.phase).toBe("draft");
    expect(next.run.upgradeDraft?.source).toBe("collapseBonus");
  });

  it("keeps overclocked metabolism faster than a neutral upgrade after resuming adventure", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const base = makeAdventureState({
      snake: [
        { x: 16, y: 16 },
        { x: 15, y: 16 },
        { x: 14, y: 16 },
        { x: 13, y: 16 }
      ],
      direction: "right",
      foods: [{ x: 2, y: 2 }],
      run: {
        ...makeAdventureState().run,
        phase: "draft",
        upgradeDraft: {
          offeredIds: ["overclocked-metabolism", "sugar-debt", "dash-line"],
          source: "normal"
        }
      }
    });

    const overclocked = chooseUpgrade(base, "overclocked-metabolism", 1000);
    const neutral = chooseUpgrade(base, "sugar-debt", 1000);

    expect(overclocked.tickMs).toBeLessThan(neutral.tickMs);

    const overclockedStep = step(overclocked, 1001);
    const neutralStep = step(neutral, 1001);

    expect(overclockedStep.tickMs).toBeLessThan(neutralStep.tickMs);
    vi.restoreAllMocks();
  });

  it("creates a non-zero run seed and preserves it through mode transitions and restart", () => {
    const initial = createInitialState();
    const seed = initial.run.seed;

    expect(seed).toBeGreaterThan(0);

    const adventure = setGameMode(initial, "adventure");
    expect(adventure.run.seed).toBe(seed);

    const endless = setGameMode(adventure, "endless");
    expect(endless.run.seed).toBe(seed);

    const restarted = restart(adventure);
    expect(restarted.run.seed).toBe(seed);
  });

  it("clears roguelite state when switching back to endless", () => {
    const base = setGameMode(createInitialState(7), "adventure", 7);
    const draftState: GameState = {
      ...base,
      run: {
        ...base.run,
        rollCursor: 2,
        segmentEndsAt: 1234,
        phase: "draft",
        eliteSegment: true,
        collapseStarted: true,
        upgradeDraft: {
          offeredIds: ["alpha", "beta"],
          source: "elite"
        },
        chosenUpgradeIds: ["starter"],
        highestCombo: 4
      },
      build: {
        comboWindowBonusMs: 200,
        dashDistanceBonus: 1,
        tickMsBonusMs: 8,
        canSwallowShorterEnemies: true,
        hasPhaseScales: true
      },
      tailHazards: [{ position: { x: 3, y: 4 }, expiresAt: 999 }],
      activeSkill: {
        ...base.activeSkill,
        charges: 0,
        recoveryEndsAt: 500,
        invulnerableUntil: 700
      },
      summary: {
        segmentReached: 3,
        clearedSegments: 2,
        score: 99,
        highestCombo: 4,
        chosenUpgradeIds: ["starter"]
      }
    };

    const next = setGameMode(draftState, "endless");

    expect(next.mode).toBe("endless");
    expect(next.run).toEqual({
      seed: 7,
      rollCursor: 0,
      segmentIndex: 1,
      segmentEndsAt: null,
      phase: "segment",
      eliteSegment: false,
      collapseStarted: false,
      upgradeDraft: null,
      chosenUpgradeIds: [],
      highestCombo: 0
    });
    expect(next.build).toEqual({
      comboWindowBonusMs: 0,
      dashDistanceBonus: 0,
      tickMsBonusMs: 0,
      canSwallowShorterEnemies: false,
      hasPhaseScales: false
    });
    expect(next.tailHazards).toEqual([]);
    expect(next.activeSkill).toEqual({
      type: "dash",
      charges: 1,
      maxCharges: 1,
      cooldownMs: 9000,
      recoveryEndsAt: null,
      invulnerableUntil: null
    });
    expect(next.summary).toBeNull();
  });

  it("clears draft and summary state on restart", () => {
    const base = setGameMode(createInitialState(7), "adventure", 7);
    const state = {
      ...base,
      score: 12,
      isPaused: false,
      run: {
        ...base.run,
        phase: "draft" as const,
        upgradeDraft: {
          offeredIds: ["combo-window-up", "dash-line", "phase-scales"],
          source: "elite" as const
        },
        chosenUpgradeIds: ["combo-window-up"]
      },
      summary: {
        segmentReached: 4,
        clearedSegments: 3,
        score: 12,
        highestCombo: 2,
        chosenUpgradeIds: ["combo-window-up"]
      }
    };

    const next = restart(state, 7);

    expect(next.score).toBe(0);
    expect(next.run.phase).toBe("segment");
    expect(next.run.upgradeDraft).toBeNull();
    expect(next.run.chosenUpgradeIds).toEqual([]);
    expect(next.summary).toBeNull();
  });

  it("reaches at least three distinct adventure pressure profiles across the run", () => {
    const early = step(
      makeAdventureState({
        isPaused: true,
        enemyCount: 3,
        enemies: [],
        run: {
          ...makeAdventureState().run,
          segmentIndex: 1,
          eliteSegment: false,
          collapseStarted: false,
          segmentEndsAt: null
        }
      }),
      1000
    );
    const elite = step(
      makeAdventureState({
        isPaused: true,
        enemyCount: 3,
        enemies: [],
        run: {
          ...makeAdventureState().run,
          segmentIndex: 3,
          eliteSegment: true,
          collapseStarted: false,
          segmentEndsAt: null
        }
      }),
      1000
    );
    const late = step(
      makeAdventureState({
        isPaused: true,
        enemyCount: 3,
        enemies: [],
        run: {
          ...makeAdventureState().run,
          segmentIndex: 6,
          eliteSegment: true,
          collapseStarted: false,
          segmentEndsAt: null
        }
      }),
      1000
    );

    const profiles = new Set(
      [early, elite, late].map((state) => state.enemies.map((enemy) => enemy.personality).join(","))
    );

    expect(profiles.size).toBeGreaterThanOrEqual(3);
  });

  it("replaces score-threshold adventure progression with run-segment pressure", () => {
    vi.spyOn(Math, "random").mockImplementation(() => 0.9);
    const state = makeAdventureState({ score: 999 });
    const next = step(state, 1000);
    expect(next.currentLevel).toBe(state.run.segmentIndex);
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

  it("does not trigger dash while an adventure draft is open", () => {
    const state = makeAdventureState({
      run: {
        ...makeAdventureState().run,
        phase: "draft",
        upgradeDraft: {
          offeredIds: ["dash-line", "phase-scales", "shadow-tail"],
          source: "normal"
        }
      }
    });

    const next = useActiveSkill(state, 1000);

    expect(next).toBe(state);
    expect(next.activeSkill.charges).toBe(state.activeSkill.charges);
    expect(next.snake).toEqual(state.snake);
  });

  it("lets dash rescue the player from immediate obstacle pressure in adventure", () => {
    const state = makeAdventureState({
      currentLevel: 2,
      levelGoal: 3,
      snake: [
        { x: 14, y: 10 },
        { x: 13, y: 10 },
        { x: 12, y: 10 },
        { x: 11, y: 10 }
      ],
      direction: "right",
      foods: [{ x: 3, y: 3 }],
      enemies: [],
      obstacles: [{ x: 16, y: 10 }],
      build: {
        ...makeAdventureState().build,
        hasPhaseScales: true
      },
      run: {
        ...makeAdventureState().run,
        segmentIndex: 2,
        eliteSegment: false,
        collapseStarted: false,
        segmentEndsAt: 5000
      }
    });

    const dashed = useActiveSkill(state, 1000);
    const next = step(dashed, 1010);

    expect(dashed.isGameOver).toBe(false);
    expect(dashed.snake[0]).toEqual({ x: 17, y: 10 });
    expect(next.isGameOver).toBe(false);
    expect(next.snake[0]).toEqual({ x: 18, y: 10 });
    expect(next.obstacles).toContainEqual({ x: 16, y: 11 });
  });

  it("swallow-gland removes a shorter enemy instead of killing the player on dash", () => {
    const enemy = {
      id: "enemy-1",
      snake: [
        { x: 18, y: 16 },
        { x: 18, y: 17 },
        { x: 18, y: 18 }
      ],
      direction: "up" as const,
      alive: true,
      hue: 120,
      personality: "hunter" as const
    };
    const state = makeAdventureState({
      snake: [
        { x: 16, y: 16 },
        { x: 15, y: 16 },
        { x: 14, y: 16 },
        { x: 13, y: 16 },
        { x: 12, y: 16 }
      ],
      direction: "right",
      foods: [{ x: 3, y: 3 }],
      enemies: [enemy],
      obstacles: [],
      build: {
        ...makeAdventureState().build,
        canSwallowShorterEnemies: true
      }
    });

    const next = useActiveSkill(state, 1000);

    expect(next.isGameOver).toBe(false);
    expect(next.enemies[0]?.alive).toBe(false);
  });

  it("records shadow-tail hazards on crossed dash cells", () => {
    const state = makeAdventureState({
      snake: [
        { x: 16, y: 16 },
        { x: 15, y: 16 },
        { x: 14, y: 16 },
        { x: 13, y: 16 }
      ],
      direction: "right",
      foods: [{ x: 3, y: 3 }],
      enemies: [],
      obstacles: [],
      run: {
        ...makeAdventureState().run,
        chosenUpgradeIds: ["shadow-tail"]
      }
    });

    const next = useActiveSkill(state, 1000);

    expect(next.tailHazards.map((hazard) => hazard.position)).toEqual([
      { x: 17, y: 16 },
      { x: 18, y: 16 },
      { x: 19, y: 16 }
    ]);
    expect(next.tailHazards.every((hazard) => hazard.expiresAt > 1000)).toBe(true);
  });

  it("keeps movement progression coherent while dash-armor invulnerability is active", () => {
    const state = makeAdventureState({
      currentLevel: 2,
      levelGoal: 3,
      snake: [
        { x: 15, y: 11 },
        { x: 14, y: 11 },
        { x: 13, y: 11 },
        { x: 12, y: 11 }
      ],
      direction: "right",
      foods: [{ x: 3, y: 3 }],
      enemies: [],
      obstacles: [{ x: 16, y: 11 }],
      run: {
        ...makeAdventureState().run,
        segmentIndex: 2,
        eliteSegment: false,
        collapseStarted: false,
        segmentEndsAt: 5000
      },
      activeSkill: {
        ...makeAdventureState().activeSkill,
        invulnerableUntil: 2000
      }
    });

    const next = step(state, 1500);

    expect(next.isGameOver).toBe(false);
    expect(next.snake[0]).toEqual({ x: 16, y: 11 });
    expect(next.snake[1]).toEqual({ x: 15, y: 11 });
  });
});
