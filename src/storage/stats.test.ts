import { describe, expect, it } from "vitest";
import { loadStats, saveStats } from "./stats";

describe("stats storage", () => {
  it("loads and saves stats", () => {
    localStorage.clear();
    saveStats({ bestScore: 12, gamesPlayed: 4 });
    expect(loadStats()).toEqual({ bestScore: 12, gamesPlayed: 4 });
  });

  it("returns defaults when localStorage is unavailable", () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      }
    });

    expect(loadStats()).toEqual({ bestScore: 0, gamesPlayed: 0 });
    expect(() => saveStats({ bestScore: 1, gamesPlayed: 1 })).not.toThrow();

    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    }
  });
});
