<script lang="ts">
  import { onDestroy } from "svelte";
  import { ioMap } from "./store";

  interface Props {
    x: number;
    y: number;
    z: number;
    nodeType: string;
    selected?: boolean;
    onselect?: () => void;
    oncontextmenu?: (e: MouseEvent) => void;
    onmove?: (nextX: number, nextY: number) => void;
  }

  let {
    x,
    y,
    z,
    nodeType,
    selected = false,
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
  style:border={selected ? "2px solid white" : "1px solid white"}
  {oncontextmenu}
  onmousedown={onMouseDown}
  style:left={`${x}px`}
  style:top={`${y}px`}
  style:z-index={z}
  style:cursor={dragging ? "grabbing" : "grab"}
>
  {nodeType}
  <pre>inputs: {$ioMap[nodeType]?.inputs}</pre>
  <pre>outputs: {$ioMap[nodeType]?.outputs}</pre>
</button>

<style>
  button {
    position: absolute;
    color: white;
    width: 10rem;
    height: 11.68rem;
    background: #383838;
    padding: 0.5rem;

    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
</style>
