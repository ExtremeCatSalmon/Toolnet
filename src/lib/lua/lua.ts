import createLuaModule from "$lib/lua/lua.vm";

interface LuaEmscriptenModule {
    cwrap: (name: string, returnType: string | null, args: string[]) => (...args: unknown[]) => any;
    HEAPU32: Uint32Array;
    UTF8ToString: (ptr: number) => string;
    modules?: Record<string, string>;
    nodeModules?: Record<string, string>;
}

export const luaModule = (await createLuaModule()) as LuaEmscriptenModule;
export interface LuaVM {
    init: () => number;
    close: () => number;
    reset: () => number;
    dostring: (str: string) => number;
    get_result: () => string;
    get_error: () => string;
    get_module_inputs: (moduleName: string) => number;
    get_module_outputs: (moduleName: string) => number;
    get_io_items: () => number;
};
export const luaVM: LuaVM = {
    init: luaModule.cwrap("lua_vm_init", "number", []),
    close: luaModule.cwrap("lua_vm_close", "number", []),
    reset: luaModule.cwrap("lua_vm_reset", "number", []),
    dostring: luaModule.cwrap("lua_vm_dostring", "number", ["string"]),
    get_result: luaModule.cwrap("lua_vm_get_result", "string", []),
    get_error: luaModule.cwrap("lua_vm_get_error", "string", []),
    get_module_inputs: luaModule.cwrap("lua_vm_get_module_inputs", "number", ["string"]),
    get_module_outputs: luaModule.cwrap("lua_vm_get_module_outputs", "number", ["string"]),
    get_io_items: luaModule.cwrap("lua_vm_get_io_items", "number", []),
};
export function moduleIoPtrToString(ptr: number): string {
    if (!ptr) {
      return "";
    }
    if (!luaModule.HEAPU32) {
      return "";
    }

    const base = ptr >>> 2;
    const maxItems = 256;
    const items = [];

    for (let i = 0; i < maxItems; i++) {
      const strPtr = luaModule.HEAPU32[base + i];
      if (strPtr === 0) break;
      items.push(luaModule.UTF8ToString(strPtr));
    }

    const lines = [];
    for (let i = 0; i < items.length; i += 2) {
      const key = items[i] ?? "";
      const value = items[i + 1] ?? "";
      lines.push(`${key}=${value}`);
    }
    return lines.join("\n");
  }
