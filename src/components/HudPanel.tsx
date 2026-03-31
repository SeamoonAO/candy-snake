import { getRelicDefinition } from "../game/relics";
import type { GameMode } from "../game/types";
import type { RelicId } from "../game/types";

interface ActiveTimers {
  speedUp: number;
  slowDown: number;
  ghostWall: number;
  doubleScore: number;
  shield: boolean;
}

interface Props {
  score: number;
  bestScore: number;
  gamesPlayed: number;
  tickMs: number;
  isPaused: boolean;
  isGameOver: boolean;
  started: boolean;
  foodCount: number;
  enemyCount: number;
  mode: GameMode;
  currentLevel: number;
  levelGoal: number;
  comboCount: number;
  comboMultiplier: number;
  activeTimers: ActiveTimers;
  relics: RelicId[];
  onFoodCountChange: (count: number) => void;
  onEnemyCountChange: (count: number) => void;
  onModeChange: (mode: GameMode) => void;
  onPauseToggle: () => void;
  onRestart: () => void;
}

function toSeconds(ms: number): string {
  return (ms / 1000).toFixed(1);
}

export function HudPanel({
  score,
  bestScore,
  gamesPlayed,
  tickMs,
  isPaused,
  isGameOver,
  started,
  foodCount,
  enemyCount,
  mode,
  currentLevel,
  levelGoal,
  comboCount,
  comboMultiplier,
  activeTimers,
  relics,
  onFoodCountChange,
  onEnemyCountChange,
  onModeChange,
  onPauseToggle,
  onRestart
}: Props) {
  return (
    <aside className="hud-panel">
      <h1>Candy Snake</h1>
      <p className="subtitle">Colorful arcade with playful power-ups</p>
      <div className="stats-grid">
        <div className="stat-card">
          <label>Score</label>
          <strong key={score} className="score-pop">
            {score}
          </strong>
        </div>
        <div className="stat-card">
          <label>Best</label>
          <strong>{bestScore}</strong>
        </div>
        <div className="stat-card">
          <label>Rounds</label>
          <strong>{gamesPlayed}</strong>
        </div>
        <div className="stat-card">
          <label>Tick</label>
          <strong>{tickMs} ms</strong>
        </div>
      </div>

      <div className="mode-panel">
        <div className="mode-header">
          <h2>Mode</h2>
          <span className="mode-chip">{mode === "adventure" ? "Adventure" : "Endless"}</span>
        </div>
        <div className="segmented">
          <button
            type="button"
            className={mode === "endless" ? "seg-btn active" : "seg-btn"}
            onClick={() => onModeChange("endless")}
          >
            Endless
          </button>
          <button
            type="button"
            className={mode === "adventure" ? "seg-btn active" : "seg-btn"}
            onClick={() => onModeChange("adventure")}
          >
            Adventure
          </button>
        </div>
        <div className="level-card">
          <span>Level {currentLevel}</span>
          <strong>{mode === "adventure" ? `${score}/${levelGoal}` : "Free play"}</strong>
        </div>
      </div>

      <div className="combo-panel">
        <div className="combo-header">
          <h2>Combo</h2>
          <span className={comboCount > 1 ? "combo-badge hot" : "combo-badge"}>
            x{comboMultiplier}
          </span>
        </div>
        <p className="combo-copy">
          {comboCount > 1
            ? `${comboCount} streak foods chained. Keep eating before the timer drops.`
            : "Eat again quickly to build score multipliers."}
        </p>
      </div>

      <div className="effects">
        <h2>Effects</h2>
        <div className="effect-list">
          {activeTimers.speedUp > 0 && (
            <span className="effect-pill speed">Speed + {toSeconds(activeTimers.speedUp)}s</span>
          )}
          {activeTimers.slowDown > 0 && (
            <span className="effect-pill slow">Slow + {toSeconds(activeTimers.slowDown)}s</span>
          )}
          {activeTimers.ghostWall > 0 && (
            <span className="effect-pill ghost">Ghost + {toSeconds(activeTimers.ghostWall)}s</span>
          )}
          {activeTimers.doubleScore > 0 && (
            <span className="effect-pill double">2x + {toSeconds(activeTimers.doubleScore)}s</span>
          )}
          {activeTimers.shield && <span className="effect-pill shield">Shield ready</span>}
          {!activeTimers.shield &&
            activeTimers.speedUp <= 0 &&
            activeTimers.slowDown <= 0 &&
            activeTimers.ghostWall <= 0 &&
            activeTimers.doubleScore <= 0 && <span className="effect-empty">No active effects</span>}
        </div>
      </div>

      <div className="effects">
        <h2>Relics</h2>
        <div className="effect-list">
          {relics.map((id) => {
            const relic = getRelicDefinition(id);
            return (
              <span key={id} className="effect-pill relic" title={`${relic.name}: ${relic.description}`}>
                {relic.icon}
              </span>
            );
          })}
          {relics.length === 0 && <span className="effect-empty">No relics collected</span>}
        </div>
      </div>

      <div className="settings-panel">
        <h2>Game Setup</h2>
        <label className="slider-row">
          <span>Beans on board: {foodCount}</span>
          <input
            type="range"
            min={1}
            max={12}
            value={foodCount}
            onChange={(event) => onFoodCountChange(Number(event.target.value))}
          />
        </label>
        <label className="slider-row">
          <span>PvE snakes: {enemyCount}</span>
          <input
            type="range"
            min={1}
            max={3}
            value={enemyCount}
            onChange={(event) => onEnemyCountChange(Number(event.target.value))}
          />
        </label>
        <p className="setup-note">Adventure mode adds obstacle maps and level goals on top of your chosen setup.</p>
      </div>

      <div className="controls">
        <button
          type="button"
          className="btn"
          onClick={onPauseToggle}
          disabled={!started || isGameOver}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button type="button" className="btn secondary" onClick={onRestart}>
          Restart (R)
        </button>
      </div>
    </aside>
  );
}
