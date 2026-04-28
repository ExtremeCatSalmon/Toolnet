# Readability Guidelines & Refactor Checklist

## 1) 변수명/타입명

### 권장

- 컬렉션은 `By` 패턴으로 의도 명확화
- 예: `ioMaps` -> `ioByNodeType`
- Worker payload key는 한 가지 스타일로 통일
- 예: `node_modules` -> `nodeModules`
- 메시지 식별자는 `form`보다 `type` 또는 `kind`가 일반적

### 현재 관찰

- `form` 키 기반 프로토콜: `src/lib/types.ts:16-39`
- 응답 키 snake_case: `src/lib/types.ts:31`
- UI 상태는 camelCase: `src/routes/+page.svelte:13`

## 2) 로직 구성 방식

### 권장

- 함수 그룹을 책임 단위로 묶어 배치
1. 초기화/수명주기
2. 상태 변경 함수
3. UI 이벤트 핸들러
4. 렌더 보조 함수

### 현재 관찰

- `+page.svelte`에서 위 항목이 섞여 있어 스크롤 이동이 잦음 (`src/routes/+page.svelte` 전반)

## 3) 타입 경계

### 권장

- 노드 인스턴스 타입과 메타데이터 타입 분리
- `NodeModel`: 위치/선택/타입 등 인스턴스 정보
- `NodeIO`: 노드 타입별 정의 정보

### 현재 관찰

- `NodeModel`이 `ioMap`까지 보유: `src/lib/types.ts:6-12`
- 동시에 `ioMaps[node.nodeType]` 별도 조회: `src/routes/+page.svelte:169`

## 4) 컴포넌트 가독성

### Node.svelte

- 장점: 드래그 로직과 cleanup이 한 눈에 들어옴 (`src/routes/Node.svelte:26-56`)
- 개선 여지: 렌더에 있는 `<pre>inputs/outputs`를 표시 컴포넌트로 분리하면 본문이 더 간결해짐

### Inspector.svelte

- 장점: 읽기 쉬운 단일 책임 (`src/routes/Inspector.svelte:10-17`)
- 개선 여지: 노드 업데이트 로직을 store action으로 옮기면 컴포넌트는 UI 선언에 집중 가능

## 5) 체크리스트 (코드 수정 시작 시)

- [ ] Worker client 전용 모듈로 분리
- [ ] `ContextMenu` 컴포넌트 분리
- [ ] `NodeModel`에서 `ioMap` 포함 여부 재결정
- [ ] worker 메시지 필드명(camelCase + type/kind) 통일
- [ ] 페이지 컴포넌트 200줄 이하 유지 목표 설정

## 6) 현재 품질 상태

- `npm run check`: 통과 (0 errors, 0 warnings)
- 즉시 치명 버그보다는 "확장 시 가독성 저하" 리스크가 큰 상태
