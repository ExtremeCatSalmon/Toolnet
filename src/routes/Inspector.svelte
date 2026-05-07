<script lang="ts">
  import { nodes } from "./store.svelte";

  interface Props {
    nodeId: number;
    nodeModules: string[];
  }
  const { nodeId, nodeModules }: Props = $props();

  const selectedNode = $derived($nodes.find((node) => node.id === nodeId));

  function updateNodeType(event: Event) {
    const nextType = (event.currentTarget as HTMLSelectElement).value;
    $nodes = $nodes.map((node) =>
      node.id === nodeId ? { ...node, nodeType: nextType } : node,
    );
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
