memo.interpreter = {};

memo.varlist = {};

(function(oi) {

    oi.get_dependencies = function(node) {
        if (!node) return [];

        if (node.type === "VariableName") {
            return node.name["varname"];
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
            case "Additive":
                if (node.operator == "+")
                    return (oi.eval_exp(node.left) + oi.eval_exp(node.right));
                if (node.operator == "-")
                    return (oi.eval_exp(node.left) - oi.eval_exp(node.right));
            case "Multiplicative":
                if (node.operator == "*")
                    return (oi.eval_exp(node.left) * oi.eval_exp(node.right));
                if (node.operator == "/")
                    return (oi.eval_exp(node.left) / oi.eval_exp(node.right));  
            case "IntLiteral":
            case "CharLiteral":
            case "StringLiteral":
                return node.value;
            case "VariableName":
                if (node.name in memo.varlist) {
                    return memo.varlist[node.name].value;
                } else {
                    return undefined;
                }
            default:
                throw new MemoSyntaxError("I don't know how to evaluate that.");
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
    
    oi.eval_and_assign = function(ast, varname) {
        ast.varname = varname;
        if ("exp" in ast) {
            ast.deps = oi.get_dependencies(ast);
        }
        if (ast.deps && ast.deps.length > 0) {
            ast.is_lambda = true;
            // } else {
            //     ast.exp.value = oi.eval_exp(ast.exp);
            //     oi.determine_type(ast.exp);
            // }
            // return;
        } 
        if (ast.type == "IfBlock") {
        } else if (ast.type == "Lambda") {
        } else if (ast.type == "List") {
        } else {
            // there is no expression or we are not in the right node
            oi.eval_exp(ast);
        }

        // // find circular dependencies -- DISABLED
        // if (oi.find_circular_dependencies(ast)) {
        //     return `I can't make sense of ${ast.varname}.`;
        // }

        memo.varlist[ast.varname] = 
        {
            type: ast.type,
            value: ast.value || undefined,
            has_value: !!ast.value,
            exp: ast.exp,
            depends_on: ast.deps,
            fade: 1,
        }

        memo.varlist[ast.varname].formatted_value = (is_html) => {
            switch(memo.varlist[ast.varname].type) {
                case "IntLiteral":
                    return memo.tools.num_to_str(memo.varlist[ast.varname].value);
                case "FloatLiteral":
                    const numStr = String(memo.varlist[ast.varname].value);
                    const wholePart = parseInt(numStr.split('.')[0]);
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
                case "StringLiteral":
                    return `"${memo.varlist[ast.varname].value}"`;
                case "CharLiteral":
                    return `'${memo.varlist[ast.varname].value}'`;
                case "List":
                    return `({${memo.varlist[ast.varname].items.join(", ")}})`;
                case "Lambda":
                default:
                    return memo.tools.lambda_to_str(memo.varlist[ast.varname], is_html);
            }
        }
        if (ast.value)
            return `I will remember ${ast.varname} as ${memo.varlist[ast.varname].formatted_value(false)}.`;
        else
            return `I will remember ${ast.varname}.`;
    }
    
    oi.eval_cmd = function(ast) {
        switch(ast.cmd) {
            case "reset":
                return `I remember ${ast.varname} as ${memo.varlist[ast.varname].formatted_value(is_html)}.`;

            case "let": 
                // if (!(ast.varname in memo.varlist)) {
                //     // varname is not there yet, need to declare and then assign
                //     return oi.eval_and_assign(ast.exp);
                // }
                return oi.eval_and_assign(ast.exp, ast.varname);
            case "print":
                // this exp needs to actually be evaluated, currently assumes
                // the exp is just a variable
                if (!(ast.exp.varname in memo.varlist)) {
                    return `Hmm I don't remember ${ast.exp.varname}.`;
                }
                return capitalize(memo.varlist[ast.exp.varname].formatted_value(is_html));
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
    oi.parse = function(input, is_html = false) {
        let ast;

        input = input.trim();

        try {
            ast = memo.parser.parse(input);
        } catch (e) {
            fade_vars();
            if (e.name == "SyntaxError") {
                let wrd = input.slice(e.location.start.column - 1);
                if (wrd.indexOf(" ")) {
                    wrd = wrd.slice(0, wrd.indexOf(" "));
                }
                return `I didn't understand ${wrd}.`;
            } else if ("code" in e && e.code == "reserved") {
                if (!isNaN(parseInt(e.details.name))) {
                    // FIXME: This should probably just pull the name from the request. But currently this serves as a test that it is actually a bad int
                    // (it won't work with another reserved word)
                    return `I remember ${memo.tools.num_to_str(e.details.name)} differently.`
                }
                // non-numeric keywords end up here
                return `I remember that differently.`
            } else {
                return `I ran into an internal issue: ${e}.`;
            }
        }

        response = oi.eval_cmd(ast);

        fade_vars(ast);

        return response;
    }

})(memo.interpreter);
