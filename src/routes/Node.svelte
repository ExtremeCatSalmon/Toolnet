<script lang="ts">
  import type { NodeIO, Port } from "$lib/types";
  import { onDestroy } from "svelte";
  import type { Attachment } from "svelte/attachments";

  interface Props {
    id: number;
    x: number;
    y: number;
    z: number;
    nodeIO: NodeIO;
    portPositions: Map<string, () => { x: number; y: number }>;
    selected?: boolean;
    selectedPort: Port;
    onselect?: () => void;
    onportselect?: (port: Port) => void;
    oncontextmenu?: (e: MouseEvent) => void;
    onmove?: (nextX: number, nextY: number) => void;
    onportupdate?: (
      portPositions: Map<string, () => { x: number; y: number }>,
    ) => void;
  }

  let {
    id,
    x,
    y,
    z,
    portPositions,
    nodeIO,
    onselect,
    selected = false,
    selectedPort,
    onportselect,
    oncontextmenu,
    onmove,
    onportupdate,
  }: Props = $props();

  let dragging = $state(false);
  let offsetX = 0;
  let offsetY = 0;

  function detachDragListeners() {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  }

  // Node끼리 연결. 사실은 Port끼리 연결. 그러면 Port List와 Port 구분자가 필요?
  // Node가 가지고 있는 Port의 목록은 어디에 저장?
  // NodeModel에 Port Id List를 저장?
  // 그렇다면 Node의 타입이 바뀌어서 io도 바뀔때 기존 Port 제거, 신규 Port 생성?
  // Port가 소속된 Node는 어디에 저장?
  // Port끼리의 연결은 어떻게 저장?
  // Port의 linked 멤버에 저장?
  // 그렇게 되면 같은 종류의 정보가 두 개의 데이터로 흩어져서 관리가 힘듦.
  // 하나의 데이터에만 있으면 다른 한 쪽에서는 연결을 알 수 없음.
  // 그렇다면 따로 Link 내용만 저장하는 리스트가 필요.
  // 하지만 이 Link 내용을 Port에서 어떻게 찾지? link_id?
  // 왜 Port에서 Link에 접근해야하지?
  // 그냥 Port와의 연결이 아니라 Node와의 연결 + Port Data로 하자.
  // Port는 제거.
  // Port Data는 Port Type(input | output), Port Name 두 개로 이루어짐
  // nodes와 nodeLinks로 만들면 될듯
  // NodeModel에는 변경사항 없음.
  // nodeLinks는 []NodeLink 타입
  // interface NodeLink {
  //     node1Id: number;
  //     port1Name: string;
  //     port1Type: "input" | "output";
  //     node2Id: number;
  //     port2Name: string;
  //     port2Type: "input" | "output";
  // }
  //
  // Port가 눌렸을때. Port의 name과 type을 부모에게 전달.
  // 부모는 그걸 갖고 node.id와 조합하여 NodeLink 생성
  // 문제 발생. 각 Port의 위치를 저장할 필요가 생김.
  // 각 Port는 현재 그저 type과 name으로 식별만 하지, 실제 Port에 관한 값이 있지는 않음.
  // NodeModel에 Port의 위치에 관련한 멤버를 추가해야할 듯.
  // Node가 움직이면 Port의 위치 정보도 업데이트 되어야하니, onmove 함수에 전달해 줘야겠음.

  function onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (target.classList.contains("dot")) return;

    onselect?.();

    dragging = true;
    offsetX = event.clientX - x;
    offsetY = event.clientY - y;

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function onMouseMove(event: MouseEvent) {
    if (!dragging) return;
    onmove?.(event.clientX - offsetX, event.clientY - offsetY);
    onportupdate?.(portPositions);
  }

  function onMouseUp(event: MouseEvent) {
    dragging = false;
    // onmove?.(event.clientX - offsetX, event.clientY - offsetY);
    onportupdate?.(portPositions);
    detachDragListeners();
  }

  onDestroy(() => {
    detachDragListeners();
  });

  function port(
    el: HTMLElement,
    data: { type: "input" | "output"; name: string },
  ) {
    let id = `${data.type}:${data.name}`;

    console.log("hello, port!");
    portPositions.set(id, () => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x + rect.width * 0.5, y: rect.y + rect.height * 0.5 };
    });
    function onclick() {
      onportselect?.(data);
    }
    el.addEventListener("click", onclick);
    onportupdate?.(portPositions);
    return {
      destroy() {
        console.log("bye port..");
        el.removeEventListener("click", onclick);
        portPositions.delete(id);
      },
    };
  }
</script>

<button
  style:border={selected
    ? "2px solid var(--kick-color)"
    : "1px solid var(--kick-color)"}
  {oncontextmenu}
  onmousedown={onMouseDown}
  style:left={`${x}px`}
  style:top={`${y}px`}
  style:z-index={z}
  style:cursor={dragging ? "grabbing" : "grab"}
>
  {#each Object.entries(nodeIO.inputs).sort() as [k, v] (`input:${k}`)}
    <div
      style="flex-grow: 1; width: 100%; text-align: left; align-content: center;"
      title={v}
    >
      <div
        use:port={{ type: "input", name: k }}
        class="dot"
        style="transform: translate(-50%,0%)"
        style:background-color={selectedPort.name === k
          ? "var(--kick-color)"
          : "white"}
      ></div>
      <div class="label">{k}</div>
    </div>
  {/each}
  {#each Object.entries(nodeIO.outputs).sort() as [k, v] (`output:${k}`)}
    <div
      style="flex-grow: 1; width: 100%; text-align: right; align-content: center;"
      title={v}
    >
      <div class="label">{k}</div>
      <div
        use:port={{ type: "output", name: k }}
        class="dot"
        style="transform: translate(50%,0%)"
        style:background-color={selectedPort.name === k
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
