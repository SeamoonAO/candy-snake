export type Point = { x: number; y: number };

export type Direction = "up" | "down" | "left" | "right";

export type EnemyPersonality = "greedy" | "hunter" | "careful";

export type GameMode = "endless" | "adventure";

export type RunPhase = "segment" | "draft";

export type UpgradeDraftSource = "normal" | "elite" | "collapseBonus";

export type UpgradeGroup = "combo" | "dash" | "glutton" | "mutation" | "risk";

export type PowerUpType =
  | "SPEED_UP"
  | "SLOW_DOWN"
  | "GHOST_WALL"
  | "DOUBLE_SCORE"
  | "SHORTEN"
  | "SHIELD";

export interface PowerUpInstance {
  type: PowerUpType;
  position: Point;
  expiresAt: number;
}

export interface ActiveEffects {
  speedUpUntil?: number;
  slowDownUntil?: number;
  ghostWallUntil?: number;
  doubleScoreUntil?: number;
  shield: boolean;
}

export interface EnemySnake {
  id: string;
  snake: Point[];
  direction: Direction;
  alive: boolean;
  hue: number;
  personality: EnemyPersonality;
}

export interface UpgradeDraft {
  offeredIds: string[];
  source: UpgradeDraftSource;
}

export interface ActiveSkillState {
  type: "dash";
  charges: number;
  maxCharges: number;
  cooldownMs: number;
  recoveryEndsAt: number | null;
  invulnerableUntil: number | null;
}

export interface RogueliteRunState {
  seed: number;
  rollCursor: number;
  segmentIndex: number;
  segmentEndsAt: number | null;
  phase: RunPhase;
  eliteSegment: boolean;
  collapseStarted: boolean;
  upgradeDraft: UpgradeDraft | null;
  chosenUpgradeIds: string[];
  highestCombo: number;
}

export interface BuildModifiers {
  comboWindowBonusMs: number;
  dashDistanceBonus: number;
  canSwallowShorterEnemies: boolean;
  hasPhaseScales: boolean;
}

export interface TailHazard {
  position: Point;
  expiresAt: number;
}

export interface RunSummary {
  segmentReached: number;
  clearedSegments: number;
  score: number;
  highestCombo: number;
  chosenUpgradeIds: string[];
}

export interface GameState {
  snake: Point[];
  enemies: EnemySnake[];
  direction: Direction;
  queuedDirection: Direction | null;
  foods: Point[];
  foodCount: number;
  enemyCount: number;
  mode: GameMode;
  currentLevel: number;
  levelGoal: number;
  obstacles: Point[];
  powerUp: PowerUpInstance | null;
  effects: ActiveEffects;
  score: number;
  comboCount: number;
  comboMultiplier: number;
  comboExpiresAt: number | null;
  run: RogueliteRunState;
  build: BuildModifiers;
  tailHazards: TailHazard[];
  activeSkill: ActiveSkillState;
  summary: RunSummary | null;
  bestScore: number;
  gamesPlayed: number;
  tickMs: number;
  isPaused: boolean;
  isGameOver: boolean;
}
