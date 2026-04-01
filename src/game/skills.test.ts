import { describe, expect, it } from "vitest";
import { DASH_COOLDOWN_MS } from "./constants";
import { createInitialState, setGameMode } from "./engine";
import { activateDash, getDashPath, tickDashRecovery } from "./skills";
import type { GameState, Point } from "./types";

function makeAdventureState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...setGameMode(createInitialState(), "adventure", 1),
    isPaused: false,
    ...overrides
  };
}

describe("skills", () => {
  it("returns each crossed cell for a dash path", () => {
    expect(getDashPath({ x: 16, y: 16 }, "right", 3)).toEqual<Point[]>([
      { x: 17, y: 16 },
      { x: 18, y: 16 },
      { x: 19, y: 16 }
    ]);
  });

  it("spends one dash charge and moves multiple cells forward", () => {
    const next = activateDash(makeAdventureState(), 1000);

    expect(next.activeSkill.charges).toBe(0);
    expect(next.snake[0]).toEqual({ x: 19, y: 16 });
  });

  it("fails the dash when a blocked path has no mutation support", () => {
    const next = activateDash(
      makeAdventureState({
        obstacles: [{ x: 18, y: 16 }]
      }),
      1000
    );

    expect(next.isGameOver).toBe(true);
    expect(next.snake[0]).toEqual({ x: 16, y: 16 });
    expect(next.activeSkill.charges).toBe(0);
  });

  it("swallow-gland removes the whole shorter enemy from the crossed dash path", () => {
    const next = activateDash(
      makeAdventureState({
        snake: [
          { x: 16, y: 16 },
          { x: 15, y: 16 },
          { x: 14, y: 16 },
          { x: 13, y: 16 },
          { x: 12, y: 16 }
        ],
        enemies: [
          {
            id: "enemy-1",
            snake: [
              { x: 17, y: 16 },
              { x: 18, y: 16 },
              { x: 19, y: 16 }
            ],
            direction: "right",
            alive: true,
            hue: 120,
            personality: "hunter"
          }
        ],
        build: {
          ...makeAdventureState().build,
          canSwallowShorterEnemies: true
        }
      }),
      1000
    );

    expect(next.isGameOver).toBe(false);
    expect(next.snake[0]).toEqual({ x: 19, y: 16 });
    expect(next.enemies[0]?.alive).toBe(false);
  });

  it("grants and then clears the dash-armor invulnerability window", () => {
    const used = activateDash(
      makeAdventureState({
        run: {
          ...makeAdventureState().run,
          chosenUpgradeIds: ["dash-armor"]
        }
      }),
      1000
    );

    expect(used.activeSkill.invulnerableUntil).toBe(1500);

    const stillActive = tickDashRecovery(used.activeSkill, 1499);
    expect(stillActive.invulnerableUntil).toBe(1500);

    const expired = tickDashRecovery(used.activeSkill, 1500);
    expect(expired.invulnerableUntil).toBeNull();
  });

  it("recovers a dash charge after the cooldown ends", () => {
    const used = activateDash(makeAdventureState(), 1000);
    const recovered = tickDashRecovery(used.activeSkill, 1000 + DASH_COOLDOWN_MS);

    expect(recovered.charges).toBe(1);
    expect(recovered.recoveryEndsAt).toBeNull();
  });
});
