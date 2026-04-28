# Worker Follow-up Solutions (With Example Code)

이 문서는 `05-worker-separation-followup.md`에서 남은 항목에 대한 **구체적 해결안**을 예시 코드와 함께 정리합니다.  
아래 코드는 "적용 예시"이며, 실제 반영 시 현재 코드 스타일에 맞춰 조정하면 됩니다.

## 1) `disconnect()` 이후 request 호출 가드

문제:
- `disconnect()` 이후에도 `requestIo`, `requestNodeModules`, `run`이 호출되면 종료 중/종료된 워커로 메시지를 보낼 수 있습니다.

해결 방향:
1. `isConnected` 상태를 명시적으로 관리
2. `postMessage` 경로를 단일 헬퍼(`safePost`)로 통일
3. 연결 상태가 아니면 조용히 무시하거나 경고 로그 출력

예시 코드 (`src/lib/lua/worker-client.ts`):

```ts
export class LuaWorkerClientImpl implements LuaWorkerClient {
  worker: Worker | null;
  isConnected: boolean;
  isShutdown: boolean;

  constructor() {
    this.worker = null;
    this.isConnected = false;
    this.isShutdown = false;
  }

  private safePost(message: WorkerRequest): void {
    if (!this.worker || !this.isConnected || this.isShutdown) return;
    this.worker.postMessage(message);
  }

  connect(): void {
    if (!this.worker) this.worker = new LuaWorker();
    this.isShutdown = false;
    this.isConnected = true;
    // ... handler setup
  }

  disconnect(): void {
    if (!this.worker || this.isShutdown) return;
    this.isConnected = false;
    this.isShutdown = true;
    this.safePost({ type: "shutdown" } as WorkerRequest); // safePost 내부에서 가드됨
    // ... fallback terminate
  }

  requestIo(): void {
    this.safePost({ type: "io" } as WorkerRequest);
  }

  requestNodeModules(): void {
    this.safePost({ type: "nodeModules" } as WorkerRequest);
  }

  run(code: string): void {
    this.safePost({ type: "run", code } as WorkerRequest);
  }
}
```

## 2) `ready` 처리 one-shot 보장

문제:
- `ready`가 반복 도착하거나(heartbeat 방식 포함) 재연결 시 중복 처리되면 `requestIo/requestNodeModules`가 여러 번 실행됩니다.

해결 방향:
1. 클라이언트 내부에서 `readyAcked` one-shot 플래그 사용
2. 페이지에서도 초기 요청 로직을 one-shot으로 한 번 더 방어

예시 코드 A (`src/lib/lua/worker-client.ts`):

```ts
export class LuaWorkerClientImpl implements LuaWorkerClient {
  readyAcked: boolean;

  constructor() {
    this.readyAcked = false;
  }

  connect(): void {
    this.readyAcked = false;
    // ...
    this.worker!.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.type === "ready" && !this.readyAcked) {
        this.readyAcked = true;
        this.worker!.postMessage({ type: "ready" } as WorkerRequest);
      }
      this.onMessageCallbacks.forEach((cb) => cb(e.data));
    };
  }
}
```

예시 코드 B (`src/routes/+page.svelte`):

```ts
let bootstrapped = false;

luaWorkerClient.onMessage((msg) => {
  if (msg.type === "ready" && !bootstrapped) {
    bootstrapped = true;
    luaWorkerClient.requestIo();
    luaWorkerClient.requestNodeModules();
  }
});
```

## 3) 워커 쪽 `ready` 반복 전송 구조 정리

문제:
- `setInterval` 기반 `ready` 반복 전송은 구조를 복잡하게 만들고 불필요한 트래픽을 유발할 수 있습니다.

해결 방향:
1. 기본은 단발 `ready` 전송으로 단순화
2. handshake 재시도가 필요하면 retry 횟수 제한 + 백오프 적용

예시 코드 (`src/lib/lua/worker.ts`):

```ts
let hasSentReady = false;

function sendReadyOnce() {
  if (hasSentReady) return;
  self.postMessage({ type: "ready" } as WorkerResponse);
  hasSentReady = true;
}

sendReadyOnce();

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  switch (e.data.type) {
    case "ready":
      // 필요 시 ack 처리만
      break;
    // ...
  }
};
```

## 4) 타입/일관성 보강 (`===`, 타이머 타입)

문제:
- 느슨한 비교(`==`)와 Node 전용 타이머 타입(`NodeJS.Timeout`)은 브라우저/워커 문맥에서 혼동을 만듭니다.

해결 방향:
1. 비교 연산자는 `===`로 통일
2. 타이머 타입은 `ReturnType<typeof setInterval>` 또는 `ReturnType<typeof setTimeout>` 사용

예시 코드:

```ts
// +page.svelte
if (msg.type === "ready") {
  // ...
}

// worker.ts
let readyInterval: ReturnType<typeof setInterval> | null = null;
```

## 5) 적용 순서 (충돌 최소화)

1. `safePost` + `isConnected` 도입  
2. one-shot `ready` 가드 적용 (client + page)  
3. worker `ready` 반복 구조 단순화  
4. 타입/연산자 일관성 정리  
5. `npm run check` + 수동 시나리오 테스트

## 6) 테스트 시나리오 체크리스트

- [ ] 최초 접속 시 `ready` 1회 처리 후 IO/모듈 요청이 1회만 실행되는지
- [ ] 빠른 mount/unmount 반복 시 콘솔 에러 없이 종료되는지
- [ ] disconnect 직후 `run/requestIo` 호출해도 예외가 없는지
- [ ] reconnect 후 정상적으로 다시 IO/모듈 데이터가 들어오는지
