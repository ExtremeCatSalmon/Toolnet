local node = require "node"
local M = node.init()
M.inputs = { number="number", divisor="number" }
M.outputs = { Q="number", R="number" }

function M:run(args)
    return { Q=args.number//args.divisor, R=args.number%args.divisor }
end

return M