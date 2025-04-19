memo.interpreter = {};

memo.varlist = {};

(function(oi) {

    oi.ids_reffed = function(node, vars) {
        if (vars == null) {
            vars = [];
        }
        if (node.type == "variable") {
            if (!vars.includes(node.varname))
                vars.push(node.varname);
        }
        
        if (Object.hasOwn(node, 'exp'))
            oi.ids_reffed(node.exp, vars);
        if (Object.hasOwn(node, 'left'))
            oi.ids_reffed(node.left, vars);
        if (Object.hasOwn(node, 'right'))
            oi.ids_reffed(node.right, vars);

        return vars;
    }

    oi.eval_exp = function(node) {
        switch(node.type) {
            case "Addition":
                return (oi.eval_exp(node.left) + oi.eval_exp(node.right));
            case "Subtraction":
                return (oi.eval_exp(node.left) - oi.eval_exp(node.right));
            case "Multiplication":
                return (oi.eval_exp(node.left) * oi.eval_exp(node.right));
            case "Division":
                return (oi.eval_exp(node.left) * oi.eval_exp(node.right));  
            case "IntLiteral":
            case "CharLiteral":
            case "StringLiteral":
                return node.value;
        }
    }
    oi.eval_and_assign = function(ast) {
        // FIXME: right now, this all assumes we're assigning a value
        // we need to evaluate expression first in the real scenario

        let ids = oi.ids_reffed(ast);

        if ("exp" in ast) {
            oi.eval_exp(ast.exp)
        } else {
            // there is no expression or we are not in the right node
            throw new Error("Could not find expression to evaluate");
        }

        let has_value = ("exp" in ast && ast.exp.value !== undefined);

        // cast to the type of the var
        if(memo.varlist[ast.varname] !== undefined && ast.exp.type != memo.varlist[ast.varname].type) {
            switch(memo.varlist[ast.varname].type) {
                case "string":
                    ast.exp.value = ast.exp.value.toString();
                    break;
                case "float":
                    let attempt_float = parseFloat(ast.exp.value);
                    if (isNaN(attempt_float))
                        return `I remember ${ast.varname} differently.`;
                    ast.exp.value = attempt_float;
                    break;
                case "int":
                    let attempt_int = parseFloat(ast.exp.value);
                    if (isNaN(attempt_int))
                        return `I remember ${ast.varname} differently.`;
                    ast.exp.value = attempt_int;
                    break;
                case "char":
                    ast.exp.value = ast.exp.value.toString()[0];
                    break;
            }
            
        }

        memo.varlist[ast.varname] = 
        {
            type: ast.type ?? ast.exp.type,
            value: has_value ? ast.exp.value : undefined,
            depends_on: 'x',
            fade: 1,
        }
        memo.varlist[ast.varname].formatted_value = () => {
            switch(memo.varlist[ast.varname].type) {
                case "int":
                case "float":
                default:
                    return memo.varlist[ast.varname].value;
                case "string":
                    return `"${memo.varlist[ast.varname].value}"`
                case "float":
                    return `'${memo.varlist[ast.varname].value}'`
            }
        }
        if (has_value)
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
                return `"${memo.varlist[ast.exp.varname].value}"`;
        }
    }
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
            return e;
//            return "I didn't understand that.";
        }

        response = oi.eval_cmd(ast);

        fade_vars(ast);

        return response;
    }

})(memo.interpreter);
