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
            return [node.name["varname"]];
        }
        if (node.left && node.right) {
            return oi.getDependencies(node.left).concat(oi.getDependencies(node.right));
        }
        return [];
    }

    oi.mathyStuff = (left, right, operator) => {
        if (left.type == "Range") {
            left = memo.tools.rangeToList(left);
        }
        if (right.type == "Range") {
            right = memo.tools.rangeToList(right);
        }

        // a list looks like: {type: 'List', exp: Array}
        if (left.type === "List" && right.type === "List") {
            const maxLen = Math.max(left.exp.length, right.exp.length);
            const results = {type: 'List', exp: []};
            for (let i = 0; i < maxLen; i++) {
                const l = i < left.exp.length ? left.exp[i] : {type: 'IntLiteral', value: 0};
                const r = i < right.exp.length ? right.exp[i] : {type: 'IntLiteral', value: 0};
                results.exp.push(oi.mathyStuff(l, r, operator));
            }
            return {type: 'List', exp: results};
        }
        if (left.type === "List") {
            // left is a List, right is a value
            const results = left.exp.map(item => oi.mathyStuff(item, right, operator));
            return {type: 'List', exp: results};
        }
        if (right.type === "List") {
            // right is a List, left is a value
            const results = right.exp.map(item => oi.mathyStuff(left, item, operator));
            return {type: 'List', exp: results};
        }
        // here we're using JavaScript's rules on how to add things
        // (which are always correct and sensible, as it is JavaScript)
        switch (operator) {
            case "+":
                return oi.determineType(left.value + right.value);
            case "-":
                return oi.determineType(left.value - right.value);
            case "*":
                return oi.determineType(left.value * right.value);
            case "/":
                return oi.determineType(left.value / right.value);
            default:
                throw new Error(`Unknown operator: ${operator}`);
        }
    }

    /*
     * Evaluate an expression node, returning a resolved node
     * { type:..., operator:..., left:..., right:..., params: [] }
     * 
     * currState = resolve all variables, used for printing
     * when false, it is quoted
     */
    oi.evalExp = function(node, params, currState = false) {
        // When currState is true, work on a copy to avoid mutating stored variables
        if (currState && node && typeof node === 'object') {
            node = structuredClone(node);
        }
        
        if (node.left) 
            node.left = oi.evalExp(node.left, params, currState);
        if (node.right)
            node.right = oi.evalExp(node.right, params, currState);
        if (node.exp) {
            if (Array.isArray(node.exp)) {
                if (node.start && node.end && typeof node.start.value === 'number' && typeof node.end.value === 'number' && node.start.value > node.end.value) {
                    for (let i = node.exp.length - 1; i >= 0; i--) {
                        node.exp[i] = oi.evalExp(node.exp[i], params, currState);
                    }
                } else {
                    for (let i = 0; i < node.exp.length; i++) {
                        node.exp[i] = oi.evalExp(node.exp[i], params, currState);
                    }
                }
            } else {
                node.exp = oi.evalExp(node.exp, params, currState);
            }
        }
        switch(node.type) {
            case "Additive":
            case "Multiplicative":
                if (currState || 
                    // if there are no dependencies on either side, we can resolve right away
                    (oi.getDependencies(node.left).length == 0 && 
                    oi.getDependencies(node.right).length == 0)) {

                    return(oi.mathyStuff(node.left, node.right, node.operator));
                }
                return node;
            case "IntLiteral":
            case "CharLiteral":
            case "StringLiteral":
            case "Comparison":
            case "Conditional":
            case "List":
                return node;
            case "Range":
                if (currState) {
                    let retval = { type: "List", exp: []};
                    if (node.start.value <= node.end.value) {
                        for (let i = node.start.value; i <= node.end.value; i += 1) {
                            retval.exp.push(oi.evalExp({type: "IntLiteral", value: i}, params, currState));
                        }
                    }
                    for (let i = node.start.value; i >= node.end.value; i -= 1) {
                        retval.exp.push(oi.evalExp({type: "IntLiteral", value: i}, params, currState));
                    }
                    return retval;
                }
                return node;
            case "VariableName":
                if (node.name.varname in memo.varlist) {
                    if (currState) {
                        return oi.evalExp(memo.varlist[node.name.varname], params, currState);
                    }
                    // When currState is false, keep the variable reference as-is
                    return node;
                }
                if (params) {
                    const matchingParam = params.find(param => param.varname === node.name.varname);
                    if (matchingParam) {
                        if (currState) {
                            return matchingParam.value;
                        }
                        return node;
                    }
                }
                throw new memo.RuntimeError(`I don't remember ${node.name.varname}.`, node.name.varname);
            case "VariableWithParam":
                throw new memo.RuntimeError(`I don't know how to handle parameters yet.`, node.name.varname);
            default:
                throw new memo.RuntimeError("I don't know how to evaluate that.", node.type);
        }
    }

    oi.determineType = function(val) {
        if (typeof val === 'number' && Number.isInteger(val)) {
            return {type: "IntLiteral", value: val};
        }
        if (typeof val === 'number') {
            return {type: "FloatLiteral", value: val};
        }

        let trimmed = (typeof val === 'string') ? val.trim() : val;
        let intPattern = /^-?\d+$/;
        if (typeof trimmed === 'string' && intPattern.test(trimmed)) {
            const attemptInt = parseInt(trimmed, 10);
            return {type: "IntLiteral", value: attemptInt};
        }
        const attemptFloat = parseFloat(trimmed);
        if (!isNaN(attemptFloat) && typeof trimmed === 'string' && /^-?\d*\.\d+$/.test(trimmed)) {
            return {type: "FloatLiteral", value: attemptFloat};
        }
        if (typeof(val) == "string" && val.length == 1) {
            return {type: "CharLiteral", value: val};
        }
        return {type: "StringLiteral", value: val};
    }

    oi.retire_var = function(ast, varname, var_replace) {
        // Replace all instances of varname with what it evaluates to
        if (ast && typeof ast === 'object') {
            if ("left" in ast) {
                if (ast.left.type == "VariableName" && ast.left.name["varname"] === varname) {
                    ast.left = structuredClone(var_replace);
                } else {
                    oi.retire_var(ast.left, varname, var_replace);
                }
            }
            if ("right" in ast) {
                if (ast.right.type == "VariableName" && ast.right.name["varname"] === varname) {
                    ast.right = structuredClone(var_replace);
                } else {
                    oi.retire_var(ast.right, varname, var_replace);
                }
            }
        }
    }

    oi.retire = function(varname) {
        // remove var and update all references to it
        let var_reading = structuredClone(memo.varlist[varname]);
        delete memo.varlist[varname];

        for(const key in memo.varlist) {
            // if it is exactly equal to another var, we can remove it first
            // (as retire_var looks at left and right only)
            if (memo.varlist[key].type == "VariableName" && memo.varlist[key].name["varname"] === varname) {
                memo.varlist[key] = structuredClone(var_reading);
            } else {
                oi.retire_var(memo.varlist[key], varname, var_reading);
            }
        }
    }
    
    oi.checkCircularDependency = function(varname, dependencies, visited = new Set()) {
        // Check if defining varname with these dependencies would create a cycle
        if (!dependencies || dependencies.length === 0) {
            return false; // No dependencies, no cycle
        }
        
        for (const dep of dependencies) {
            if (dep === varname) {
                // Direct self-reference
                return true;
            }
            
            if (visited.has(dep)) {
                // We've already checked this dependency in this path
                continue;
            }
            
            visited.add(dep);
            
            // Check if this dependency exists in varlist
            if (dep in memo.varlist) {
                const depVar = memo.varlist[dep];
                const depDependencies = oi.getDependencies(depVar);
                
                // Recursively check if any of dep's dependencies lead back to varname
                if (depDependencies && depDependencies.length > 0) {
                    for (const nestedDep of depDependencies) {
                        if (nestedDep === varname) {
                            return true; // Found a cycle
                        }
                        
                        // Recursively check deeper
                        if (oi.checkCircularDependency(varname, [nestedDep], new Set(visited))) {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    oi.evalAndAssign = function(ast, varname, params) {
        ast = oi.evalExp(ast, params, false);
        ast.params = params;
        ast.varname = varname;
        if ("exp" in ast) {
            ast.deps = oi.getDependencies(ast.exp);
        }

        // Check for circular dependencies
        const dependencies = oi.getDependencies(ast);
        if (oi.checkCircularDependency(varname, dependencies)) {
            throw new memo.RuntimeError(`I cannot remember ${varname} that way; it would create a circular dependency.`);
        }

        ast.has_value = !!ast.value;
        ast.fade = 1;
        memo.varlist[ast.varname] = ast;

        if (ast.has_value)
            return `I will remember ${ast.varname} as ${memo.tools.expToStr(memo.varlist[ast.varname], false)}.`;
        else
            return `I will remember ${ast.varname}.`;
    }
    
    oi.evalCmd = function(ast, params) {
        switch(ast.cmd) {
            case "clear":
                memo.varlist = {};
                if (typeof clearMemory === 'function') {
                    clearMemory();
                }
                return "I have forgotten everything.";
            case "reset":
                if (memo.varlist[ast.varname]) {
                    return `I remember ${ast.varname} as ${memo.tools.expToStr(memo.varlist[ast.varname], false)}.`;
                }
                return `I don't remember ${ast.varname}.`;
            case "let": 
                return oi.evalAndAssign(ast.exp, ast.varname, ast.params);
            case "print":
                return memo.tools.expToStr(
                    oi.evalExp(ast.exp, params, true), false
                )
        }
    }

    const fadeVars = (ast) => {
        let to_delete = [];
        for (const key in memo.varlist) {
            if (!ast || !ast.all_vars || ast.all_vars.indexOf(key) == -1) {
                memo.varlist[key].fade++;
                if (memo.varlist[key].fade > 11) {
                    to_delete.push(key);
                }
            }
        }
        for (const key of to_delete) {
            memo.interpreter.retire(key);
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

    oi.parse = function(input) {
        let ast;

        input = input.trim();

        if (DEBUG)
            console.log("Before preprocessing: ", input);

        // Preprocess input
        input = memo.preprocess(input);

        if (DEBUG)
            console.log("After preprocessing: ", input);

        try {
            ast = memo.parser.parse(input);
        } catch (e) {
            fadeVars();
            if (e.name == "SyntaxError") {
                const word = getWordAt(input, e.location.start.column - 1);
                if (word) {
                    return `I didn't understand ${word}.`;
                } else {
                    return `I didn't understand.`;
                }
            } else if ("code" in e && e.code == "reserved") {
                if (!isNaN(parseInt(e.details.name))) {
                    // FIXME: This should probably just pull the name from the request. But currently this serves as a test that it is actually a bad int
                    // (it won't work with another reserved word)
                    return `I remember ${memo.tools.intToStr(e.details.name)} differently.`
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
