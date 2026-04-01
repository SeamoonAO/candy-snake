import { useEffect, useMemo, useRef, useState } from "react";
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

export function useSnakeGame() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [bursts, setBursts] = useState<BurstEffect[]>([]);
  const [started, setStarted] = useState(false);
  const processedGameOverRef = useRef(false);
  const startedRef = useRef(false);
  const stateRef = useRef(state);
  const burstSerialRef = useRef(0);

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

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
    if (state.isPaused || state.isGameOver || draftPaused) return undefined;
    const timer = window.setInterval(() => {
      const now = Date.now();
      setState((prev) => {
        const next = step(prev, now);
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
  }, [state.isPaused, state.isGameOver, state.run.phase, state.tickMs]);

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
  };

  const chooseDraftOption = (upgradeId: string) => {
    setState((prev) => chooseUpgrade(prev, upgradeId, Date.now()));
  };

  return {
    state,
    bursts,
    started,
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
    chooseDraftOption
  };
}
