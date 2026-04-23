import { writable } from "svelte/store";
import type { NodeIO, NodeModel } from "./types";

export const ioMap = writable<Record<string, NodeIO>>({});
export const nodes = writable<NodeModel[]>([]);
export const selectedNodeId = writable<number | null>(null);
export const modules = writable<Record<string, string>>({});
export const nodeModules = writable<Record<string, string>>({});
