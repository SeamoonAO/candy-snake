import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, setGameMode } from "../game/engine";
import { useSnakeGame } from "./useSnakeGame";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
    setDraftOpen() {
      const adventureState = setGameMode(createInitialState(1), "adventure", 1);
      const draftState = {
        ...adventureState,
        isPaused: true,
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
    expect(game.current.state.isPaused).toBe(true);
    expect(game.current.state.run.phase).toBe("draft");

    game.press("1", "Digit1");

    expect(game.current.state.run.phase).toBe("segment");
    expect(game.current.state.run.upgradeDraft).toBeNull();
    expect(game.current.state.run.chosenUpgradeIds).toContain("overclocked-metabolism");

    game.unmount();
  });
});
