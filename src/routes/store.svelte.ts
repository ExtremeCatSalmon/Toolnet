import type { NodeModel, Port } from "$lib/types";

export const nodes = $state<Record<number,NodeModel>>({});
export const portMap = $state<Record<string, Port>>({});
export const nodeIdCounter = $state<{ count: number }>({ count: 0 });
export const selection = $state<{
  nodeId: number | null;
}>({
  nodeId: null,
});
