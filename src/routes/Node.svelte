<script lang="ts">
  import { type NodeIO } from "$lib/types";
  import { onDestroy } from "svelte";

  let container: HTMLElement;

  interface Props {
    x: number;
    y: number;
    z: number;
    nodeIO: NodeIO;
    selected?: boolean;
    port_selected?: boolean;
    selected_input_port?: string;
    selected_output_port?: string;
    ports?: {
      inputs: Record<string, { x: number; y: number }>;
      outputs: Record<string, { x: number; y: number }>;
    };
    onselect?: () => void;
    oncontextmenu?: (e: MouseEvent) => void;
    onmove?: (nextX: number, nextY: number, new_ports: typeof ports) => void;
    oninputportclick?: (port_name: string, port_rect: DOMRect) => void;
    onoutputportclick?: (port_name: string, port_rect: DOMRect) => void;
  }

  let {
    x,
    y,
    z,
    selected = false,
    ports = { inputs: {}, outputs: {} },
    port_selected,
    selected_input_port,
    selected_output_port,
    nodeIO,
    onselect,
    oncontextmenu,
    onmove,
    oninputportclick,
    onoutputportclick,
  }: Props = $props();

  let dragging = $state(false);
  let offsetX = 0;
  let offsetY = 0;

  function detachDragListeners() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  function onMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const port = target.closest("[data-port]");
    if (event.button !== 0) return;
    if (port) {
      const portType = port.getAttribute("data-port");
      const rect = port.getBoundingClientRect();
      rect.x += rect.width / 2;
      rect.y += rect.height / 2;
      if (portType === "input") {
        oninputportclick?.(port.getAttribute("data-port-name") || "", rect);
      } else {
        onoutputportclick?.(port.getAttribute("data-port-name") || "", rect);
      }
    } else {
      onselect?.();
      event.stopPropagation();

      dragging = true;
      offsetX = event.clientX - x;
      offsetY = event.clientY - y;

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
  }

  // TODO: line 동기화 제대로 안되는거 해결
  function onMouseMove(event: MouseEvent) {
    if (!dragging) return;
    const new_ports: typeof ports = { inputs: {}, outputs: {} };
    Object.keys(ports.inputs).forEach((port_name) => {
      const n = container.querySelector(`[data-port-name=${port_name}][data-port=input]`);
      if (!n) return;
      const rect = n.getBoundingClientRect();
      rect.x += rect.width / 2;
      rect.y += rect.height / 2;
      new_ports.inputs[port_name] = rect;
    });
    Object.keys(ports.outputs).forEach((port_name) => {
      const n = container.querySelector(`[data-port-name=${port_name}][data-port=output]`);
      if (!n) return;
      const rect = n.getBoundingClientRect();
      rect.x += rect.width / 2;
      rect.y += rect.height / 2;
      new_ports.outputs[port_name] = rect;
    });
    onmove?.(event.clientX - offsetX, event.clientY - offsetY, new_ports);
  }

  function onMouseUp() {
    dragging = false;
    detachDragListeners();
  }

  onDestroy(() => {
    detachDragListeners();
  });
  $effect(() => {
    console.log(port_selected,selected_input_port,selected_output_port);
  });
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
        data-port="input"
        data-port-name={k}
        class="dot"
        style="transform: translate(-50%,0%)"
        style:background-color={port_selected&&selected_input_port===k ? "var(--kick-color)" : "white"}
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
        data-port="output"
        data-port-name={k}
        class="dot"
        style="transform: translate(50%,0%)"
        style:background-color={(port_selected&&selected_output_port===k) ? "var(--kick-color)" : "white"}
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
    background-color: white;
    vertical-align: middle;
    display: inline-block;
    box-sizing: content-box;
  }
  .label {
    cursor: pointer;
    display: inline-block;
    vertical-align: middle;
    line-height: 0.5rem;
  }
</style>
