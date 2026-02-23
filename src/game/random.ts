import type { Point } from "./types";

export type Rng = () => number;

export function createRng(seed: number): Rng {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function randomInt(min: number, max: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function chance(probability: number, rng: Rng = Math.random): boolean {
  return rng() < probability;
}

export function pointToKey(point: Point): string {
  return `${point.x},${point.y}`;
}

export function randomEmptyCell(
  width: number,
  height: number,
  occupied: Set<string>,
  rng: Rng = Math.random
): Point | null {
  const capacity = width * height;
  if (occupied.size >= capacity) return null;

  for (let tries = 0; tries < 200; tries += 1) {
    const candidate = { x: randomInt(0, width - 1, rng), y: randomInt(0, height - 1, rng) };
    if (!occupied.has(pointToKey(candidate))) return candidate;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const candidate = { x, y };
      if (!occupied.has(pointToKey(candidate))) return candidate;
    }
  }
  return null;
}

export function pickWeighted<T extends string>(
  weighted: Record<T, number>,
  rng: Rng = Math.random
): T {
  const entries = Object.entries(weighted) as Array<[T, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const roll = rng() * total;
  let cursor = 0;

  for (const [key, weight] of entries) {
    cursor += weight;
    if (roll <= cursor) return key;
  }
  return entries[entries.length - 1][0];
}
