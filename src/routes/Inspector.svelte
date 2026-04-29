<script lang="ts">
  import { makePortId } from "$lib/port";
  import type { NodeIO } from "$lib/types";
  import { nodes, portMap } from "./store.svelte";

  interface Props {
    nodeId: number;
    nodeModules: string[];
    io: NodeIO;
  }
  const { nodeId, nodeModules, io }: Props = $props();

  const selectedNode = $derived(nodes[nodeId]);

  function updateNodeType(event: Event) {
    const nextType = (event.currentTarget as HTMLSelectElement).value;
    // if (io) {
    //   (["input", "output"] as ("input" | "output")[]).forEach((kind) => {
    //     // @ts-ignore
    //     Object.keys(io[kind + "s"]).forEach((portName: string) => {
    //       const portId = makePortId(nodeId, kind, portName);
    //       portMap[portId].linked.forEach((pid) => {
    //         portMap[pid].linked.delete(portId);
    //         portMap[pid] = { ...portMap[pid] };
    //       });
    //       delete portMap[portId];
    //     });
    //   });
    // }
    nodes[nodeId] = {...nodes[nodeId], nodeType: nextType};
  }
</script>

{#if selectedNode}
  <p>
    node type:
    <select value={selectedNode.nodeType} onchange={updateNodeType}>
      <option value="">not selected</option>
      {#each nodeModules as moduleName}
        <option value={moduleName}>{moduleName}</option>
      {/each}
    </select>
  </p>

  <p>
    {selectedNode.x}
    {selectedNode.y}
    {selectedNode.z}
  </p>
{:else}
  <p>Selected node was not found.</p>
{/if}
