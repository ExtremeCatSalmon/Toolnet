local node = require "node"
local M = node.init()
M.inputs = { a = "any" }
M.outputs = {}

function M:run(args)
    if type(args.a) == "table" then
        print("{")
        for k, v in pairs(args.a) do
            print("    "..k.."="..v)
        end
        print("}")
    else
        print(args.a)
    end
    return {}
end

return M
