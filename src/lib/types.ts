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
  ports: {
    inputs: Record<string,{x:number,y:number}>,
    outputs: Record<string,{x:number,y:number}>,
  }
}

export interface PortConnection {
  first_id: number;
  first_port: string;
  second_id: number;
  second_port: string;
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
export type WorkerRequest  = ReadyRequest  | ShutdownRequest  | RunRequest;
export type WorkerResponse = ReadyResponse | ShutdownResponse | RunResponse;

export function TypedPromise<T,R>(
  executor: (
    resolve: (value: T) => void,
    reject: (value: R) => void,
  ) => void
): Promise<T> {
  return new Promise(executor);
}