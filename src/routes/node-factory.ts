import type { NodeModel } from "$lib/types";

const DEFAULT_SPAWN_RANGE = 500;

function randomPosition(max: number): number {
  return Math.floor(Math.random() * max);
}

export function createNodeFactory() {
  let nextId = 0;

  return function createNode(
    x = randomPosition(DEFAULT_SPAWN_RANGE),
    y = randomPosition(DEFAULT_SPAWN_RANGE),
  ): Omit<NodeModel, "z"> {
    return {
      id: nextId++,
      x,
      y,
      nodeType: "",
      ports: {inputs:{}, outputs:{}},
    };
  };
}
