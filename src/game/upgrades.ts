import {
  UPGRADE_CATALOG_MAX_SIZE,
  UPGRADE_CATALOG_MIN_SIZE,
  UPGRADE_COMBO_WINDOW_STEP_MS,
  UPGRADE_DASH_COOLDOWN_STEP_MS,
  UPGRADE_MIN_DASH_COOLDOWN_MS,
  UPGRADE_OFFER_COUNT,
  UPGRADE_RARITY_WEIGHTS,
  UPGRADE_RISK_SCORE_BONUS,
  UPGRADE_RISK_TICK_BONUS_MS
} from "./constants";
import { createRng } from "./random";
import type {
  GameState,
  RogueliteRunState,
  UpgradeDraft,
  UpgradeDraftSource,
  UpgradeGroup
} from "./types";

export type UpgradeRarity = "common" | "skill" | "mutation" | "risk";

export interface UpgradeDefinition {
  id: string;
  label: string;
  rarity: UpgradeRarity;
  group: UpgradeGroup;
  repeatable: boolean;
  eligible: (state: GameState) => boolean;
  apply: (state: GameState) => GameState;
}

const alwaysEligible = () => true;

function appendChosenUpgrade(run: RogueliteRunState, upgradeId: string): RogueliteRunState {
  return {
    ...run,
    chosenUpgradeIds: [...run.chosenUpgradeIds, upgradeId]
  };
}

function createUpgrade(definition: UpgradeDefinition): UpgradeDefinition {
  return definition;
}

const comboWindowUp = createUpgrade({
  id: "combo-window-up",
  label: "Combo Window Up",
  rarity: "common",
  group: "combo",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    build: {
      ...state.build,
      comboWindowBonusMs: state.build.comboWindowBonusMs + UPGRADE_COMBO_WINDOW_STEP_MS
    }
  })
});

const streakPayout = createUpgrade({
  id: "streak-payout",
  label: "Streak Payout",
  rarity: "common",
  group: "combo",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    score: state.score + Math.max(3, state.comboMultiplier * 2)
  })
});

const candyEcho = createUpgrade({
  id: "candy-echo",
  label: "Candy Echo",
  rarity: "common",
  group: "glutton",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    build: {
      ...state.build,
      comboWindowBonusMs: state.build.comboWindowBonusMs + Math.floor(UPGRADE_COMBO_WINDOW_STEP_MS / 2)
    }
  })
});

const rainbowRush = createUpgrade({
  id: "rainbow-rush",
  label: "Rainbow Rush",
  rarity: "common",
  group: "combo",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    score: state.score + 4
  })
});

const leanGrowth = createUpgrade({
  id: "lean-growth",
  label: "Lean Growth",
  rarity: "common",
  group: "glutton",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    score: state.score + 2
  })
});

const comboBattery = createUpgrade({
  id: "combo-battery",
  label: "Combo Battery",
  rarity: "common",
  group: "combo",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    build: {
      ...state.build,
      comboWindowBonusMs: state.build.comboWindowBonusMs + Math.floor(UPGRADE_COMBO_WINDOW_STEP_MS / 2)
    }
  })
});

const snapTurn = createUpgrade({
  id: "snap-turn",
  label: "Snap Turn",
  rarity: "common",
  group: "dash",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    build: {
      ...state.build,
      dashDistanceBonus: state.build.dashDistanceBonus + 1
    }
  })
});

const quickBite = createUpgrade({
  id: "quick-bite",
  label: "Quick Bite",
  rarity: "common",
  group: "glutton",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    activeSkill: {
      ...state.activeSkill,
      charges: Math.min(state.activeSkill.maxCharges, state.activeSkill.charges + 1)
    }
  })
});

const dashExtraCharge = createUpgrade({
  id: "dash-extra-charge",
  label: "Dash Extra Charge",
  rarity: "skill",
  group: "dash",
  repeatable: true,
  eligible: (state) => state.activeSkill.type === "dash",
  apply: (state) => ({
    ...state,
    activeSkill: {
      ...state.activeSkill,
      maxCharges: state.activeSkill.maxCharges + 1,
      charges: state.activeSkill.charges + 1
    }
  })
});

