local node = require "node"
local M = node.init()
M.props = { a="number" }
M.inputs = {}
M.outputs = { a="number" }

function M:run(args)
    return { a=self.a }
end

return M
