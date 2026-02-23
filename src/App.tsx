import { GameBoard } from "./components/GameBoard";
import { HudPanel } from "./components/HudPanel";
import { Overlay } from "./components/Overlay";
import { useSnakeGame } from "./hooks/useSnakeGame";

export default function App() {
  const {
    state,
    bursts,
    started,
    activeTimers,
    updateFoodCount,
    updateEnemyCount,
    startGame,
    pauseOrResume,
    restartGame
  } = useSnakeGame();

  return (
    <main className="app">
      <HudPanel
        score={state.score}
        bestScore={state.bestScore}
        gamesPlayed={state.gamesPlayed}
        tickMs={state.tickMs}
        isPaused={state.isPaused}
        isGameOver={state.isGameOver}
        started={started}
        foodCount={state.foodCount}
        enemyCount={state.enemyCount}
        activeTimers={activeTimers}
        onFoodCountChange={updateFoodCount}
        onEnemyCountChange={updateEnemyCount}
        onPauseToggle={pauseOrResume}
        onRestart={restartGame}
      />

      <section className="play-area">
        <GameBoard state={state} bursts={bursts} />
        <Overlay
          started={started}
          isPaused={state.isPaused}
          isGameOver={state.isGameOver}
          score={state.score}
          onStart={startGame}
          onRestart={restartGame}
        />
        <p className="key-hints">Keys: Arrow / WASD to move, Space pause, R restart</p>
      </section>
    </main>
  );
}
