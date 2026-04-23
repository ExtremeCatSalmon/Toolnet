import { luaModule, luaVM, moduleIoPtrToString } from "$lib/lua/lua";
import { ioMap, modules, nodeModules } from "./store";
import type { NodeIO } from "./types";

const stdNodes = ["add", "sub", "divmod"] as const;

async function fetchLuaSource(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch Lua source: ${path} (${response.status})`);
  }

  return response.text();
}

function syncNodeIoMap(nodeModuleMap: Record<string, string>): Record<string, NodeIO> {
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

export function setupLuaSync() {
  const unsubModules = modules.subscribe((moduleMap) => {
    luaModule.modules = moduleMap;
  });

  const unsubNodeModules = nodeModules.subscribe((moduleMap) => {
    luaModule.nodeModules = moduleMap;
    ioMap.set(syncNodeIoMap(moduleMap));
  });

  return function cleanupLuaSync() {
    unsubModules();
    unsubNodeModules();
  };
}

export async function initLuaModules() {
  luaVM.init();

  const [nodeLuaCode, ...moduleSources] = await Promise.all([
    fetchLuaSource("/lua/node.lua"),
    ...stdNodes.map((moduleName) => fetchLuaSource(`/lua/nodes/${moduleName}.lua`)),
  ]);

  modules.update((prev) => ({ ...prev, node: nodeLuaCode }));

  const stdNodeModules: Record<string, string> = {};
  stdNodes.forEach((moduleName, index) => {
    stdNodeModules[`nodes.${moduleName}`] = moduleSources[index];
  });

  nodeModules.update((prev) => ({ ...prev, ...stdNodeModules }));
}
