import type { NodeModel } from "$lib/types";
import { nodeIdCounter } from "./store.svelte";

const DEFAULT_SPAWN_RANGE = 500;

function randomPosition(max: number): number {
  return Math.floor(Math.random() * max);
}

export function createNodeFactory() {
  // let nextId = 0;

  return function createNode(
    x = randomPosition(DEFAULT_SPAWN_RANGE),
    y = randomPosition(DEFAULT_SPAWN_RANGE),
  ): NodeModel {
    return {
      x,
      y,
      z: 0,
      nodeType: "",
    };
  };
}
