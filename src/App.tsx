import { GameBoard } from "./components/GameBoard";
import { HudPanel } from "./components/HudPanel";
import { Overlay } from "./components/Overlay";
import { RunSummary } from "./components/RunSummary";
import { UpgradeOverlay } from "./components/UpgradeOverlay";
import { useSnakeGame } from "./hooks/useSnakeGame";

export default function App() {
  const {
    state,
    bursts,
    started,
    activeTimers,
    draftOffers,
    recentBuild,
    dashCooldownRemainingMs,
    updateFoodCount,
    updateEnemyCount,
    updateGameMode,
    startGame,
    pauseOrResume,
    restartGame,
    chooseDraftOption
  } = useSnakeGame();

  const keyHints =
    state.mode === "adventure"
      ? "Keys: Arrow / WASD move, E dash, 1-3 choose draft, Space pause, R restart"
      : "Keys: Arrow / WASD move, Space pause, R restart";

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
        mode={state.mode}
        currentLevel={state.currentLevel}
        levelGoal={state.levelGoal}
        comboCount={state.comboCount}
        comboMultiplier={state.comboMultiplier}
        activeTimers={activeTimers}
        runPhase={state.run.phase}
        segmentIndex={state.run.segmentIndex}
        eliteSegment={state.run.eliteSegment}
        collapseStarted={state.run.collapseStarted}
        dashCharges={state.activeSkill.charges}
        dashMaxCharges={state.activeSkill.maxCharges}
        dashCooldownRemainingMs={dashCooldownRemainingMs}
        recentBuild={recentBuild}
        onFoodCountChange={updateFoodCount}
        onEnemyCountChange={updateEnemyCount}
        onModeChange={updateGameMode}
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
          hasUpgradeDraft={Boolean(state.run.upgradeDraft)}
          hasSummary={Boolean(state.summary)}
          onStart={startGame}
          onRestart={restartGame}
        />
        {state.run.upgradeDraft && draftOffers.length > 0 && (
          <UpgradeOverlay
            offers={draftOffers}
            source={state.run.upgradeDraft.source}
            onSelect={chooseDraftOption}
          />
        )}
        {state.summary && <RunSummary summary={state.summary} onRestart={restartGame} />}
        <p className="key-hints">{keyHints}</p>
      </section>
    </main>
  );
}
