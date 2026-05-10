local node = require "node"
local M = node.init()
M.inputs = { a="any", b="any" }
M.outputs = { tuple="table" }

function M:run(args)
    return { tuple={args.a,args.b} }
end

return M
