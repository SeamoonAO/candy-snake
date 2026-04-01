import { useEffect, useMemo, useRef, useState } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../game/constants";
import {
  chooseUpgrade,
  createInitialState,
  restart,
  setEnemyCount,
  setFoodCount,
  setGameMode,
  step,
  togglePause,
  turn,
  useActiveSkill
} from "../game/engine";
import { getEffectRemainingMs } from "../game/powerups";
import { pointToKey } from "../game/random";
import { resolveUpgradeOffers, UPGRADE_DEFS } from "../game/upgrades";
import type { Direction, GameMode, GameState } from "../game/types";
import { loadStats, saveStats } from "../storage/stats";

interface BurstEffect {
  id: string;
  x: number;
  y: number;
  kind: "food" | "powerup" | "hurt";
  expiresAt: number;
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right"
};

const KEY_TO_DRAFT_INDEX: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2
};

const UPGRADE_LABELS = new Map(UPGRADE_DEFS.map((upgrade) => [upgrade.id, upgrade.label]));
const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

function oppositeDirection(direction: Direction): Direction {
  return OPPOSITE_DIRECTION[direction];
}

function chooseAutopilotDirection(state: GameState): Direction | null {
  const head = state.snake[0];
  const currentDirection = state.queuedDirection ?? state.direction;
  const blocked = new Set<string>([
    ...state.obstacles,
    ...state.enemies.filter((enemy) => enemy.alive).flatMap((enemy) => enemy.snake),
    ...state.snake.slice(0, -1)
  ].map(pointToKey));
  const foodKeys = new Set(state.foods.map(pointToKey));
  const candidates: Array<{ dir: Direction; x: number; y: number }> = [
    { dir: "up", x: head.x, y: head.y - 1 },
    { dir: "down", x: head.x, y: head.y + 1 },
    { dir: "left", x: head.x - 1, y: head.y },
    { dir: "right", x: head.x + 1, y: head.y }
  ];
  const queue = [{ x: head.x, y: head.y }];
  const seen = new Set<string>([pointToKey(head)]);
  const firstStep = new Map<string, Direction>();

  while (queue.length > 0) {
    const point = queue.shift();
    if (!point) break;
    const pointKey = pointToKey(point);
    if (foodKeys.has(pointKey) && pointKey !== pointToKey(head)) {
      return firstStep.get(pointKey) ?? null;
    }

    for (const next of [
      { dir: "up" as const, x: point.x, y: point.y - 1 },
      { dir: "down" as const, x: point.x, y: point.y + 1 },
      { dir: "left" as const, x: point.x - 1, y: point.y },
      { dir: "right" as const, x: point.x + 1, y: point.y }
    ]) {
      if (next.x < 0 || next.x >= BOARD_WIDTH || next.y < 0 || next.y >= BOARD_HEIGHT) continue;
      const nextKey = pointToKey(next);
      if (seen.has(nextKey) || blocked.has(nextKey)) continue;
      if (
        point.x === head.x &&
        point.y === head.y &&
        next.dir === oppositeDirection(currentDirection)
      ) {
        continue;
      }
      seen.add(nextKey);
      firstStep.set(
        nextKey,
        point.x === head.x && point.y === head.y ? next.dir : (firstStep.get(pointKey) ?? next.dir)
      );
      queue.push(next);
    }
  }

  for (const next of candidates) {
    if (next.dir === oppositeDirection(currentDirection)) continue;
    if (next.x < 0 || next.x >= BOARD_WIDTH || next.y < 0 || next.y >= BOARD_HEIGHT) continue;
    if (!blocked.has(pointToKey(next))) return next.dir;
  }

  return null;
}

