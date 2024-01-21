remember.interpreter = {};

remember.varlist = {};

(function(oi) {
    oi.eval_and_assign = function(ast) {
        // FIXME: right now, this all assumes we're assigning a value
        // we need to evaluate expression first in the real scenario

        let has_value = ("exp" in ast && ast.exp.value !== undefined);

        // cast to the type of the var
        if(remember.varlist[ast.varname] !== undefined && ast.exp.type != remember.varlist[ast.varname].type) {
            switch(remember.varlist[ast.varname].type) {
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

        remember.varlist[ast.varname] = 
        {
            type: ast.type ?? ast.exp.type,
            value: has_value ? ast.exp.value : undefined,
            fade: 1,
        }
        remember.varlist[ast.varname].formatted_value = () => {
            switch(remember.varlist[ast.varname].type) {
                case "int":
                case "float":
                default:
                    return remember.varlist[ast.varname].value;
                case "string":
                    return `"${remember.varlist[ast.varname].value}"`
                case "float":
                    return `'${remember.varlist[ast.varname].value}'`
            }
        }
        if (has_value)
            return `I will remember ${ast.varname} as ${remember.varlist[ast.varname].formatted_value()}.`;
        else
            return `I will remember ${ast.varname}.`;
    }
    oi.eval_cmd = function(ast) {
        switch(ast.cmd) {
            case "reset":
                return `I remember ${ast.varname} as ${remember.varlist[ast.varname].formatted_value()}.`;
            case "declare":
                if (ast.varname in remember.varlist) {
                    // varname is already there, can't re-declare
                    return `I remember ${ast.varname} as ${remember.varlist[ast.varname].formatted_value()}.`;
                } else if (ast.type == "undetermined") {
                    // not a valid type
                    return `I can't tell what you want ${ast.varname} to be.`;
                } else {
                    return oi.eval_and_assign(ast);
                }
            case "let": 
                if (!(ast.varname in remember.varlist)) {
                    // varname is not there yet, need to declare and then assign
                    return oi.eval_and_assign(ast);
                }
                return oi.eval_and_assign(ast);
            case "print":
                if (!(ast.varname in remember.varlist)) {
                    return `Hmm I don't remember ${ast.varname}.`;
                }
                return `"${remember.varlist[ast.varname]}"`;
        }
    }
    const fade_vars = (ast) => {
        for (const key in remember.varlist) {
            if (!ast || ast.all_vars.indexOf(key) == -1) {
                remember.varlist[key].fade++;
                if (remember.varlist[key].fade > 11) {
                    delete remember.varlist[key];
                }
            }
        }
    }
    oi.parse = function(input) {
        let ast;

        try {
            ast = remember.parser.parse(input);
        } catch (e) {
            fade_vars();
            return "I didn't understand that.";
        }

        response = oi.eval_cmd(ast);

        fade_vars(ast);

        return response;
    }

})(remember.interpreter);
