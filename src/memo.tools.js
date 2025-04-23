memo.tools = {}

memo.tools.num_to_str = (num) => {
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

memo.tools.lambda_to_str = (node) => {
    switch(node.type) {
        case "Additive":
            if (node.operator == "+")
                return `(${memo.tools.lambda_to_str(node.left)} plus ${memo.tools.lambda_to_str(node.right)})`;
            if (node.operator == "-")
                return `(${memo.tools.lambda_to_str(node.left)} minus ${memo.tools.lambda_to_str(node.right)})`;
        case "Multiplicative":
            if (node.operator == "*")
                return `(${memo.tools.lambda_to_str(node.left)} times ${memo.tools.lambda_to_str(node.right)})`;
            if (node.operator == "/")
                return `(${memo.tools.lambda_to_str(node.left)} divided by ${memo.tools.lambda_to_str(node.right)})`; 
        case "IntLiteral":
            return memo.tools.num_to_str(node.value);
        case "CharLiteral":
            return `'${node.value}'`;
        case "StringLiteral":
            return `"${node.value}'`;
        case "VariableName":
            return node.name["varname"];
        default:
            return "";
    }
}