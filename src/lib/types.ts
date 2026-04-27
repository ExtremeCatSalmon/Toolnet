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
}

export interface ReadyRequest {
  type: "ready";
}
export interface ReadyResponse {
  type: "ready";
}
export interface IoRequest {
  type: "io";
}
export interface IoResponse {
  type: "io";
  io: Record<string, NodeIO>;
  ok: boolean;
}
export interface NodeModulesRequest {
  type: "nodeModules";
}
export interface NodeModulesResponse {
  type: "nodeModules";
  nodeModules: Record<string, string>;
  ok: boolean;
}
export interface RunRequest {
  type: "run";
  code: string;
}
export interface ShutdownRequest {
  type: "shutdown";
}
export interface ShutdownResponse {
  type: "shutdown";
}
export type WorkerRequest  = ReadyRequest  | IoRequest  | NodeModulesRequest  | ShutdownRequest | RunRequest;
export type WorkerResponse = ReadyResponse | IoResponse | NodeModulesResponse | ShutdownResponse;