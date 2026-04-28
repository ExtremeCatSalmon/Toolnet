import createLuaModule from "$lib/lua/lua.vm";

enum ValType {
  NIL = 0,
  BOOLEAN,
  NUMBER,
  STRING,
  TABLE,
  FUNCTION,
  UNSUPPORTED,
}

class Ref {
  type: ValType;
  ref: number;
  constructor(type: ValType, ref: number) {
    this.type = type;
    this.ref = ref;
  }
}

interface LuaEmscriptenModule {
  getValue: (ptr: number, type?: string, noSafe?: boolean) => any;
  cwrap: (
    name: string,
    returnType: string | null,
    args: string[],
  ) => (...args: unknown[]) => any;
  HEAPU32: Uint32Array;
  HEAPU8: Uint8Array;
  UTF8ToString: (ptr: number) => string;
  modules?: Record<string, string>;
  nodeModules?: Record<string, string>;
  // Val
  _sizeof_val: number;
  _offsetof_val_type: number;
  _offsetof_val_as: number;
  // ValTyle
  _sizeof_val_type: number;
  // Table
  _sizeof_table: number;
  _offsetof_table_ref: number;
  _offsetof_table_keys: number;
  _offsetof_table_values: number;
  // primitive types
  _sizeof_int: number;
  _sizeof_size_t: number;
}

const vals_ptr_to_array = function (vm: LuaVM, rawptr: number) {
  let ptr = rawptr >>> 2;
  let [vals_ptr, vals_cnt] = vm.memU32.subarray(ptr, ptr + 2);
  const vals = [];
  for (let i = 0; i < vals_cnt; ++i) {
    let pt = vals_ptr + vm.sizeof_val * i;
    vals.push(val_to_jsval(vm, pt));
  }
  return vals;
};
const val_to_jsval = function (vm: LuaVM, ptr: number): any {
  let bytes = vm.memU8.subarray(ptr, ptr + vm.sizeof_val);
  let view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let type = view.getInt32(0, true);
  switch (type) {
    case ValType.NIL:
      return 0;
    case ValType.BOOLEAN:
      return view.getInt32(vm.offsetof_val_as, true);
    case ValType.NUMBER:
      return view.getFloat64(vm.offsetof_val_as, true);
    case ValType.STRING:
      return vm.module.UTF8ToString(vm.memU32[(ptr + vm.offsetof_val_as) >>> 2]);
    case ValType.TABLE:
      let keys = vals_ptr_to_array(
        vm,
        ptr + vm.offsetof_val_as + vm.offsetof_table_keys,
      );
      let values = vals_ptr_to_array(
        vm,
        ptr + vm.offsetof_val_as + vm.offsetof_table_values,
      );
      let result = Object.fromEntries(keys.map((key, i) => [key, values[i]]));
      Object.defineProperty(result, "__ref__", {
        value: new Ref(
          ValType.TABLE,
          view.getInt32(vm.offsetof_table_ref, true),
        ),
        enumerable: false,
      });
      return result;
    case ValType.FUNCTION:
      return new Ref(ValType.FUNCTION, view.getInt32(vm.offsetof_val_as, true));
    case ValType.UNSUPPORTED:
      return "UNSUPPORTED";
  }
};

export const luaModule = (await createLuaModule()) as LuaEmscriptenModule;
export interface LuaVM {
  init: () => number;
  close: () => number;
  _dostring: (str: string) => number;
  dostring: (str: string) => any[] | Error;
  dostring_free: (rawptr: number) => void;

  memU8: Uint8Array;
  memU32: Uint32Array;
  module: LuaEmscriptenModule;

  // Val
  sizeof_val: number;
  offsetof_val_type: number;
  offsetof_val_as: number;
  // ValType
  sizeof_val_type: number;
  // Table
  sizeof_table: number;
  offsetof_table_ref: number;
  offsetof_table_keys: number;
  offsetof_table_values: number;
  // primitive types
  sizeof_int: number;
  sizeof_size_t: number;
}
export const luaVM: LuaVM = {
  init: luaModule.cwrap("lua_vm_init", "number", []),
  close: luaModule.cwrap("lua_vm_close", "number", []),
  _dostring: luaModule.cwrap("lua_vm_dostring", "number", ["string"]),
  dostring: function (code: string): any[] | Error {
    const rawptr = this._dostring(code);
    if (!rawptr) return new Error("OOM Error");
    const result = val_to_jsval(this, rawptr);
    this.dostring_free(rawptr);
    if (result.ok) {
      return Object.values(result.ret);
    } else {
      console.error(result.ret[0]);
      return new Error(result.ret[0]);
    }
  },
  dostring_free: luaModule.cwrap("lua_vm_dostring_free", "", ["number"]),

  memU8: luaModule.HEAPU8,
  memU32: luaModule.HEAPU32,
  module: luaModule,

  // Val
  sizeof_val: luaModule.getValue(luaModule._sizeof_val, "i32"),
  offsetof_val_type: luaModule.getValue(luaModule._offsetof_val_type, "i32"),
  offsetof_val_as: luaModule.getValue(luaModule._offsetof_val_as, "i32"),
  // ValType
  sizeof_val_type: luaModule.getValue(luaModule._sizeof_val_type, "i32"),
  // Table
  sizeof_table: luaModule.getValue(luaModule._sizeof_table, "i32"),
  offsetof_table_ref: luaModule.getValue(luaModule._offsetof_table_ref, "i32"),
  offsetof_table_keys: luaModule.getValue(
    luaModule._offsetof_table_keys,
    "i32",
  ),
  offsetof_table_values: luaModule.getValue(
    luaModule._offsetof_table_values,
    "i32",
  ),
  // primitive types
  sizeof_int: luaModule.getValue(luaModule._sizeof_int, "i32"),
  sizeof_size_t: luaModule.getValue(luaModule._sizeof_size_t, "i32"),
};