memo.interpreter = {};

memo.varlist = {};

memo.RuntimeError = class extends Error {
    constructor(message, term = null) {
        super(message);
        this.name = "RuntimeError";
        this.term = term; // the unknown term (may be null)
    }
};

(function(oi) {

    oi.get_dependencies = function(node) {
        if (!node) return [];

        if (node.type === "VariableName") {
            return node.name["varname"];
        }
        if (node.left && node.right) {
            return oi.get_dependencies(node.left).concat(oi.get_dependencies(node.right));
        }
        return [];
    }

    oi.eval_exp = function(node, curr_state = false) {
        // curr_state means resolves all variables
        if (node.left) 
            node.left = oi.eval_exp(node.left);
        if (node.right)
            node.right = oi.eval_exp(node.right);
        if (node.exp)
            node.exp = oi.eval_exp(node.exp);

        switch(node.type) {
            case "Additive":
            case "Multiplicative":
                if (curr_state || 
                    (oi.get_dependencies(node.left).length == 0 && 
                    oi.get_dependencies(node.right).length == 0)) {

                    if (node.operator == "+")
                        return oi.determine_type(node.left.value + node.right.value);
                    if (node.operator == "-")
                        return oi.determine_type(node.left.value - node.right.value);
                    if (node.operator == "*")
                        return oi.determine_type(node.left.value * node.right.value);
                    if (node.operator == "/")
                        return oi.determine_type(oi.eval_exp(node.left).value / oi.eval_exp(node.right).value);
                }
                return node;
            case "IntLiteral":
            case "CharLiteral":
            case "StringLiteral":
                return node;
            case "VariableName":
                if (node.name.varname in memo.varlist) {
                    if (curr_state) {
                        return memo.varlist[node.name].value;
                    }
                    return node;
                }
                throw new memo.RuntimeError(`I don't remember ${node.name.varname}.`, node.name.varname);
            default:
                throw new memo.RuntimeError("I don't know how to evaluate that.", node.type);
        }
    }

    oi.determine_type = function(val) {
        const attempt_int = parseInt(val);
        const attempt_float = parseFloat(val);
        
        if (!isNaN(attempt_int) && attempt_int == attempt_float) {
            return {type: "IntLiteral", value: attempt_int};
        }
        if (!isNaN(attempt_float)) {
            return {type: "FloatLiteral", value: attempt_float};
        }
        if (typeof(val) == "string" && val.length == 1) {
            return {type: "CharLiteral", value: ast.value};
        }
        return {type: "StringLiteral", value: ast.value};
    }
    
    oi.eval_and_assign = function(ast, varname) {
        ast = oi.eval_exp(ast, false);
        ast.varname = varname;
        if ("exp" in ast) {
            ast.deps = oi.get_dependencies(ast.exp);
        }

        ast.has_value = !!ast.value;
        ast.fade = 1;
        memo.varlist[ast.varname] = ast;

        // FIXME: this does not need to be assigned to the var
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
                    return memo.tools.exp_to_str(memo.varlist[ast.varname], is_html);
            }
        }

        if (ast.has_value)
            return `I will remember ${ast.varname} as ${memo.varlist[ast.varname].formatted_value(false)}.`;
        else
            return `I will remember ${ast.varname}.`;
    }
    
    oi.eval_cmd = function(ast) {
        switch(ast.cmd) {
            // case "reset":
            //     return `I remember ${ast.varname} as ${memo.varlist[ast.varname].formatted_value(false)}.`;
            case "let": 
                return oi.eval_and_assign(ast.exp, ast.varname);
            case "print":
                // this exp needs to actually be evaluated, currently assumes
                // the exp is just a variable
                if (!(ast.exp.varname in memo.varlist)) {
                    return `Hmm I don't remember ${ast.exp.varname}.`;
                }
                return capitalize(memo.varlist[ast.exp.varname].formatted_value(false));
        }
    }
    
    const capitalize = (str) => {
        // FIXME: this should not lowercase content in strings
        if (!str || typeof str !== "string") return "";

        return str.charAt(0).toUpperCase() + str.slice(1) /*.toLowerCase()*/ + ".";
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

        try {
            response = oi.eval_cmd(ast);
        }
        catch (e) {
            if (e.name == "RuntimeError" || e.name == "SyntaxError") {
                return e.message;
            } else {
                return `I ran into an internal issue: ${e}.`;
            }
        }

        fade_vars(ast);

        return response;
    }

})(memo.interpreter);
