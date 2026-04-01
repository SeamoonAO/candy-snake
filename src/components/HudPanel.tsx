import type { GameMode } from "../game/types";

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
  runPhase: "segment" | "draft";
  segmentIndex: number;
  eliteSegment: boolean;
  collapseStarted: boolean;
  lives: number;
  maxLives: number;
  hurtActive: boolean;
  autopilotEnabled: boolean;
  dashCharges: number;
  dashMaxCharges: number;
  dashCooldownRemainingMs: number;
  recentBuild: Array<{ id: string; label: string }>;
  onFoodCountChange: (count: number) => void;
  onEnemyCountChange: (count: number) => void;
  onModeChange: (mode: GameMode) => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  onToggleAutopilot: () => void;
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
  runPhase,
  segmentIndex,
  eliteSegment,
  collapseStarted,
  lives,
  maxLives,
  hurtActive,
  autopilotEnabled,
  dashCharges,
  dashMaxCharges,
  dashCooldownRemainingMs,
  recentBuild,
  onFoodCountChange,
  onEnemyCountChange,
  onModeChange,
  onPauseToggle,
  onRestart,
  onToggleAutopilot
}: Props) {
  const dashReady = dashCharges > 0;
  const dashHint = dashReady ? "Dash ready on E" : `Cooldown ${toSeconds(dashCooldownRemainingMs)}s`;
  const segmentSource = collapseStarted ? "Collapse" : eliteSegment ? "Elite" : "Standard";

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
        {mode === "adventure" && (
          <div className="run-panel">
            <div className="run-header">
              <h2>Run</h2>
              <span className={`mode-chip ${runPhase === "draft" ? "draft-chip" : ""}`}>{runPhase}</span>
            </div>
            <div className="run-meta">
              <div className="run-stat">
                <span>Segment</span>
                <strong>{segmentIndex}</strong>
              </div>
              <div className="run-stat">
                <span>Source</span>
                <strong>{segmentSource}</strong>
              </div>
            </div>
            <div className={`life-card ${hurtActive ? "hurt" : ""}`}>
              <div>
                <span className="dash-label">Lives</span>
                <strong>
                  {lives} / {maxLives}
                </strong>
              </div>
              <div className="life-pips" aria-label={`Lives ${lives} of ${maxLives}`}>
                {Array.from({ length: maxLives }, (_, index) => (
                  <span key={index} className={index < lives ? "life-pip full" : "life-pip empty"}>
                    {index < lives ? "❤" : "·"}
                  </span>
                ))}
              </div>
            </div>
            <div className={`life-card ${autopilotEnabled ? "autopilot" : ""}`}>
              <div>
                <span className="dash-label">Autopilot</span>
                <strong>{autopilotEnabled ? "ON" : "OFF"}</strong>
              </div>
              <div className="life-pips" aria-label={`Autopilot ${autopilotEnabled ? "on" : "off"}`}>
                <span className={autopilotEnabled ? "life-pip full" : "life-pip empty"}>
                  {autopilotEnabled ? "AUTO" : "MANUAL"}
                </span>
              </div>
            </div>
            <button type="button" className="seg-btn" onClick={onToggleAutopilot}>
              {autopilotEnabled ? "Disable Autopilot" : "Enable Autopilot"}
            </button>
            <div className="dash-card">
              <div>
                <span className="dash-label">Dash</span>
                <strong>
                  {dashCharges}/{dashMaxCharges}
                </strong>
              </div>
              <span className={`dash-hint ${dashReady ? "ready" : ""}`}>{dashHint}</span>
            </div>
          </div>
        )}
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

      {mode === "adventure" && (
        <div className="build-panel">
          <div className="combo-header">
            <h2>Build</h2>
            <span className="mode-chip">{recentBuild.length}</span>
          </div>
          <div className="build-chip-list">
            {recentBuild.length > 0 ? (
              recentBuild.map((upgrade) => (
                <span key={`${upgrade.id}-${upgrade.label}`} className="build-chip">
                  {upgrade.label}
                </span>
              ))
            ) : (
              <span className="build-empty">Draft picks will stack here.</span>
            )}
          </div>
        </div>
      )}

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

      <p className="control-copy">
        {mode === "adventure"
          ? "Move with Arrow / WASD. Press E to dash, Q to toggle autopilot, 1-3 to draft, Space to pause, R to reset."
          : "Move with Arrow / WASD. Press Space to pause and R to reset."}
      </p>

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
