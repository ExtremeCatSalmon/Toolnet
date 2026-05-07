export interface NodeIO {
  inputs: Record<string,string>;
  outputs: Record<string,string>;
}

export interface NodeModel {
  id: number;
  x: number;
  y: number;
  z: number;
  nodeType: string;
  portPositions: Map<string, () => { x: number; y: number }>;
}

export interface NodeTreeNode {
  id: number;
  hm: string;
  connectedNodesByInputPort: Record<string,NodeTreeNode>;
}

// JSON.stringifiable
export interface Port {
  type: "input" | "output";
  name: string;
}

// JSON.stringifiable
export interface NodeLink {
  nodes: [number, number];
  ports: [Port  , Port  ];
}

export interface ReadyRequest {
  type: "ready";
}
export interface ReadyResponse {
  type: "ready";
}
export interface RunRequest {
  type: "run";
  uuid: string;
  code: string;
}
export interface RunResponse {
  type: "run";
  uuid: string;
  ok: boolean;
  return: any[] | Error;
}
export interface ShutdownRequest {
  type: "shutdown";
}
export interface ShutdownResponse {
  type: "shutdown";
}
export type WorkerRequest = ReadyRequest | ShutdownRequest | RunRequest;
export type WorkerResponse = ReadyResponse | ShutdownResponse | RunResponse;

export function TypedPromise<T, R>(
  executor: (resolve: (value: T) => void, reject: (value: R) => void) => void,
): Promise<T> {
  return new Promise(executor);
}