const dashCooldownCut = createUpgrade({
  id: "dash-cooldown-cut",
  label: "Dash Cooldown Cut",
  rarity: "skill",
  group: "dash",
  repeatable: true,
  eligible: (state) => state.activeSkill.type === "dash",
  apply: (state) => ({
    ...state,
    activeSkill: {
      ...state.activeSkill,
      cooldownMs: Math.max(
        UPGRADE_MIN_DASH_COOLDOWN_MS,
        state.activeSkill.cooldownMs - UPGRADE_DASH_COOLDOWN_STEP_MS
      )
    }
  })
});

const dashArmor = createUpgrade({
  id: "dash-armor",
  label: "Dash Armor",
  rarity: "skill",
  group: "dash",
  repeatable: true,
  eligible: (state) => state.activeSkill.type === "dash",
  apply: (state) => ({
    ...state,
    effects: {
      ...state.effects,
      shield: true
    }
  })
});

const dashFeast = createUpgrade({
  id: "dash-feast",
  label: "Dash Feast",
  rarity: "skill",
  group: "dash",
  repeatable: true,
  eligible: (state) => state.activeSkill.type === "dash",
  apply: (state) => ({
    ...state,
    activeSkill: {
      ...state.activeSkill,
      charges: Math.min(state.activeSkill.maxCharges, state.activeSkill.charges + 1)
    },
    score: state.score + 3
  })
});

const swallowGland = createUpgrade({
  id: "swallow-gland",
  label: "Swallow Gland",
  rarity: "mutation",
  group: "mutation",
  repeatable: false,
  eligible: (state) => !state.build.canSwallowShorterEnemies,
  apply: (state) => ({
    ...state,
    build: {
      ...state.build,
      canSwallowShorterEnemies: true
    }
  })
});

const shadowTail = createUpgrade({
  id: "shadow-tail",
  label: "Shadow Tail",
  rarity: "mutation",
  group: "mutation",
  repeatable: false,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    tailHazards: []
  })
});

const phaseScales = createUpgrade({
  id: "phase-scales",
  label: "Phase Scales",
  rarity: "mutation",
  group: "mutation",
  repeatable: false,
  eligible: (state) => !state.build.hasPhaseScales,
  apply: (state) => ({
    ...state,
    build: {
      ...state.build,
      hasPhaseScales: true
    }
  })
});

const sugarDebt = createUpgrade({
  id: "sugar-debt",
  label: "Sugar Debt",
  rarity: "risk",
  group: "risk",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    score: state.score + UPGRADE_RISK_SCORE_BONUS
  })
});

const overclockedMetabolism = createUpgrade({
  id: "overclocked-metabolism",
  label: "Overclocked Metabolism",
  rarity: "risk",
  group: "risk",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    tickMs: Math.max(40, state.tickMs - UPGRADE_RISK_TICK_BONUS_MS)
  })
});

const glassSerpent = createUpgrade({
  id: "glass-serpent",
  label: "Glass Serpent",
  rarity: "risk",
  group: "risk",
  repeatable: false,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    score: state.score + UPGRADE_RISK_SCORE_BONUS + 5
  })
});

const hungryOrbit = createUpgrade({
  id: "hungry-orbit",
  label: "Hungry Orbit",
  rarity: "common",
  group: "glutton",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    score: state.score + 1
  })
});

const dashLine = createUpgrade({
  id: "dash-line",
  label: "Dash Line",
  rarity: "common",
  group: "dash",
  repeatable: true,
  eligible: alwaysEligible,
  apply: (state) => ({
    ...state,
    build: {
      ...state.build,
      dashDistanceBonus: state.build.dashDistanceBonus + 1
    }
  })
});

export const UPGRADE_DEFS: UpgradeDefinition[] = [
  comboWindowUp,
  streakPayout,
  candyEcho,
  rainbowRush,
  leanGrowth,
  comboBattery,
  snapTurn,
  quickBite,
  dashExtraCharge,
  dashCooldownCut,
  dashArmor,
  dashFeast,
  swallowGland,
  shadowTail,
  phaseScales,
  sugarDebt,
  overclockedMetabolism,
  glassSerpent,
  hungryOrbit,
  dashLine
];

