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

    oi.getDependencies = function(node) {
        if (!node) return [];

        if (node.type === "VariableName") {
            return node.name["varname"];
        }
        if (node.left && node.right) {
            return oi.getDependencies(node.left).concat(oi.getDependencies(node.right));
        }
        return [];
    }

    oi.evalExp = function(node, currState = false) {
        // currState means resolves all variables
        if (node.left) 
            node.left = oi.evalExp(node.left);
        if (node.right)
            node.right = oi.evalExp(node.right);
        if (node.exp) {
            if (Array.isArray(node.exp)) {
                for (let i = 0; i < node.exp.length; i++) {
                    node.exp[i] = oi.evalExp(node.exp[i]);
                }
            } else
                node.exp = oi.evalExp(node.exp);
        }
        switch(node.type) {
            case "Additive":
            case "Multiplicative":
                if (currState || 
                    (oi.getDependencies(node.left).length == 0 && 
                    oi.getDependencies(node.right).length == 0)) {

                    if (node.operator == "+")
                        return oi.determineType(node.left.value + node.right.value);
                    if (node.operator == "-")
                        return oi.determineType(node.left.value - node.right.value);
                    if (node.operator == "*")
                        return oi.determineType(node.left.value * node.right.value);
                    if (node.operator == "/")
                        return oi.determineType(node.left.value / node.right.value);
                }
                return node;
            case "IntLiteral":
            case "CharLiteral":
            case "StringLiteral":
            case "Comparison":
            case "Conditional":
            case "Range":
            case "List":
                return node;
            case "VariableName":
                if (node.name.varname in memo.varlist) {
                    if (currState) {
                        return memo.varlist[node.name].value;
                    }
                    return node;
                }
                throw new memo.RuntimeError(`I don't remember ${node.name.varname}.`, node.name.varname);
            case "List":
                return node.exp.length;
            default:
                throw new memo.RuntimeError("I don't know how to evaluate that.", node.type);
        }
    }

    oi.determineType = function(val) {
        const attemptInt = parseInt(val);
        const attemptFloat = parseFloat(val);
        
        if (!isNaN(attemptInt) && attemptInt == attemptFloat) {
            return {type: "IntLiteral", value: attemptInt};
        }
        if (!isNaN(attemptFloat)) {
            return {type: "FloatLiteral", value: attemptFloat};
        }
        if (typeof(val) == "string" && val.length == 1) {
            return {type: "CharLiteral", value: val};
        }
        return {type: "StringLiteral", value: val};
    }
    
    oi.evalAndAssign = function(ast, varname) {
        ast = oi.evalExp(ast, false);
        ast.varname = varname;
        if ("exp" in ast) {
            ast.deps = oi.getDependencies(ast.exp);
        }

        ast.has_value = !!ast.value;
        ast.fade = 1;
        memo.varlist[ast.varname] = ast;

        if (ast.has_value)
            return `I will remember ${ast.varname} as ${memo.tools.expToStr(memo.varlist[ast.varname], false)}.`;
        else
            return `I will remember ${ast.varname}.`;
    }
    
    oi.evalCmd = function(ast) {
        switch(ast.cmd) {
            // case "reset":
            //     return `I remember ${ast.varname} as ${memo.varlist[ast.varname].formatted_value(false)}.`;
            case "let": 
                return oi.evalAndAssign(ast.exp, ast.varname);
            case "print":
                // this exp needs to actually be evaluated, currently assumes
                // the exp is just a variable
                if (!(ast.exp.varname in memo.varlist)) {
                    return `Hmm I don't remember ${ast.exp.varname}.`;
                }
                return capitalize(`${ast.exp.varname} is ${memo.tools.expToStr(memo.varlist[ast.exp.varname], false)}`);
        }
    }
    
    const capitalize = (str) => {
        // FIXME: this should not lowercase content in strings
        if (!str || typeof str !== "string") return "";

        return str.charAt(0).toUpperCase() + str.slice(1) /*.toLowerCase()*/ + ".";
    };
    const fadeVars = (ast) => {
        for (const key in memo.varlist) {
            if (!ast || !ast.all_vars || ast.all_vars.indexOf(key) == -1) {
                memo.varlist[key].fade++;
                if (memo.varlist[key].fade > 11) {
                    delete memo.varlist[key];
                }
            }
        }
    };
    const getWordAt = (str, pos) => {
        // check ranges
        if ((pos < 0) || (pos > str.length)) {
            return '';
        }
        // Perform type conversions.
        str = String(str);
        pos = Number(pos) >>> 0;
        
        // Search for the word's beginning and end.
        var left = str.slice(0, pos + 1).search(/\S+$/), // use /\S+\s*$/ to return the preceding word 
            right = str.slice(pos).search(/\s/);
        
        // The last word in the string is a special case.
        if (right < 0) {
            str = str.slice(left);
        } else {
            // Return the word, using the located bounds to extract it from the string.
            str = str.slice(left, right + pos);
        }
        // Remove any non-letter characters.
        return str.replace(/[^\p{L}]/gu, '');
    };
    oi.parse = function(input, isHtml = false) {
        let ast;

        input = input.trim();

        try {
            ast = memo.parser.parse(input);
        } catch (e) {
            fadeVars();
            if (e.name == "SyntaxError") {
                return `I didn't understand ${getWordAt(input, e.location.start.column - 1)}.`;
            } else if ("code" in e && e.code == "reserved") {
                if (!isNaN(parseInt(e.details.name))) {
                    // FIXME: This should probably just pull the name from the request. But currently this serves as a test that it is actually a bad int
                    // (it won't work with another reserved word)
                    return `I remember ${memo.tools.intrToStr(e.details.name)} differently.`
                }
                // non-numeric keywords end up here
                return `I remember that differently.`
            } else {
                return `I ran into an internal issue: ${e}.`;
            }
        }

        try {
            response = oi.evalCmd(ast);
        }
        catch (e) {
            if (e.name == "RuntimeError" || e.name == "SyntaxError") {
                return e.message;
            } else {
                return `I ran into an internal issue: ${e}.`;
            }
        }

        fadeVars(ast);

        return response;
    }

})(memo.interpreter);
