import type { RunSummary as RunSummaryState } from "../game/types";

interface Props {
  summary: RunSummaryState;
  onRestart: () => void;
}

export function RunSummary({ summary, onRestart }: Props) {
  return (
    <div className="overlay summary-overlay">
      <div className="overlay-card summary-card">
        <p className="overlay-eyebrow">Run Summary</p>
        <h2>Adventure complete</h2>
        <p className="summary-copy">Segment {summary.segmentReached} reached before the run collapsed.</p>
        <div className="summary-grid">
          <div className="summary-stat">
            <span>Segment</span>
            <strong>{summary.segmentReached}</strong>
          </div>
          <div className="summary-stat">
            <span>Final Score</span>
            <strong>{summary.score}</strong>
          </div>
          <div className="summary-stat">
            <span>Highest Combo</span>
            <strong>{summary.highestCombo}</strong>
          </div>
          <div className="summary-stat">
            <span>Cleared</span>
            <strong>{summary.clearedSegments}</strong>
          </div>
        </div>
        <div className="summary-build">
          <span className="summary-label">Chosen upgrades</span>
          <div className="build-chip-list">
            {summary.chosenUpgradeIds.length > 0 ? (
              summary.chosenUpgradeIds.map((upgradeId) => (
                <span key={upgradeId} className="build-chip">
                  {upgradeId}
                </span>
              ))
            ) : (
              <span className="build-empty">No upgrades taken</span>
            )}
          </div>
        </div>
        <button type="button" className="btn" onClick={onRestart}>
          Play Again
        </button>
      </div>
    </div>
  );
}
