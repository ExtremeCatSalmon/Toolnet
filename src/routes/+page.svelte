<script lang="ts">
  import { onMount } from "svelte";
  import Inspector from "./Inspector.svelte";
  import Node from "./Node.svelte";
  import { createNodeFactory } from "./node-factory";
  import { nodes, selectedNodeId } from "./store";
  import { type NodeIO } from "$lib/types";
  import {
    LuaWorkerClientImpl,
    type LuaWorkerClient,
  } from "$lib/lua/worker-client";

  const createNode = createNodeFactory();

  let ioByNodeType: Record<string, NodeIO> = $state({});
  // let nodeModules: Record<string, string> = $state({});
  let luaWorkerClient: LuaWorkerClient = new LuaWorkerClientImpl();

  onMount(() => {
    luaWorkerClient.connect();
    luaWorkerClient.onMessage((msg) => {
      if (msg.type === "ready") {
        luaWorkerClient
          .run(
            `
        local names = {}
        for key,value in pairs(package.preload) do
          if string.find(key,"^nodes.") then
            names[key] = {}
            names[key]['inputs'] = value().inputs
            names[key]['outputs'] = value().outputs
          end
        end
        return names
        `,
          )
          .then((ret) => {
            ioByNodeType = ret[0];
          })
          .catch((err) => {
            console.error("failed to load node modules:", err);
          });
      }
    });
    luaWorkerClient.onError((err: ErrorEvent) => {
      console.error("worker error:", err);
    });
    return function () {
      luaWorkerClient.disconnect();
    };
  });

  let topZ = $state(0);

  function createAndAppendNode(x?: number, y?: number) {
    $nodes = [...$nodes, { ...createNode(x, y), z: ++topZ }];
  }

  function updateNodePosition(nodeId: number, x: number, y: number) {
    $nodes = $nodes.map((node) =>
      node.id === nodeId ? { ...node, x, y } : node,
    );
  }

  function focusNode(nodeId: number) {
    const target = $nodes.find((node) => node.id === nodeId);
    if (!target) return;

    if (target.z < topZ) {
      const nextZ = topZ + 1;
      topZ = nextZ;
      $nodes = $nodes.map((node) =>
        node.id === nodeId ? { ...node, z: nextZ } : node,
      );
    }

    $selectedNodeId = nodeId;
  }

  function deleteNode(nodeId: number) {
    $nodes = $nodes.filter((node) => node.id !== nodeId);
    if ($selectedNodeId === nodeId) {
      $selectedNodeId = null;
    }
  }

  let showMenu = $state(false);
  let menuX = $state(0);
  let menuY = $state(0);
  let menuNodeId = $state<number | null>(null);

  type MenuType = "canvas" | "node";
  let currentMenu = $state<MenuType>("canvas");

  function getMenuOptions(menuType: MenuType) {
    if (menuType === "canvas") {
      return {
        "New Node": () => {
          createAndAppendNode(menuX, menuY);
          closeMenu();
        },
      };
    }

    return {
      "Delete Node": () => {
        if (menuNodeId === null) return;
        deleteNode(menuNodeId);
        closeMenu();
      },
    };
  }

  function openMenu(
    e: MouseEvent,
    menuType: MenuType,
    nodeId: number | null = null,
  ) {
    e.preventDefault();
    e.stopPropagation();
    menuX = e.clientX;
    menuY = e.clientY;
    menuNodeId = nodeId;
    showMenu = true;
    currentMenu = menuType;

    if (nodeId !== null) {
      focusNode(nodeId);
    }
  }

  function closeMenu() {
    showMenu = false;
    menuNodeId = null;
  }
</script>

<svelte:head>
  <title>Toolnet</title>
</svelte:head>

<div class="app">
  {#if showMenu}
    <div
      class="context-menu"
      style:top={`${menuY}px`}
      style:left={`${menuX}px`}
    >
      {#each Object.entries(getMenuOptions(currentMenu)) as [label, action]}
        <button onclick={action}>{label}</button>
      {/each}
    </div>
  {/if}

  <svg
    style="pointer-events: none; inset: 0; width: 100%; height: 100%; position: absolute;"
  />

  <section
    role="button"
    tabindex="0"
    class="content"
    onmousedown={() => {
      $selectedNodeId = null;
      closeMenu();
    }}
    oncontextmenu={(e) => openMenu(e, "canvas")}
  >
    {#each $nodes as node (node.id)}
      <Node
        id={node.id}
        x={node.x}
        y={node.y}
        z={node.z}
        nodeIO={ioByNodeType[node.nodeType] ?? { inputs: "", outputs: "" }}
        nodeType={node.nodeType}
        selected={node.id === $selectedNodeId}
        oncontextmenu={(e) => openMenu(e, "node", node.id)}
        onmove={(nextX, nextY) => updateNodePosition(node.id, nextX, nextY)}
        onselect={() => {
          focusNode(node.id);
        }}
      />
    {/each}
  </section>

  <aside class="sidebar">
    <h3>Node Props</h3>
    {#if $selectedNodeId !== null}
      <Inspector
        nodeId={$selectedNodeId}
        nodeModules={Object.keys(ioByNodeType).sort()}
      />
    {:else}
      <p>No node selected</p>
    {/if}
  </aside>
</div>

<style>
  .app {
    display: flex;
    min-height: 100vh;
    --kick-color: salmon;
    --text-color: white;
    color: var(--text-color);
  }

  .content {
    flex: 1;
    padding: 2rem;
    background: #282828;
  }

  .sidebar {
    width: 15rem;
    background-color: #383838;
    box-sizing: border-box;
    padding-left: 1rem;
  }

  .context-menu {
    position: absolute;
    background: #383838;
    border: 1px solid var(--kick-color);
    box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    min-width: 5rem;
  }

  .context-menu button {
    all: unset;
    display: block;
    cursor: pointer;
    padding: 0.25em 0.5em;
    box-sizing: border-box;
    width: 100%;
  }

  .context-menu button:hover {
    background-color: rgba(255, 255, 255, 0.1);
    cursor: pointer;
  }
</style>
