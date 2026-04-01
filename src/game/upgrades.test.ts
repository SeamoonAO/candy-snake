import { describe, expect, it } from "vitest";
import { createInitialState, setGameMode } from "./engine";
import { buildUpgradeOffers, UPGRADE_DEFS } from "./upgrades";
import type { GameState } from "./types";

function makeAdventureState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...setGameMode(createInitialState(), "adventure", 1),
    ...overrides
  };
}

describe("upgrades", () => {
  it("generates three distinct upgrade offers for a normal segment", () => {
    const { offers } = buildUpgradeOffers(makeAdventureState(), "normal");
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((offer) => offer.id)).size).toBe(3);
  });

  it("does not offer already chosen one-time mutations again", () => {
    const state = makeAdventureState({
      run: {
        ...makeAdventureState().run,
        chosenUpgradeIds: ["swallow-gland"]
      }
    });
    const { offers } = buildUpgradeOffers(state, "elite");
    expect(offers.some((offer) => offer.id === "swallow-gland")).toBe(false);
  });

  it("uses stored run RNG state so repeated calls from the same state stay deterministic", () => {
    const state = makeAdventureState();
    expect(buildUpgradeOffers(state, "normal").offers.map((offer) => offer.id)).toEqual(
      buildUpgradeOffers(state, "normal").offers.map((offer) => offer.id)
    );
  });

  it("boosts mutation or skill rarity for elite drafts", () => {
    const { offers } = buildUpgradeOffers(makeAdventureState(), "elite");
    expect(offers.some((offer) => offer.rarity !== "common")).toBe(true);
  });

  it("keeps the MVP catalog inside the planned size range", () => {
    expect(UPGRADE_DEFS.length).toBeGreaterThanOrEqual(18);
    expect(UPGRADE_DEFS.length).toBeLessThanOrEqual(24);
  });
});
