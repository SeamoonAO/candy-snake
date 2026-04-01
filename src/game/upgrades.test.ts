import { describe, expect, it } from "vitest";
import { createInitialState, setGameMode } from "./engine";
import {
  applyUpgradeChoice,
  buildUpgradeOffers,
  resolveUpgradeOffers,
  UPGRADE_DEFS
} from "./upgrades";
import type { GameState, UpgradeDraft } from "./types";

function makeAdventureState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...setGameMode(createInitialState(), "adventure", 1),
    ...overrides
  };
}

function withDraft(state: GameState, offeredIds: string[], source: UpgradeDraft["source"] = "normal"): GameState {
  return {
    ...state,
    run: {
      ...state.run,
      upgradeDraft: {
        offeredIds,
        source
      }
    }
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

  it("records repeatable upgrades in chosen history every time they are picked", () => {
    const firstPick = applyUpgradeChoice(
      withDraft(makeAdventureState(), ["combo-window-up", "dash-line", "candy-echo"]),
      "combo-window-up"
    );
    const secondPick = applyUpgradeChoice(
      withDraft(firstPick, ["combo-window-up", "dash-feast", "lean-growth"]),
      "combo-window-up"
    );

    expect(secondPick.run.chosenUpgradeIds).toEqual(["combo-window-up", "combo-window-up"]);
    expect(secondPick.build.comboWindowBonusMs).toBe(firstPick.build.comboWindowBonusMs * 2);
  });

  it("rejects choices when there is no current draft or the choice is off-draft", () => {
    const baseState = makeAdventureState();
    const noDraftResult = applyUpgradeChoice(baseState, "combo-window-up");
    const offDraftState = withDraft(baseState, ["dash-line", "dash-feast", "phase-scales"]);
    const offDraftResult = applyUpgradeChoice(offDraftState, "combo-window-up");

    expect(noDraftResult).toBe(baseState);
    expect(offDraftResult).toBe(offDraftState);
  });

  it("consumes the current draft after a valid choice", () => {
    const state = withDraft(makeAdventureState(), ["dash-line", "combo-window-up", "candy-echo"]);
    const next = applyUpgradeChoice(state, "dash-line");

    expect(next).not.toBe(state);
    expect(next.run.upgradeDraft).toBeNull();
    expect(next.run.chosenUpgradeIds).toEqual(["dash-line"]);
  });

  it("resolves stored offer ids back to upgrade definitions in order", () => {
    const offers = resolveUpgradeOffers({
      offeredIds: ["dash-line", "combo-window-up", "dash-feast"],
      source: "elite"
    });

    expect(offers.map((offer) => offer.id)).toEqual([
      "dash-line",
      "combo-window-up",
      "dash-feast"
    ]);
  });

  it("keeps the MVP catalog inside the planned size range", () => {
    expect(UPGRADE_DEFS.length).toBeGreaterThanOrEqual(18);
    expect(UPGRADE_DEFS.length).toBeLessThanOrEqual(24);
  });
});
