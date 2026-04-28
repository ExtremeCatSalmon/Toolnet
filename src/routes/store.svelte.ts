import type { NodeModel, PortConnection } from "$lib/types";

export const nodes = $state<NodeModel[]>([]);
export const lines = $state<PortConnection[]>([]);
export const selection = $state<{
  nodeId: number | null;
}>({
  nodeId: null,
});
