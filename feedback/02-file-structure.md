# File Structure Feedback

## 현재 구조에서의 읽기 난도 포인트

### A. 라우트(`src/routes`)와 도메인 로직이 섞여 있음

- `node-factory.ts`, `store.ts`, `Node.svelte`, `Inspector.svelte`가 모두 `routes`에 위치
- 결과적으로 "페이지 라우팅 파일"과 "재사용 가능한 편집기 도메인"의 구분이 약함

### B. Worker 파일은 `lib`에 있지만, 클라이언트 제어 로직은 `+page.svelte`에 있음

- Worker 런타임(`src/lib/lua/worker.ts`)과 Worker API 소비 로직(`src/routes/+page.svelte:16-45`)이 분리되지 않음

## 추천 구조 (읽기 쉬운 경계)

```text
src/
  features/
    node-editor/
      components/
        Node.svelte
        Inspector.svelte
        ContextMenu.svelte
      model/
        node.types.ts
        node.store.ts
        node.factory.ts
      services/
        lua-worker-client.ts
      views/
        EditorPage.svelte
  lib/
    lua/
      worker.ts
      lua.ts
      lua.vm.js
      lua.vm.wasm
  routes/
    +page.svelte
```

## 분리 원칙

1. `routes`는 "페이지 조합"만 담당
2. 상태 변경 로직은 `model/`로 이동
3. 외부 통신/비동기(Worker)는 `services/`로 이동
4. UI 렌더 단위는 `components/`로 분리

## 단계별 적용 제안

### Phase 1 (저비용)

- `+page.svelte` 내 Worker 관련 로직을 `lua-worker-client.ts`로 추출
- `getMenuOptions`, `openMenu`, `closeMenu`를 `ContextMenu.svelte`/메뉴 상태 모듈로 추출

### Phase 2 (중간)

- 노드 상태 변경 함수(`createAndAppendNode`, `focusNode`, `deleteNode`)를 `node.store.ts` 근처로 이동
- `+page.svelte`는 상태를 호출만 하도록 축소

### Phase 3 (중장기)

- `features/node-editor/views/EditorPage.svelte` 신설
- `routes/+page.svelte`는 해당 뷰를 렌더만 담당

## 기대 효과

- 파일을 열었을 때 "이 파일이 무슨 책임인지" 즉시 파악 가능
- 버그 수정 시 탐색 범위 축소
- 팀 협업 시 충돌 감소
