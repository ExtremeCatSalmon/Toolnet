<script lang="ts">
  import { type NodeIO, type NodeModel } from "$lib/types";
  import { onDestroy } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import { portMap } from "./store.svelte";
  import { makePortId } from "$lib/port";

  let container: HTMLElement;

  interface Props {
    node: NodeModel;
    id: number;
    x: number;
    y: number;
    z: number;
    nodeIO: NodeIO;
    selected?: boolean;
    selected_port?: string;
    onselect?: () => void;
    oncontextmenu?: (e: MouseEvent) => void;
    onmove?: (nextX: number, nextY: number) => void;
    oninputportclick?: (portId: string) => void;
    onoutputportclick?: (portId: string) => void;
    onupdate?: (ports: string[]) => void;
  }

  let {
    node,
    id,
    x,
    y,
    z,
    selected = false,
    selected_port,
    nodeIO,
    onselect,
    oncontextmenu,
    onmove,
    oninputportclick,
    onoutputportclick,
    onupdate,
  }: Props = $props();

  let dragging = $state(false);
  let offsetX = 0;
  let offsetY = 0;

  function detachDragListeners() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  function centerPointFromElement(el: Element): {x: number, y: number} {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.width / 2,
    };
  }
  // function collectPortPoints(
  //   kind: "input" | "output",
  // ): Record<string, Port> {
  //   const result: Record<string, Port> = {};
  //   let source = kind === "input" ? ports.inputs : ports.outputs;
  //   source ??= {};

  //   Object.keys(source).forEach((portName) => {
  //     const el = container.querySelector(
  //       `[data-port-name=${portName}][data-port=${kind}]`,
  //     );
  //     if (!el) return;
  //     result[portName].pos = centerPointFromElement(el);
  //   });

  //   return result;
  // }

  function onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    onselect?.();
    event.stopPropagation();

    dragging = true;
    offsetX = event.clientX - x;
    offsetY = event.clientY - y;

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

function updatePortPosition(portId: string) {
  const port = portMap[portId];
  if (!port?.el) return;

  const rect = port.el.getBoundingClientRect();

  port.x = rect.x + rect.width / 2;
  port.y = rect.y + rect.height / 2;
}
  // TODO: line 동기화 제대로 안되는거 해결
  function onMouseMove(event: MouseEvent) {
    if (!dragging) return;
    Object.keys(portMap).forEach(portId => {
      console.log(portId);
      updatePortPosition(portId);
    });
    onmove?.(event.clientX - offsetX, event.clientY - offsetY);
  }

  function onMouseUp() {
    dragging = false;
    detachDragListeners();
  }

  onDestroy(() => {
    detachDragListeners();
  });

  function registerPort(
    kind: "input" | "output",
    portName: string,
  ): Attachment {
    const portId = makePortId(id, kind, portName);
    return (el) => {
      const div = el as HTMLElement;
      div.onmousedown = (e: MouseEvent) => {
        e.stopPropagation();
        if (kind === "input") {
          oninputportclick?.(portId);
        } else {
          onoutputportclick?.(portId);
        }
      };
      portMap[portId] = {
        el: el,
        ...centerPointFromElement(el),
        linked: new Set<string>(),
        node,
      };
      return () => {
        console.log("cleaning");
      };
    };
  }
</script>

<button
  bind:this={container}
  style:box-shadow={selected
    ? "0 0 0 2px var(--kick-color)"
    : "0 0 0 1px var(--kick-color)"}
  {oncontextmenu}
  onmousedown={onMouseDown}
  style:left={`${x}px`}
  style:top={`${y}px`}
  style:z-index={z}
  // style:cursor={dragging ? "grabbing" : "grab"}
>
  {#each Object.entries(nodeIO.inputs).sort() as [k, v]}
    <div
      style="flex-grow: 1; width: 100%; text-align: left; align-content: center;"
      title={v}
    >
      <div
        {@attach registerPort("input", k)}
        class="dot"
        style="transform: translate(-50%,0%)"
        style:background-color={selected_port === makePortId(id, "input", k)
          ? "var(--kick-color)"
          : "white"}
      ></div>
      <div class="label">{k}</div>
    </div>
  {/each}
  {#each Object.entries(nodeIO.outputs).sort() as [k, v]}
    <div
      style="flex-grow: 1; width: 100%; text-align: right; align-content: center;"
      title={v}
    >
      <div class="label">{k}</div>
      <div
        {@attach registerPort("output", k)}
        class="dot"
        style="transform: translate(50%,0%)"
        style:background-color={selected_port === makePortId(id, "output", k)
          ? "var(--kick-color)"
          : "white"}
      ></div>
    </div>
  {/each}
</button>

<style>
  button {
    border: none;
    position: absolute;
    color: var(--text-color);
    width: 10rem;
    min-height: 11.68rem;
    background: #383838;
    padding: 0px;
    margin: 0px;

    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;

    display: flex;
    flex-direction: column;
    align-items: flex-start;

    box-sizing: border-box;
  }
  .dot {
    cursor: pointer;
    width: 0.75rem;
    height: 0.75rem;
    vertical-align: middle;
    display: inline-block;
    box-sizing: content-box;
  }
  .dot:active {
    background-color: var(--kick-color) !important;
  }
  .label {
    cursor: pointer;
    display: inline-block;
    vertical-align: middle;
    line-height: 0.5rem;
  }
</style>
