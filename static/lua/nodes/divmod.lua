local node = require "node"
local M = node.init()
M.inputs = { number="number", divisor="number" }
M.outputs = { Q="number", R="number" }

function M:run(a,b)
    return a//b, a%b
end

return M