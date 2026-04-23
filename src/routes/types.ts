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
