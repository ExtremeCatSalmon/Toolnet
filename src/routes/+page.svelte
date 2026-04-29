<script lang="ts">
  import { onMount, untrack } from "svelte";
  import Inspector from "./Inspector.svelte";
  import Node from "./Node.svelte";
  import { createNodeFactory } from "./node-factory";
  import { nodes, selection, portMap, nodeIdCounter } from "./store.svelte";
  import { type NodeIO } from "$lib/types";
  import {
    LuaWorkerClientImpl,
    type LuaWorkerClient,
  } from "$lib/lua/worker-client";
  import { makePortId, parsePortId } from "$lib/port";

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
    const new_node = createNode(x, y);
    new_node.z = ++topZ;
    nodes[nodeIdCounter.count++] = new_node;
  }

  function updateNodePosition(nodeId: number, x: number, y: number) {
    if (nodeId in nodes) {
      nodes[nodeId].x = x;
      nodes[nodeId].y = y;
    }
  }

  function focusNode(nodeId: number) {
    if (!(nodeId in nodes)) return;
    // if (nodes[target].z < topZ) {
    // }
    nodes[nodeId].z = ++topZ;
    selection.nodeId = nodeId;
  }

  function deleteNode(nodeId: number) {
    const io = ioByNodeType[nodes[nodeId].nodeType];
    if (io) {
      (["input", "output"] as ("input" | "output")[]).forEach((kind) => {
        // @ts-ignore
        Object.keys(io[kind + "s"]).forEach((portName: string) => {
          const portId = makePortId(nodeId, kind, portName);
          portMap[portId].linked.forEach((pid) => {
            portMap[pid].linked.delete(portId);
            portMap[pid] = { ...portMap[pid] };
          });
          delete portMap[portId];
        });
      });
    }
    delete nodes[nodeId];
    if (selection.nodeId === nodeId) {
      selection.nodeId = null;
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

  let selected_port: string | undefined = $state();

  function onPortClick(portId: string) {
    if (!selected_port) {
      selected_port = portId;
      return;
    }
    const port1 = parsePortId(selected_port);
    const port2 = parsePortId(portId);
    if (port1.nodeId === port2.nodeId || port1.kind === port2.kind) {
      selected_port = portId;
      return;
    }
    selected_port = undefined;
    if (
      portMap[port1.id].linked.has(port2.id) ||
      portMap[port2.id].linked.has(port1.id)
    ) {
      portMap[port1.id].linked.delete(port2.id);
      portMap[port2.id].linked.delete(port1.id);
      portMap[port1.id] = { ...portMap[port1.id] };
      portMap[port2.id] = { ...portMap[port2.id] };
      return;
    }
    portMap[port1.id].linked.add(port2.id);
    portMap[port2.id].linked.add(port1.id);
    portMap[port1.id] = { ...portMap[port1.id] };
    portMap[port2.id] = { ...portMap[port2.id] };
  }
  let c = $state(0);
  $effect(() => {
    untrack(() => {
      c++;
    });
    console.log("changed", $state.snapshot(portMap));
  });
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

  <h1>{c}</h1>
  <svg
    style="pointer-events: none; inset: 0; width: 100%; height: 100%; position: absolute;"
  >
    {#each Object.entries(portMap) as [portId, port] (portId)}
      {#each port.linked as pid (pid)}
        <line
          x1={port.x}
          y1={port.y}
          x2={portMap[pid].x}
          y2={portMap[pid].y}
          stroke="white"
          stroke-width="5"
        />
      {/each}
    {/each}
    <!-- {#each lines as line}
      <line
        x1={nodes.find((n) => n.id === line?.first_id)?.ports.inputs[
          line.first_port
        ]?.x}
        y1={nodes.find((n) => n.id === line?.first_id)?.ports.inputs[
          line.first_port
        ]?.y}
        x2={nodes.find((n) => n.id === line?.second_id)?.ports.outputs[
          line.second_port
        ]?.x}
        y2={nodes.find((n) => n.id === line?.second_id)?.ports.outputs[
          line.second_port
        ]?.y}
        stroke="white"
        stroke-width="5"
      />
    {/each} -->
  </svg>

  <section
    role="button"
    tabindex="0"
    class="content"
    onmousedown={() => {
      selection.nodeId = null;
      selected_port = undefined;
      closeMenu();
    }}
    oncontextmenu={(e) => openMenu(e, "canvas")}
  >
    {#each Object.entries(nodes) as [_nodeId, node] (_nodeId)}
      {@const nodeId = parseInt(_nodeId)}
      <Node
        {node}
        id={nodeId}
        x={node.x}
        y={node.y}
        z={node.z}
        {selected_port}
        nodeIO={ioByNodeType[node.nodeType] || { inputs: {}, outputs: {} }}
        selected={nodeId === selection.nodeId}
        oncontextmenu={(e: MouseEvent) => openMenu(e, "node", nodeId)}
        onmove={(nextX: number, nextY: number) => {
          updateNodePosition(nodeId, nextX, nextY);
        }}
        onselect={() => {
          focusNode(nodeId);
        }}
        oninputportclick={onPortClick}
        onoutputportclick={onPortClick}
      />
    {/each}
  </section>

  <aside class="sidebar">
    <h3>Node Props</h3>
    {#if selection.nodeId !== null}
      <Inspector
        io={ioByNodeType[nodes[selection.nodeId].nodeType] || {inputs: {}, outputs: {}}}
        nodeId={selection.nodeId}
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
