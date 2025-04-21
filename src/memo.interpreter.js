memo.interpreter = {};

memo.varlist = {};

(function(oi) {

    oi.get_dependencies = function(node) {
        if (!node) return [];

        if (node.type === "Variable") {
            return [node.varname];
        }
    
        return oi.get_dependencies(node.left).concat(oi.get_dependencies(node.right));
    }

    oi.find_circular_dependencies = function(ast, visited = new Set(), stack = new Set()) {
        if (!ast || !ast.varname) return false;

        if (stack.has(ast.varname)) {
            // Circular dependency detected
            return true;
        }

        if (visited.has(ast.varname)) {
            // Already checked this variable, no circular dependency
            return false;
        }

        // Mark the current variable as visited and add it to the stack
        visited.add(ast.varname);
        stack.add(ast.varname);

        let dependencies = memo.varlist[ast.varname]?.depends_on
        if (!Array.isArray(dependencies) || dependencies.length === 0) {
            dependencies = ast.deps || [];
        }
        for (const dep of dependencies) {
            if (oi.find_circular_dependencies({ varname: dep }, visited, stack)) {
                return true;
            }
        }

        // Remove the current variable from the stack
        stack.delete(ast.varname);

        return false;
    };

    oi.eval_exp = function(node) {
        switch(node.type) {
            case "Addition":
                return (oi.eval_exp(node.left) + oi.eval_exp(node.right));
            case "Subtraction":
                return (oi.eval_exp(node.left) - oi.eval_exp(node.right));
            case "Multiplication":
                return (oi.eval_exp(node.left) * oi.eval_exp(node.right));
            case "Division":
                return (oi.eval_exp(node.left) / oi.eval_exp(node.right));  
            case "IntLiteral":
            case "CharLiteral":
            case "StringLiteral":
                return node.value;
        }
    }

    oi.determine_type = function(ast) {
        const attempt_int = parseInt(ast.value);
        const attempt_float = parseFloat(ast.value);
        
        if (!isNaN(attempt_int) && attempt_int == attempt_float) {
            ast.value = attempt_int;
            ast.type = "IntLiteral";
            return;
        }
        // if (typeof(ast.value) == "int") {
        //     ast.type = "IntLiteral";
        //     return;
        // }
        if (!isNaN(attempt_float)) {
            ast.value = attempt_float;
            ast.type = "FloatLiteral";
            return;
        }
        // if (typeof(ast.value) == "float") {
        //     ast.type = "FloatLiteral";
        //     return;
        // }
        if (typeof(ast.value) == "string") {
            if (ast.value.length == 1) {
                ast.type = "CharLiteral";
                return;
            }
            
            ast.type = "StringLiteral";
            return;
        }
    }
    
    oi.eval_and_assign = function(ast) {
        if ("exp" in ast) {
            ast.deps = oi.get_dependencies(ast.exp);
            if (ast.deps.length > 0) {
                ast.type = "Lambda";
            } else {
                ast.exp.value = oi.eval_exp(ast.exp);
                oi.determine_type(ast.exp);
            }
        } else {
            // there is no expression or we are not in the right node
            return "I can't think of the thing I'm supposed to evaluate.";
        }

        // find circular dependencies
        if (oi.find_circular_dependencies(ast)) {
            return `I can't make sense of ${ast.varname}.`;
        }

        memo.varlist[ast.varname] = 
        {
            type: ast.type ?? ast.exp.type,
            value: ast.exp.value || undefined,
            has_value: !!ast.exp.value,
            exp: ast.exp,
            depends_on: ast.deps,
            fade: 1,
        }

        memo.varlist[ast.varname].formatted_value = () => {
            switch(memo.varlist[ast.varname].type) {
                case "int":
                case "IntLiteral":
                    return memo.tools.num_to_str(memo.varlist[ast.varname].value);
                case "float": //FIXME: will this exist?
                case "FloatLiteral":
                    const numStr = String(memo.varlist[ast.varname].value);
                    const wholePart = numStr.split('.')[0];
                    const decimalPart = numStr.split('.')[1];
                    const floatPart = decimalPart ? parseFloat('0.' + decimalPart) : 0;
                    const whole_str = memo.tools.num_to_str(wholePart);

                    if (floatPart < 0.2) {
                        return `more than ${whole_str}`;
                    } 
                    if (floatPart < 0.4) {
                        return `${whole_str} and a third`;
                    }
                    if (floatPart < 0.6) {
                        return `${whole_str} and a half`;
                    }
                    if (floatPart < 0.8) {
                        return `more than ${whole_str} and a half`;
                    }
                    return `almost ${memo.tools.num_to_str(wholePart + 1)}`;

                case "string":
                    return `"${memo.varlist[ast.varname].value}"`;
                case "char": //FIXME: will this exist?
                    return `'${memo.varlist[ast.varname].value}'`;
                case "Lambda":
                    return memo.tools.lambda_to_str(memo.varlist[ast.varname].exp);
                default:
                    return memo.varlist[ast.varname].value;
            }
        }
        if (ast.exp.value)
            return `I will remember ${ast.varname} as ${memo.varlist[ast.varname].formatted_value()}.`;
        else
            return `I will remember ${ast.varname}.`;
    }
    
    oi.eval_cmd = function(ast) {
        switch(ast.cmd) {
            case "reset":
                return `I remember ${ast.varname} as ${memo.varlist[ast.varname].formatted_value()}.`;

            case "let": 
                if (!(ast.varname in memo.varlist)) {
                    // varname is not there yet, need to declare and then assign
                    return oi.eval_and_assign(ast);
                }
                return oi.eval_and_assign(ast);
            case "print":
                // this exp needs to actually be evaluated, currently assumes
                // the exp is just a variable
                if (!(ast.exp.varname in memo.varlist)) {
                    return `Hmm I don't remember ${ast.exp.varname}.`;
                }
                return capitalize(memo.varlist[ast.exp.varname].formatted_value());
        }
    }
    
    const capitalize = (str) => {
        if (!str || typeof str !== "string") return "";

        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() + ".";
    };
    const fade_vars = (ast) => {
        for (const key in memo.varlist) {
            if (!ast || !ast.all_vars || ast.all_vars.indexOf(key) == -1) {
                memo.varlist[key].fade++;
                if (memo.varlist[key].fade > 11) {
                    delete memo.varlist[key];
                }
            }
        }
    }
    oi.parse = function(input) {
        let ast;

        input = input.trim();

        try {
            ast = memo.parser.parse(input);
        } catch (e) {
            fade_vars();
            if (e.name == "SyntaxError") {
                return `I didn't understand ${e.found}.`;
            } else {
                return `I ran into an internal issue: ${e}`;
            }
        }

        response = oi.eval_cmd(ast);

        fade_vars(ast);

        return response;
    }

})(memo.interpreter);
