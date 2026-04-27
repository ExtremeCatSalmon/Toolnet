import { luaModule, luaVM, moduleIoPtrToString } from "$lib/lua/lua";
import type { NodeIO, WorkerRequest, WorkerResponse } from "$lib/types";

const stdNodes = ["add", "sub", "divmod"] as const;

function nodeIoFromNodeModuleMap(
  nodeModuleMap: Record<string, string>,
): Record<string, NodeIO> {
  const result: Record<string, NodeIO> = {};

  for (const moduleName of Object.keys(nodeModuleMap)) {
    result[moduleName] = { inputs: "", outputs: "" };

    try {
      luaVM.get_module_inputs(moduleName);
      result[moduleName].inputs = moduleIoPtrToString(luaVM.get_io_items());

      luaVM.get_module_outputs(moduleName);
      result[moduleName].outputs = moduleIoPtrToString(luaVM.get_io_items());
    } catch (error) {
      console.error(`Failed to sync module IO for ${moduleName}:`, error);
    }
  }

  return result;
}

async function fetchLuaSource(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch Lua source: ${path} (${response.status})`);
  }

  return response.text();
}

let ioMap: Record<string, NodeIO> = {};
async function initLuaModules() {
  const [nodeLuaCode, ...moduleSources] = await Promise.all([
    fetchLuaSource("/lua/node.lua"),
    ...stdNodes.map((moduleName) =>
      fetchLuaSource(`/lua/nodes/${moduleName}.lua`),
    ),
  ]);

  luaModule.modules = { ...luaModule.modules, node: nodeLuaCode };

  const stdNodeModules: Record<string, string> = {};
  stdNodes.forEach((moduleName, index) => {
    stdNodeModules[`nodes.${moduleName}`] = moduleSources[index];
  });

  luaModule.nodeModules = { ...luaModule.nodeModules, ...stdNodeModules };

  ioMap = nodeIoFromNodeModuleMap(luaModule.nodeModules);
}

const LUA_SMOKE_TEST = `
    local add = require "nodes.add"
    local sub = require "nodes.sub"
    local divmod = require "nodes.divmod"
    print(add(60, 7), sub(170, 0.1), divmod(67, 2))
  `;

function runLuaSmokeTest() {
  const status = luaVM.dostring(LUA_SMOKE_TEST);
  if (status !== 0) {
    console.error("Lua smoke test failed:", luaVM.get_error());
  }
}

luaVM.init();
await initLuaModules().catch((err) => {
  console.error(err);
});
// runLuaSmokeTest();

function close() {
  luaVM.close();
  self.close();
}

let isReady = false;
let readyInterval: ReturnType<typeof setInterval>;
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  switch (e.data.type) {
    case "ready":
      clearInterval(readyInterval);
      break;
    case "run":
      if (isReady) {
        const status = luaVM.dostring(e.data.code);
        if (status !== 0) {
          console.error("Lua smoke test failed:", luaVM.get_error());
        }
      }
      break;
    case "io":
      if (luaModule.nodeModules) {
        self.postMessage({ type: "io", io: ioMap, ok: true } as WorkerResponse);
      } else {
        self.postMessage({ type: "io", ok: false } as WorkerResponse);
      }
      break;
    case "nodeModules":
      if (luaModule.nodeModules) {
        self.postMessage({
          type: "nodeModules",
          nodeModules: luaModule.nodeModules,
          ok: true,
        } as WorkerResponse);
      } else {
        self.postMessage({ type: "nodeModules", ok: false } as WorkerResponse);
      }
      break;
    case "shutdown":
      close();
      break;
  }
};


self.postMessage({ type: "ready" } as WorkerResponse);
readyInterval = setInterval(() => {
  self.postMessage({ type: "ready" } as WorkerResponse);
},1000);
isReady = true;