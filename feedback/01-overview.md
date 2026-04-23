# Overview Feedback (No Code Changes)

분석 기준: 2026-04-23  
검토 대상: `src/routes/+page.svelte`, `src/lib/lua/worker.ts`, `src/lib/types.ts`, `src/routes/*`

## 요약

현재 코드는 기능 흐름이 직관적이고 타입 체크도 통과합니다.  
다만 가독성/유지보수 관점에서는 "한 파일에 많은 책임이 몰리는 구조"와 "도메인 경계가 흐려지는 타입 모델"이 앞으로의 개발 속도를 늦출 가능성이 큽니다.

## 주요 관찰 포인트

### 1) 화면 파일의 책임 집중

- `+page.svelte`가 다음을 동시에 수행하고 있습니다.
- Worker 생성/초기화/메시지 처리: `src/routes/+page.svelte:16-45`
- 노드 편집 도메인 로직: `src/routes/+page.svelte:49-79`
- 컨텍스트 메뉴 상태/행동: `src/routes/+page.svelte:81-129`
- 실제 렌더링: `src/routes/+page.svelte:136-189`

영향:
- 파일 길이가 길어질수록 맥락 전환 비용이 큼
- 기능 추가 시 충돌 범위가 넓어짐

### 2) 타입 경계의 혼합

- `NodeModel`에 `ioMap`이 포함: `src/lib/types.ts:6-12`
- 동시에 페이지에서 `ioMaps[node.nodeType]`를 별도 관리: `src/routes/+page.svelte:12`, `:169`

영향:
- 노드 인스턴스 상태와 모듈 메타데이터 경계가 섞임
- 추후 동기화 규칙이 복잡해질 수 있음

### 3) Worker 프로토콜 가독성

- message key가 `form`으로 통일되어 있음: `src/lib/types.ts:16-39`, `src/lib/lua/worker.ts:85`
- snake_case(`node_modules`)와 camelCase(`nodeModules`)가 혼재: `src/lib/types.ts:31`, `src/routes/+page.svelte:13`

영향:
- 읽는 사람 입장에서 즉시 변환 규칙을 머릿속으로 맞춰야 함

### 4) 컴포넌트 자체는 비교적 양호

- `Node.svelte`는 드래그 책임이 명확하고 정리 루틴도 있음: `src/routes/Node.svelte:26-56`
- `Inspector.svelte`도 역할이 단순하고 읽기 쉬움: `src/routes/Inspector.svelte:4-35`

## 우선순위 (가독성 기준)

1. `+page.svelte`에서 Worker 클라이언트 책임 분리
2. Node 상태 모델과 IO 메타데이터 모델 분리
3. Worker 메시지 필드명/응답 키 네이밍 통일
4. 컨텍스트 메뉴를 별도 컴포넌트로 분리

실행 방법은 [feedback/04-change-recipes.md](/c:/Users/master/Desktop/ExtremeCatSalmonProjects/toolnetfrontend/feedback/04-change-recipes.md)에 단계별로 정리했습니다.

## 지금 상태에서 잘하고 있는 점

- 핵심 이벤트 흐름이 일관됨 (`select -> focus -> z-index`)  
- 타입으로 Worker 요청/응답을 이미 일부 고정함 (`WorkerRequest`, `WorkerResponse`)  
- 최소 상태 저장소(`nodes`, `selectedNodeId`)는 단순하고 이해하기 쉬움
