<script lang="ts">
  import { onMount } from "svelte";
  import Inspector from "./Inspector.svelte";
  import Node from "./Node.svelte";
  import { createNodeFactory } from "./node-factory";
  import { nodes, lines, selection } from "./store.svelte";
  import { type NodeIO, type PortConnection } from "$lib/types";
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
    nodes.push({ ...createNode(x, y), z: ++topZ });
  }

  function updateNodePosition(
    nodeId: number,
    x: number,
    y: number,
    ports: any,
  ) {
    const idx = nodes.findIndex((node) => node.id === nodeId);
    if (idx > -1) {
      nodes[idx].x = x;
      nodes[idx].y = y;
      nodes[idx].ports = ports;
    }
  }

  function focusNode(nodeId: number) {
    const target = nodes.findIndex((node) => node.id === nodeId);
    if (target < 0) return;

    if (nodes[target].z < topZ) {
      const nextZ = topZ + 1;
      topZ = nextZ;
      nodes[target] = { ...nodes[target], z: nextZ };
    }

    selection.nodeId = nodeId;
  }

  function deleteNode(nodeId: number) {
    lines.splice(
      0,
      lines.length,
      ...lines.filter(
        (line) => line.first_id !== nodeId && line.second_id !== nodeId,
      ),
    );
    nodes.splice(
      0,
      nodes.length,
      ...nodes.filter((node) => node.id !== nodeId),
    );
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

  let conn1 = $state<PortConnection | null>(null);
  let selected_port_node: number | undefined = $derived((conn1?.first_id || 0) > -1 ? conn1?.first_id : (conn1?.second_id || 0) > -1 ? conn1?.second_id : -1);
  let selected_input_port: string | undefined = $derived(!!conn1?.first_port ? conn1?.first_port : undefined);
  let selected_output_port: string | undefined = $derived(!!conn1?.second_port ? conn1?.second_port : undefined);
    $effect(() => {
      console.log($state.snapshot(conn1),conn1?.second_id,selected_port_node);
      console.log(conn1?.first_id || 0, conn1?.second_id || 0);
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

  <svg
    style="pointer-events: none; inset: 0; width: 100%; height: 100%; position: absolute;"
  >
    {#each lines as line}
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
    {/each}
  </svg>

  <section
    role="button"
    tabindex="0"
    class="content"
    onmousedown={() => {
      selection.nodeId = null;
      closeMenu();
    }}
    oncontextmenu={(e) => openMenu(e, "canvas")}
  >
    {#each nodes as node (node.id)}
      <Node
        x={node.x}
        y={node.y}
        z={node.z}
        port_selected={selected_port_node==node.id}
        {selected_input_port}
        {selected_output_port}
        ports={node.ports}
        nodeIO={ioByNodeType[node.nodeType] || { inputs: {}, outputs: {} }}
        selected={node.id === selection.nodeId}
        oncontextmenu={(e: MouseEvent) => openMenu(e, "node", node.id)}
        onmove={(
          nextX: number,
          nextY: number,
          new_ports: typeof node.ports,
        ) => {
          updateNodePosition(node.id, nextX, nextY, new_ports);
        }}
        onselect={() => {
          focusNode(node.id);
        }}
        oninputportclick={(port_name: string, port_rect: DOMRect) => {
          if (!conn1)
            conn1 = {
              first_id: -1,
              first_port: "",
              second_id: -1,
              second_port: "",
            };
          node.ports.inputs[port_name] = port_rect;
          conn1.first_id = node.id;
          conn1.first_port = port_name;
          if (conn1.first_id === conn1.second_id) {
            conn1.second_id = -1;
            conn1.second_port = "";
          }
          if (conn1.first_id > -1 && conn1.second_id > -1) {
            const already = lines.findIndex(
              (conn) => JSON.stringify(conn) === JSON.stringify(conn1),
            );
            if (already > -1) {
              lines.splice(already, 1);
            } else {
              lines.push(conn1);
            }
            conn1 = null;
          }
        }}
        onoutputportclick={(port_name: string, port_rect: DOMRect) => {
          if (!conn1)
            conn1 = {
              first_id: -1,
              first_port: "",
              second_id: -1,
              second_port: "",
            };
          node.ports.outputs[port_name] = port_rect;
          conn1.second_id = node.id;
          conn1.second_port = port_name;
          if (conn1.second_id === conn1.first_id) {
            conn1.first_id = -1;
            conn1.first_port = "";
          }
          if (conn1.first_id > -1 && conn1.second_id > -1) {
            const already = lines.findIndex(
              (conn) => JSON.stringify(conn) === JSON.stringify(conn1),
            );
            if (already > -1) {
              lines.splice(already, 1);
            } else {
              lines.push(conn1);
            }
            conn1 = null;
          }
        }}
      />
    {/each}
  </section>

  <aside class="sidebar">
    <h3>Node Props</h3>
    {#if selection.nodeId !== null}
      <Inspector
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
