import { writable } from "svelte/store";
import type { NodeModel } from "../lib/types";

export const nodes = writable<NodeModel[]>([]);
export const selectedNodeId = writable<number | null>(null);