export function useSnakeGame() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [bursts, setBursts] = useState<BurstEffect[]>([]);
  const [started, setStarted] = useState(false);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const processedGameOverRef = useRef(false);
  const startedRef = useRef(false);
  const autopilotRef = useRef(false);
  const stateRef = useRef(state);
  const burstSerialRef = useRef(0);

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  useEffect(() => {
    autopilotRef.current = autopilotEnabled;
  }, [autopilotEnabled]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const stats = loadStats();
    setState((prev) => ({
      ...prev,
      bestScore: stats.bestScore,
      gamesPlayed: stats.gamesPlayed
    }));
  }, []);

  useEffect(() => {
    const draftPaused = state.run.phase === "draft";
    if (state.isPaused || state.isGameOver) return undefined;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setState((prev) => {
        if (autopilotEnabled && prev.mode === "adventure" && prev.run.phase === "draft" && prev.run.upgradeDraft) {
          const [upgradeId] = prev.run.upgradeDraft.offeredIds;
          return upgradeId ? chooseUpgrade(prev, upgradeId, now) : prev;
        }
        if (draftPaused) return prev;

        const guided =
          autopilotEnabled && prev.mode === "adventure"
            ? (() => {
                const direction = chooseAutopilotDirection(prev);
                return direction ? turn(prev, direction) : prev;
              })()
            : prev;
        const next = step(guided, now);
        const nextHead = next.snake[0];
        const consumedFood = next.score > prev.score;
        const consumedPowerup =
          !!prev.powerUp &&
          !next.powerUp &&
          nextHead.x === prev.powerUp.position.x &&
          nextHead.y === prev.powerUp.position.y;
        const tookDamage = next.lives < prev.lives;

        if (consumedFood || consumedPowerup || tookDamage) {
          const kind: BurstEffect["kind"] = tookDamage
            ? "hurt"
            : consumedPowerup
              ? "powerup"
              : "food";
          const burstOrigin = tookDamage ? prev.snake[0] : nextHead;
          const burst: BurstEffect = {
            id: `fx-${now}-${burstSerialRef.current}`,
            x: burstOrigin.x,
            y: burstOrigin.y,
            kind,
            expiresAt: now + 520
          };
          burstSerialRef.current += 1;
          setBursts((prevBursts) => [...prevBursts.filter((item) => item.expiresAt > now), burst]);
        }
        return next;
      });
      setBursts((prev) => prev.filter((item) => item.expiresAt > now));
    }, state.tickMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [autopilotEnabled, state.isPaused, state.isGameOver, state.run.phase, state.tickMs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const currentState = stateRef.current;
      const direction = KEY_TO_DIRECTION[event.key];
      const draftIndex = KEY_TO_DRAFT_INDEX[event.key];

      if (currentState.run.phase === "draft" && currentState.run.upgradeDraft) {
        if (draftIndex !== undefined) {
          event.preventDefault();
          setState((prev) => {
            if (prev.run.phase !== "draft" || !prev.run.upgradeDraft) return prev;
            const upgradeId = prev.run.upgradeDraft.offeredIds[draftIndex];
            if (!upgradeId) return prev;
            return chooseUpgrade(prev, upgradeId, Date.now());
          });
          return;
        }

        if (direction) {
          event.preventDefault();
          return;
        }

        if (event.code === "Space") {
          event.preventDefault();
          return;
        }
      }

      if (direction) {
        event.preventDefault();
        if (autopilotRef.current) setAutopilotEnabled(false);
        setState((prev) => {
          let next = turn(prev, direction);
          if (!startedRef.current && !prev.isGameOver) {
            next = { ...next, isPaused: false };
          }
          return next;
        });
        if (!startedRef.current) setStarted(true);
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setState((prev) => {
          if (!startedRef.current || prev.isGameOver) return prev;
          return togglePause(prev);
        });
        return;
      }

      if (event.key.toLowerCase() === "q") {
        if (currentState.mode !== "adventure") return;
        event.preventDefault();
        setAutopilotEnabled((prev) => !prev);
        return;
      }

      if (event.key.toLowerCase() === "e") {
        if (currentState.mode !== "adventure") return;
        event.preventDefault();
        setState((prev) => useActiveSkill(prev, Date.now()));
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        setState((prev) => restart(prev));
        setStarted(false);
        setAutopilotEnabled(false);
        processedGameOverRef.current = false;
        setBursts([]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (state.isGameOver && !processedGameOverRef.current) {
      const bestScore = Math.max(state.bestScore, state.score);
      const gamesPlayed = state.gamesPlayed + 1;
      saveStats({ bestScore, gamesPlayed });
      setState((prev) => ({ ...prev, bestScore, gamesPlayed }));
      processedGameOverRef.current = true;
    }
    if (!state.isGameOver) processedGameOverRef.current = false;
  }, [state.isGameOver, state.bestScore, state.gamesPlayed, state.score]);

  const activeTimers = useMemo(() => {
    const now = Date.now();
    return {
      speedUp: getEffectRemainingMs(state.effects.speedUpUntil, now),
      slowDown: getEffectRemainingMs(state.effects.slowDownUntil, now),
      ghostWall: getEffectRemainingMs(state.effects.ghostWallUntil, now),
      doubleScore: getEffectRemainingMs(state.effects.doubleScoreUntil, now),
      shield: state.effects.shield
    };
  }, [state.effects]);

  const draftOffers = useMemo(() => resolveUpgradeOffers(state.run.upgradeDraft), [state.run.upgradeDraft]);

  const recentBuild = useMemo(
    () =>
      state.run.chosenUpgradeIds
        .map((upgradeId) => ({
          id: upgradeId,
          label: UPGRADE_LABELS.get(upgradeId) ?? upgradeId
        }))
        .slice(-4)
        .reverse(),
    [state.run.chosenUpgradeIds]
  );

  const dashCooldownRemainingMs = useMemo(() => {
    if (state.activeSkill.recoveryEndsAt === null) return 0;
    return Math.max(0, state.activeSkill.recoveryEndsAt - Date.now());
  }, [state.activeSkill]);

  const startGame = () => {
    if (state.isGameOver) return;
    setStarted(true);
    setState((prev) => ({ ...prev, isPaused: false }));
  };

  const pauseOrResume = () => {
    if (!started || state.isGameOver) return;
    setState((prev) => togglePause(prev));
  };

  const restartGame = () => {
    setState((prev) => restart(prev));
    setStarted(false);
    setAutopilotEnabled(false);
    processedGameOverRef.current = false;
    setBursts([]);
  };

  const updateFoodCount = (count: number) => {
    setState((prev) => setFoodCount(prev, count));
  };

  const updateEnemyCount = (count: number) => {
    setState((prev) => setEnemyCount(prev, count));
  };

  const updateGameMode = (mode: GameMode) => {
    setState((prev) => setGameMode(prev, mode));
    if (mode !== "adventure") setAutopilotEnabled(false);
  };

  const chooseDraftOption = (upgradeId: string) => {
    setState((prev) => chooseUpgrade(prev, upgradeId, Date.now()));
  };

  const toggleAutopilot = () => {
    setAutopilotEnabled((prev) => !prev);
  };

  return {
    state,
    bursts,
    started,
    autopilotEnabled,
    activeTimers,
    draftOffers,
    recentBuild,
    dashCooldownRemainingMs,
    updateFoodCount,
    updateEnemyCount,
    updateGameMode,
    startGame,
    pauseOrResume,
    restartGame,
    chooseDraftOption,
    toggleAutopilot
  };
}
