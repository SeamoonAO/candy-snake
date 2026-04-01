import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, setGameMode } from "../game/engine";
import { useSnakeGame } from "./useSnakeGame";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function renderUseSnakeGame() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let latest: ReturnType<typeof useSnakeGame> | null = null;

  function Harness() {
    latest = useSnakeGame();
    return null;
  }

  act(() => {
    root.render(<Harness />);
  });

  return {
    get current() {
      if (!latest) {
        throw new Error("hook not mounted");
      }
      return latest;
    },
    press(key: string, code: string) {
      act(() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key, code, bubbles: true }));
      });
    },
    setState(nextState: ReturnType<typeof createInitialState>) {
      Object.assign(this.current.state, nextState);
    },
    setDraftOpen() {
      const adventureState = setGameMode(createInitialState(1), "adventure", 1);
      const draftState = {
        ...adventureState,
        isPaused: false,
        isGameOver: false,
        queuedDirection: null,
        run: {
          ...adventureState.run,
          phase: "draft" as const,
          segmentEndsAt: null,
          upgradeDraft: {
            offeredIds: ["overclocked-metabolism", "sugar-debt", "dash-line"],
            source: "normal" as const
          }
        }
      };

      Object.assign(this.current.state, draftState);
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
}

afterEach(() => {
  localStorage.clear();
});

describe("useSnakeGame", () => {
  it("keeps space pause toggling working in endless mode", () => {
    const game = renderUseSnakeGame();

    act(() => {
      game.current.startGame();
    });

    expect(game.current.state.isPaused).toBe(false);

    game.press(" ", "Space");
    expect(game.current.state.isPaused).toBe(true);

    game.press(" ", "Space");
    expect(game.current.state.isPaused).toBe(false);

    game.unmount();
  });

  it("uses draft number keys instead of movement controls while an adventure draft is open", () => {
    const game = renderUseSnakeGame();

    game.setDraftOpen();

    expect(game.current.state.run.phase).toBe("draft");
    expect(game.current.state.run.upgradeDraft?.offeredIds).toEqual([
      "overclocked-metabolism",
      "sugar-debt",
      "dash-line"
    ]);

    game.press("ArrowUp", "ArrowUp");

    expect(game.current.state.queuedDirection).toBeNull();
    expect(game.current.state.isPaused).toBe(false);
    expect(game.current.state.run.phase).toBe("draft");

    game.press("1", "Digit1");

    expect(game.current.state.run.phase).toBe("segment");
    expect(game.current.state.run.upgradeDraft).toBeNull();
    expect(game.current.state.run.chosenUpgradeIds).toContain("overclocked-metabolism");

    game.unmount();
  });

  it("ignores space pause toggles while an adventure draft is open", () => {
    const game = renderUseSnakeGame();

    act(() => {
      game.current.updateGameMode("adventure");
      game.current.startGame();
    });

    game.setDraftOpen();

    expect(game.current.state.run.phase).toBe("draft");
    expect(game.current.state.isPaused).toBe(false);

    game.press(" ", "Space");

    expect(game.current.state.run.phase).toBe("draft");
    expect(game.current.state.isPaused).toBe(false);

    game.press("2", "Digit2");

    expect(game.current.state.run.phase).toBe("segment");
    expect(game.current.state.isPaused).toBe(false);
    expect(game.current.state.run.chosenUpgradeIds).toContain("sugar-debt");

    game.unmount();
  });

  it("triggers dash only in adventure mode", () => {
    const endless = renderUseSnakeGame();

    act(() => {
      endless.current.startGame();
    });

    const endlessHead = endless.current.state.snake[0];
    const endlessCharges = endless.current.state.activeSkill.charges;
    endless.press("e", "KeyE");

    expect(endless.current.state.snake[0]).toEqual(endlessHead);
    expect(endless.current.state.activeSkill.charges).toBe(endlessCharges);

    endless.unmount();

    const adventure = renderUseSnakeGame();

    act(() => {
      adventure.current.updateGameMode("adventure");
      adventure.current.startGame();
    });

    const adventureHead = adventure.current.state.snake[0];
    const adventureCharges = adventure.current.state.activeSkill.charges;
    adventure.press("e", "KeyE");

    expect(adventure.current.state.snake[0]).not.toEqual(adventureHead);
    expect(adventure.current.state.activeSkill.charges).toBe(adventureCharges - 1);

    adventure.unmount();
  });

  it("restarts both endless and drafted adventure runs from the keyboard", () => {
    const endless = renderUseSnakeGame();

    endless.setState({
      ...endless.current.state,
      score: 9,
      isPaused: false
    });

    endless.press("r", "KeyR");

    expect(endless.current.state.mode).toBe("endless");
    expect(endless.current.state.score).toBe(0);
    expect(endless.current.state.run.upgradeDraft).toBeNull();

    endless.unmount();

    const adventure = renderUseSnakeGame();

    adventure.setDraftOpen();
    adventure.setState({
      ...adventure.current.state,
      score: 12
    });

    adventure.press("r", "KeyR");

    expect(adventure.current.state.mode).toBe("adventure");
    expect(adventure.current.state.score).toBe(0);
    expect(adventure.current.state.run.phase).toBe("segment");
    expect(adventure.current.state.run.upgradeDraft).toBeNull();

    adventure.unmount();
  });
});
