import { writable } from "svelte/store";
import type { NodeModel, PortConnection } from "../lib/types";

export const nodes = writable<NodeModel[]>([]);
export const selectedNodeId = writable<number | null>(null);
export const lines = writable<PortConnection[]>([]);