import { useEffect, useMemo, useRef, useState } from "react";
import { restart, step, togglePause, turn, createInitialState } from "../game/engine";
import { getEffectRemainingMs } from "../game/powerups";
import type { Direction, GameState } from "../game/types";
import { loadStats, saveStats } from "../storage/stats";

interface BurstEffect {
  id: string;
  x: number;
  y: number;
  kind: "food" | "powerup";
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

export function useSnakeGame() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [bursts, setBursts] = useState<BurstEffect[]>([]);
  const [started, setStarted] = useState(false);
  const processedGameOverRef = useRef(false);
  const startedRef = useRef(false);
  const burstSerialRef = useRef(0);

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  useEffect(() => {
    const stats = loadStats();
    setState((prev) => ({
      ...prev,
      bestScore: stats.bestScore,
      gamesPlayed: stats.gamesPlayed
    }));
  }, []);

  useEffect(() => {
    if (state.isPaused || state.isGameOver) return undefined;
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

        if (consumedFood || consumedPowerup) {
          const kind: BurstEffect["kind"] = consumedPowerup ? "powerup" : "food";
          const burst: BurstEffect = {
            id: `fx-${now}-${burstSerialRef.current}`,
            x: nextHead.x,
            y: nextHead.y,
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
  }, [state.isPaused, state.isGameOver, state.tickMs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const direction = KEY_TO_DIRECTION[event.key];
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
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        setState((prev) => restart(prev));
        setStarted(false);
        processedGameOverRef.current = false;
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

  return {
    state,
    bursts,
    started,
    activeTimers,
    startGame,
    pauseOrResume,
    restartGame
  };
}
