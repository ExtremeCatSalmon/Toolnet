import type { NodeModel } from "$lib/types";
import { nodeIdCounter } from "./store.svelte";

const DEFAULT_SPAWN_RANGE = 500;

function randomPosition(max: number): number {
  return Math.floor(Math.random() * max);
}

export function createNodeFactory() {
  return function createNode(
    x = randomPosition(DEFAULT_SPAWN_RANGE),
    y = randomPosition(DEFAULT_SPAWN_RANGE),
  ): Omit<NodeModel, "z"> {
    return {
      id: nodeIdCounter(),
      x,
      y,
      nodeType: "",
      portPositions: new Map<string, () => { x: number; y: number }>(),
    };
  };
}
