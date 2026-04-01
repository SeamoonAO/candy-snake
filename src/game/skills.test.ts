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

  it("recovers a dash charge after the cooldown ends", () => {
    const used = activateDash(makeAdventureState(), 1000);
    const recovered = tickDashRecovery(used.activeSkill, 1000 + DASH_COOLDOWN_MS);

    expect(recovered.charges).toBe(1);
    expect(recovered.recoveryEndsAt).toBeNull();
  });
});
