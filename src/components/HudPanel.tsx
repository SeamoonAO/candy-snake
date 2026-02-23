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
  activeTimers: ActiveTimers;
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
  activeTimers,
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
