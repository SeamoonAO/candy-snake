# Candy Snake

A colorful snake game built with React + Vite + TypeScript.

## Run (Local)

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
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
- Space: Pause / Resume
- R: Restart
