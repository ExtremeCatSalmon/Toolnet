# Change Recipes (How To Refactor)

이 문서는 "코드를 지금 당장 수정하지 않고", 실제 수정에 들어갈 때 따라갈 수 있는 실행 레시피입니다.

## 1) `+page.svelte` 책임 분리 레시피

목표:
- 페이지 파일은 조합과 바인딩만 담당
- Worker 통신과 편집기 상태 조작은 별도 모듈로 이동

권장 변경 순서:
1. `src/features/node-editor/services/lua-worker-client.ts` 생성
2. `+page.svelte`의 Worker 관련 코드(`onMount`, `onmessage`, `postMessage`)를 클라이언트로 이동
3. `+page.svelte`는 `connect/disconnect` + `subscribe`만 호출
4. 기존 동작 동일성 확인 (`ready`, `io`, `node_modules`, `shutdown`)

분리 대상 (현재 기준):
- `src/routes/+page.svelte:16-45`

클라이언트 인터페이스 초안:
```ts
export interface LuaWorkerClient {
  connect(): void;
  disconnect(): void;
  requestIo(): void;
  requestNodeModules(): void;
  run(code: string): void;
  onMessage(cb: (msg: WorkerResponse) => void): () => void;
  onError(cb: (error: Event) => void): () => void;
}
```

완료 기준:
- `+page.svelte`에서 `worker` 변수/`onmessage` switch 제거
- UI 로직은 `nodeModules`, `ioByNodeType` state만 소비

## 2) 컨텍스트 메뉴 분리 레시피

목표:
- 메뉴 상태(`showMenu`, `menuX`, `menuY`, `menuNodeId`)와 렌더를 별도 컴포넌트로 분리

권장 변경 순서:
1. `src/features/node-editor/components/ContextMenu.svelte` 생성
2. 메뉴 props를 명시적으로 전달 (`open`, `x`, `y`, `items`)
3. 메뉴 액션은 페이지에서 생성하고 컴포넌트는 렌더만 담당
4. `+page.svelte`에서는 `openMenu`, `closeMenu`만 유지

분리 대상 (현재 기준):
- `src/routes/+page.svelte:81-129`
- `src/routes/+page.svelte:137-147`

컴포넌트 props 초안:
```ts
interface ContextMenuItem {
  label: string;
  action: () => void;
}
```

완료 기준:
- 메뉴 마크업/스타일이 `+page.svelte`에서 사라짐
- 메뉴 관련 함수 길이가 절반 이하로 감소

## 3) 타입 경계 정리 레시피 (`NodeModel` vs `NodeIO`)

목표:
- 노드 인스턴스 상태와 모듈 메타데이터를 분리해 읽기/추론 비용 감소

현재 상태:
- `NodeModel`에 `ioMap` 포함 (`src/lib/types.ts`)
- 동시에 `ioMaps[node.nodeType]` 별도 조회 (`src/routes/+page.svelte`)

권장 변경안:
1. `NodeModel`에서 `ioMap` 제거
2. 별도 타입 추가: `type NodeIoByType = Record<string, NodeIO>`
3. `Node.svelte`는 `ioMap` prop을 명시 타입으로만 받음
4. `node-factory`는 순수 노드 인스턴스만 생성

타입 초안:
```ts
export interface NodeModel {
  id: number;
  x: number;
  y: number;
  z: number;
  nodeType: string;
}

export type NodeIoByType = Record<string, NodeIO>;
```

완료 기준:
- `NodeModel`과 Worker 응답 구조가 역할별로 분리
- `node-factory`가 외부 메타데이터를 모름

## 4) Worker 메시지 네이밍 통일 레시피

목표:
- 프로토콜 필드명과 payload 키의 스타일을 한 가지로 통일

권장 기준:
1. 식별자 키: `type` 사용 (예: `type: "nodeModules"`)
2. payload 키: camelCase 고정 (`nodeModules`)

권장 변경 순서:
1. `src/lib/types.ts`에서 메시지 타입 정의를 먼저 교체
2. `src/lib/lua/worker.ts` switch 분기 키 반영
3. `+page.svelte` 소비 코드 반영
4. 임시 호환이 필요하면 1~2 릴리즈 동안 구키 병행 지원

완료 기준:
- `node_modules`와 `nodeModules` 혼용 제거
- `form` 사용 제거

## 5) 파일 이동 레시피 (최소 충돌 순서)

권장 이동 순서:
1. `node-factory.ts` -> `features/node-editor/model/node.factory.ts`
2. `store.ts` -> `features/node-editor/model/node.store.ts`
3. `Node.svelte`, `Inspector.svelte` -> `features/node-editor/components/`
4. `+page.svelte`의 화면 본문 -> `features/node-editor/views/EditorPage.svelte`
5. `routes/+page.svelte`는 `EditorPage` 렌더만 수행

이유:
- import 경로 충돌을 최소화하고, 큰 파일 이동을 마지막에 배치

## 6) 커밋 단위 제안

권장 커밋 플랜:
1. `refactor(types): split node instance and node io metadata`
2. `refactor(worker): introduce typed lua worker client`
3. `refactor(ui): extract context menu component`
4. `refactor(structure): move node editor files to feature directory`
5. `chore(readability): rename protocol keys to camelCase type field`

## 7) 리팩터링 완료 판정 체크리스트

- [ ] `+page.svelte`가 150~200줄 내외로 축소됨
- [ ] Worker 로직이 페이지에서 제거되고 서비스로 이동됨
- [ ] 타입 파일에서 `NodeModel`/`NodeIO` 경계가 명확함
- [ ] 메시지 키 스타일이 한 가지(camelCase + `type`)로 통일됨
- [ ] `npm run check` 통과
