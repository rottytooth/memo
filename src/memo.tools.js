memo.tools = {}

memo.tools.int_to_str = (num) => {
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
                    groupWord += tens[Math.floor(group / 10)] + " ";
                }
                if (group % 10 > 0) {
                    groupWord += ones[group % 10] + " ";
                }
            }

            word = groupWord + thousands[groupIndex] + " " + word;
        }

        groupIndex++;
    }

    return word.trim();
}

memo.tools.float_to_str = (num) => {
    const wholePart = parseInt(String(num).split('.')[0]);
    const decimalPart = String(num).split('.')[1];
    const floatPart = decimalPart ? parseFloat('0.' + decimalPart) : 0;
    const whole_str = memo.tools.int_to_str(wholePart);

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
    return `almost ${memo.tools.int_to_str(wholePart + 1)}`;
}

memo.tools.exp_to_str = (node, is_html) => {
    switch(node.type) {
        case "Additive":
            if (node.operator == "+")
                return `(${memo.tools.exp_to_str(node.left, is_html)} plus ${memo.tools.exp_to_str(node.right, is_html)})`;
            if (node.operator == "-")
                return `(${memo.tools.exp_to_str(node.left, is_html)} minus ${memo.tools.exp_to_str(node.right, is_html)})`;
        case "Multiplicative":
            if (node.operator == "*")
                return `(${memo.tools.exp_to_str(node.left, is_html)} times ${memo.tools.exp_to_str(node.right, is_html)})`;
            if (node.operator == "/")
                return `(${memo.tools.exp_to_str(node.left, is_html)} divided by ${memo.tools.exp_to_str(node.right, is_html)})`; 
        case "IntLiteral":
            return memo.tools.int_to_str(node.value);
        case "FloatLiteral":
                return memo.tools.float_to_str(node.value);
        case "CharLiteral":
            return `'${node.value}'`;
        case "StringLiteral":
            return `"${node.value}'`;
        case "VariableName":
            if (is_html) {
                return `<span class="vrbl">${node.name["varname"]}</span>`
            }
            return node.name["varname"];
        default:
            return "";
    }
}

memo.tools.format_var_str = (varname, is_html) => {
    switch(memo.varlist[varname].type) {
        case "IntLiteral":
            return memo.tools.int_to_str(memo.varlist[varname].value);
        case "FloatLiteral":
            return memo.tools.float_to_str(memo.varlist[varname].value);
        case "StringLiteral":
            return `"${memo.varlist[varname].value}"`;
        case "CharLiteral":
            return `'${memo.varlist[varname].value}'`;
        case "List":
            return `({${memo.varlist[varname].items.join(", ")}})`;
        case "Lambda":
        default:
            return memo.tools.exp_to_str(memo.varlist[varname], is_html);
    }
}