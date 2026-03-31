import { isEffectActive } from "./powerups";
import type { ActiveEffects, RelicId } from "./types";

export type RelicTrigger = "onStep" | "onFood" | "onHit" | "onNodeClear";

interface RelicRuntime {
  now: number;
  score: number;
  effects: ActiveEffects;
  relics: RelicId[];
  preventedHit: boolean;
}

interface RelicContext {
  levelCleared: boolean;
}

interface RelicTriggerTools {
  consume: () => void;
}

type RelicHandler = (runtime: RelicRuntime, context: RelicContext, tools: RelicTriggerTools) => void;

export interface RelicDefinition {
  id: RelicId;
  name: string;
  icon: string;
  description: string;
  triggers: Partial<Record<RelicTrigger, RelicHandler>>;
}

const RELIC_DEFINITIONS: Record<RelicId, RelicDefinition> = {
  HONEY_FANG: {
    id: "HONEY_FANG",
    name: "Honey Fang",
    icon: "HF",
    description: "onFood: each bean gives +1 bonus score.",
    triggers: {
      onFood: (runtime) => {
        runtime.score += 1;
      }
    }
  },
  GUARDIAN_SHELL: {
    id: "GUARDIAN_SHELL",
    name: "Guardian Shell",
    icon: "GS",
    description: "onHit: consume this relic to block one fatal collision.",
    triggers: {
      onHit: (runtime, _context, tools) => {
        runtime.preventedHit = true;
        tools.consume();
      }
    }
  },
  WAYFINDER_SIGIL: {
    id: "WAYFINDER_SIGIL",
    name: "Wayfinder Sigil",
    icon: "WS",
    description: "onNodeClear: gain +5 score when entering a new adventure node.",
    triggers: {
      onNodeClear: (runtime, context) => {
        if (context.levelCleared) runtime.score += 5;
      }
    }
  },
  CALM_FEATHER: {
    id: "CALM_FEATHER",
    name: "Calm Feather",
    icon: "CF",
    description: "onStep: shortens Slow effect decay by 0.12s each step.",
    triggers: {
      onStep: (runtime) => {
        if (!isEffectActive(runtime.effects.slowDownUntil, runtime.now)) return;
        runtime.effects = {
          ...runtime.effects,
          slowDownUntil: Math.max(runtime.now, runtime.effects.slowDownUntil! - 120)
        };
      }
    }
  }
};

export function getRelicDefinition(id: RelicId): RelicDefinition {
  return RELIC_DEFINITIONS[id];
}

export function runRelicTriggers(
  relics: RelicId[],
  trigger: RelicTrigger,
  runtime: Omit<RelicRuntime, "relics">
): RelicRuntime {
  const next: RelicRuntime = {
    ...runtime,
    relics: [...relics]
  };

  for (const relic of relics) {
    const definition = RELIC_DEFINITIONS[relic];
    const handler = definition.triggers[trigger];
    if (!handler) continue;
    let consumed = false;
    handler(next, { levelCleared: false }, { consume: () => (consumed = true) });
    if (consumed) next.relics = next.relics.filter((id) => id !== relic);
  }

  return next;
}

export function runNodeClearRelics(
  relics: RelicId[],
  runtime: Omit<RelicRuntime, "relics">,
  levelCleared: boolean
): RelicRuntime {
  const next: RelicRuntime = {
    ...runtime,
    relics: [...relics]
  };

  for (const relic of relics) {
    const definition = RELIC_DEFINITIONS[relic];
    const handler = definition.triggers.onNodeClear;
    if (!handler) continue;
    let consumed = false;
    handler(next, { levelCleared }, { consume: () => (consumed = true) });
    if (consumed) next.relics = next.relics.filter((id) => id !== relic);
  }
  return next;
}
