import LuaWorker from "$lib/lua/worker?worker";
import type { NodeIO, WorkerRequest, WorkerResponse } from "$lib/types";

const SHUTDOWN_FALLBACK_MS = 300;

export type IoMapsSubscriberCallback = (ioMaps: Record<string, NodeIO>) => void;
export type NodeModulesSubscriberCallback = (
  nodeModules: Record<string, string>,
) => void;
export type OnMessageCallback = (msg: WorkerResponse) => void;
export type OnErrorCallback = (err: ErrorEvent) => void;

export interface LuaWorkerClient {
  connect(): void;
  disconnect(): void;
  requestIo(): void;
  requestNodeModules(): void;
  run(code: string): void;
  subscribeIoMaps(cb: IoMapsSubscriberCallback): () => void;
  subscribeNodeModules(cb: NodeModulesSubscriberCallback): () => void;
  onMessage(cb: OnMessageCallback): () => void;
  onError(cb: OnErrorCallback): () => void;
}

export class LuaWorkerClientImpl implements LuaWorkerClient {
  worker: Worker | null;
  isShutdown: boolean;
  shutdownFallbackTimer: ReturnType<typeof setTimeout> | null;
  ioMapsSubscribers: IoMapsSubscriberCallback[];
  nodeModulesSubscribers: NodeModulesSubscriberCallback[];
  onMessageCallbacks: OnMessageCallback[];
  onErrorCallbacks: OnErrorCallback[];
  constructor() {
    this.worker = null;
    this.ioMapsSubscribers = [];
    this.nodeModulesSubscribers = [];
    this.onErrorCallbacks = [];
    this.onMessageCallbacks = [];
    this.isShutdown = false;
    this.shutdownFallbackTimer = null;
  }

  private clearShutdownFallbackTimer(): void {
    if (this.shutdownFallbackTimer === null) {
      return;
    }
    clearTimeout(this.shutdownFallbackTimer);
    this.shutdownFallbackTimer = null;
  }

  private scheduleTerminateFallback(): void {
    this.clearShutdownFallbackTimer();
    const targetWorker = this.worker;
    if (targetWorker) {
      this.shutdownFallbackTimer = setTimeout(() => {
        targetWorker.terminate();
        this.clearShutdownFallbackTimer();
      }, SHUTDOWN_FALLBACK_MS);
    }
  }

  connect(): void {
    this.clearShutdownFallbackTimer();
    if (this.isShutdown) {
      if (this.worker) this.worker.terminate();
      this.worker = new LuaWorker();
      this.isShutdown = false;
    }
    if (!this.worker) {
      this.worker = new LuaWorker();
    }

    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (!this.worker) return;
      this.onMessageCallbacks.forEach((cb) => cb(e.data));
      switch (e.data.type) {
        case "ready":
          this.worker.postMessage({ type: "ready" } as WorkerRequest);
          break;
        case "io":
          if (e.data.ok) {
            let ioMaps = e.data.io;
            this.ioMapsSubscribers.forEach((cb) => cb(ioMaps));
          } else {
            console.error("worker failed to load ioMap");
          }
          break;
        case "nodeModules":
          if (e.data.ok) {
            let nodeModules = e.data.nodeModules;
            this.nodeModulesSubscribers.forEach((cb) => cb(nodeModules));
          } else {
            console.error("worker failed to load nodeModules");
          }
          break;
      }
    };
    this.worker.onerror = (e: ErrorEvent) => {
      this.onErrorCallbacks.forEach((cb) => cb(e));
    };
  }

  disconnect(): void {
    if (this.isShutdown) return;
    if (!this.worker) return;

    this.isShutdown = true;
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.ioMapsSubscribers = [];
    this.nodeModulesSubscribers = [];
    this.onMessageCallbacks = [];
    this.onErrorCallbacks = [];

    try {
      this.worker.postMessage({ type: "shutdown" } as WorkerRequest);
    } catch (error) {
      console.warn(
        "worker shutdown message failed, fallback will terminate",
        error,
      );
    }

    this.scheduleTerminateFallback();
  }
  onMessage(cb: OnMessageCallback): () => void {
    let self = this;
    self.onMessageCallbacks.push(cb);
    return function () {
      self.onMessageCallbacks = self.onMessageCallbacks.filter(
        (cb2) => cb2 !== cb,
      );
    };
  }
  onError(cb: OnErrorCallback): () => void {
    let self = this;
    self.onErrorCallbacks.push(cb);
    return function () {
      self.onErrorCallbacks = self.onErrorCallbacks.filter((cb2) => cb2 !== cb);
    };
  }
  requestIo(): void {
    if (!this.worker) return;
    this.worker.postMessage({ type: "io" } as WorkerRequest);
  }
  requestNodeModules(): void {
    if (!this.worker) return;
    this.worker.postMessage({ type: "nodeModules" } as WorkerRequest);
  }
  run(code: string): void {
    if (!this.worker) return;
    this.worker.postMessage({ type: "run", code } as WorkerRequest);
  }
  subscribeIoMaps(cb: IoMapsSubscriberCallback): () => void {
    let self = this;
    self.ioMapsSubscribers.push(cb);
    return function () {
      self.ioMapsSubscribers = self.ioMapsSubscribers.filter(
        (sub) => sub !== cb,
      );
    };
  }
  subscribeNodeModules(cb: NodeModulesSubscriberCallback): () => void {
    let self = this;
    self.nodeModulesSubscribers.push(cb);
    return function () {
      self.nodeModulesSubscribers = self.nodeModulesSubscribers.filter(
        (sub) => sub !== cb,
      );
    };
  }
}
