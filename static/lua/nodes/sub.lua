local node = require "node"
local M = node.init()
M.inputs = { a="number", b="number" }
M.outputs = { result="number" }

function M:run(a,b)
    return a-b
end

return M