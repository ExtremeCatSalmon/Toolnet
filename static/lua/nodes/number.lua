local node = require "node"
local M = node.init()
M.inputs = {}
M.outputs = { a="number" }

function M:run(a,b)
    return 67
end

return M