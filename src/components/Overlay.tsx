interface Props {
  started: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  score: number;
  onStart: () => void;
  onRestart: () => void;
}

export function Overlay({ started, isPaused, isGameOver, score, onStart, onRestart }: Props) {
  if (!started) {
    return (
      <div className="overlay">
        <div className="overlay-card">
          <h2>Ready for sugar rush?</h2>
          <p>Use Arrow keys or WASD to move. Collect candies and grab fun power-ups.</p>
          <button type="button" className="btn" onClick={onStart}>
            Start Game
          </button>
        </div>
      </div>
    );
  }

  if (isGameOver) {
    return (
      <div className="overlay">
        <div className="overlay-card">
          <h2>Game Over</h2>
          <p>Your score: {score}</p>
          <button type="button" className="btn" onClick={onRestart}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className="overlay subtle">
        <div className="overlay-card">
          <h2>Paused</h2>
          <p>Press Space or Resume to continue.</p>
        </div>
      </div>
    );
  }

  return null;
}
