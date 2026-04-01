import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { HudPanel } from "./HudPanel";
import { RunSummary } from "./RunSummary";
import { UpgradeOverlay } from "./UpgradeOverlay";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const sampleOffers = [
  { id: "combo-window-up", label: "Sugar Rush", rarity: "common" as const },
  { id: "dash-armor", label: "Candy Armor", rarity: "skill" as const },
  { id: "phase-scales", label: "Phase Scales", rarity: "mutation" as const }
];

const sampleSummary = {
  segmentReached: 7,
  highestCombo: 5,
  chosenUpgradeIds: ["combo-window-up", "dash-armor"],
  finalScore: 42
};

function render(element: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("roguelite UI", () => {
  it("renders three upgrade options with keyboard hints", () => {
    const view = render(
      <UpgradeOverlay offers={sampleOffers} source="elite" onSelect={() => undefined} />
    );

    const buttons = Array.from(view.container.querySelectorAll("button.upgrade-card"));

    expect(buttons).toHaveLength(3);
    expect(buttons.map((button) => button.textContent?.includes("Sugar Rush"))).toContain(true);
    expect(buttons.map((button) => button.textContent?.includes("Candy Armor"))).toContain(true);
    expect(buttons.map((button) => button.textContent?.includes("Phase Scales"))).toContain(true);
    expect(view.container.textContent).toContain("Sugar Rush");
    expect(view.container.textContent).toContain("Candy Armor");
    expect(view.container.textContent).toContain("Phase Scales");
    expect(view.container.textContent).toContain("Press 1, 2, or 3");

    view.unmount();
  });

  it("renders run summary stats", () => {
    const view = render(
      <RunSummary
        summary={{
          segmentReached: sampleSummary.segmentReached,
          clearedSegments: sampleSummary.segmentReached - 1,
          highestCombo: sampleSummary.highestCombo,
          chosenUpgradeIds: sampleSummary.chosenUpgradeIds,
          score: sampleSummary.finalScore
        }}
        onRestart={() => undefined}
      />
    );

    expect(view.container.textContent).toContain("Segment 7");
    expect(view.container.textContent).toContain("Highest Combo");
    expect(view.container.textContent).toContain("42");
    expect(view.container.textContent).toContain("combo-window-up");

    view.unmount();
  });

  it("shows adventure life tracking in the HUD", () => {
    const view = render(
      <HudPanel
        score={12}
        bestScore={30}
        gamesPlayed={4}
        tickMs={120}
        isPaused={false}
        isGameOver={false}
        started={true}
        foodCount={5}
        enemyCount={2}
        mode="adventure"
        currentLevel={2}
        levelGoal={3}
        comboCount={2}
        comboMultiplier={2}
        activeTimers={{ speedUp: 0, slowDown: 0, ghostWall: 0, doubleScore: 0, shield: false }}
        runPhase="segment"
        segmentIndex={2}
        eliteSegment={false}
        collapseStarted={false}
        lives={3}
        maxLives={3}
        hurtActive={false}
        dashCharges={1}
        dashMaxCharges={1}
        dashCooldownRemainingMs={0}
        recentBuild={[]}
        onFoodCountChange={() => undefined}
        onEnemyCountChange={() => undefined}
        onModeChange={() => undefined}
        onPauseToggle={() => undefined}
        onRestart={() => undefined}
      />
    );

    expect(view.container.textContent).toContain("Lives");
    expect(view.container.textContent).toContain("3 / 3");

    view.unmount();
  });
});
