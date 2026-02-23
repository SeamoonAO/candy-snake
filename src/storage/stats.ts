const STORAGE_KEY = "candy-snake:stats";

type Stats = { bestScore: number; gamesPlayed: number };

export function loadStats(): Stats {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { bestScore: 0, gamesPlayed: 0 };
    const parsed = JSON.parse(raw) as Partial<Stats>;
    return {
      bestScore: Number.isFinite(parsed.bestScore) ? Number(parsed.bestScore) : 0,
      gamesPlayed: Number.isFinite(parsed.gamesPlayed) ? Number(parsed.gamesPlayed) : 0
    };
  } catch {
    return { bestScore: 0, gamesPlayed: 0 };
  }
}

export function saveStats(stats: Stats): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage errors to keep gameplay resilient.
  }
}
