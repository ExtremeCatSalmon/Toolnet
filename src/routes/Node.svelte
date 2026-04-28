<script lang="ts">
  import { type NodeIO } from "$lib/types";
  import { onDestroy } from "svelte";

  interface Props {
    x: number;
    y: number;
    z: number;
    nodeIO: NodeIO;
    selected?: boolean;
    onselect?: () => void;
    oncontextmenu?: (e: MouseEvent) => void;
    onmove?: (nextX: number, nextY: number) => void;
  }

  let {
    x,
    y,
    z,
    selected = false,
    nodeIO,
    onselect,
    oncontextmenu,
    onmove,
  }: Props = $props();

  let dragging = $state(false);
  let offsetX = 0;
  let offsetY = 0;

  function detachDragListeners() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

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

  function onMouseMove(event: MouseEvent) {
    if (!dragging) return;
    onmove?.(event.clientX - offsetX, event.clientY - offsetY);
  }

  function onMouseUp() {
    dragging = false;
    detachDragListeners();
  }

  onDestroy(() => {
    detachDragListeners();
  });
</script>

<button
  style:border={selected ? "2px solid var(--kick-color)" : "1px solid var(--kick-color)"}
  {oncontextmenu}
  onmousedown={onMouseDown}
  style:left={`${x}px`}
  style:top={`${y}px`}
  style:z-index={z}
  style:cursor={dragging ? "grabbing" : "grab"}
>
  {nodeType}
  <pre>inputs:<br>{nodeIO.inputs}</pre>
  <pre>outputs:<br>{nodeIO.outputs}</pre>
</button>

<style>
  button {
    position: absolute;
    color: var(--text-color);
    width: 10rem;
    height: 11.68rem;
    background: #383838;
    padding: 0.5rem;

    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style>
