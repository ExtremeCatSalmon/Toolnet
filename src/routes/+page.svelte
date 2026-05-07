<script lang="ts">
  import { onMount } from "svelte";
  import Inspector from "./Inspector.svelte";
  import Node from "./Node.svelte";
  import { createNodeFactory } from "./node-factory";
  import { nodeLinks, nodes, selectedNodeId } from "./store.svelte";
  import type { NodeIO, Port, NodeLink, NodeTreeNode } from "$lib/types";
  import {
    LuaWorkerClientImpl,
    type LuaWorkerClient,
  } from "$lib/lua/worker-client";

  const createNode = createNodeFactory();

  let ioByNodeType: Record<string, NodeIO> = $state({});
  const emptyNodeIO = { inputs: {}, outputs: {} };
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
  function updateNodePortPositions(
    nodeId: number,
    portPositions: Map<string, () => { x: number; y: number }>,
  ) {
    $nodes = $nodes.map((node) =>
      node.id === nodeId ? { ...node, portPositions } : node,
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

  function makeTreeFrom(nodeId: number, output: string = ""): NodeTreeNode {
    let treeRoot: NodeTreeNode = {
      id: nodeId,
      hm: output,
      connectedNodesByInputPort: {},
    };
    nodeLinks.forEach((link) => {
      if (link.nodes.includes(nodeId)) {
        const idx = link.nodes.indexOf(nodeId);
        if (link.ports[idx].type == "output") return;
        treeRoot.connectedNodesByInputPort[link.ports[idx].name] = makeTreeFrom(link.nodes[1-idx],link.ports[idx].name);
      }
    });
    return treeRoot;
  }

  function runNode(nodeId: number) {
    console.log(makeTreeFrom(nodeId));
    // let links = nodeLinks.filter(
    //   (link) => link.node1Id === nodeId || link.node2Id === nodeId,
    // );
    // links.forEach((link) => {
    //   if (link.node1Id === nodeId) {
    //     if (link.port1.type === "input") {
    //     }
    //   } else {
    //     if (link.port2.type === "input") {
    //     }
    //   }
    // });
  }

  function deleteNode(nodeId: number) {
    nodeLinks.splice(
      0,
      nodeLinks.length,
      ...nodeLinks.filter((link) => !link.nodes.includes(nodeId)),
    );
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
      Run: () => {
        if (menuNodeId === null) return;
        runNode(menuNodeId);
        closeMenu();
      },
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

  let last_port_node_id = $state<number>(-1);
  let last_port = $state<Port | undefined>();
  $effect(() => {
    console.log("AWESOME", $state.snapshot(nodeLinks));
  });
  function newLink(
    node1Id: number,
    port1: Port,
    node2Id: number,
    port2: Port,
  ): NodeLink {
    return { nodes: [node1Id, node2Id], ports: [port1, port2] };
  }
  function pushLink(link: NodeLink) {
    nodeLinks.push(link);
  }
  function samePort(port1: Port, port2: Port) {
    return port1.name === port2.name && port1.type === port2.type;
  }
  // true when equal.
  function compareLink(link1: NodeLink, link2: NodeLink): boolean {
    return (
      (link1.nodes[0] === link2.nodes[0] &&
        link1.nodes[1] === link2.nodes[1] &&
        samePort(link1.ports[0], link2.ports[0]) &&
        samePort(link1.ports[1], link2.ports[1])) ||
      (link1.nodes[0] === link2.nodes[1] &&
        link1.nodes[1] === link2.nodes[0] &&
        samePort(link1.ports[0], link2.ports[1]) &&
        samePort(link1.ports[1], link2.ports[0]))
    );
  }
  function findLinkIdxFromNodeLinks(link: NodeLink): number {
    return nodeLinks.findIndex((ln) => compareLink(ln, link));
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
  >
    {#each nodeLinks as link, linkIdx (linkIdx)}
      {@const node1 = $nodes.find((n) => n.id === link.nodes[0])}
      {@const node2 = $nodes.find((n) => n.id === link.nodes[1])}
      {@const port1Pos = node1?.portPositions.get(
        `${link.ports[0].type}:${link.ports[0].name}`,
      )?.()}
      {@const port2Pos = node2?.portPositions.get(
        `${link.ports[1].type}:${link.ports[1].name}`,
      )?.()}
      <line
        x1={port1Pos?.x}
        y1={port1Pos?.y}
        x2={port2Pos?.x}
        y2={port2Pos?.y}
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
        portPositions={node.portPositions}
        nodeIO={ioByNodeType[node.nodeType] ?? emptyNodeIO}
        selected={node.id === $selectedNodeId}
        selectedPort={last_port_node_id === node.id
          ? (last_port ?? { type: "input", name: "" })
          : { type: "input", name: "" }}
        oncontextmenu={(e) => openMenu(e, "node", node.id)}
        onmove={(nextX, nextY) => updateNodePosition(node.id, nextX, nextY)}
        onportupdate={(portPositions) =>
          updateNodePortPositions(node.id, portPositions)}
        onportselect={(port: Port) => {
          console.log(node.id, port);
          function fail() {
            // failed to make link
            last_port_node_id = node.id;
            last_port = port;
          }
          function done() {
            // succeeded to make link or did something
            last_port_node_id = -1;
            last_port = undefined;
          }
          if (last_port != undefined) {
            if (last_port_node_id == node.id) return fail();
            if (last_port.type == port.type) return fail();
            const new_link = newLink(
              node.id,
              port,
              last_port_node_id,
              last_port,
            );
            const link_idx = findLinkIdxFromNodeLinks(new_link);
            if (link_idx > -1) {
              nodeLinks.splice(link_idx, 1);
              return done();
            }
            pushLink(new_link);
            return done();
          }
          fail();
        }}
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
