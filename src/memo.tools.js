memo.tools = {
// String utils for the []memo language
// How to describe data in plain English
}


memo.tools.intToStr = (num) => {
    // Handle very large numbers
    if (num > 999999999999) {
        return "a lot";
    }
    
    const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    const teens = ["", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
    const tens = ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
    const thousands = ["", "thousand", "million", "billion"];

    if (num === 0) return "zero";

    let word = "";
    let numStr = num.toString();
    let groupIndex = 0;

    if (numStr[0] === "-") {
        word += "negative ";
        numStr = numStr.slice(1);
    }

    while (numStr.length > 0) {
        let group = parseInt(numStr.slice(-3)) || 0;
        numStr = numStr.slice(0, -3);

        if (group > 0) {
            let groupWord = "";

            if (group >= 100) {
                groupWord += ones[Math.floor(group / 100)] + " hundred ";
                group %= 100;
            }

            if (group >= 11 && group <= 19) {
                groupWord += teens[group - 10] + " ";
            } else {
                if (group >= 10) {
                    const tensDigit = tens[Math.floor(group / 10)];
                    const onesDigit = ones[group % 10];
                    if (group % 10 > 0) {
                        // Hyphenate compound numbers like "twenty-one"
                        groupWord += tensDigit + "-" + onesDigit + " ";
                    } else {
                        groupWord += tensDigit + " ";
                    }
                } else if (group % 10 > 0) {
                    groupWord += ones[group % 10] + " ";
                }
            }

            word = groupWord + thousands[groupIndex] + " " + word;
        }

        groupIndex++;
    }

    return word.trim();
}

memo.tools.floatToStr = (num) => {
    const wholePart = parseInt(String(num).split('.')[0]);
    const decimalPart = String(num).split('.')[1];
    const floatPart = decimalPart ? parseFloat('0.' + decimalPart) : 0;
    const wholeStr = memo.tools.intToStr(wholePart);

    if (floatPart < 0.2) {
        return `more than ${wholeStr}`;
    } 
    if (floatPart < 0.4) {
        return `${num >= 1 ? wholeStr + ' and' : ""} a third`;
    }
    if (floatPart < 0.6) {
        return `${num >= 1 ? wholeStr + ' and' : ""} a half`;
    }
    if (floatPart < 0.8) {
        return `more than ${num >= 1 ? wholeStr + ' and' : ""} a half`;
    }
    return `almost ${memo.tools.intToStr(wholePart + 1)}`;
}    

memo.tools.capitalize = (str) => {
    // FIXME: this should not lowercase content in strings
    if (!str || typeof str !== "string") return "";

    return str.charAt(0).toUpperCase() + str.slice(1) /*.toLowerCase()*/ + ".";
};

memo.tools.rangeToList = (range) => {
    // Use the step from the range if available, otherwise calculate it
    let step = range.step ? range.step.value : (range.end.value < range.start.value ? -1 : 1);
    
    // Calculate the number of steps needed
    const diff = range.end.value - range.start.value;
    const length = Math.floor(Math.abs(diff) / Math.abs(step)) + 1;
    
    return { type: "List", exp: Array.from({length: length}, (_, i) => ({type: "IntLiteral", value: range.start.value + i * step})) };
}

// Check if a node or its children contain any string literals
memo.tools.containsString = (node) => {
    if (!node) return false;

    if (node.type === "StringLiteral" || node.type === "CharLiteral") {
        return true;
    }

    if (node.type === "List" && Array.isArray(node.exp)) {
        return node.exp.some(elem => memo.tools.containsString(elem));
    }

    return false;
}

// Stringify list contents by extracting values (for lists containing strings)
// numbersToWords: if true, convert numbers to words (for print output)
memo.tools.stringifyList = (node) => {
    if (!node) return "";

    switch(node.type) {
            case "NothingLiteral":
                return "Nothing";
            case "IntLiteral":
                return memo.tools.intToStr(node.value);
            case "FloatLiteral":
                return memo.tools.floatToStr(node.value);
            case "CharLiteral":
                return node.value;
            case "StringLiteral":
                return node.value;
            case "List":
                if (Array.isArray(node.exp)) {
                    // Empty list should return "Nothing"
                    if (node.exp.length === 0) {
                        return "Nothing";
                    }
                    return node.exp.map(elem => memo.tools.stringifyList(elem)).join("");
                }
                return "Nothing";
            default:
                return "";
    }
}

memo.tools.expToStr = (node, isHtml) => {
    // node: the AST node (an exp)
    // isHtml: whether to format the output for HTML (color code)
    switch(node.type) {
        case "Additive":
            if (node.operator == "+")
                return `(${memo.tools.expToStr(node.left, isHtml)} plus ${memo.tools.expToStr(node.right, isHtml)})`;
            if (node.operator == "-")
                return `(${memo.tools.expToStr(node.left, isHtml)} minus ${memo.tools.expToStr(node.right, isHtml)})`;
            break;
        case "Multiplicative":
            if (node.operator == "*")
                return `(${memo.tools.expToStr(node.left, isHtml)} times ${memo.tools.expToStr(node.right, isHtml)})`;
            if (node.operator == "/")
                return `(${memo.tools.expToStr(node.left, isHtml)} divided by ${memo.tools.expToStr(node.right, isHtml)})`;
            if (node.operator == "%")
                return `(${memo.tools.expToStr(node.left, isHtml)} modulo ${memo.tools.expToStr(node.right, isHtml)})`;
            break;
        case "NothingLiteral":
            return "Nothing";
        case "IntLiteral":
            return memo.tools.intToStr(node.value);
        case "FloatLiteral":
                return memo.tools.floatToStr(node.value);
        case "CharLiteral":
            return `'${node.value}'`;
        case "StringLiteral":
            return `"${node.value}"`;
        case "VariableName":
            if (isHtml) {
                return `<span class="vrbl">${node.name["varname"]}</span>`
            }
            return node.name["varname"];
        case "Comparison":
            if (node.operator == "==")
                return `(${memo.tools.expToStr(node.left, isHtml)} equals ${memo.tools.expToStr(node.right, isHtml)})`;
            if (node.operator == "!=")
                return `(${memo.tools.expToStr(node.left, isHtml)} is not equal to ${memo.tools.expToStr(node.right, isHtml)})`;
            if (node.operator == ">")
                return `(${memo.tools.expToStr(node.left, isHtml)} is greater than ${memo.tools.expToStr(node.right, isHtml)})`;
            if (node.operator == ">=")
                return `(${memo.tools.expToStr(node.left, isHtml)} is greater than or equal to ${memo.tools.expToStr(node.right, isHtml)})`;
            if (node.operator == "<")
                return `(${memo.tools.expToStr(node.left, isHtml)} is less than ${memo.tools.expToStr(node.right, isHtml)})`;
            if (node.operator == "<=")
                return `(${memo.tools.expToStr(node.left, isHtml)} is less than or equal to ${memo.tools.expToStr(node.right, isHtml)})`;
        case "Conditional":
            let toret = `if ${memo.tools.expToStr(node.comp, isHtml)} then ${memo.tools.expToStr(node.exp, isHtml)}`;
            if (node.else_cond) {
                node.else_cond.forEach((cond) => {
                    toret += ` else if ${memo.tools.expToStr(cond.comp, isHtml)} then ${memo.tools.expToStr(cond.exp, isHtml)}`;
                });
            }
            if (node.f_else) {
                toret += ` else ${memo.tools.expToStr(node.f_else, isHtml)}`;
            }
            return toret;
        case "List":
            let gt = ">";
            let lt = "<";
            if (isHtml) {
                gt = "&gt;";
                lt = "&lt;";
            }
            let retval = `${lt}${node.exp.map((elem) => memo.tools.expToStr(elem, isHtml)).join(", ")}${gt}`;
            return retval;
        case "Range":
            // only if NOT currState
            return `from ${memo.tools.expToStr(node.start, isHtml)} to ${memo.tools.expToStr(node.end, isHtml)}`;
        case "VariableWithParam":
            let paramStr = "";
            if (node.param.type === "Variable") {
                paramStr = node.param.varname;
            } else {
                paramStr = memo.tools.expToStr(node.param, isHtml);
            }
            let funcName = node.name.varname;
            if (isHtml) {
                funcName = `<span class="vrbl">${funcName}</span>`;
            }
            return `${funcName} with ${paramStr}`;
        case "Lambda":
            return "lambda";
        case "Reduce":
            // Format: "the sum of expression"
            return `the ${node.operator} of ${memo.tools.expToStr(node.exp, isHtml)}`;
        case "FilteredExpression":
            // Build the filter condition string
            let filterStr = "";
            if (node.filter) {
                filterStr = memo.tools.expToStr(node.filter, isHtml);
            }

            // Format: "expression where condition" or "expression when condition"
            return `${memo.tools.expToStr(node.exp, isHtml)} where ${filterStr}`;
        case "ForLoop":
            let rangeStr = "";
            if (node.range) {
                if (node.range.type === "Range") {
                    rangeStr = memo.tools.expToStr(node.range, isHtml);
                } else if (node.range.type === "VariableName") {
                    rangeStr = memo.tools.expToStr(node.range, isHtml);
                } else if (node.range.type === "VariableWithParam") {
                    rangeStr = memo.tools.expToStr(node.range, isHtml);
                } else {
                    // Range with start and end
                    rangeStr = `${memo.tools.expToStr(node.range.start, isHtml)} to ${memo.tools.expToStr(node.range.end, isHtml)}`;
                }
            }
            let stepStr = "";
            if (node.rangeStep || (node.range && node.range.step)) {
                const step = node.rangeStep || node.range.step;
                // Don't show default step of 1 or -1
                if (!(step.type === "IntLiteral" && (step.value === 1 || step.value === -1))) {
                    stepStr = ` step ${memo.tools.expToStr(step, isHtml)}`;
                }
            }
            // Use iteratorVar if available (for stored variables), otherwise varname
            const iterVarName = node.iteratorVar || node.varname;
            const iterVar = isHtml ? `<span class="vrbl">${iterVarName}</span>` : iterVarName;
            return `for ${iterVar} in ${rangeStr}${stepStr}, ${memo.tools.expToStr(node.exp, isHtml)}`;
        default:
            return "";
    }
}
