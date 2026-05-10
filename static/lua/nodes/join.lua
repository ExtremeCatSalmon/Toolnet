local node = require "node"
local M = node.init()
M.inputs = { a="string", b="string" }
M.outputs = { a="string" }

function M:run(args)
    return { a=args.a..args.b }
end

return M
