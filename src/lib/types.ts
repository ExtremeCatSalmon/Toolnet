export interface NodeIO {
  inputs: string;
  outputs: string;
}

export interface NodeModel {
  id: number;
  x: number;
  y: number;
  z: number;
  nodeType: string;
  ioMap: NodeIO;
}

export interface ReadyResponse {
  form: "ready";
}
export interface IoRequest {
  form: "io";
}
export interface IoResponse {
  form: "io";
  io: Record<string, NodeIO>;
  ok: boolean;
}
export interface NodeModulesRequest {
  form: "node_modules";
}
export interface NodeModulesResponse {
  form: "node_modules";
  node_modules: Record<string, string>;
  ok: boolean;
}
export interface RunRequest {
  form: "run";
  code: string;
}
export interface ShutdownRequest {
  form: "shutdown";
}
export type WorkerRequest  = RunRequest    | IoRequest  | NodeModulesRequest | ShutdownRequest;
export type WorkerResponse = ReadyResponse | IoResponse | NodeModulesResponse;