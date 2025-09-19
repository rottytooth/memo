memo.tools = {
// String utils for the []memo language
// How to describe data in plain English
}

memo.tools.intToStr = (num) => {
    // FIXME: what happens over a billion?
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


memo.tools.expToStr = (node, isHtml) => {
    // node: the AST node (an exp)
    // isHtml: whether to format the output for HTML (color code)
    switch(node.type) {
        case "Additive":
            if (node.operator == "+")
                return `(${memo.tools.expToStr(node.left, isHtml)} plus ${memo.tools.expToStr(node.right, isHtml)})`;
            if (node.operator == "-")
                return `(${memo.tools.expToStr(node.left, isHtml)} minus ${memo.tools.expToStr(node.right, isHtml)})`;
        case "Multiplicative":
            if (node.operator == "*")
                return `(${memo.tools.expToStr(node.left, isHtml)} times ${memo.tools.expToStr(node.right, isHtml)})`;
            if (node.operator == "/")
                return `(${memo.tools.expToStr(node.left, isHtml)} divided by ${memo.tools.expToStr(node.right, isHtml)})`; 
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
        case "Range":
            return `from ${memo.tools.expToStr(node.start, isHtml)} to ${memo.tools.expToStr(node.end, isHtml)}`;
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
        case "Lambda":
        default:
            return "";
    }
}
