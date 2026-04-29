export function makePortId(
  nodeId: number,
  kind: "input" | "output",
  portName: string,
): string {
  return `${kind === "input" ? "I" : "O"}${nodeId}:${portName.length}:${portName}`;
}

export function parsePortId(portId: string) {
  const id = portId;
  const split = (str: string): [string, string] => {
    return [str.slice(0, str.indexOf(":")), str.slice(str.indexOf(":") + 1)];
  };
  const kind = portId[0] === "I" ? "input" : "output";
  portId = portId.slice(1);
  let textId;
  [textId, portId] = split(portId);
  let textNameLen;
  [textNameLen, portId] = split(portId);
  const nameLen = parseInt(textNameLen);
  const name = portId.slice(0, nameLen);
  const nodeId = parseInt(textId);
  return {
    id,
    nodeId,
    name,
    kind,
  };
}
