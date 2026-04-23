> written by codex

# Toolnet Frontend

SvelteKit + Lua(WASM) 기반의 노드 편집기 프로토타입입니다.

## 2026-04-23 코드베이스 리뷰 요약

### 주요 발견사항 (심각도 순)

| 심각도 | 항목 | 영향 | 처리 상태 |
| --- | --- | --- | --- |
| High | 노드 선택 상태를 배열 index로 관리 | 우클릭 삭제 시 의도하지 않은 노드가 삭제될 수 있음 | 해결 |
| Medium | 스토어 객체의 중첩 필드 직접 변경 | 리렌더링/상태 동기화가 비결정적으로 동작할 수 있음 | 해결 |
| Medium | Lua 모듈 fetch 시 `response.ok` 미검증 | 404/500 HTML 응답이 Lua 소스로 들어가 디버깅 어려움/오작동 위험 | 해결 |
| Medium | 자동 생성 `lua.vm.js`가 타입체크 오류를 대량 유발 | 실제 앱 코드 이슈가 가려짐 | 해결 |
| Low | 드래그 이벤트 리스너 정리 누락 가능성 | 컴포넌트 생명주기 중 메모리 릭 여지 | 해결 |

## 이번 리팩터링에서 반영한 내용

### 1) 상태 안정성 개선

- `selectedNodeId`를 실제 `node.id` 기준으로 일관되게 사용하도록 변경
- 컨텍스트 메뉴를 노드에서 열 때 해당 노드를 즉시 focus 처리
- 삭제 로직을 `id` 기준 필터링으로 변경

관련 파일:
- `src/routes/+page.svelte`
- `src/routes/Inspector.svelte`
- `src/routes/store.ts`

### 2) 구조 개선

- 노드 타입/모델을 `src/routes/types.ts`로 분리
- 노드 생성 책임을 `src/routes/node-factory.ts`로 분리
- `+page.svelte`는 화면 조합/이벤트 라우팅 중심으로 정리

관련 파일:
- `src/routes/types.ts`
- `src/routes/node-factory.ts`
- `src/routes/+page.svelte`

### 3) Lua 연동 안정성 강화

- Lua 스크립트 fetch 공통 함수 추가 (`response.ok` 검사)
- 모듈 IO 동기화 중 예외 처리 추가
- Lua 초기화 실패 시 에러 로그 명확화

관련 파일:
- `src/routes/lua.svelte.ts`
- `src/lib/lua/lua.ts`

### 4) 개발 경험 개선

- 생성 파일 `src/lib/lua/lua.vm.js` 상단에 `// @ts-nocheck` 추가
- `tsconfig.json`에서 생성 파일 제외 설정 추가

관련 파일:
- `src/lib/lua/lua.vm.js`
- `tsconfig.json`

## 현재 디렉터리 구조 (핵심)

```text
src/
  lib/
    lua/
      lua.ts
      lua.vm.js
      lua.vm.wasm
  routes/
    +layout.svelte
    +page.svelte
    +page.server.ts
    Inspector.svelte
    Node.svelte
    lua.svelte.ts
    node-factory.ts
    store.ts
    types.ts
```

## 취약점/보안 여지 분석

### 1) Lua 실행 경로

- 현재 `luaVM.dostring(...)`은 코드 내부 상수로만 실행되므로 즉시 악용 가능성은 낮음
- 그러나 향후 사용자 입력 문자열을 직접 `dostring`에 연결하면 코드 주입 위험이 생길 수 있음

권장:
- 사용자 입력은 직접 실행하지 말고, 허용된 노드 조합을 AST/IR로 직렬화해 실행
- 실행 시간/메모리 제한(가능하면 워커 격리) 적용

### 2) 정적 Lua 모듈 로딩

- 모듈명은 현재 고정 배열(`add`, `sub`, `divmod`) 기반이라 경로 조작 위험이 낮음
- 다만 배포 시 정적 리소스 무결성(캐시/서빙 정책) 관리 필요

권장:
- 버전 고정된 에셋 해시 사용
- 실패 응답 로깅/모니터링 연결

### 3) 브라우저 번들 경고

- 빌드 시 `lua.vm.js`의 `node:module` externalized 경고가 발생
- 현재 빌드는 성공하지만, 장기적으로는 브라우저 전용 빌드 산출물 정리가 필요

권장:
- Emscripten 빌드 타깃/옵션 재검토
- 불필요한 Node 폴리필 경로 제거

## 검증 결과

2026-04-23 기준:

- `npm run check`: 통과 (`0 errors, 0 warnings`)
- `npm run build`: 통과 (단, `lua.vm.js` 관련 externalized 경고 존재)

## 남은 개선 과제

 - [ ] 노드 편집/삭제/드래그에 대한 단위 테스트 및 E2E 테스트 추가
 - [ ] `+page.svelte`의 컨텍스트 메뉴를 별도 컴포넌트로 분리
 - [ ] 노드 실행 그래프 검증(순환 참조, 타입 불일치) 로직 추가
 - [x] Lua 실행을 Web Worker로 분리해 UI 프리징 위험 감소
