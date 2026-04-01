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

  it("uses run seed and roll cursor to drive deterministic drafts", () => {
    const baseState = makeAdventureState();
    const firstState = {
      ...baseState,
      run: {
        ...baseState.run,
        rollCursor: 0
      }
    };
    const sameCursorState = {
      ...baseState,
      run: {
        ...baseState.run,
        rollCursor: 0
      }
    };
    const advancedCursorState = {
      ...baseState,
      run: {
        ...baseState.run,
        rollCursor: 1
      }
    };

    const firstDraft = buildUpgradeOffers(firstState, "normal");
    const sameCursorDraft = buildUpgradeOffers(sameCursorState, "normal");
    const advancedCursorDraft = buildUpgradeOffers(advancedCursorState, "normal");

    expect(firstDraft.offers.map((offer) => offer.id)).toEqual(
      sameCursorDraft.offers.map((offer) => offer.id)
    );
    expect(firstDraft.run.upgradeDraft?.offeredIds).toEqual(
      sameCursorDraft.run.upgradeDraft?.offeredIds
    );
    expect(advancedCursorDraft.offers.map((offer) => offer.id)).not.toEqual(
      firstDraft.offers.map((offer) => offer.id)
    );
    expect(advancedCursorDraft.run.upgradeDraft?.offeredIds).not.toEqual(
      firstDraft.run.upgradeDraft?.offeredIds
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
