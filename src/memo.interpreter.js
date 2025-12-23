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

    // Deep clone utility with fallback for environments without structuredClone
    oi.deepClone = function(obj) {
        if (typeof structuredClone !== 'undefined') {
            return structuredClone(obj);
        }
        // Fallback: JSON-based cloning (works for most cases)
        return JSON.parse(JSON.stringify(obj));
    };

    oi.getDependencies = function(node) {
        if (!node) return [];

        if (node.type === "VariableName") {
            return [node.name["varname"]];
        }
        if (node.type === "VariableWithParam") {
            // Depends on the function being called
            let deps = [node.name.varname];
            // Also check if the parameter is a variable reference
            if (node.param.type === "Variable") {
                deps.push(node.param.varname);
            }
            return deps;
        }
        if (node.type === "Conditional") {
            let deps = oi.getDependencies(node.comp);
            deps = deps.concat(oi.getDependencies(node.exp));
            if (node.f_else) {
                deps = deps.concat(oi.getDependencies(node.f_else));
            }
            return deps;
        }
        if (node.type === "Comparison") {
            return oi.getDependencies(node.left).concat(oi.getDependencies(node.right));
        }
        if (node.type === "ForLoop") {
            // ForLoop node - get dependencies from the body expression
            let deps = [];

            // Get dependencies from the range
            if (node.range) {
                if (node.range.type === "VariableName") {
                    deps.push(node.range.name.varname);
                } else if (node.range.type === "VariableWithParam") {
                    deps.push(node.range.name.varname);
                    // Also check parameter dependencies
                    if (node.range.param) {
                        deps = deps.concat(oi.getDependencies(node.range.param));
                    }
                } else if (node.range.type === "Range") {
                    // Get dependencies from range start and end
                    deps = deps.concat(oi.getDependencies(node.range.start));
                    deps = deps.concat(oi.getDependencies(node.range.end));
                }
            }

            if (node.exp) {
                if (node.exp.type === "List" && Array.isArray(node.exp.exp)) {
                    // Body is a list of expressions
                    for (let i = 0; i < node.exp.exp.length; i++) {
                        deps = deps.concat(oi.getDependencies(node.exp.exp[i]));
                    }
                } else {
                    deps = oi.getDependencies(node.exp);
                }
            }
            // Filter out the iterator variable itself from dependencies
            return deps.filter(dep => dep !== node.varname);
        }
        if (node.type === "List" && Array.isArray(node.exp)) {
            let deps = [];
            for (let i = 0; i < node.exp.length; i++) {
                deps = deps.concat(oi.getDependencies(node.exp[i]));
            }
            return deps;
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
                // When combining IntLiteral with StringLiteral/CharLiteral, convert int to words
                let leftVal = left.value;
                let rightVal = right.value;

                if (left.type === "IntLiteral" && (right.type === "StringLiteral" || right.type === "CharLiteral")) {
                    leftVal = memo.tools.stringifyList(left);
                } else if (right.type === "IntLiteral" && (left.type === "StringLiteral" || left.type === "CharLiteral")) {
                    rightVal = memo.tools.stringifyList(right);
                }

                return oi.determineType(leftVal + rightVal);
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
        // Handle ForLoop nodes first (they have cmd instead of type)
        if (node && node.type === "ForLoop") {
            if (!currState) {
                // Don't evaluate during assignment, keep the ForLoop structure
                return node;
            }
            
            // Evaluate the range to get the list of values to iterate over
            let rangeNode = oi.evalExp(node.range, params, true);
            
            // If there's a separate rangeStep (for "for n in varname step X"), apply it
            if (node.rangeStep) {
                let stepValue = oi.evalExp(node.rangeStep, params, true);
                
                if (rangeNode.type === "Range") {
                    // Range object - apply step directly
                    rangeNode = { ...rangeNode, step: stepValue };
                } else if (rangeNode.type === "List") {
                    // List (e.g., from a stored Range variable) - filter to step intervals
                    // Extract the step value if it's wrapped in IntLiteral
                    const stepVal = stepValue.type === "IntLiteral" ? stepValue.value : 
                                  stepValue.type === "VariableName" ? oi.evalExp(stepValue, params, true).value : 
                                  stepValue;
                    
                    if (stepVal && typeof stepVal === 'number' && stepVal !== 1) {
                        // Filter list to only include elements at step intervals
                        const filteredExp = rangeNode.exp.filter((item, index) => index % stepVal === 0);
                        rangeNode = { type: "List", exp: filteredExp };
                    }
                }
            }
            
            // Runtime validation for step direction (only for Range nodes with literal values)
            if (rangeNode.type === "Range" && rangeNode.step) {
                const start = rangeNode.start.value;
                const end = rangeNode.end.value;
                const stepVal = rangeNode.step.value;
                if (start < end && stepVal < 0) {
                    throw new memo.RuntimeError("Step must be positive when counting upward.");
                }
                if (start > end && stepVal > 0) {
                    throw new memo.RuntimeError("Step must be negative when counting downward.");
                }
            }
            
            const rangeList = rangeNode.type === "List" ? rangeNode : memo.tools.rangeToList(rangeNode);
            
            if (!rangeList || !rangeList.exp || !Array.isArray(rangeList.exp)) {
                throw new memo.RuntimeError("For loop range must evaluate to a list.");
            }
            
            // The expression should be a List of expressions to evaluate for each iteration
            const bodyExp = node.exp;
            // Use the saved iterator variable name (iteratorVar) if available,
            // otherwise fall back to varname (for backwards compatibility)
            const iteratorVar = node.iteratorVar || node.varname;
            
            // Build the result list
            const resultList = [];
            
            for (let i = 0; i < rangeList.exp.length; i++) {
                const iterValue = rangeList.exp[i];
                
                // Create parameter binding for this iteration
                const iterParams = [{
                    varname: iteratorVar,
                    value: iterValue
                }];
                
                // Evaluate the body expression with the iterator value
                let iterResult;
                if (bodyExp.type === "List") {
                    // Body is a list of expressions - evaluate each one
                    const evaledList = [];
                    for (let j = 0; j < bodyExp.exp.length; j++) {
                        evaledList.push(oi.evalExp(bodyExp.exp[j], iterParams, currState));
                    }
                    iterResult = { type: "List", exp: evaledList };
                } else {
                    // Body is a single expression
                    iterResult = oi.evalExp(bodyExp, iterParams, currState);
                }
                
                resultList.push(iterResult);
            }
            
            return { type: "List", exp: resultList };
        }
        
        // When currState is true, work on a copy to avoid mutating stored variables
        if (currState && node && typeof node === 'object') {
            node = oi.deepClone(node);
        }
        
        if (node.left) 
            node.left = oi.evalExp(node.left, params, currState);
        if (node.right)
            node.right = oi.evalExp(node.right, params, currState);
        // Don't recursively process exp for ForLoop nodes (type === "ForLoop")
        if (node.exp && node.type !== "ForLoop") {
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
        
        let result;
        switch(node.type) {
            case "Additive":
            case "Multiplicative":
                if (currState || 
                    // if there are no dependencies on either side, we can resolve right away
                    (oi.getDependencies(node.left).length == 0 && 
                    oi.getDependencies(node.right).length == 0)) {

                    result = oi.mathyStuff(node.left, node.right, node.operator);
                } else {
                    result = node;
                }
                break;
            case "IntLiteral":
            case "CharLiteral":
            case "StringLiteral":
                result = node;
                break;
            case "Conditional":
                if (currState) {
                    // Evaluate the condition
                    const condResult = oi.evalExp(node.comp, params, currState);
                    const condValue = (typeof condResult === 'object' && 'value' in condResult) 
                        ? condResult.value 
                        : condResult;
                    
                    // Determine truthiness
                    let isTruthy = false;
                    if (typeof condValue === 'boolean') {
                        isTruthy = condValue;
                    } else if (typeof condValue === 'number') {
                        isTruthy = condValue !== 0;
                    } else if (typeof condValue === 'string') {
                        isTruthy = condValue.length > 0;
                    } else if (condValue !== null && condValue !== undefined) {
                        isTruthy = true;
                    }
                    
                    // Evaluate the appropriate branch
                    if (isTruthy) {
                        result = oi.evalExp(node.exp, params, currState);
                    } else if (node.f_else) {
                        result = oi.evalExp(node.f_else, params, currState);
                    } else {
                        result = { type: "IntLiteral", value: 0 };
                    }
                } else {
                    result = node;
                }
                break;
            case "Comparison":
                if (currState) {
                    const left = oi.evalExp(node.left, params, currState);
                    const right = oi.evalExp(node.right, params, currState);
                    
                    const leftVal = (typeof left === 'object' && 'value' in left) ? left.value : left;
                    const rightVal = (typeof right === 'object' && 'value' in right) ? right.value : right;
                    
                    let compResult;
                    switch (node.operator) {
                        case "==": compResult = leftVal == rightVal; break;
                        case "!=": compResult = leftVal != rightVal; break;
                        case ">": compResult = leftVal > rightVal; break;
                        case "<": compResult = leftVal < rightVal; break;
                        case ">=": compResult = leftVal >= rightVal; break;
                        case "<=": compResult = leftVal <= rightVal; break;
                        default: throw new memo.RuntimeError("Unknown comparison operator: " + node.operator + ".");
                    }
                    
                    result = { type: "BooleanLiteral", value: compResult };
                } else {
                    result = node;
                }
                break;
            case "List":
                return node;
            case "Range":
                if (currState) {
                    // Resolve the step if it's a variable
                    let resolvedRange = { ...node };
                    if (node.step && node.step.type === "VariableName") {
                        const stepValue = oi.evalExp(node.step, params, currState);
                        resolvedRange.step = stepValue;
                    }
                    return memo.tools.rangeToList(resolvedRange);
                }
                return node;
            case "VariableName":
                const varnameLower = node.name.varname.toLowerCase();
                if (varnameLower in memo.varlist) {
                    if (currState) {
                        result = oi.evalExp(memo.varlist[node.name.varname], params, currState);
                        break;
                    }
                    // When currState is false, keep the variable reference as-is
                    return node;
                }
                if (params) {
                    const matchingParam = params.find(param => param.varname.toLowerCase() === varnameLower);
                    if (matchingParam) {
                        if (currState) {
                            result = matchingParam.value;
                            break;
                        }
                        return node;
                    }
                }
                // When currState is false (defining a function), allow undefined variables
                // They will be validated when the function is actually called
                if (!currState) {
                    return node;
                }
                throw new memo.RuntimeError(`I don't remember ${node.name.varname}.`, node.name.varname);
            case "VariableWithParam":
                // When currState is false and the function doesn't exist yet,
                // just return the node without evaluation (for function definitions)
                const funcNameLower = node.name.varname.toLowerCase();
                if (!currState && !(funcNameLower in memo.varlist)) {
                    return node;
                }
                
                // Look up the variable (function) definition
                if (!(funcNameLower in memo.varlist)) {
                    throw new memo.RuntimeError(`I don't remember ${node.name.varname}.`, funcNameLower);
                }
                
                const funcDef = memo.varlist[funcNameLower];
                
                // Check if the function has parameters defined
                if (!funcDef.params || funcDef.params.length === 0) {
                    throw new memo.RuntimeError(`${node.name.varname} doesn't accept parameters.`, node.name.varname);
                }
                
                // Evaluate the parameter value (could be a literal or variable reference)
                let paramValue;
                if (node.param.type === "Variable") {
                    // It's an Identifier (variable reference)
                    paramValue = oi.evalExp({type: "VariableName", name: node.param}, params, true);
                } else {
                    // It's a Literal
                    paramValue = oi.evalExp(node.param, params, true);
                }
                
                // Create a parameter binding for evaluation
                const funcParams = [{
                    varname: funcDef.params[0].varname.toLowerCase(),
                    value: paramValue
                }];
                
                // Evaluate the function body with the parameter binding
                // Always evaluate to get the value, then preserve structure if currState=false
                const funcResult = oi.evalExp(funcDef, funcParams, true);
                
                if (currState) {
                    result = funcResult;
                } else {
                    // Keep the VariableWithParam structure but add the computed value
                    node.value = funcResult.value !== undefined ? funcResult.value : funcResult;
                    result = node;
                }
                break;
            default:
                throw new memo.RuntimeError("I don't know how to evaluate that.", node.type);
        }
        
        // Remove all 'as string' coercion. Integers are always stored as ints.
        // When currState is true and printing, convert ints to words in output logic, not here.
        return result;
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
                    ast.left = oi.deepClone(var_replace);
                } else {
                    oi.retire_var(ast.left, varname, var_replace);
                }
            }
            if ("right" in ast) {
                if (ast.right.type == "VariableName" && ast.right.name["varname"] === varname) {
                    ast.right = oi.deepClone(var_replace);
                } else {
                    oi.retire_var(ast.right, varname, var_replace);
                }
            }
        }
    }

    oi.retire = function(varname) {
        // remove var and update all references to it
        let var_reading = oi.deepClone(memo.varlist[varname]);
        delete memo.varlist[varname];

        for(const key in memo.varlist) {
            // if it is exactly equal to another var, we can remove it first
            // (as retire_var looks at left and right only)
            if (memo.varlist[key].type == "VariableName" && memo.varlist[key].name["varname"] === varname) {
                memo.varlist[key] = oi.deepClone(var_reading);
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

        // For ForLoop nodes, save the iterator variable name as a separate property
        let forIterator = null;
        let forRangeVar = null;
        if (ast.type === "ForLoop") {
            forIterator = ast.varname;
            ast.iteratorVar = ast.varname;
            // Try to extract the range variable name (if range is a variable)
            if (ast.range && ast.range.type === "VariableName") {
                forRangeVar = ast.range.name.varname.toLowerCase();
            } else if (ast.range && ast.range.type === "VariableWithParam") {
                forRangeVar = ast.range.name.varname.toLowerCase();
            }
        }

        ast.params = params;
        ast.varname = varname.toLowerCase();

        // Get dependencies - for ForLoop nodes, use the whole AST to get proper filtering
        if (ast.type === "ForLoop") {
            ast.deps = oi.getDependencies(ast);
            // Remove the iterator variable from deps (should not be a dependency)
            if (forIterator) {
                ast.deps = ast.deps.filter(dep => dep.toLowerCase() !== forIterator.toLowerCase());
            }
        } else if ("exp" in ast) {
            ast.deps = oi.getDependencies(ast.exp);
        } else {
            // For nodes without exp field (like VariableWithParam), get dependencies directly
            ast.deps = oi.getDependencies(ast);
        }


        // Collect parameter names for this assignment (if any), lowercased
        let allowedParams = [];
        if (ast.params && Array.isArray(ast.params)) {
            allowedParams = ast.params.map(p => p.varname.toLowerCase());
        }
        // For for-loops, also allow the iterator variable (lowercased)
        if (ast.type === "ForLoop" && forIterator) {
            allowedParams.push(forIterator.toLowerCase());
        }

        // Special case: for conditionals, check dependencies in the condition and both branches
        if (ast.type === "Conditional") {
            let condDeps = oi.getDependencies(ast.comp).map(dep => dep.toLowerCase());
            let thenDeps = oi.getDependencies(ast.exp).map(dep => dep.toLowerCase());
            let elseDeps = ast.f_else ? oi.getDependencies(ast.f_else).map(dep => dep.toLowerCase()) : [];
            let allDeps = [...condDeps, ...thenDeps, ...elseDeps];
            // Remove allowed params
            allDeps = allDeps.filter(dep => !allowedParams.includes(dep));
            for (const dep of allDeps) {
                if (!Object.keys(memo.varlist).map(k => k.toLowerCase()).includes(dep)) {
                    throw new memo.RuntimeError(`I don't remember ${dep}.`);
                }
            }
        }


        // For for-loops, explicitly check that the range variable exists if it's a variable
        if (ast.type === "ForLoop" && forRangeVar) {
            if (!Object.keys(memo.varlist).map(k => k.toLowerCase()).includes(forRangeVar)) {
                throw new memo.RuntimeError(`I don't remember ${forRangeVar}.`);
            }
        }

        // Set dependencies to lowercased ast.deps
        const dependencies = ast.deps.map(dep => dep.toLowerCase());

        for (const dep of dependencies) {
            // Allow if dep is in memo.varlist (case-insensitive)
            if (Object.keys(memo.varlist).map(k => k.toLowerCase()).includes(dep)) continue;
            // Allow if dep is a parameter for this assignment or a for-loop iterator
            if (allowedParams.includes(dep)) continue;
            // Otherwise, throw error and prevent variable creation
            throw new memo.RuntimeError(`I don't remember ${dep}.`);
        }

        // Check for circular dependencies
        if (oi.checkCircularDependency(varname, dependencies)) {
            throw new memo.RuntimeError(`I cannot remember ${varname} that way; it would create a circular dependency.`);
        }

        ast.has_value = !!ast.value;
        ast.fade = 1;

        // Only create the variable if all dependencies exist (no error thrown above)
        memo.varlist[ast.varname] = ast;

        if (ast.has_value)
            return `I will remember ${ast.varname} as ${memo.tools.expToStr(memo.varlist[ast.varname], false)}.`;
        else
            return `I will remember ${ast.varname}.`;
    }
    
    oi.evalCmd = function(ast, params) {
        switch(ast.cmd) {
            case "clear": {
                const varName = ast.varname;
                if (memo.varlist[varName]) {
                    resolveDependents(varName);
                    delete memo.varlist[varName];
                    return `I have forgotten ${varName}.`;
                }
                return `I don't remember ${varName}.`;
            }
            case "reset": {
                if (memo.varlist[ast.varname]) {
                    return `I remember ${ast.varname} as ${memo.tools.expToStr(memo.varlist[ast.varname], false)}.`;
                }
                return `I don't remember ${ast.varname}.`;
            }
            case "let": {
                return oi.evalAndAssign(ast.exp, ast.varname, ast.params);
            }
            case "print": {
                const currState = true;
                const evaluatedExp = oi.evalExp(ast.exp, params, currState);
                let printOutput;
                if (evaluatedExp.type === "List" || evaluatedExp.type === "Range") {
                    const listNode = evaluatedExp.type === "Range" ?
                        memo.tools.rangeToList(evaluatedExp) : evaluatedExp;
                    if (memo.tools.containsString(listNode)) {
                        // If list contains string/char, concatenate, but use digit form for IntLiterals
                        printOutput = memo.tools.stringifyList(listNode);
                    } else {
                        // Otherwise, print as smart list format <one, two, three>
                        const items = Array.isArray(listNode.exp) ? listNode.exp.map(elem => memo.tools.stringifyList(elem)) : [];
                        printOutput = `<${items.join(", ")}>`;
                    }
                } else if (evaluatedExp.type === "StringLiteral") {
                    // Output string literals as-is
                    printOutput = evaluatedExp.value;
                } else if (evaluatedExp.type === "IntLiteral") {
                    // Output digit form for IntLiterals
                    printOutput = memo.tools.stringifyList(evaluatedExp);
                } else if (evaluatedExp.type === "FloatLiteral") {
                    printOutput = memo.tools.floatToStr(evaluatedExp.value);
                } else {
                    // For all other outputs, remove quotes if present
                    let outputStr = memo.tools.expToStr(evaluatedExp, false);
                    if (outputStr.length > 1 && outputStr[0] === '"' && outputStr[outputStr.length - 1] === '"') {
                        outputStr = outputStr.slice(1, -1);
                    }
                    printOutput = outputStr;
                }
                // Do NOT post-process with regex replace; IntLiterals are handled above, and StringLiterals are left alone
                memo.moreText = "";
                if (printOutput.length > 2000) {
                    let truncated = printOutput.substring(0, 2000);
                    const lastSpace = truncated.lastIndexOf(' ');
                    if (lastSpace > 0) {
                        truncated = truncated.substring(0, lastSpace);
                        memo.moreText = printOutput.substring(lastSpace + 1);
                    } else {
                        memo.moreText = printOutput.substring(2000);
                    }
                    return truncated + "...";
                }
                return printOutput;
            }
            default: {
                return "Unknown command.";
            }
        }
    }

    // Helper to recursively resolve all dependents before deleting a variable
    const resolveDependents = (varname) => {
        for (const depKey in memo.varlist) {
            if (memo.varlist[depKey].deps && memo.varlist[depKey].deps.includes(varname)) {
                // Recursively resolve further dependents first
                resolveDependents(depKey);
                // Evaluate and store the resolved value (no dependencies)
                const resolved = oi.evalExp(memo.varlist[depKey], undefined, true);
                if (resolved && typeof resolved.value !== 'undefined') {
                    const oldParams = memo.varlist[depKey].params || [];
                    memo.varlist[depKey] = oi.deepClone(resolved);
                    // Reset fade to 1 - this is now a fresh literal value
                    memo.varlist[depKey].fade = 1;
                    memo.varlist[depKey].params = oldParams;
                    memo.varlist[depKey].deps = []; // No more dependencies
                }
            }
        }
    };

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
            // Resolve all dependents to literal values before deleting
            resolveDependents(key);
            // Delete the variable
            delete memo.varlist[key];
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
        
        // Check for "more" or "tell me more" command
        if (input.toLowerCase() === "more." || input.toLowerCase() === "tell me more.") {
            if (memo.moreText && memo.moreText.length > 0) {
                let output = memo.moreText.substring(0, 2000);
                
                // Find the last space within the 2000 characters to break at word boundary
                if (memo.moreText.length > 2000) {
                    const lastSpace = output.lastIndexOf(' ');
                    if (lastSpace > 0) {
                        output = output.substring(0, lastSpace);
                        memo.moreText = memo.moreText.substring(lastSpace + 1);
                    } else {
                        memo.moreText = memo.moreText.substring(2000);
                    }
                } else {
                    memo.moreText = memo.moreText.substring(output.length);
                }
                
                return output + (memo.moreText.length > 0 ? "..." : "");
            } else {
                return "There is nothing more.";
            }
        }

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
