# Candy Snake

A colorful snake game built with React + Vite + TypeScript.

## Modes

- `Endless`: classic arcade snake with power-ups and PvE enemy snakes.
- `Adventure`: roguelite run mode with timed segments, `1-of-3` upgrade drafts, dash skill pressure, and an end-of-run summary.

## Run (Local)

```bash
bun install
bun run dev
```

## Test

```bash
bun run test
```

## Build

```bash
bun run build
```

## Docker Quick Deploy

Build and run with Docker:

```bash
docker build -t candy-snake:latest .
docker run -d --name candy-snake -p 8080:80 candy-snake:latest
```

Or use Docker Compose:

```bash
docker compose up -d --build
```

Then open:

`http://localhost:8080`

## Controls

- Arrow keys / WASD: Move
- `E`: Dash in `Adventure`
- `1`, `2`, `3`: Choose upgrade draft cards in `Adventure`
- Space: Pause / Resume
- R: Restart

## Adventure Loop

- Each adventure run advances through short segments on the main board.
- Segment breaks open a `1-of-3` upgrade draft with normal, elite, or collapse rewards.
- The HUD tracks segment pressure, dash cooldown, and your recent build.
- When the run ends, a summary screen shows segment reached, score, combo peak, and chosen upgrades.
