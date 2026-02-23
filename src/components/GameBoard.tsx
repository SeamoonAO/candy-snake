import type { CSSProperties } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH } from "../game/constants";
import { pointToKey } from "../game/random";
import type { GameState, PowerUpType } from "../game/types";

const POWERUP_LABEL: Record<PowerUpType, string> = {
  SPEED_UP: "S+",
  SLOW_DOWN: "S-",
  GHOST_WALL: "GW",
  DOUBLE_SCORE: "2X",
  SHORTEN: "SH",
  SHIELD: "SD"
};

interface Props {
  state: GameState;
  bursts: Array<{
    id: string;
    x: number;
    y: number;
    kind: "food" | "powerup";
  }>;
}

export function GameBoard({ state, bursts }: Props) {
  const snakeIndexMap = new Map(state.snake.map((segment, index) => [pointToKey(segment), index]));
  const foodKeys = new Set(state.foods.map(pointToKey));
  const powerUpKey = state.powerUp ? pointToKey(state.powerUp.position) : null;
  const cells = Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }, (_, i) => ({
    x: i % BOARD_WIDTH,
    y: Math.floor(i / BOARD_WIDTH)
  }));

  return (
    <section className="board-shell" aria-label="Candy snake board">
      <div className="game-board">
        {cells.map((cell) => {
          const key = pointToKey(cell);
          const snakeIndex = snakeIndexMap.get(key);
          const isFood = foodKeys.has(key);
          const isPowerUp = key === powerUpKey && state.powerUp;

          let className = "cell";
          let content: string | null = null;
          const style: Record<string, string> = {};

          if (typeof snakeIndex === "number") {
            className += snakeIndex === 0 ? " snake head" : " snake";
            style["--snake-hue"] = `${(snakeIndex * 24 + 80) % 360}`;
          } else if (isFood) {
            className += " food";
          } else if (isPowerUp && state.powerUp) {
            className += ` powerup powerup-${state.powerUp.type.toLowerCase()}`;
            content = POWERUP_LABEL[state.powerUp.type];
          }

          return (
            <div key={key} className={className} style={style}>
              {content ? <span>{content}</span> : null}
            </div>
          );
        })}
      </div>
      <div className="board-fx-layer" aria-hidden>
        {bursts.map((burst) => (
          <span
            key={burst.id}
            className={`burst burst-${burst.kind}`}
            style={
              {
                "--fx-left": `${((burst.x + 0.5) / BOARD_WIDTH) * 100}%`,
                "--fx-top": `${((burst.y + 0.5) / BOARD_HEIGHT) * 100}%`
              } as CSSProperties
            }
          />
        ))}
      </div>
    </section>
  );
}
