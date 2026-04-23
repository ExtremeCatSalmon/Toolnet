<script lang="ts">
  import { onMount } from "svelte";
  import { luaVM } from "$lib/lua/lua";
  import Inspector from "./Inspector.svelte";
  import { setupLuaSync, initLuaModules } from "./lua.svelte";
  import Node from "./Node.svelte";
  import { createNodeFactory } from "./node-factory";
  import { nodes, selectedNodeId } from "./store";

  const createNode = createNodeFactory();
  const LUA_SMOKE_TEST = `
    local add = require "nodes.add"
    local sub = require "nodes.sub"
    local divmod = require "nodes.divmod"
    print(add(60, 7), sub(170, 0.1), divmod(67, 2))
  `;

  function runLuaSmokeTest() {
    const status = luaVM.dostring(LUA_SMOKE_TEST);
    if (status !== 0) {
      console.error("Lua smoke test failed:", luaVM.get_error());
    }
  }

  onMount(() => {
    const cleanup = setupLuaSync();

    void initLuaModules()
      .then(() => {
        runLuaSmokeTest();
      })
      .catch((error) => {
        console.error("Failed to initialize Lua modules:", error);
      });

    return () => {
      cleanup();
      luaVM.close();
    };
  });

  let topZ = $state(0);

  function createAndAppendNode(x?: number, y?: number) {
    $nodes = [...$nodes, { ...createNode(x, y), z: ++topZ }];
  }

  function updateNodePosition(nodeId: number, x: number, y: number) {
    $nodes = $nodes.map((node) => (node.id === nodeId ? { ...node, x, y } : node));
  }

  function focusNode(nodeId: number) {
    const target = $nodes.find((node) => node.id === nodeId);
    if (!target) return;

    if (target.z < topZ) {
      const nextZ = topZ + 1;
      topZ = nextZ;
      $nodes = $nodes.map((node) => (node.id === nodeId ? { ...node, z: nextZ } : node));
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

  function openMenu(e: MouseEvent, menuType: MenuType, nodeId: number | null = null) {
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
    <div class="context-menu" style:top={`${menuY}px`} style:left={`${menuX}px`}>
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
        x={node.x}
        y={node.y}
        z={node.z}
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
      <Inspector nodeId={$selectedNodeId} />
    {:else}
      <p>No node selected</p>
    {/if}
  </aside>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    color: white;
  }

  .app {
    display: flex;
    min-height: 100vh;
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
    border: 1px solid #ccc;
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
