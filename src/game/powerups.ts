import { POWERUP_DURATION_MS, POWERUP_WEIGHTS } from "./constants";
import { pickWeighted } from "./random";
import type { ActiveEffects, PowerUpType } from "./types";

export function choosePowerUpType(): PowerUpType {
  return pickWeighted(POWERUP_WEIGHTS);
}

export function isEffectActive(until: number | undefined, now: number): boolean {
  return typeof until === "number" && until > now;
}

export function getEffectRemainingMs(until: number | undefined, now: number): number {
  if (!until) return 0;
  return Math.max(0, until - now);
}

export function cleanupExpiredEffects(effects: ActiveEffects, now: number): ActiveEffects {
  return {
    ...effects,
    speedUpUntil: isEffectActive(effects.speedUpUntil, now) ? effects.speedUpUntil : undefined,
    slowDownUntil: isEffectActive(effects.slowDownUntil, now) ? effects.slowDownUntil : undefined,
    ghostWallUntil: isEffectActive(effects.ghostWallUntil, now)
      ? effects.ghostWallUntil
      : undefined,
    doubleScoreUntil: isEffectActive(effects.doubleScoreUntil, now)
      ? effects.doubleScoreUntil
      : undefined
  };
}

export function applyPowerUp(
  effects: ActiveEffects,
  type: PowerUpType,
  now: number
): { effects: ActiveEffects; shortenBy: number } {
  const duration = POWERUP_DURATION_MS[type];
  const nextEffects: ActiveEffects = { ...effects };

  switch (type) {
    case "SPEED_UP":
      nextEffects.speedUpUntil = now + (duration ?? 0);
      break;
    case "SLOW_DOWN":
      nextEffects.slowDownUntil = now + (duration ?? 0);
      break;
    case "GHOST_WALL":
      nextEffects.ghostWallUntil = now + (duration ?? 0);
      break;
    case "DOUBLE_SCORE":
      nextEffects.doubleScoreUntil = now + (duration ?? 0);
      break;
    case "SHIELD":
      nextEffects.shield = true;
      break;
    case "SHORTEN":
      return { effects: nextEffects, shortenBy: 3 };
    default:
      break;
  }

  return { effects: nextEffects, shortenBy: 0 };
}