if (
  UPGRADE_DEFS.length < UPGRADE_CATALOG_MIN_SIZE ||
  UPGRADE_DEFS.length > UPGRADE_CATALOG_MAX_SIZE
) {
  throw new Error("Upgrade catalog size is outside the MVP range.");
}

const UPGRADE_BY_ID = new Map(UPGRADE_DEFS.map((upgrade) => [upgrade.id, upgrade]));

function isAlreadyChosen(state: GameState, upgrade: UpgradeDefinition): boolean {
  return !upgrade.repeatable && state.run.chosenUpgradeIds.includes(upgrade.id);
}

function eligibleUpgrades(state: GameState): UpgradeDefinition[] {
  return UPGRADE_DEFS.filter((upgrade) => upgrade.eligible(state) && !isAlreadyChosen(state, upgrade));
}

function drawUpgrade(
  pool: UpgradeDefinition[],
  source: UpgradeDraftSource,
  run: RogueliteRunState
): { offer: UpgradeDefinition; run: RogueliteRunState } {
  const weights = UPGRADE_RARITY_WEIGHTS[source];
  const totalWeight = pool.reduce((sum, upgrade) => sum + weights[upgrade.rarity], 0);
  let cursor = 0;
  const { value, run: nextRun } = nextRunRoll(run);
  const threshold = value * totalWeight;

  for (const upgrade of pool) {
    cursor += weights[upgrade.rarity];
    if (threshold <= cursor) {
      return { offer: upgrade, run: nextRun };
    }
  }

  return { offer: pool[pool.length - 1], run: nextRun };
}

export function nextRunRoll(run: RogueliteRunState): { value: number; run: RogueliteRunState } {
  const rng = createRng(run.seed);
  let value = 0;
  for (let index = 0; index <= run.rollCursor; index += 1) {
    value = rng();
  }

  return {
    value,
    run: {
      ...run,
      rollCursor: run.rollCursor + 1
    }
  };
}

export function buildUpgradeOffers(
  state: GameState,
  source: UpgradeDraft["source"]
): { offers: UpgradeDefinition[]; run: RogueliteRunState } {
  let run = { ...state.run, upgradeDraft: null };
  let pool = eligibleUpgrades(state);
  const offers: UpgradeDefinition[] = [];

  if (source === "elite") {
    const premiumPool = pool.filter((upgrade) => upgrade.rarity !== "common");
    if (premiumPool.length > 0) {
      const premiumDraw = drawUpgrade(premiumPool, source, run);
      offers.push(premiumDraw.offer);
      run = premiumDraw.run;
      pool = pool.filter((upgrade) => upgrade.id !== premiumDraw.offer.id);
    }
  }

  while (offers.length < UPGRADE_OFFER_COUNT && pool.length > 0) {
    const draw = drawUpgrade(pool, source, run);
    offers.push(draw.offer);
    run = draw.run;
    pool = pool.filter((upgrade) => upgrade.id !== draw.offer.id);
  }

  run = {
    ...run,
    upgradeDraft: {
      offeredIds: offers.map((offer) => offer.id),
      source
    }
  };

  return { offers, run };
}

export function resolveUpgradeOffers(draft: UpgradeDraft | null): UpgradeDefinition[] {
  if (!draft) return [];
  return draft.offeredIds
    .map((offerId) => UPGRADE_BY_ID.get(offerId))
    .filter((offer): offer is UpgradeDefinition => Boolean(offer));
}

export function applyUpgradeChoice(state: GameState, upgradeId: string): GameState {
  const draft = state.run.upgradeDraft;
  if (!draft || !draft.offeredIds.includes(upgradeId)) {
    return state;
  }

  const upgrade = UPGRADE_BY_ID.get(upgradeId);
  if (!upgrade || !upgrade.eligible(state) || isAlreadyChosen(state, upgrade)) {
    return state;
  }

  const appliedState = upgrade.apply(state);
  return {
    ...appliedState,
    run: {
      ...appendChosenUpgrade(appliedState.run, upgradeId),
      upgradeDraft: null
    }
  };
}
