# Worker Separation Follow-up Feedback

분석 기준일: 2026-04-24  
대상: Worker 분리 이후 상태 (`+page.svelte`, `worker-client.ts`, `worker.ts`, `types.ts`)

## 요약

Worker 분리는 성공적으로 반영됐고, 페이지-런타임 결합도는 확실히 낮아졌습니다.  
다만 종료 보장, 에러 관측성, 기본값 안정성 같은 운영 품질 항목은 추가 보완이 필요합니다.

## 발견사항 (심각도 순)

### 1) High: `disconnect()`가 shutdown 메시지 전송만 수행

근거:
- `src/lib/lua/worker-client.ts:62-63`

영향:
- Worker가 비정상 상태일 때 정리 보장이 약함
- 향후 reconnect 시나리오에서 상태 누수 가능

권장 변경:
1. `disconnect()`에서 이벤트 핸들러 해제
2. shutdown 전송 후 일정 시간 내 종료 확인
3. 실패 시 `worker.terminate()` fallback
4. disconnect 이후 subscriber/callback 배열 초기화

### 2) Medium: `ready` 직후 디버그 실행 코드 상주

근거:
- `src/routes/+page.svelte:31`

영향:
- mount 시 불필요한 실행/로그 발생
- 실제 기능 이벤트와 디버그 이벤트 혼재

권장 변경:
1. `run("Hello, World!")` 제거
2. 필요 시 dev 플래그 하에서만 실행

### 3) Medium: Worker 종료 순서

근거:
- `src/lib/lua/worker.ts:78-80`

영향:
- `self.close()` 먼저 호출 시 `luaVM.close()` 실행 보장 약화 가능

권장 변경:
1. `luaVM.close()` 먼저 실행
2. 그 다음 `self.close()` 호출
3. try/finally로 최소 정리 보장

### 4) Medium: `Node`에 전달되는 `nodeIO` 기본값 타입 안정성

근거:
- `src/routes/+page.svelte:161` (`nodeIO={... ?? {}}`)
- `src/routes/Node.svelte:6` (`nodeIO: NodeIO`)

영향:
- `inputs/outputs`가 빈 객체 상태면 UI에 `undefined` 출력 가능

권장 변경:
1. 기본값을 `{ inputs: "", outputs: "" }`로 고정
2. fallback 상수를 별도 정의해서 재사용

### 5) Low: `onError` 콜백 미활용

근거:
- `src/lib/lua/worker-client.ts:20`, `:72`
- `src/routes/+page.svelte`에서는 `onError` 미구독

영향:
- Worker 실패가 콘솔 이외 UI로 드러나지 않음

권장 변경:
1. 페이지에서 `onError` 구독
2. 사용자 표시 상태(`workerStatus`, `workerErrorMessage`) 추가
3. 재시도 버튼 또는 자동 재연결 정책 정의

## 잘된 점

1. Worker 책임 분리 자체는 완료됨 (`+page.svelte`가 단순해짐)
2. 메시지 프로토콜이 `type` + camelCase로 통일됨
3. 타입 체크 통과 상태 유지

## 다음 액션 (추천 순서)

1. `disconnect()` 정리 보강 (핸들러 해제 + terminate fallback)
2. `ready` 시 디버그 실행 제거
3. `nodeIO` fallback 타입 고정
4. `onError`를 UI 상태와 연결
5. 종료 순서(`luaVM.close` -> `self.close`) 정리
