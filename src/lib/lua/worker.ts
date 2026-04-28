import { luaVM } from "$lib/lua/lua";
import type { RunResponse, WorkerRequest, WorkerResponse } from "$lib/types";

const stdNodes = ["add", "sub", "divmod","number"] as const;

async function fetchLuaSource(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch Lua source: ${path} (${response.status})`);
  }

  return response.text();
}

async function initLuaModules() {
  const [nodeLuaCode, ...moduleSources] = await Promise.all([
    fetchLuaSource("/lua/node.lua"),
    ...stdNodes.map((moduleName) =>
      fetchLuaSource(`/lua/nodes/${moduleName}.lua`),
    ),
  ]);

  let luaModules = {node: nodeLuaCode};

  const stdNodeModules: Record<string, string> = {};
  stdNodes.forEach((moduleName, index) => {
    stdNodeModules[`nodes.${moduleName}`] = moduleSources[index];
  });

  luaModules = {...luaModules, ...stdNodeModules};

  Object.entries(luaModules).forEach(([k,v]) => {
    let code = `
      package.preload['${k}'] = function()
      ${v}
      end
      `;
    luaVM.dostring(code);
  });
}

const LUA_SMOKE_TEST = `
    local add = require "nodes.add"
    local sub = require "nodes.sub"
    local divmod = require "nodes.divmod"
    print(add(60, 7), sub(170, 0.1), divmod(67, 2))
  `;

function runLuaSmokeTest() {
  const ret = luaVM.dostring(LUA_SMOKE_TEST);
  if (ret instanceof Error) {
    console.error("test failed");
  } else {
    console.log("test succeeded");
  }
}

luaVM.init();
await initLuaModules().catch((err) => {
  console.error(err);
});
runLuaSmokeTest();

function close() {
  luaVM.close();
  self.close();
}

let isReady = false;
let readyInterval: ReturnType<typeof setInterval>;
self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  switch (e.data.type) {
    case "ready":
      console.log("worker ready");
      clearInterval(readyInterval);
      break;
    case "run":
      if (isReady) {
        const ret = luaVM.dostring(e.data.code);
        self.postMessage({ type: "run", ok: !(ret instanceof Error), return: ret, uuid: e.data.uuid } as RunResponse);
      }
      break;
    case "shutdown":
      console.log("shuting down the worker...");
      close();
      break;
  }
};


self.postMessage({ type: "ready" } as WorkerResponse);
readyInterval = setInterval(() => {
  self.postMessage({ type: "ready" } as WorkerResponse);
},1000);
isReady = true;