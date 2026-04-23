> written by codex

# Toolnet Frontend

현재 코드 상태를 기준으로 리팩터링 가능한 지점을 정리한 문서입니다.

분석 기준일: 2026-04-23
분석 범위: `src/routes`, `src/lib/lua`, `src/lib/types.ts`

## 핵심 발견사항 (심각도 순)

| 심각도 | 항목 | 근거 | 영향 | 개선 방향 |
| --- | --- | --- | --- | --- |
| High | Worker 종료 메시지 포맷 불일치 | `src/routes/+page.svelte:43` (`worker.postMessage("shutdown")`) vs `src/lib/lua/worker.ts:85` (`switch (e.data.form)`) | 페이지 이탈 시 Worker/Lua VM이 정상 종료되지 않을 수 있음 | 메시지 형식을 단일 프로토콜(`{ form: "shutdown" }`)로 통일 |
| High | 타입 불일치로 `svelte-check` 실패 | `src/routes/node-factory.ts:21`, `src/lib/types.ts:12` | 타입 안정성 저하, CI 실패 가능 | `NodeModel`/`NodeIO` 책임 재정의 후 생성 시점 타입 일치 |
| Medium | 메시지 프로토콜 타입 미정의 | `src/routes/+page.svelte:19`, `src/lib/lua/worker.ts:85` | 런타임에서 오타/스키마 불일치 탐지 어려움 | Worker request/response를 TS 유니온 타입으로 명시 |
| Medium | 데이터 모델 중복/경계 불명확 | `src/lib/types.ts:12`, `src/routes/+page.svelte:12`, `src/routes/+page.svelte:169` | `node.ioMap`과 `ioMaps[nodeType]` 이중 관리 여지 | Node 상태와 모듈 메타데이터를 분리된 모델로 고정 |
| Medium | `+page.svelte` 책임 과다 | `src/routes/+page.svelte` (Worker init, 메뉴, 노드 CRUD, 포커스, 렌더링 모두 포함) | 변경 파급 범위 확대, 테스트 어려움 | 편집기 로직을 store/service, UI를 컴포넌트로 분리 |
| Low | 네이밍 일관성 부족 | `ioMaps`/`ioMap`, `nodeModules`/`node_modules`, `form` 키 | 가독성 저하, 협업 시 혼선 | camelCase 기준 통일 + 용어 사전 정의 |
| Low | 미사용/잔존 코드 | `src/routes/store.ts:6` 주석 코드, `NodeIO` import 미사용 | 맥락 파악 비용 증가 | 죽은 코드 제거, TODO/DEPRECATED 명시 |
| Low | 에러 관측성 부족 | `src/routes/+page.svelte`에 `worker.onerror` 없음 | Worker 초기화/실행 실패 시 UI 피드백 부족 | 에러 핸들러 및 사용자 표시 상태 추가 |

## 현재 확인된 체크 결과

`npm run check` 결과 (2026-04-23):

- 실패 1건
- 파일: `src/routes/node-factory.ts:21`
- 에러: `Type '{}' is missing the following properties from type 'NodeIO': inputs, outputs`

## 리팩터링 포인트

### 1) 변수명/네이밍

- `ioMaps`는 단수형/의미형으로 `nodeIoByModule` 또는 `ioByNodeType`처럼 의도를 드러내는 이름으로 변경
- Worker payload의 `node_modules`는 앱 전역 컨벤션(camelCase)과 맞춰 `nodeModules`로 통일
- Worker message key `form`은 일반적으로 `type`/`kind`를 사용하므로 표준화 권장
- `selectedNodeId`, `menuNodeId`처럼 ID 기반 변수는 모두 `...Id` 패턴 유지 (현재 방향은 좋음)

### 2) 타입 모델

- `NodeModel`은 노드 인스턴스 상태만 보유 (`id`, `x`, `y`, `z`, `nodeType`)하도록 단순화
- `NodeIO`는 모듈 정의 메타데이터로 분리하고 `Record<nodeType, NodeIO>`에서만 관리
- Worker 통신 타입 예시를 명시한 계약 파일 분리 권장:
  - `WorkerRequest`
  - `WorkerResponse`
  - `WorkerErrorResponse`

### 3) 로직 구조

- `+page.svelte`에서 아래 책임 분리 권장
  - Worker 수명주기/메시지 처리
  - 노드 상태 조작(CRUD, z-index, 선택)
  - 컨텍스트 메뉴 상태/액션
- `getMenuOptions`는 렌더 시 객체를 매번 생성하므로, 액션 핸들러를 고정 함수로 분리하면 추적이 쉬움
- Worker 준비 상태(`isWorkerReady`)는 선언되어 있으나 현재 실질 가드로 거의 활용되지 않음

### 4) 파일 구조

현재는 라우트와 편집기 도메인이 혼합되어 있어, 아래처럼 기능 단위 분리를 권장:

```text
src/
  features/
    node-editor/
      components/
        Node.svelte
        Inspector.svelte
        ContextMenu.svelte
      model/
        types.ts
        store.ts
      services/
        node-factory.ts
        worker-client.ts
  lib/
    lua/
      worker.ts
      lua.ts
```

### 5) 테스트/검증

- 최소 단위 테스트 대상
  - node factory 생성 규칙
  - focus 시 z-index 상승 규칙
  - delete 후 selectedNodeId 정합성
- Worker contract 테스트
  - `ready/io/node_modules/run/shutdown` request-response 스키마 검증
- CI 기준
  - `npm run check` 통과를 병합 조건으로 고정

## 우선순위 실행안 (코드 수정 시)

1. Worker 종료 메시지 계약 통일 (`shutdown` 포맷 정합성)  
2. `NodeModel`/`NodeIO` 경계 재정의 후 타입 오류 제거  
3. Worker message 타입 선언 파일 추가  
4. `+page.svelte`에서 Worker 로직과 메뉴 로직 분리  
5. 네이밍 컨벤션(camelCase + type/kind 키) 일괄 정리

## 메모

이번 요청에서는 코드 수정 없이 문서(`README.md`)만 업데이트했습니다.

## 남은 개선 과제

 - [ ] 노드 편집/삭제/드래그에 대한 단위 테스트 및 E2E 테스트 추가
 - [ ] `+page.svelte`의 컨텍스트 메뉴를 별도 컴포넌트로 분리
 - [ ] 노드 실행 그래프 검증(순환 참조, 타입 불일치) 로직 추가
 - [ ] Lua 실행을 Web Worker로 분리해 UI 프리징 위험 감소