import { writable } from "svelte/store";
import type { NodeModel, NodeLink } from "../lib/types";

export const nodes = writable<NodeModel[]>([]);
export const selectedNodeId = writable<number | null>(null);
export const nodeLinks = $state<NodeLink[]>([]);
let nodeIdCnt = 0;
export const nodeIdCounter = (): number => {
    return nodeIdCnt++;
};
// nodes.subscribe((newNodes)=>{
//     console.log("UNBELIEVABLE", newNodes);
// });