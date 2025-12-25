memo = {};
memo.moreText = ""; // Stores remaining text for "more" command

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
                    return node.exp.map(elem => memo.tools.stringifyList(elem)).join("");
                }
                return "";
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

memo.preprocess = function(input) {
    // Preserve string literals - we don't want to modify them
    const stringLiterals = [];
    let processed = input.replace(/(["'"])[^"']*\1/g, (match) => {
        stringLiterals.push(match);
        return `__STRING_${stringLiterals.length - 1}__`;
    });

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    // Handle forget/clear variants - both now require a variable name
    // "forget x" -> "clear x"
    processed = processed.replace(/\bforget\b/gi, 'clear');

    // Handle "x is value" assignment syntax -> "remember x as value"
    // Match: identifier followed by "is" followed by value/expression
    // But not when "is" is part of "what is" or comparison operators
    // And not when "is" appears after "if", "then", or "else" (inside conditionals)
    processed = processed.replace(
        /\b(?!what\s+)(?<!if\s)(?<!then\s)(?<!else\s)([a-zA-Z_][a-zA-Z0-9_]*)\s+is\s+(?!equal|greater|less|than|not|more|fewer|the\s+same|different)(.+)/gi,
        'remember $1 as $2'
    );

    // Handle specific assignment syntax variations
    // "let x be value" -> "remember x as value"
    processed = processed.replace(
        /\blet\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+be\s+(.+)/gi,
        'remember $1 as $2'
    );
    
    // "set x to be value" -> "remember x as value"
    processed = processed.replace(
        /\bset\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+to\s+be\s+(.+)/gi,
        'remember $1 as $2'
    );
    
    // "set x to value" -> "remember x as value"
    processed = processed.replace(
        /\bset\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+to\s+(.+)/gi,
        'remember $1 as $2'
    );

    // Command synonyms - normalize to canonical forms
    const commandSynonyms = {
        // Remember/Understand variants
        // Note: 'let' and 'set' are handled above with specific syntax rules
        'define': 'remember',
        'make': 'remember',
        'create': 'remember',
        'assign': 'remember',
        'store': 'remember',
        'save': 'remember',
        'keep': 'remember',
        
        // Tell me variants
        'show me': 'tell me',
        'display': 'tell me',
        'print': 'tell me',
        'output': 'tell me',
        'what is': 'tell me about',
        'what\'s': 'tell me about',
        'give me': 'tell me',
    };

    // Apply command synonyms (case-insensitive)
    for (const [variant, canonical] of Object.entries(commandSynonyms)) {
        const regex = new RegExp(`\\b${variant}\\b`, 'gi');
        processed = processed.replace(regex, canonical);
    }

    // Context-aware parameter handling
    // For DEFINITION context: "Remember x [VARIANT] p as ..."
    // Replace variants with "with" before "as"
    const definitionParamVariants = {
        'taking': 'with',
        'using': 'with',
        'accepting': 'with',
        'given': 'with',
        'receiving': 'with',
        'having': 'with',
    };

    for (const [variant, canonical] of Object.entries(definitionParamVariants)) {
        // Match: (remember/understand/recognize) identifier variant identifier(s) as
        const regex = new RegExp(
            `((?:remember|understand|recognize)\\s+[a-zA-Z_][a-zA-Z0-9_]*)\\s+${variant}\\s+([^\\s]+(?:\\s+and\\s+[^\\s]+)*)\\s+as`,
            'gi'
        );
        processed = processed.replace(regex, `$1 ${canonical} $2 as`);
    }

    // For EXPRESSION/CALL context: "identifier [VARIANT] parameter"
    // Add variations that resolve to "with" in expression context
    const callParamVariants = {
        'given': 'with',
        'of': 'with',
        'applied to': 'with',
        'on': 'with',
    };

    for (const [variant, canonical] of Object.entries(callParamVariants)) {
        // Match: identifier variant identifier (but NOT before "as")
        // Use negative lookahead to avoid matching definition context
        const regex = new RegExp(
            `\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s+${variant}\\s+([a-zA-Z_][a-zA-Z0-9_]*)(?!\\s+as)`,
            'gi'
        );
        processed = processed.replace(regex, `$1 ${canonical} $2`);
    }

    // Special handling for "for" - only convert to "with" when NOT followed by "in"
    // This preserves "for x in range" for for-loops while converting "Next for x" to "Next with x"
    // Also preserve "as for x in" pattern (for loop definitions)
    processed = processed.replace(
        /\b(?!as\s)([a-zA-Z_][a-zA-Z0-9_]*)\s+for\s+([a-zA-Z_][a-zA-Z0-9_]*)(?!\s+(?:in|as))/gi,
        '$1 with $2'
    );

    // Function-call style notation: identifier(param) -> identifier with param
    // Only in expression context (not in definitions)
    processed = processed.replace(
        /\b([a-zA-Z_][a-zA-Z0-9_]*)\(([a-zA-Z_][a-zA-Z0-9_]*)\)(?!\s+as)/g,
        '$1 with $2'
    );

    // Convert commas before "else" or "else if" to semicolons
    // This allows natural comma usage while avoiding list ambiguity in the parser
    processed = processed.replace(/,(\s+else\s+if\b)/gi, ';$1');
    processed = processed.replace(/,(\s+else\b)/gi, ';$1');

    // Operator synonyms
    // Handle "subtracted from" which flips operand order
    // "ten subtracted from five" means "five minus ten"
    processed = processed.replace(/\b(\w+)\s+subtracted\s+from\s+(\w+)/gi, '$2 minus $1');

    const operatorSynonyms = {
        // Addition
        'add': 'plus',
        'added to': 'plus',
        'adding': 'plus',
        'sum of': 'sum',
        'total of': 'sum',
        'combined with': 'plus',
        
        // Subtraction
        'subtract': 'minus',
        // 'subtracted from' is handled above with operand flipping
        'subtracting': 'minus',
        'take away': 'minus',
        
        // Multiplication
        'multiply': 'times',
        'multiplied by': 'times',
        'mult': 'times',
        'product of': 'product',
        
        // Division
        'divide': 'divided by',
        'div': 'divided by',
        'over': 'divided by',
        'quotient of': 'quotient',
        
        // Modulo
        'mod': 'modulo',
        'remainder': 'modulo',
        'remainder of': 'modulus',
    };

    for (const [variant, canonical] of Object.entries(operatorSynonyms)) {
        const regex = new RegExp(`\\b${variant}\\b`, 'gi');
        processed = processed.replace(regex, canonical);
    }

    // Handle "to be" constructions -> "as" (only in definition context)
    processed = processed.replace(/\b(remember|understand|recognize)\b([^.!]*?)\bto be\b/gi, '$1$2as');
    
    // Remove common filler words that don't affect meaning
    const fillerWords = [
        'please',
        'the value of',
    ];
    
    for (const filler of fillerWords) {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        processed = processed.replace(regex, '');
    }

    // Replace "by" with "step" in for-loop context
    processed = processed.replace(/\b(for\s+\w+\s+in\s+[^,]+)\s+by\s+/gi, '$1 step ');

    // Normalize "one million/thousand/hundred/billion" to "a million/thousand/hundred/billion"
    // This makes number parsing consistent
    processed = processed.replace(/\bone\s+(million|thousand|hundred|billion)\b/gi, 'a $1');

    // Normalize multiple spaces back to single space
    processed = processed.replace(/\s+/g, ' ').trim();

    // Restore string literals
    stringLiterals.forEach((literal, index) => {
        processed = processed.replace(`__STRING_${index}__`, literal);
    });

    return processed;
};


// @generated by Peggy 4.2.0.
//
// https://peggyjs.org/
(function(root) {
  "use strict";

function peg$subclass(child, parent) {
  function C() { this.constructor = child; }
  C.prototype = parent.prototype;
  child.prototype = new C();
}

function peg$SyntaxError(message, expected, found, location) {
  var self = Error.call(this, message);
  // istanbul ignore next Check is a necessary evil to support older environments
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(self, peg$SyntaxError.prototype);
  }
  self.expected = expected;
  self.found = found;
  self.location = location;
  self.name = "SyntaxError";
  return self;
}

peg$subclass(peg$SyntaxError, Error);

function peg$padEnd(str, targetLength, padString) {
  padString = padString || " ";
  if (str.length > targetLength) { return str; }
  targetLength -= str.length;
  padString += padString.repeat(targetLength);
  return str + padString.slice(0, targetLength);
}

peg$SyntaxError.prototype.format = function(sources) {
  var str = "Error: " + this.message;
  if (this.location) {
    var src = null;
    var k;
    for (k = 0; k < sources.length; k++) {
      if (sources[k].source === this.location.source) {
        src = sources[k].text.split(/\r\n|\n|\r/g);
        break;
      }
    }
    var s = this.location.start;
    var offset_s = (this.location.source && (typeof this.location.source.offset === "function"))
      ? this.location.source.offset(s)
      : s;
    var loc = this.location.source + ":" + offset_s.line + ":" + offset_s.column;
    if (src) {
      var e = this.location.end;
      var filler = peg$padEnd("", offset_s.line.toString().length, ' ');
      var line = src[s.line - 1];
      var last = s.line === e.line ? e.column : line.length + 1;
      var hatLen = (last - s.column) || 1;
      str += "\n --> " + loc + "\n"
          + filler + " |\n"
          + offset_s.line + " | " + line + "\n"
          + filler + " | " + peg$padEnd("", s.column - 1, ' ')
          + peg$padEnd("", hatLen, "^");
    } else {
      str += "\n at " + loc;
    }
  }
  return str;
};

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
    literal: function(expectation) {
      return "\"" + literalEscape(expectation.text) + "\"";
    },

    class: function(expectation) {
      var escapedParts = expectation.parts.map(function(part) {
        return Array.isArray(part)
          ? classEscape(part[0]) + "-" + classEscape(part[1])
          : classEscape(part);
      });

      return "[" + (expectation.inverted ? "^" : "") + escapedParts.join("") + "]";
    },

    any: function() {
      return "any character";
    },

    end: function() {
      return "end of input";
    },

    other: function(expectation) {
      return expectation.description;
    }
  };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/"/g,  "\\\"")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, "\\\\")
      .replace(/\]/g, "\\]")
      .replace(/\^/g, "\\^")
      .replace(/-/g,  "\\-")
      .replace(/\0/g, "\\0")
      .replace(/\t/g, "\\t")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x0F]/g,          function(ch) { return "\\x0" + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return "\\x"  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = expected.map(describeExpectation);
    var i, j;

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== undefined ? options : {};

  var peg$FAILED = {};
  var peg$source = options.grammarSource;

  var peg$startRuleFunctions = { Command: peg$parseCommand };
  var peg$startRuleFunction = peg$parseCommand;

  var peg$c0 = ".";
  var peg$c1 = "lear";
  var peg$c2 = "orget";
  var peg$c3 = "emember";
  var peg$c4 = "nderstand";
  var peg$c5 = ",";
  var peg$c6 = "and";
  var peg$c7 = "ecognize";
  var peg$c8 = "with";
  var peg$c9 = "as";
  var peg$c10 = "nt";
  var peg$c11 = "eger";
  var peg$c12 = "loat";
  var peg$c13 = "tring";
  var peg$c14 = "rray";
  var peg$c15 = "har";
  var peg$c16 = "acter";
  var peg$c17 = "ell me";
  var peg$c18 = "about";
  var peg$c19 = "from";
  var peg$c20 = "to";
  var peg$c21 = "the";
  var peg$c22 = "range";
  var peg$c23 = "count";
  var peg$c24 = "remember";
  var peg$c25 = "million";
  var peg$c26 = "thousand";
  var peg$c27 = "hundred";
  var peg$c28 = "billion";
  var peg$c29 = "negative";
  var peg$c30 = "lambda";
  var peg$c31 = ", and";
  var peg$c32 = "if";
  var peg$c33 = "then";
  var peg$c34 = ";";
  var peg$c35 = "else";
  var peg$c36 = "for";
  var peg$c37 = "in";
  var peg$c38 = "step";
  var peg$c39 = "a";
  var peg$c40 = "is equal to";
  var peg$c41 = "is the same as";
  var peg$c42 = "equals";
  var peg$c43 = "is";
  var peg$c44 = "is not equal to";
  var peg$c45 = "is different from";
  var peg$c46 = "is not";
  var peg$c47 = "is greater than";
  var peg$c48 = "is more than";
  var peg$c49 = "is less than";
  var peg$c50 = "is fewer than";
  var peg$c51 = "is less";
  var peg$c52 = "than";
  var peg$c53 = "or equal to";
  var peg$c54 = "or the same as";
  var peg$c55 = "is greater";
  var peg$c56 = "is more";
  var peg$c57 = "he";
  var peg$c58 = "of";
  var peg$c59 = "plus";
  var peg$c60 = "sum";
  var peg$c61 = "minus";
  var peg$c62 = "difference";
  var peg$c63 = "times";
  var peg$c64 = "product";
  var peg$c65 = "divided by";
  var peg$c66 = "quotient";
  var peg$c67 = "modulo";
  var peg$c68 = "modulus";
  var peg$c69 = "string";
  var peg$c70 = "float";
  var peg$c71 = "int";
  var peg$c72 = "integer";
  var peg$c73 = "number";
  var peg$c74 = "boolean";
  var peg$c75 = "bool";
  var peg$c76 = "'s";
  var peg$c77 = "variable";
  var peg$c78 = "var";
  var peg$c79 = "vessel";
  var peg$c80 = "-";
  var peg$c81 = "illion";
  var peg$c82 = "housand";
  var peg$c83 = "undred";
  var peg$c84 = "ten";
  var peg$c85 = "twenty";
  var peg$c86 = "thirty";
  var peg$c87 = "forty";
  var peg$c88 = "fifty";
  var peg$c89 = "sixty";
  var peg$c90 = "seventy";
  var peg$c91 = "eighty";
  var peg$c92 = "ninety";
  var peg$c93 = "zero";
  var peg$c94 = "one";
  var peg$c95 = "two";
  var peg$c96 = "three";
  var peg$c97 = "four";
  var peg$c98 = "five";
  var peg$c99 = "six";
  var peg$c100 = "seven";
  var peg$c101 = "eight";
  var peg$c102 = "nine";
  var peg$c103 = "eleven";
  var peg$c104 = "twelve";
  var peg$c105 = "dozen";
  var peg$c106 = "thirteen";
  var peg$c107 = "fourteen";
  var peg$c108 = "fifteen";
  var peg$c109 = "sixteen";
  var peg$c110 = "seventeen";
  var peg$c111 = "eighteen";
  var peg$c112 = "nineteen";
  var peg$c113 = " and";
  var peg$c114 = "'";

  var peg$r0 = /^[Cc]/;
  var peg$r1 = /^[Ff]/;
  var peg$r2 = /^[Rr]/;
  var peg$r3 = /^[Uu]/;
  var peg$r4 = /^[Ii]/;
  var peg$r5 = /^[Ss]/;
  var peg$r6 = /^[Aa]/;
  var peg$r7 = /^[Tt]/;
  var peg$r8 = /^[a-zA-Z0-9_]/;
  var peg$r9 = /^[a-zA-Z\xE4\xF6\xFC\xDF\xC4\xD6\xDC_]/;
  var peg$r10 = /^[a-z0-9A-Z\xE4\xF6\xFC\xDF\xC4\xD6\xDC_]/;
  var peg$r11 = /^[,:]/;
  var peg$r12 = /^[Mm]/;
  var peg$r13 = /^[Hh]/;
  var peg$r14 = /^["\u201C]/;
  var peg$r15 = /^[^"]/;
  var peg$r16 = /^["\u201D]/;
  var peg$r17 = /^[^']/;
  var peg$r18 = /^[ \r\n\t]/;
  var peg$r19 = /^[\r\n]/;

  var peg$e0 = peg$literalExpectation(".", false);
  var peg$e1 = peg$classExpectation(["C", "c"], false, false);
  var peg$e2 = peg$literalExpectation("lear", false);
  var peg$e3 = peg$classExpectation(["F", "f"], false, false);
  var peg$e4 = peg$literalExpectation("orget", false);
  var peg$e5 = peg$classExpectation(["R", "r"], false, false);
  var peg$e6 = peg$literalExpectation("emember", false);
  var peg$e7 = peg$classExpectation(["U", "u"], false, false);
  var peg$e8 = peg$literalExpectation("nderstand", false);
  var peg$e9 = peg$literalExpectation(",", false);
  var peg$e10 = peg$literalExpectation("and", false);
  var peg$e11 = peg$literalExpectation("ecognize", false);
  var peg$e12 = peg$literalExpectation("with", false);
  var peg$e13 = peg$literalExpectation("as", false);
  var peg$e14 = peg$classExpectation(["I", "i"], false, false);
  var peg$e15 = peg$literalExpectation("nt", false);
  var peg$e16 = peg$literalExpectation("eger", false);
  var peg$e17 = peg$literalExpectation("loat", false);
  var peg$e18 = peg$classExpectation(["S", "s"], false, false);
  var peg$e19 = peg$literalExpectation("tring", false);
  var peg$e20 = peg$classExpectation(["A", "a"], false, false);
  var peg$e21 = peg$literalExpectation("rray", false);
  var peg$e22 = peg$literalExpectation("har", false);
  var peg$e23 = peg$literalExpectation("acter", false);
  var peg$e24 = peg$anyExpectation();
  var peg$e25 = peg$classExpectation(["T", "t"], false, false);
  var peg$e26 = peg$literalExpectation("ell me", false);
  var peg$e27 = peg$literalExpectation("about", false);
  var peg$e28 = peg$literalExpectation("from", false);
  var peg$e29 = peg$literalExpectation("to", false);
  var peg$e30 = peg$literalExpectation("the", false);
  var peg$e31 = peg$literalExpectation("range", false);
  var peg$e32 = peg$literalExpectation("count", false);
  var peg$e33 = peg$classExpectation([["a", "z"], ["A", "Z"], ["0", "9"], "_"], false, false);
  var peg$e34 = peg$literalExpectation("remember", false);
  var peg$e35 = peg$literalExpectation("million", false);
  var peg$e36 = peg$literalExpectation("thousand", false);
  var peg$e37 = peg$literalExpectation("hundred", false);
  var peg$e38 = peg$literalExpectation("billion", false);
  var peg$e39 = peg$literalExpectation("negative", false);
  var peg$e40 = peg$classExpectation([["a", "z"], ["A", "Z"], "\xE4", "\xF6", "\xFC", "\xDF", "\xC4", "\xD6", "\xDC", "_"], false, false);
  var peg$e41 = peg$classExpectation([["a", "z"], ["0", "9"], ["A", "Z"], "\xE4", "\xF6", "\xFC", "\xDF", "\xC4", "\xD6", "\xDC", "_"], false, false);
  var peg$e42 = peg$literalExpectation("lambda", false);
  var peg$e43 = peg$literalExpectation(", and", false);
  var peg$e44 = peg$literalExpectation("if", false);
  var peg$e45 = peg$literalExpectation("then", false);
  var peg$e46 = peg$literalExpectation(";", false);
  var peg$e47 = peg$literalExpectation("else", false);
  var peg$e48 = peg$literalExpectation("for", false);
  var peg$e49 = peg$literalExpectation("in", false);
  var peg$e50 = peg$literalExpectation("step", false);
  var peg$e51 = peg$classExpectation([",", ":"], false, false);
  var peg$e52 = peg$literalExpectation("a", false);
  var peg$e53 = peg$literalExpectation("is equal to", false);
  var peg$e54 = peg$literalExpectation("is the same as", false);
  var peg$e55 = peg$literalExpectation("equals", false);
  var peg$e56 = peg$literalExpectation("is", false);
  var peg$e57 = peg$literalExpectation("is not equal to", false);
  var peg$e58 = peg$literalExpectation("is different from", false);
  var peg$e59 = peg$literalExpectation("is not", false);
  var peg$e60 = peg$literalExpectation("is greater than", false);
  var peg$e61 = peg$literalExpectation("is more than", false);
  var peg$e62 = peg$literalExpectation("is less than", false);
  var peg$e63 = peg$literalExpectation("is fewer than", false);
  var peg$e64 = peg$literalExpectation("is less", false);
  var peg$e65 = peg$literalExpectation("than", false);
  var peg$e66 = peg$literalExpectation("or equal to", false);
  var peg$e67 = peg$literalExpectation("or the same as", false);
  var peg$e68 = peg$literalExpectation("is greater", false);
  var peg$e69 = peg$literalExpectation("is more", false);
  var peg$e70 = peg$literalExpectation("he", false);
  var peg$e71 = peg$literalExpectation("of", false);
  var peg$e72 = peg$literalExpectation("plus", false);
  var peg$e73 = peg$literalExpectation("sum", false);
  var peg$e74 = peg$literalExpectation("minus", false);
  var peg$e75 = peg$literalExpectation("difference", false);
  var peg$e76 = peg$literalExpectation("times", false);
  var peg$e77 = peg$literalExpectation("product", false);
  var peg$e78 = peg$literalExpectation("divided by", false);
  var peg$e79 = peg$literalExpectation("quotient", false);
  var peg$e80 = peg$literalExpectation("modulo", false);
  var peg$e81 = peg$literalExpectation("modulus", false);
  var peg$e82 = peg$literalExpectation("string", false);
  var peg$e83 = peg$literalExpectation("float", false);
  var peg$e84 = peg$literalExpectation("int", false);
  var peg$e85 = peg$literalExpectation("integer", false);
  var peg$e86 = peg$literalExpectation("number", false);
  var peg$e87 = peg$literalExpectation("boolean", false);
  var peg$e88 = peg$literalExpectation("bool", false);
  var peg$e89 = peg$literalExpectation("'s", false);
  var peg$e90 = peg$literalExpectation("variable", false);
  var peg$e91 = peg$literalExpectation("var", false);
  var peg$e92 = peg$literalExpectation("vessel", false);
  var peg$e93 = peg$literalExpectation("-", false);
  var peg$e94 = peg$classExpectation(["M", "m"], false, false);
  var peg$e95 = peg$literalExpectation("illion", false);
  var peg$e96 = peg$literalExpectation("housand", false);
  var peg$e97 = peg$classExpectation(["H", "h"], false, false);
  var peg$e98 = peg$literalExpectation("undred", false);
  var peg$e99 = peg$literalExpectation("ten", false);
  var peg$e100 = peg$literalExpectation("twenty", false);
  var peg$e101 = peg$literalExpectation("thirty", false);
  var peg$e102 = peg$literalExpectation("forty", false);
  var peg$e103 = peg$literalExpectation("fifty", false);
  var peg$e104 = peg$literalExpectation("sixty", false);
  var peg$e105 = peg$literalExpectation("seventy", false);
  var peg$e106 = peg$literalExpectation("eighty", false);
  var peg$e107 = peg$literalExpectation("ninety", false);
  var peg$e108 = peg$literalExpectation("zero", false);
  var peg$e109 = peg$literalExpectation("one", false);
  var peg$e110 = peg$literalExpectation("two", false);
  var peg$e111 = peg$literalExpectation("three", false);
  var peg$e112 = peg$literalExpectation("four", false);
  var peg$e113 = peg$literalExpectation("five", false);
  var peg$e114 = peg$literalExpectation("six", false);
  var peg$e115 = peg$literalExpectation("seven", false);
  var peg$e116 = peg$literalExpectation("eight", false);
  var peg$e117 = peg$literalExpectation("nine", false);
  var peg$e118 = peg$literalExpectation("eleven", false);
  var peg$e119 = peg$literalExpectation("twelve", false);
  var peg$e120 = peg$literalExpectation("dozen", false);
  var peg$e121 = peg$literalExpectation("thirteen", false);
  var peg$e122 = peg$literalExpectation("fourteen", false);
  var peg$e123 = peg$literalExpectation("fifteen", false);
  var peg$e124 = peg$literalExpectation("sixteen", false);
  var peg$e125 = peg$literalExpectation("seventeen", false);
  var peg$e126 = peg$literalExpectation("eighteen", false);
  var peg$e127 = peg$literalExpectation("nineteen", false);
  var peg$e128 = peg$literalExpectation(" and", false);
  var peg$e129 = peg$classExpectation(["\"", "\u201C"], false, false);
  var peg$e130 = peg$classExpectation(["\""], true, false);
  var peg$e131 = peg$classExpectation(["\"", "\u201D"], false, false);
  var peg$e132 = peg$literalExpectation("'", false);
  var peg$e133 = peg$classExpectation(["'"], true, false);
  var peg$e134 = peg$otherExpectation("whitespace");
  var peg$e135 = peg$classExpectation([" ", "\r", "\n", "\t"], false, false);
  var peg$e136 = peg$otherExpectation("newline");
  var peg$e137 = peg$classExpectation(["\r", "\n"], false, false);

  var peg$f0 = function(c) {
	return c;
};
  var peg$f1 = function(v) {
	return {
    	cmd: "clear",
        varname: v.varname
    };
};
  var peg$f2 = function(v) {
	return {
    	cmd: "reset",
        varname: v.varname
    };
};
  var peg$f3 = function(p) {
	return p;
};
  var peg$f4 = function(v, p, a, lbd) {
	if (!!a) {
	    p = [p].concat(a);
    }
	return {
    	cmd: "let",
        varname: v.varname,
        exp: lbd,
        params: p
    };
};
  var peg$f5 = function(v, lbd) {
	return {
    	cmd: "let",
        varname: v.varname,
        exp: lbd,
        params: []
    };
};
  var peg$f6 = function(f) {
	return f.join("").toLowerCase();
};
  var peg$f7 = function() {
	return "undetermined"
};
  var peg$f8 = function(exp) {
	return {
    	cmd: "print",
        exp: exp
    };
};
  var peg$f9 = function(v) {
	throw new MemoSyntaxError("Cannot assign a new value to a reserved name", "reserved", {"name": v["value"]});
};
  var peg$f10 = function(v) {
  throw new MemoSyntaxError("Cannot assign a new value to a reserved name", "reserved", v)
};
  var peg$f11 = function(v) {
	return {
        type: "Variable",
        varname: flattenToString(v).toLowerCase()
    };
};
  var peg$f12 = function() {
  return {
    	type: "Lambda",

      // exp: exp
    };
};
  var peg$f13 = function(exp) {
	if (Array.isArray(exp)) {
    	return {
        	type: "List",
            exp: exp
        };
    }
    return exp;
};
  var peg$f14 = function(exp, explist) {
	if (DEBUG) console.log("in Expression");
	if (explist != null) {
		explist = explist[3];
        if (DEBUG) console.log([exp].concat(explist));
		exp = [exp].concat(explist);
    }
    console.log(exp);

    return exp;
};
  var peg$f15 = function(c, e, fe) {
	if (DEBUG) console.log("in If");
	return {
		type: "Conditional",
		comp: c,
		exp: e,
		f_else: fe
	};
};
  var peg$f16 = function(e) {
	if (DEBUG) console.log("in Else");
    return e;
};
  var peg$f17 = function(id, s, end, step, e) {
	if (DEBUG) console.log("in For with number..to..number..step");
	// Evaluate step if it's an additive expression like "zero minus two"
	let stepValue = step;
	if (step.type === "Additive" && step.operator === "-") {
		if (step.left.type === "IntLiteral" && step.right.type === "IntLiteral") {
			stepValue = {type: "IntLiteral", value: step.left.value - step.right.value};
		}
	}
	// Validate step direction
	if (stepValue.type === "IntLiteral") {
		if (s.value < end.value && stepValue.value < 0) {
			throw new MemoSyntaxError("Step must be positive when counting upward", "invalid_step", {start: s.value, end: end.value, step: stepValue.value});
		}
		if (s.value > end.value && stepValue.value > 0) {
			throw new MemoSyntaxError("Step must be negative when counting downward", "invalid_step", {start: s.value, end: end.value, step: stepValue.value});
		}
	}
	return {
		type: "ForLoop",
		varname: id.varname,
		exp: e,
		range: {
			type: "Range",
			start: s,
			end: end,
			step: stepValue
		}
	};
};
  var peg$f18 = function(id, s, end, e) {
	if (DEBUG) console.log("in For with number..to..number");
	return {
		type: "ForLoop",
		varname: id.varname,
		exp: e,
		range: {
			type: "Range",
			start: s,
			end: end,
			step: (s.value > end.value) ? {type: "IntLiteral", value: -1} : {type: "IntLiteral", value: 1}
		}
	};
};
  var peg$f19 = function(id, r, step, e) {
	if (DEBUG) console.log("in For with Range and step");
	// Evaluate step if it's an additive expression like "zero minus two"
	let stepValue = step;
	if (step.type === "Additive" && step.operator === "-") {
		if (step.left.type === "IntLiteral" && step.right.type === "IntLiteral") {
			stepValue = {type: "IntLiteral", value: step.left.value - step.right.value};
		}
	}
	// Validate at parse time if all values are literals
	if (r.start.type === "IntLiteral" && r.end.type === "IntLiteral" && stepValue.type === "IntLiteral") {
		if (r.start.value < r.end.value && stepValue.value < 0) {
			throw new MemoSyntaxError("Step must be positive when counting upward", "invalid_step", {start: r.start.value, end: r.end.value, step: stepValue.value});
		}
		if (r.start.value > r.end.value && stepValue.value > 0) {
			throw new MemoSyntaxError("Step must be negative when counting downward", "invalid_step", {start: r.start.value, end: r.end.value, step: stepValue.value});
		}
	}
	r.step = stepValue;
	return {
		type: "ForLoop",
		varname: id.varname,
		exp: e,
		range: r
	};
};
  var peg$f20 = function(id, r, e) {
	if (DEBUG) console.log("in For with Range");
	return {
		type: "ForLoop",
		varname: id.varname,
		exp: e,
		range: r
	};
};
  var peg$f21 = function(id, rangeVar, step, e) {
	if (DEBUG) console.log("in For with VarWithParam and step");
	// Evaluate step if it's an additive expression like "zero minus two"
	let stepValue = step;
	if (step.type === "Additive" && step.operator === "-") {
		if (step.left.type === "IntLiteral" && step.right.type === "IntLiteral") {
			stepValue = {type: "IntLiteral", value: step.left.value - step.right.value};
		}
	}
	return {
		type: "ForLoop",
		varname: id.varname,
		exp: e,
		range: rangeVar,
		rangeStep: stepValue
	};
};
  var peg$f22 = function(id, rangeVar, e) {
	if (DEBUG) console.log("in For with VarWithParam");
	return {
		type: "ForLoop",
		varname: id.varname,
		exp: e,
		range: rangeVar
	};
};
  var peg$f23 = function(id, rangeVar, step, e) {
	if (DEBUG) console.log("in For with VariableName and step");
	// Evaluate step if it's an additive expression like "zero minus two"
	let stepValue = step;
	if (step.type === "Additive" && step.operator === "-") {
		if (step.left.type === "IntLiteral" && step.right.type === "IntLiteral") {
			stepValue = {type: "IntLiteral", value: step.left.value - step.right.value};
		}
	}
	// For VariableName, the interpreter will need to resolve this at runtime
	return {
		type: "ForLoop",
		varname: id.varname,
		exp: e,
		range: rangeVar,
		rangeStep: stepValue // Store step separately when range is a variable
	};
};
  var peg$f24 = function(id, rangeVar, e) {
	if (DEBUG) console.log("in For with VariableName");
	return {
		type: "ForLoop",
		varname: id.varname,
		exp: e,
		range: rangeVar
	};
};
  var peg$f25 = function(s, e) {
	if (DEBUG) console.log("in Range");
	// Calculate step based on whether we're counting up or down
	let stepValue = (s.value > e.value) ? -1 : 1;
	return {
		type: "Range",
		start: s,
		end: e,
		step: {type: "IntLiteral", value: stepValue}
	};
};
  var peg$f26 = function(s, e) {
	if (DEBUG) console.log("in Range (short form)");
	// Calculate step based on whether we're counting up or down
	let stepValue = (s.value > e.value) ? -1 : 1;
	return {
		type: "Range",
		start: s,
		end: e,
		step: {type: "IntLiteral", value: stepValue}
	};
};
  var peg$f27 = function(left, op, right) {
	if (DEBUG) console.log("in Comparison");
	return {
		type: "Comparison",
		operator: op,
		left: left,
		right: right
	};
};
  var peg$f28 = function() { return "=="; };
  var peg$f29 = function() { return "!="; };
  var peg$f30 = function() { return ">"; };
  var peg$f31 = function() { return "<"; };
  var peg$f32 = function() { return "<="; };
  var peg$f33 = function() { return ">="; };
  var peg$f34 = function(left, op, right) {
	if (DEBUG) console.log("in AdditiveExpression");
	return {
		type: "Additive", 
		operator: op,
		left: left,
		right: right
    };
};
  var peg$f35 = function(op, left, right) {
	if (DEBUG) console.log("in AdditiveExpression DirectObject");
	return {
		type: "Additive", 
		operator: op,
		left: left,
		right: right
    };
};
  var peg$f36 = function(left, op, right) { 
	if (DEBUG) console.log("in MultiplicativeExpression");
	return {
    	type: "Multiplicative", 
    	operator: op,
    	left: left,
    	right: right
    };
};
  var peg$f37 = function(op, left, right) { 
	if (DEBUG) console.log("in MultiplicativeExpression DirectObject");
	return {
    	type: "Multiplicative", 
    	operator: op,
    	left: left,
    	right: right
    };
};
  var peg$f38 = function() { return "+"; };
  var peg$f39 = function() { return "+"; };
  var peg$f40 = function() { return "-"; };
  var peg$f41 = function() { return "-"; };
  var peg$f42 = function() { return "*"; };
  var peg$f43 = function() { return "*"; };
  var peg$f44 = function() { return "/"; };
  var peg$f45 = function() { return "/"; };
  var peg$f46 = function() { return "%"; };
  var peg$f47 = function() { return "%"; };
  var peg$f48 = function(g, c) {
	if (!!c) {
		g.type_coerce = c;
	}
	return g;
};
  var peg$f49 = function(type) {
	return type;
};
  var peg$f50 = function(p, id) {
	if (DEBUG) console.log("in VarWithParam");
	return {
    	type: "VariableWithParam",
        name: id,
        param: p
    };
};
  var peg$f51 = function(id, p) {
	if (DEBUG) console.log("in VarWithParam");
	return {
    	type: "VariableWithParam",
        name: id,
        param: p
    };
};
  var peg$f52 = function(id) {
	if (DEBUG) console.log("in VariableName");
	return {
		type: "VariableName",
        name: id
    };
};
  var peg$f53 = function(mil, thou, hun, end) {
	if (DEBUG) console.log("in NumberLiteral Millions");
	let retval = mil;
    if (thou) retval += thou;
    if (hun) retval += hun;
    if (end) retval += end;
	return { type: "IntLiteral", value: retval };
};
  var peg$f54 = function(thou, hun, end) {
	if (DEBUG) console.log("in NumberLiteral Thousands");
	let retval = thou;
    if (hun) retval += hun;
    if (end) retval += end;
	return { type: "IntLiteral", value: retval };
};
  var peg$f55 = function(hun, end) {
	if (DEBUG) console.log("in NumberLiteral Hundreds");
	let retval = hun;
    if (end) retval += end;
	return { type: "IntLiteral", value: retval };
};
  var peg$f56 = function(neg, end) {
	if (DEBUG) console.log("in NumberLiteral EndDigit");
	return { type: "IntLiteral", value: neg ? -end : end };
};
  var peg$f57 = function() { return 1000000; };
  var peg$f58 = function(end) {
	if (DEBUG) console.log("in MillionsDigit");
	return end * 1000000;
};
  var peg$f59 = function(hun, end) {
	if (DEBUG) console.log("in ThousandsDigit");
	let retval = 0;
    if (end) retval += end;
    if (hun) retval += hun;
	return retval * 1000;
};
  var peg$f60 = function(end) {
	if (DEBUG) console.log("in EndDigit");
	return end * 1000;
};
  var peg$f61 = function() {
	return 1000;
};
  var peg$f62 = function(end) {
	return end * 100;
};
  var peg$f63 = function() {
	return 100;
};
  var peg$f64 = function(tens, ones) {
	let retval = 0;
	if (tens) retval += tens;
	if (ones) retval += ones;
	return retval;
};
  var peg$f65 = function() { return 10; };
  var peg$f66 = function() { return 20; };
  var peg$f67 = function() { return 30; };
  var peg$f68 = function() { return 40; };
  var peg$f69 = function() { return 50; };
  var peg$f70 = function() { return 60; };
  var peg$f71 = function() { return 70; };
  var peg$f72 = function() { return 80; };
  var peg$f73 = function() { return 90; };
  var peg$f74 = function() { return 0; };
  var peg$f75 = function() { return 1; };
  var peg$f76 = function() { return 2; };
  var peg$f77 = function() { return 3; };
  var peg$f78 = function() { return 4; };
  var peg$f79 = function() { return 5; };
  var peg$f80 = function() { return 6; };
  var peg$f81 = function() { return 7; };
  var peg$f82 = function() { return 8; };
  var peg$f83 = function() { return 9; };
  var peg$f84 = function() { return 0; };
  var peg$f85 = function() { return 11; };
  var peg$f86 = function() { return 12; };
  var peg$f87 = function() { return 12; };
  var peg$f88 = function() { return 13; };
  var peg$f89 = function() { return 14; };
  var peg$f90 = function() { return 15; };
  var peg$f91 = function() { return 16; };
  var peg$f92 = function() { return 17; };
  var peg$f93 = function() { return 18; };
  var peg$f94 = function() { return 19; };
  var peg$f95 = function(val) { 
	return {
		type: 'StringLiteral',
		value: val.join("") 
    };
};
  var peg$f96 = function(val) { 
	return {
		type: 'CharLiteral',
		value: val 
	};
};
  var peg$currPos = options.peg$currPos | 0;
  var peg$savedPos = peg$currPos;
  var peg$posDetailsCache = [{ line: 1, column: 1 }];
  var peg$maxFailPos = peg$currPos;
  var peg$maxFailExpected = options.peg$maxFailExpected || [];
  var peg$silentFails = options.peg$silentFails | 0;

  var peg$result;

  if (options.startRule) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function offset() {
    return peg$savedPos;
  }

  function range() {
    return {
      source: peg$source,
      start: peg$savedPos,
      end: peg$currPos
    };
  }

  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }

  function expected(description, location) {
    location = location !== undefined
      ? location
      : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location
    );
  }

  function error(message, location) {
    location = location !== undefined
      ? location
      : peg$computeLocation(peg$savedPos, peg$currPos);

    throw peg$buildSimpleError(message, location);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos];
    var p;

    if (details) {
      return details;
    } else {
      if (pos >= peg$posDetailsCache.length) {
        p = peg$posDetailsCache.length - 1;
      } else {
        p = pos;
        while (!peg$posDetailsCache[--p]) {}
      }

      details = peg$posDetailsCache[p];
      details = {
        line: details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;

      return details;
    }
  }

  function peg$computeLocation(startPos, endPos, offset) {
    var startPosDetails = peg$computePosDetails(startPos);
    var endPosDetails = peg$computePosDetails(endPos);

    var res = {
      source: peg$source,
      start: {
        offset: startPos,
        line: startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line: endPosDetails.line,
        column: endPosDetails.column
      }
    };
    if (offset && peg$source && (typeof peg$source.offset === "function")) {
      res.start = peg$source.offset(res.start);
      res.end = peg$source.offset(res.end);
    }
    return res;
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parseCommand() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parseClear();
    if (s1 === peg$FAILED) {
      s1 = peg$parsePrint();
      if (s1 === peg$FAILED) {
        s1 = peg$parseLet();
        if (s1 === peg$FAILED) {
          s1 = peg$parseReset();
        }
      }
    }
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 46) {
        s2 = peg$c0;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e0); }
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = [];
      s4 = peg$parse_();
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = peg$parse_();
      }
      peg$savedPos = s0;
      s0 = peg$f0(s1);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseClear() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = input.charAt(peg$currPos);
    if (peg$r0.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e1); }
    }
    if (s2 !== peg$FAILED) {
      if (input.substr(peg$currPos, 4) === peg$c1) {
        s3 = peg$c1;
        peg$currPos += 4;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e2); }
      }
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      s2 = input.charAt(peg$currPos);
      if (peg$r1.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e3); }
      }
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c2) {
          s3 = peg$c2;
          peg$currPos += 5;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e4); }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseIdentifier();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f1(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseReset() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = input.charAt(peg$currPos);
    if (peg$r2.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e5); }
    }
    if (s2 !== peg$FAILED) {
      if (input.substr(peg$currPos, 7) === peg$c3) {
        s3 = peg$c3;
        peg$currPos += 7;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e6); }
      }
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      s2 = input.charAt(peg$currPos);
      if (peg$r3.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e7); }
      }
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 9) === peg$c4) {
          s3 = peg$c4;
          peg$currPos += 9;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e8); }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseIdentifier();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f2(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseAdditionalParams() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 44) {
      s1 = peg$c5;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e9); }
    }
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c6) {
          s3 = peg$c6;
          peg$currPos += 3;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e10); }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseIdentifier();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f3(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseLet() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = input.charAt(peg$currPos);
    if (peg$r2.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e5); }
    }
    if (s2 !== peg$FAILED) {
      if (input.substr(peg$currPos, 7) === peg$c3) {
        s3 = peg$c3;
        peg$currPos += 7;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e6); }
      }
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      s2 = input.charAt(peg$currPos);
      if (peg$r3.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e7); }
      }
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 9) === peg$c4) {
          s3 = peg$c4;
          peg$currPos += 9;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e8); }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        s2 = input.charAt(peg$currPos);
        if (peg$r2.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e5); }
        }
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 8) === peg$c7) {
            s3 = peg$c7;
            peg$currPos += 8;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e11); }
          }
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseIdentifier();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c8) {
              s5 = peg$c8;
              peg$currPos += 4;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e12); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseIdentifier();
                if (s7 !== peg$FAILED) {
                  s8 = [];
                  s9 = peg$parseAdditionalParams();
                  while (s9 !== peg$FAILED) {
                    s8.push(s9);
                    s9 = peg$parseAdditionalParams();
                  }
                  s9 = peg$parse_();
                  if (s9 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c9) {
                      s10 = peg$c9;
                      peg$currPos += 2;
                    } else {
                      s10 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e13); }
                    }
                    if (s10 !== peg$FAILED) {
                      s11 = peg$parse_();
                      if (s11 !== peg$FAILED) {
                        s12 = peg$parseLambda();
                        if (s12 !== peg$FAILED) {
                          peg$savedPos = s0;
                          s0 = peg$f4(s3, s7, s8, s12);
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = input.charAt(peg$currPos);
      if (peg$r2.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e5); }
      }
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c3) {
          s3 = peg$c3;
          peg$currPos += 7;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e6); }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        s2 = input.charAt(peg$currPos);
        if (peg$r3.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e7); }
        }
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 9) === peg$c4) {
            s3 = peg$c4;
            peg$currPos += 9;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e8); }
          }
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          s2 = input.charAt(peg$currPos);
          if (peg$r2.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e5); }
          }
          if (s2 !== peg$FAILED) {
            if (input.substr(peg$currPos, 8) === peg$c7) {
              s3 = peg$c7;
              peg$currPos += 8;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e11); }
            }
            if (s3 !== peg$FAILED) {
              s2 = [s2, s3];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseIdentifier();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c9) {
                s5 = peg$c9;
                peg$currPos += 2;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e13); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parseLambda();
                if (s6 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f5(s3, s6);
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parseType() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = input.charAt(peg$currPos);
    if (peg$r4.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e14); }
    }
    if (s2 !== peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c10) {
        s3 = peg$c10;
        peg$currPos += 2;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e15); }
      }
      if (s3 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c11) {
          s4 = peg$c11;
          peg$currPos += 4;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e16); }
        }
        if (s4 === peg$FAILED) {
          s4 = null;
        }
        s2 = [s2, s3, s4];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      s2 = input.charAt(peg$currPos);
      if (peg$r1.test(s2)) {
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e3); }
      }
      if (s2 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c12) {
          s3 = peg$c12;
          peg$currPos += 4;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e17); }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        s2 = input.charAt(peg$currPos);
        if (peg$r5.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e18); }
        }
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c13) {
            s3 = peg$c13;
            peg$currPos += 5;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e19); }
          }
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          s2 = input.charAt(peg$currPos);
          if (peg$r6.test(s2)) {
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e20); }
          }
          if (s2 !== peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c14) {
              s3 = peg$c14;
              peg$currPos += 4;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e21); }
            }
            if (s3 !== peg$FAILED) {
              s2 = [s2, s3];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
          if (s1 === peg$FAILED) {
            s1 = peg$currPos;
            s2 = input.charAt(peg$currPos);
            if (peg$r0.test(s2)) {
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e1); }
            }
            if (s2 !== peg$FAILED) {
              if (input.substr(peg$currPos, 3) === peg$c15) {
                s3 = peg$c15;
                peg$currPos += 3;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e22); }
              }
              if (s3 !== peg$FAILED) {
                if (input.substr(peg$currPos, 5) === peg$c16) {
                  s4 = peg$c16;
                  peg$currPos += 5;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e23); }
                }
                if (s4 === peg$FAILED) {
                  s4 = null;
                }
                s2 = [s2, s3, s4];
                s1 = s2;
              } else {
                peg$currPos = s1;
                s1 = peg$FAILED;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f6(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = [];
      if (input.length > peg$currPos) {
        s3 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e24); }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        if (input.length > peg$currPos) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e24); }
        }
      }
      s1 = input.substring(s1, peg$currPos);
      peg$savedPos = s0;
      s1 = peg$f7();
      s0 = s1;
    }

    return s0;
  }

  function peg$parsePrint() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = input.charAt(peg$currPos);
    if (peg$r7.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e25); }
    }
    if (s1 !== peg$FAILED) {
      if (input.substr(peg$currPos, 6) === peg$c17) {
        s2 = peg$c17;
        peg$currPos += 6;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e26); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c18) {
            s5 = peg$c18;
            peg$currPos += 5;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e27); }
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseExpression();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f8(s5);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseIdentifier() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parseNumberLiteral();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f9(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      s2 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c19) {
        s3 = peg$c19;
        peg$currPos += 4;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e28); }
      }
      if (s3 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c20) {
          s3 = peg$c20;
          peg$currPos += 2;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e29); }
        }
        if (s3 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c21) {
            s3 = peg$c21;
            peg$currPos += 3;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e30); }
          }
          if (s3 === peg$FAILED) {
            if (input.substr(peg$currPos, 5) === peg$c22) {
              s3 = peg$c22;
              peg$currPos += 5;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e31); }
            }
            if (s3 === peg$FAILED) {
              if (input.substr(peg$currPos, 5) === peg$c23) {
                s3 = peg$c23;
                peg$currPos += 5;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e32); }
              }
            }
          }
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = input.charAt(peg$currPos);
        if (peg$r8.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e33); }
        }
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = undefined;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = undefined;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 8) === peg$c24) {
          s2 = peg$c24;
          peg$currPos += 8;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e34); }
        }
        if (s2 === peg$FAILED) {
          if (input.substr(peg$currPos, 7) === peg$c25) {
            s2 = peg$c25;
            peg$currPos += 7;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e35); }
          }
          if (s2 === peg$FAILED) {
            if (input.substr(peg$currPos, 8) === peg$c26) {
              s2 = peg$c26;
              peg$currPos += 8;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e36); }
            }
            if (s2 === peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c27) {
                s2 = peg$c27;
                peg$currPos += 7;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e37); }
              }
              if (s2 === peg$FAILED) {
                if (input.substr(peg$currPos, 7) === peg$c28) {
                  s2 = peg$c28;
                  peg$currPos += 7;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e38); }
                }
                if (s2 === peg$FAILED) {
                  if (input.substr(peg$currPos, 8) === peg$c29) {
                    s2 = peg$c29;
                    peg$currPos += 8;
                  } else {
                    s2 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e39); }
                  }
                }
              }
            }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f10(s2);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$currPos;
        if (input.substr(peg$currPos, 4) === peg$c19) {
          s3 = peg$c19;
          peg$currPos += 4;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e28); }
        }
        if (s3 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c20) {
            s3 = peg$c20;
            peg$currPos += 2;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e29); }
          }
          if (s3 === peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c21) {
              s3 = peg$c21;
              peg$currPos += 3;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e30); }
            }
            if (s3 === peg$FAILED) {
              if (input.substr(peg$currPos, 5) === peg$c22) {
                s3 = peg$c22;
                peg$currPos += 5;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e31); }
              }
              if (s3 === peg$FAILED) {
                if (input.substr(peg$currPos, 5) === peg$c23) {
                  s3 = peg$c23;
                  peg$currPos += 5;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e32); }
                }
              }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = input.charAt(peg$currPos);
          if (peg$r8.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e33); }
          }
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = undefined;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = undefined;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = input.charAt(peg$currPos);
          if (peg$r9.test(s3)) {
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e40); }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = input.charAt(peg$currPos);
            if (peg$r10.test(s5)) {
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e41); }
            }
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = input.charAt(peg$currPos);
              if (peg$r10.test(s5)) {
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e41); }
              }
            }
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f11(s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }

    return s0;
  }

  function peg$parseLambda() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6) === peg$c30) {
      s1 = peg$c30;
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e42); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f12();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$parseExpression();
    }

    return s0;
  }

  function peg$parseExpression() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parseListOrExpression();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f13(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseListOrExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    s2 = peg$parseConditional();
    if (s2 !== peg$FAILED) {
      s3 = peg$currPos;
      s4 = peg$parse_();
      if (s4 === peg$FAILED) {
        s4 = null;
      }
      if (input.substr(peg$currPos, 5) === peg$c31) {
        s5 = peg$c31;
        peg$currPos += 5;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e43); }
      }
      if (s5 === peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c6) {
          s5 = peg$c6;
          peg$currPos += 3;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e10); }
        }
        if (s5 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s5 = peg$c5;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e9); }
          }
        }
      }
      if (s5 !== peg$FAILED) {
        s6 = [];
        s7 = peg$parse_();
        if (s7 !== peg$FAILED) {
          while (s7 !== peg$FAILED) {
            s6.push(s7);
            s7 = peg$parse_();
          }
        } else {
          s6 = peg$FAILED;
        }
        if (s6 !== peg$FAILED) {
          s7 = peg$parseListOrExpression();
          if (s7 !== peg$FAILED) {
            s4 = [s4, s5, s6, s7];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      peg$savedPos = s0;
      s0 = peg$f14(s2, s3);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseConditional() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

    s0 = peg$parseRange();
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c32) {
        s1 = peg$c32;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e44); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseComparison();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 4) === peg$c33) {
                s5 = peg$c33;
                peg$currPos += 4;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e45); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseExpression();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 === peg$FAILED) {
                      s8 = null;
                    }
                    if (input.charCodeAt(peg$currPos) === 59) {
                      s9 = peg$c34;
                      peg$currPos++;
                    } else {
                      s9 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e46); }
                    }
                    if (s9 === peg$FAILED) {
                      s9 = null;
                    }
                    s10 = peg$parse_();
                    if (s10 === peg$FAILED) {
                      s10 = null;
                    }
                    s11 = peg$parseElse();
                    if (s11 === peg$FAILED) {
                      s11 = null;
                    }
                    peg$savedPos = s0;
                    s0 = peg$f15(s3, s7, s11);
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseForLoop();
      }
    }

    return s0;
  }

  function peg$parseElse() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4) === peg$c35) {
      s1 = peg$c35;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e47); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseExpression();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f16(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseForLoop() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c36) {
      s1 = peg$c36;
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e48); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseIdentifier();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c37) {
              s5 = peg$c37;
              peg$currPos += 2;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e49); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseNumberLiteral();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parse_();
                  if (s8 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c20) {
                      s9 = peg$c20;
                      peg$currPos += 2;
                    } else {
                      s9 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e29); }
                    }
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parse_();
                      if (s10 !== peg$FAILED) {
                        s11 = peg$parseNumberLiteral();
                        if (s11 !== peg$FAILED) {
                          s12 = peg$parse_();
                          if (s12 !== peg$FAILED) {
                            if (input.substr(peg$currPos, 4) === peg$c38) {
                              s13 = peg$c38;
                              peg$currPos += 4;
                            } else {
                              s13 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$e50); }
                            }
                            if (s13 !== peg$FAILED) {
                              s14 = peg$parse_();
                              if (s14 !== peg$FAILED) {
                                s15 = peg$parseUnaryExpression();
                                if (s15 !== peg$FAILED) {
                                  s16 = input.charAt(peg$currPos);
                                  if (peg$r11.test(s16)) {
                                    peg$currPos++;
                                  } else {
                                    s16 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$e51); }
                                  }
                                  if (s16 === peg$FAILED) {
                                    s16 = null;
                                  }
                                  s17 = peg$parse_();
                                  if (s17 !== peg$FAILED) {
                                    s18 = peg$parseExpression();
                                    if (s18 !== peg$FAILED) {
                                      peg$savedPos = s0;
                                      s0 = peg$f17(s3, s7, s11, s15, s18);
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$FAILED;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c36) {
        s1 = peg$c36;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e48); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseIdentifier();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c37) {
                s5 = peg$c37;
                peg$currPos += 2;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e49); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseNumberLiteral();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 !== peg$FAILED) {
                      if (input.substr(peg$currPos, 2) === peg$c20) {
                        s9 = peg$c20;
                        peg$currPos += 2;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e29); }
                      }
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parse_();
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parseNumberLiteral();
                          if (s11 !== peg$FAILED) {
                            s12 = input.charAt(peg$currPos);
                            if (peg$r11.test(s12)) {
                              peg$currPos++;
                            } else {
                              s12 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$e51); }
                            }
                            if (s12 === peg$FAILED) {
                              s12 = null;
                            }
                            s13 = peg$parse_();
                            if (s13 !== peg$FAILED) {
                              s14 = peg$parseExpression();
                              if (s14 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s0 = peg$f18(s3, s7, s11, s14);
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 3) === peg$c36) {
          s1 = peg$c36;
          peg$currPos += 3;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e48); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseIdentifier();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_();
              if (s4 !== peg$FAILED) {
                if (input.substr(peg$currPos, 2) === peg$c37) {
                  s5 = peg$c37;
                  peg$currPos += 2;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e49); }
                }
                if (s5 !== peg$FAILED) {
                  s6 = peg$parse_();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parseRange();
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parse_();
                      if (s8 !== peg$FAILED) {
                        if (input.substr(peg$currPos, 4) === peg$c38) {
                          s9 = peg$c38;
                          peg$currPos += 4;
                        } else {
                          s9 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$e50); }
                        }
                        if (s9 !== peg$FAILED) {
                          s10 = peg$parse_();
                          if (s10 !== peg$FAILED) {
                            s11 = peg$parseUnaryExpression();
                            if (s11 !== peg$FAILED) {
                              s12 = input.charAt(peg$currPos);
                              if (peg$r11.test(s12)) {
                                peg$currPos++;
                              } else {
                                s12 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$e51); }
                              }
                              if (s12 === peg$FAILED) {
                                s12 = null;
                              }
                              s13 = peg$parse_();
                              if (s13 !== peg$FAILED) {
                                s14 = peg$parseExpression();
                                if (s14 !== peg$FAILED) {
                                  peg$savedPos = s0;
                                  s0 = peg$f19(s3, s7, s11, s14);
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 3) === peg$c36) {
            s1 = peg$c36;
            peg$currPos += 3;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e48); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = peg$parseIdentifier();
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                  if (input.substr(peg$currPos, 2) === peg$c37) {
                    s5 = peg$c37;
                    peg$currPos += 2;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e49); }
                  }
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parse_();
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parseRange();
                      if (s7 !== peg$FAILED) {
                        s8 = input.charAt(peg$currPos);
                        if (peg$r11.test(s8)) {
                          peg$currPos++;
                        } else {
                          s8 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$e51); }
                        }
                        if (s8 === peg$FAILED) {
                          s8 = null;
                        }
                        s9 = peg$parse_();
                        if (s9 !== peg$FAILED) {
                          s10 = peg$parseExpression();
                          if (s10 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s0 = peg$f20(s3, s7, s10);
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 3) === peg$c36) {
              s1 = peg$c36;
              peg$currPos += 3;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e48); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 !== peg$FAILED) {
                s3 = peg$parseIdentifier();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_();
                  if (s4 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c37) {
                      s5 = peg$c37;
                      peg$currPos += 2;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e49); }
                    }
                    if (s5 !== peg$FAILED) {
                      s6 = peg$parse_();
                      if (s6 !== peg$FAILED) {
                        s7 = peg$parseVarWithParam();
                        if (s7 !== peg$FAILED) {
                          s8 = peg$parse_();
                          if (s8 !== peg$FAILED) {
                            if (input.substr(peg$currPos, 4) === peg$c38) {
                              s9 = peg$c38;
                              peg$currPos += 4;
                            } else {
                              s9 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$e50); }
                            }
                            if (s9 !== peg$FAILED) {
                              s10 = peg$parse_();
                              if (s10 !== peg$FAILED) {
                                s11 = peg$parseUnaryExpression();
                                if (s11 !== peg$FAILED) {
                                  s12 = input.charAt(peg$currPos);
                                  if (peg$r11.test(s12)) {
                                    peg$currPos++;
                                  } else {
                                    s12 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$e51); }
                                  }
                                  if (s12 === peg$FAILED) {
                                    s12 = null;
                                  }
                                  s13 = peg$parse_();
                                  if (s13 !== peg$FAILED) {
                                    s14 = peg$parseExpression();
                                    if (s14 !== peg$FAILED) {
                                      peg$savedPos = s0;
                                      s0 = peg$f21(s3, s7, s11, s14);
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$FAILED;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 3) === peg$c36) {
                s1 = peg$c36;
                peg$currPos += 3;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e48); }
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$parse_();
                if (s2 !== peg$FAILED) {
                  s3 = peg$parseIdentifier();
                  if (s3 !== peg$FAILED) {
                    s4 = peg$parse_();
                    if (s4 !== peg$FAILED) {
                      if (input.substr(peg$currPos, 2) === peg$c37) {
                        s5 = peg$c37;
                        peg$currPos += 2;
                      } else {
                        s5 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e49); }
                      }
                      if (s5 !== peg$FAILED) {
                        s6 = peg$parse_();
                        if (s6 !== peg$FAILED) {
                          s7 = peg$parseVarWithParam();
                          if (s7 !== peg$FAILED) {
                            s8 = input.charAt(peg$currPos);
                            if (peg$r11.test(s8)) {
                              peg$currPos++;
                            } else {
                              s8 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$e51); }
                            }
                            if (s8 === peg$FAILED) {
                              s8 = null;
                            }
                            s9 = peg$parse_();
                            if (s9 !== peg$FAILED) {
                              s10 = peg$parseExpression();
                              if (s10 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s0 = peg$f22(s3, s7, s10);
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 3) === peg$c36) {
                  s1 = peg$c36;
                  peg$currPos += 3;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e48); }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$parse_();
                  if (s2 !== peg$FAILED) {
                    s3 = peg$parseIdentifier();
                    if (s3 !== peg$FAILED) {
                      s4 = peg$parse_();
                      if (s4 !== peg$FAILED) {
                        if (input.substr(peg$currPos, 2) === peg$c37) {
                          s5 = peg$c37;
                          peg$currPos += 2;
                        } else {
                          s5 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$e49); }
                        }
                        if (s5 !== peg$FAILED) {
                          s6 = peg$parse_();
                          if (s6 !== peg$FAILED) {
                            s7 = peg$parseVariableName();
                            if (s7 !== peg$FAILED) {
                              s8 = peg$parse_();
                              if (s8 !== peg$FAILED) {
                                if (input.substr(peg$currPos, 4) === peg$c38) {
                                  s9 = peg$c38;
                                  peg$currPos += 4;
                                } else {
                                  s9 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$e50); }
                                }
                                if (s9 !== peg$FAILED) {
                                  s10 = peg$parse_();
                                  if (s10 !== peg$FAILED) {
                                    s11 = peg$parseUnaryExpression();
                                    if (s11 !== peg$FAILED) {
                                      s12 = input.charAt(peg$currPos);
                                      if (peg$r11.test(s12)) {
                                        peg$currPos++;
                                      } else {
                                        s12 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$e51); }
                                      }
                                      if (s12 === peg$FAILED) {
                                        s12 = null;
                                      }
                                      s13 = peg$parse_();
                                      if (s13 !== peg$FAILED) {
                                        s14 = peg$parseExpression();
                                        if (s14 !== peg$FAILED) {
                                          peg$savedPos = s0;
                                          s0 = peg$f23(s3, s7, s11, s14);
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$FAILED;
                                        }
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$FAILED;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$FAILED;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 3) === peg$c36) {
                    s1 = peg$c36;
                    peg$currPos += 3;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e48); }
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = peg$parse_();
                    if (s2 !== peg$FAILED) {
                      s3 = peg$parseIdentifier();
                      if (s3 !== peg$FAILED) {
                        s4 = peg$parse_();
                        if (s4 !== peg$FAILED) {
                          if (input.substr(peg$currPos, 2) === peg$c37) {
                            s5 = peg$c37;
                            peg$currPos += 2;
                          } else {
                            s5 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$e49); }
                          }
                          if (s5 !== peg$FAILED) {
                            s6 = peg$parse_();
                            if (s6 !== peg$FAILED) {
                              s7 = peg$parseVariableName();
                              if (s7 !== peg$FAILED) {
                                s8 = input.charAt(peg$currPos);
                                if (peg$r11.test(s8)) {
                                  peg$currPos++;
                                } else {
                                  s8 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$e51); }
                                }
                                if (s8 === peg$FAILED) {
                                  s8 = null;
                                }
                                s9 = peg$parse_();
                                if (s9 !== peg$FAILED) {
                                  s10 = peg$parseExpression();
                                  if (s10 !== peg$FAILED) {
                                    peg$savedPos = s0;
                                    s0 = peg$f24(s3, s7, s10);
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$parseRange();
                    if (s0 === peg$FAILED) {
                      s0 = peg$parseComparison();
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseRange() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c21) {
      s2 = peg$c21;
      peg$currPos += 3;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e30); }
    }
    if (s2 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 97) {
        s2 = peg$c39;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e52); }
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (input.substr(peg$currPos, 5) === peg$c22) {
      s2 = peg$c22;
      peg$currPos += 5;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e31); }
    }
    if (s2 === peg$FAILED) {
      if (input.substr(peg$currPos, 5) === peg$c23) {
        s2 = peg$c23;
        peg$currPos += 5;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e32); }
      }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c19) {
          s4 = peg$c19;
          peg$currPos += 4;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e28); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseNumberLiteral();
            if (s6 !== peg$FAILED) {
              s7 = peg$parse_();
              if (s7 !== peg$FAILED) {
                if (input.substr(peg$currPos, 2) === peg$c20) {
                  s8 = peg$c20;
                  peg$currPos += 2;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e29); }
                }
                if (s8 !== peg$FAILED) {
                  s9 = peg$parse_();
                  if (s9 !== peg$FAILED) {
                    s10 = peg$parseNumberLiteral();
                    if (s10 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s0 = peg$f25(s6, s10);
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c19) {
        s1 = peg$c19;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e28); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseNumberLiteral();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c20) {
                s5 = peg$c20;
                peg$currPos += 2;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e29); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseNumberLiteral();
                  if (s7 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s0 = peg$f26(s3, s7);
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parseComparison() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parseAdditiveExpression();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseNotEqualTo();
        if (s3 === peg$FAILED) {
          s3 = peg$parseGreaterThan();
          if (s3 === peg$FAILED) {
            s3 = peg$parseLessThan();
            if (s3 === peg$FAILED) {
              s3 = peg$parseLessThanEqualTo();
              if (s3 === peg$FAILED) {
                s3 = peg$parseGreaterThanEqualTo();
                if (s3 === peg$FAILED) {
                  s3 = peg$parseEqualTo();
                }
              }
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = peg$parseExpression();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f27(s1, s3, s5);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parseAdditiveExpression();
    }

    return s0;
  }

  function peg$parseEqualTo() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 11) === peg$c40) {
      s1 = peg$c40;
      peg$currPos += 11;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e53); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 14) === peg$c41) {
        s1 = peg$c41;
        peg$currPos += 14;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e54); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c42) {
          s1 = peg$c42;
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e55); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c43) {
            s1 = peg$c43;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e56); }
          }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f28();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseNotEqualTo() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 15) === peg$c44) {
      s1 = peg$c44;
      peg$currPos += 15;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e57); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 17) === peg$c45) {
        s1 = peg$c45;
        peg$currPos += 17;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e58); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c46) {
          s1 = peg$c46;
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e59); }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f29();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseGreaterThan() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 15) === peg$c47) {
      s1 = peg$c47;
      peg$currPos += 15;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e60); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 12) === peg$c48) {
        s1 = peg$c48;
        peg$currPos += 12;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e61); }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f30();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseLessThan() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 12) === peg$c49) {
      s1 = peg$c49;
      peg$currPos += 12;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e62); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 13) === peg$c50) {
        s1 = peg$c50;
        peg$currPos += 13;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e63); }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f31();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseLessThanEqualTo() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.substr(peg$currPos, 7) === peg$c51) {
      s2 = peg$c51;
      peg$currPos += 7;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e64); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s4 = peg$currPos;
        if (input.substr(peg$currPos, 4) === peg$c52) {
          s5 = peg$c52;
          peg$currPos += 4;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e65); }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          if (s6 !== peg$FAILED) {
            s5 = [s5, s6];
            s4 = s5;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 === peg$FAILED) {
          s4 = null;
        }
        if (input.substr(peg$currPos, 11) === peg$c53) {
          s5 = peg$c53;
          peg$currPos += 11;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e66); }
        }
        if (s5 !== peg$FAILED) {
          s2 = [s2, s3, s4, s5];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      if (input.substr(peg$currPos, 7) === peg$c51) {
        s2 = peg$c51;
        peg$currPos += 7;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e64); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          if (input.substr(peg$currPos, 4) === peg$c52) {
            s5 = peg$c52;
            peg$currPos += 4;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e65); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (input.substr(peg$currPos, 14) === peg$c54) {
            s5 = peg$c54;
            peg$currPos += 14;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e67); }
          }
          if (s5 !== peg$FAILED) {
            s2 = [s2, s3, s4, s5];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f32();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseGreaterThanEqualTo() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.substr(peg$currPos, 10) === peg$c55) {
      s2 = peg$c55;
      peg$currPos += 10;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e68); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s4 = peg$currPos;
        if (input.substr(peg$currPos, 4) === peg$c52) {
          s5 = peg$c52;
          peg$currPos += 4;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e65); }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parse_();
          if (s6 !== peg$FAILED) {
            s5 = [s5, s6];
            s4 = s5;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 === peg$FAILED) {
          s4 = null;
        }
        if (input.substr(peg$currPos, 11) === peg$c53) {
          s5 = peg$c53;
          peg$currPos += 11;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e66); }
        }
        if (s5 !== peg$FAILED) {
          s2 = [s2, s3, s4, s5];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      if (input.substr(peg$currPos, 7) === peg$c56) {
        s2 = peg$c56;
        peg$currPos += 7;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e69); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          if (input.substr(peg$currPos, 4) === peg$c52) {
            s5 = peg$c52;
            peg$currPos += 4;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e65); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (input.substr(peg$currPos, 14) === peg$c54) {
            s5 = peg$c54;
            peg$currPos += 14;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e67); }
          }
          if (s5 !== peg$FAILED) {
            s2 = [s2, s3, s4, s5];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f33();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseAdditiveExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

    s0 = peg$currPos;
    s1 = peg$parseMultiplicativeExpression();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = peg$parseAdditionOp();
      if (s3 === peg$FAILED) {
        s3 = peg$parseSubtractionOp();
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        if (s4 === peg$FAILED) {
          s4 = null;
        }
        s5 = peg$parseAdditiveExpression();
        if (s5 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f34(s1, s3, s5);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = input.charAt(peg$currPos);
      if (peg$r7.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e25); }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c57) {
          s2 = peg$c57;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e70); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          s4 = peg$parseAdditionOpDirectObject();
          if (s4 === peg$FAILED) {
            s4 = peg$parseSubtractionOpDirectObject();
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            if (input.substr(peg$currPos, 2) === peg$c58) {
              s6 = peg$c58;
              peg$currPos += 2;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e71); }
            }
            if (s6 !== peg$FAILED) {
              s7 = [];
              s8 = peg$parse_();
              if (s8 !== peg$FAILED) {
                while (s8 !== peg$FAILED) {
                  s7.push(s8);
                  s8 = peg$parse_();
                }
              } else {
                s7 = peg$FAILED;
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parseMultiplicativeExpression();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parse_();
                  if (s9 === peg$FAILED) {
                    s9 = null;
                  }
                  if (input.substr(peg$currPos, 3) === peg$c6) {
                    s10 = peg$c6;
                    peg$currPos += 3;
                  } else {
                    s10 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e10); }
                  }
                  if (s10 !== peg$FAILED) {
                    s11 = peg$parse_();
                    if (s11 === peg$FAILED) {
                      s11 = null;
                    }
                    s12 = peg$parseAdditiveExpression();
                    if (s12 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s0 = peg$f35(s4, s8, s12);
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseMultiplicativeExpression();
      }
    }

    return s0;
  }

  function peg$parseMultiplicativeExpression() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

    s0 = peg$currPos;
    s1 = peg$parseUnaryExpression();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = peg$parseMultiplicationOp();
      if (s3 === peg$FAILED) {
        s3 = peg$parseDivisionOp();
        if (s3 === peg$FAILED) {
          s3 = peg$parseModuloOp();
        }
      }
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        if (s4 === peg$FAILED) {
          s4 = null;
        }
        s5 = peg$parseAdditiveExpression();
        if (s5 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f36(s1, s3, s5);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = input.charAt(peg$currPos);
      if (peg$r7.test(s1)) {
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e25); }
      }
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c57) {
          s2 = peg$c57;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e70); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          s4 = peg$parseMultiplicationOpDirectObject();
          if (s4 === peg$FAILED) {
            s4 = peg$parseDivisionOpDirectObject();
            if (s4 === peg$FAILED) {
              s4 = peg$parseModuloOpDirectObject();
            }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 === peg$FAILED) {
              s5 = null;
            }
            if (input.substr(peg$currPos, 2) === peg$c58) {
              s6 = peg$c58;
              peg$currPos += 2;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e71); }
            }
            if (s6 !== peg$FAILED) {
              s7 = [];
              s8 = peg$parse_();
              if (s8 !== peg$FAILED) {
                while (s8 !== peg$FAILED) {
                  s7.push(s8);
                  s8 = peg$parse_();
                }
              } else {
                s7 = peg$FAILED;
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parseMultiplicativeExpression();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parse_();
                  if (s9 === peg$FAILED) {
                    s9 = null;
                  }
                  if (input.substr(peg$currPos, 3) === peg$c6) {
                    s10 = peg$c6;
                    peg$currPos += 3;
                  } else {
                    s10 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e10); }
                  }
                  if (s10 !== peg$FAILED) {
                    s11 = peg$parse_();
                    if (s11 === peg$FAILED) {
                      s11 = null;
                    }
                    s12 = peg$parseAdditiveExpression();
                    if (s12 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s0 = peg$f37(s4, s8, s12);
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseUnaryExpression();
      }
    }

    return s0;
  }

  function peg$parseAdditionOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4) === peg$c59) {
      s1 = peg$c59;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e72); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f38();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseAdditionOpDirectObject() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c60) {
      s1 = peg$c60;
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e73); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f39();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseSubtractionOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5) === peg$c61) {
      s1 = peg$c61;
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e74); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f40();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseSubtractionOpDirectObject() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 10) === peg$c62) {
      s1 = peg$c62;
      peg$currPos += 10;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e75); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f41();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseMultiplicationOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5) === peg$c63) {
      s1 = peg$c63;
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e76); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f42();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseMultiplicationOpDirectObject() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 7) === peg$c64) {
      s1 = peg$c64;
      peg$currPos += 7;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e77); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f43();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseDivisionOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 10) === peg$c65) {
      s1 = peg$c65;
      peg$currPos += 10;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e78); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f44();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseDivisionOpDirectObject() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 8) === peg$c66) {
      s1 = peg$c66;
      peg$currPos += 8;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e79); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f45();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseModuloOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6) === peg$c67) {
      s1 = peg$c67;
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e80); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f46();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseModuloOpDirectObject() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 7) === peg$c68) {
      s1 = peg$c68;
      peg$currPos += 7;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e81); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f47();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseUnaryExpression() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseRange();
    if (s1 === peg$FAILED) {
      s1 = peg$parseLiteral();
      if (s1 === peg$FAILED) {
        s1 = peg$parseVarWithParam();
        if (s1 === peg$FAILED) {
          s1 = peg$parseVariableName();
        }
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseTypeConvert();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      peg$savedPos = s0;
      s0 = peg$f48(s1, s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseTypeConvert() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (input.substr(peg$currPos, 2) === peg$c9) {
      s2 = peg$c9;
      peg$currPos += 2;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e13); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c69) {
          s4 = peg$c69;
          peg$currPos += 6;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e82); }
        }
        if (s4 === peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c70) {
            s4 = peg$c70;
            peg$currPos += 5;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e83); }
          }
          if (s4 === peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c71) {
              s4 = peg$c71;
              peg$currPos += 3;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e84); }
            }
            if (s4 === peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c72) {
                s4 = peg$c72;
                peg$currPos += 7;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e85); }
              }
              if (s4 === peg$FAILED) {
                if (input.substr(peg$currPos, 6) === peg$c73) {
                  s4 = peg$c73;
                  peg$currPos += 6;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e86); }
                }
                if (s4 === peg$FAILED) {
                  if (input.substr(peg$currPos, 7) === peg$c74) {
                    s4 = peg$c74;
                    peg$currPos += 7;
                  } else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e87); }
                  }
                  if (s4 === peg$FAILED) {
                    if (input.substr(peg$currPos, 4) === peg$c75) {
                      s4 = peg$c75;
                      peg$currPos += 4;
                    } else {
                      s4 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e88); }
                    }
                  }
                }
              }
            }
          }
        }
        if (s4 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f49(s4);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseVarWithParam() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parseLiteral();
    if (s1 === peg$FAILED) {
      s1 = peg$parseIdentifier();
    }
    if (s1 !== peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c76) {
        s2 = peg$c76;
        peg$currPos += 2;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e89); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseIdentifier();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f50(s1, s4);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseIdentifier();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c8) {
            s3 = peg$c8;
            peg$currPos += 4;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e12); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseRange();
              if (s5 === peg$FAILED) {
                s5 = peg$parseLiteral();
                if (s5 === peg$FAILED) {
                  s5 = peg$parseIdentifier();
                }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f51(s1, s5);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parseVariableName() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c21) {
      s2 = peg$c21;
      peg$currPos += 3;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e30); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        if (input.substr(peg$currPos, 8) === peg$c77) {
          s4 = peg$c77;
          peg$currPos += 8;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e90); }
        }
        if (s4 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c78) {
            s4 = peg$c78;
            peg$currPos += 3;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e91); }
          }
          if (s4 === peg$FAILED) {
            if (input.substr(peg$currPos, 6) === peg$c79) {
              s4 = peg$c79;
              peg$currPos += 6;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e92); }
            }
          }
        }
        if (s4 !== peg$FAILED) {
          s2 = [s2, s3, s4];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    s2 = peg$parseIdentifier();
    if (s2 !== peg$FAILED) {
      peg$savedPos = s0;
      s0 = peg$f52(s2);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseLiteral() {
    var s0;

    s0 = peg$parseStringLiteral();
    if (s0 === peg$FAILED) {
      s0 = peg$parseCharLiteral();
      if (s0 === peg$FAILED) {
        s0 = peg$parseNumberLiteral();
      }
    }

    return s0;
  }

  function peg$parseNumberLiteral() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8;

    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.substr(peg$currPos, 8) === peg$c29) {
      s2 = peg$c29;
      peg$currPos += 8;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e39); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    s2 = peg$parseMillionsDigit();
    if (s2 !== peg$FAILED) {
      s3 = peg$parseDigitSeparator();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      s4 = peg$parseThousandsDigit();
      if (s4 === peg$FAILED) {
        s4 = null;
      }
      s5 = peg$parseDigitSeparator();
      if (s5 === peg$FAILED) {
        s5 = null;
      }
      s6 = peg$parseHundredsDigit();
      if (s6 === peg$FAILED) {
        s6 = null;
      }
      s7 = peg$parseDigitSeparator();
      if (s7 === peg$FAILED) {
        s7 = null;
      }
      s8 = peg$parseEndDigit();
      if (s8 === peg$FAILED) {
        s8 = null;
      }
      peg$savedPos = s0;
      s0 = peg$f53(s2, s4, s6, s8);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.substr(peg$currPos, 8) === peg$c29) {
        s2 = peg$c29;
        peg$currPos += 8;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e39); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 === peg$FAILED) {
        s1 = null;
      }
      s2 = peg$parseThousandsDigit();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseDigitSeparator();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s4 = peg$parseHundredsDigit();
        if (s4 === peg$FAILED) {
          s4 = null;
        }
        s5 = peg$parseDigitSeparator();
        if (s5 === peg$FAILED) {
          s5 = null;
        }
        s6 = peg$parseEndDigit();
        if (s6 === peg$FAILED) {
          s6 = null;
        }
        peg$savedPos = s0;
        s0 = peg$f54(s2, s4, s6);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.substr(peg$currPos, 8) === peg$c29) {
          s2 = peg$c29;
          peg$currPos += 8;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e39); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 === peg$FAILED) {
          s1 = null;
        }
        s2 = peg$parseHundredsDigit();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseDigitSeparator();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          s4 = peg$parseEndDigit();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f55(s2, s4);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$currPos;
          if (input.substr(peg$currPos, 8) === peg$c29) {
            s2 = peg$c29;
            peg$currPos += 8;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e39); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              s2 = [s2, s3];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
          if (s1 === peg$FAILED) {
            s1 = null;
          }
          s2 = peg$parseEndDigit();
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f56(s1, s2);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
      }
    }

    return s0;
  }

  function peg$parseMillionsDigit() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 97) {
      s1 = peg$c39;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e52); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s2 = peg$c80;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e93); }
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = input.charAt(peg$currPos);
        if (peg$r12.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e94); }
        }
        if (s3 !== peg$FAILED) {
          if (input.substr(peg$currPos, 6) === peg$c81) {
            s4 = peg$c81;
            peg$currPos += 6;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e95); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = input.charAt(peg$currPos);
            if (peg$r8.test(s6)) {
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e33); }
            }
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = undefined;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$currPos;
              peg$silentFails++;
              s7 = peg$currPos;
              s8 = peg$parse_();
              if (s8 !== peg$FAILED) {
                s9 = peg$currPos;
                if (input.substr(peg$currPos, 3) === peg$c21) {
                  s10 = peg$c21;
                  peg$currPos += 3;
                } else {
                  s10 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e30); }
                }
                if (s10 !== peg$FAILED) {
                  s11 = peg$parse_();
                  if (s11 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 5) === peg$c22) {
                      s12 = peg$c22;
                      peg$currPos += 5;
                    } else {
                      s12 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e31); }
                    }
                    if (s12 === peg$FAILED) {
                      if (input.substr(peg$currPos, 5) === peg$c23) {
                        s12 = peg$c23;
                        peg$currPos += 5;
                      } else {
                        s12 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e32); }
                      }
                    }
                    if (s12 !== peg$FAILED) {
                      s10 = [s10, s11, s12];
                      s9 = s10;
                    } else {
                      peg$currPos = s9;
                      s9 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s9;
                    s9 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s9;
                  s9 = peg$FAILED;
                }
                if (s9 !== peg$FAILED) {
                  s8 = [s8, s9];
                  s7 = s8;
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
              peg$silentFails--;
              if (s7 === peg$FAILED) {
                s6 = undefined;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f57();
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseHundredsDigit();
      if (s1 === peg$FAILED) {
        s1 = peg$parseEndDigit();
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 45) {
            s2 = peg$c80;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e93); }
          }
        }
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s3 = input.charAt(peg$currPos);
        if (peg$r12.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e94); }
        }
        if (s3 !== peg$FAILED) {
          if (input.substr(peg$currPos, 6) === peg$c81) {
            s4 = peg$c81;
            peg$currPos += 6;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e95); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = input.charAt(peg$currPos);
            if (peg$r8.test(s6)) {
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e33); }
            }
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = undefined;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$currPos;
              peg$silentFails++;
              s7 = peg$currPos;
              s8 = peg$parse_();
              if (s8 !== peg$FAILED) {
                s9 = peg$currPos;
                if (input.substr(peg$currPos, 3) === peg$c21) {
                  s10 = peg$c21;
                  peg$currPos += 3;
                } else {
                  s10 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e30); }
                }
                if (s10 !== peg$FAILED) {
                  s11 = peg$parse_();
                  if (s11 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 5) === peg$c22) {
                      s12 = peg$c22;
                      peg$currPos += 5;
                    } else {
                      s12 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e31); }
                    }
                    if (s12 === peg$FAILED) {
                      if (input.substr(peg$currPos, 5) === peg$c23) {
                        s12 = peg$c23;
                        peg$currPos += 5;
                      } else {
                        s12 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e32); }
                      }
                    }
                    if (s12 !== peg$FAILED) {
                      s10 = [s10, s11, s12];
                      s9 = s10;
                    } else {
                      peg$currPos = s9;
                      s9 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s9;
                    s9 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s9;
                  s9 = peg$FAILED;
                }
                if (s9 !== peg$FAILED) {
                  s8 = [s8, s9];
                  s7 = s8;
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
              peg$silentFails--;
              if (s7 === peg$FAILED) {
                s6 = undefined;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f58(s1);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parseThousandsDigit() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8;

    s0 = peg$currPos;
    s1 = peg$parseHundredsDigit();
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c6) {
          s4 = peg$c6;
          peg$currPos += 3;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e10); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            s3 = [s3, s4, s5];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 === peg$FAILED) {
        s2 = peg$parse_();
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 45) {
            s2 = peg$c80;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e93); }
          }
        }
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = peg$parseEndDigit();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      s4 = peg$parse_();
      if (s4 !== peg$FAILED) {
        s5 = input.charAt(peg$currPos);
        if (peg$r7.test(s5)) {
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e25); }
        }
        if (s5 !== peg$FAILED) {
          if (input.substr(peg$currPos, 7) === peg$c82) {
            s6 = peg$c82;
            peg$currPos += 7;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e96); }
          }
          if (s6 !== peg$FAILED) {
            s7 = peg$currPos;
            peg$silentFails++;
            s8 = input.charAt(peg$currPos);
            if (peg$r8.test(s8)) {
              peg$currPos++;
            } else {
              s8 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e33); }
            }
            peg$silentFails--;
            if (s8 === peg$FAILED) {
              s7 = undefined;
            } else {
              peg$currPos = s7;
              s7 = peg$FAILED;
            }
            if (s7 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f59(s1, s3);
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseEndDigit();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = input.charAt(peg$currPos);
          if (peg$r7.test(s3)) {
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e25); }
          }
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 7) === peg$c82) {
              s4 = peg$c82;
              peg$currPos += 7;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e96); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              peg$silentFails++;
              s6 = input.charAt(peg$currPos);
              if (peg$r8.test(s6)) {
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e33); }
              }
              peg$silentFails--;
              if (s6 === peg$FAILED) {
                s5 = undefined;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f60(s1);
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 97) {
          s1 = peg$c39;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e52); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          peg$silentFails++;
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = input.charAt(peg$currPos);
            if (peg$r12.test(s5)) {
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e94); }
            }
            if (s5 !== peg$FAILED) {
              if (input.substr(peg$currPos, 6) === peg$c81) {
                s6 = peg$c81;
                peg$currPos += 6;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e95); }
              }
              if (s6 !== peg$FAILED) {
                s4 = [s4, s5, s6];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          peg$silentFails--;
          if (s3 === peg$FAILED) {
            s2 = undefined;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              if (input.substr(peg$currPos, 8) === peg$c26) {
                s4 = peg$c26;
                peg$currPos += 8;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e36); }
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$currPos;
                peg$silentFails++;
                s6 = input.charAt(peg$currPos);
                if (peg$r8.test(s6)) {
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e33); }
                }
                peg$silentFails--;
                if (s6 === peg$FAILED) {
                  s5 = undefined;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f61();
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }

    return s0;
  }

  function peg$parseHundredsDigit() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseEndDigit();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s2 = peg$c80;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e93); }
        }
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = input.charAt(peg$currPos);
      if (peg$r13.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e97); }
      }
      if (s3 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c83) {
          s4 = peg$c83;
          peg$currPos += 6;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e98); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = input.charAt(peg$currPos);
          if (peg$r8.test(s6)) {
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e33); }
          }
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = undefined;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f62(s1);
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 97) {
        s1 = peg$c39;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e52); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = input.charAt(peg$currPos);
          if (peg$r12.test(s5)) {
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e94); }
          }
          if (s5 !== peg$FAILED) {
            if (input.substr(peg$currPos, 6) === peg$c81) {
              s6 = peg$c81;
              peg$currPos += 6;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e95); }
            }
            if (s6 !== peg$FAILED) {
              s4 = [s4, s5, s6];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = undefined;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          peg$silentFails++;
          s4 = peg$currPos;
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            s6 = input.charAt(peg$currPos);
            if (peg$r7.test(s6)) {
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e25); }
            }
            if (s6 !== peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c82) {
                s7 = peg$c82;
                peg$currPos += 7;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e96); }
              }
              if (s7 !== peg$FAILED) {
                s5 = [s5, s6, s7];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          peg$silentFails--;
          if (s4 === peg$FAILED) {
            s3 = undefined;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c27) {
                s5 = peg$c27;
                peg$currPos += 7;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e37); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$currPos;
                peg$silentFails++;
                s7 = input.charAt(peg$currPos);
                if (peg$r8.test(s7)) {
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e33); }
                }
                peg$silentFails--;
                if (s7 === peg$FAILED) {
                  s6 = undefined;
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
                if (s6 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f63();
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parseEndDigit() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$parseTeensDigit();
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseTensDigit();
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c6) {
            s4 = peg$c6;
            peg$currPos += 3;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e10); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s3 = [s3, s4, s5];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c5;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e9); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s3 = [s3, s4];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 45) {
              s2 = peg$c80;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e93); }
            }
          }
        }
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s3 = peg$parseOnesDigit();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        peg$savedPos = s0;
        s0 = peg$f64(s1, s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseOnesDigit();
      }
    }

    return s0;
  }

  function peg$parseTensDigit() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c84) {
      s1 = peg$c84;
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e99); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = input.charAt(peg$currPos);
      if (peg$r8.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e33); }
      }
      peg$silentFails--;
      if (s3 === peg$FAILED) {
        s2 = undefined;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f65();
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c85) {
        s1 = peg$c85;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e100); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = input.charAt(peg$currPos);
        if (peg$r8.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e33); }
        }
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = undefined;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f66();
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 6) === peg$c86) {
          s1 = peg$c86;
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e101); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          peg$silentFails++;
          s3 = input.charAt(peg$currPos);
          if (peg$r8.test(s3)) {
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e33); }
          }
          peg$silentFails--;
          if (s3 === peg$FAILED) {
            s2 = undefined;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f67();
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 5) === peg$c87) {
            s1 = peg$c87;
            peg$currPos += 5;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e102); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            peg$silentFails++;
            s3 = input.charAt(peg$currPos);
            if (peg$r8.test(s3)) {
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e33); }
            }
            peg$silentFails--;
            if (s3 === peg$FAILED) {
              s2 = undefined;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f68();
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 5) === peg$c88) {
              s1 = peg$c88;
              peg$currPos += 5;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e103); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$currPos;
              peg$silentFails++;
              s3 = input.charAt(peg$currPos);
              if (peg$r8.test(s3)) {
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e33); }
              }
              peg$silentFails--;
              if (s3 === peg$FAILED) {
                s2 = undefined;
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f69();
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 5) === peg$c89) {
                s1 = peg$c89;
                peg$currPos += 5;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e104); }
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$currPos;
                peg$silentFails++;
                s3 = input.charAt(peg$currPos);
                if (peg$r8.test(s3)) {
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e33); }
                }
                peg$silentFails--;
                if (s3 === peg$FAILED) {
                  s2 = undefined;
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f70();
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 7) === peg$c90) {
                  s1 = peg$c90;
                  peg$currPos += 7;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e105); }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$currPos;
                  peg$silentFails++;
                  s3 = input.charAt(peg$currPos);
                  if (peg$r8.test(s3)) {
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e33); }
                  }
                  peg$silentFails--;
                  if (s3 === peg$FAILED) {
                    s2 = undefined;
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s0 = peg$f71();
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 6) === peg$c91) {
                    s1 = peg$c91;
                    peg$currPos += 6;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e106); }
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = peg$currPos;
                    peg$silentFails++;
                    s3 = input.charAt(peg$currPos);
                    if (peg$r8.test(s3)) {
                      peg$currPos++;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e33); }
                    }
                    peg$silentFails--;
                    if (s3 === peg$FAILED) {
                      s2 = undefined;
                    } else {
                      peg$currPos = s2;
                      s2 = peg$FAILED;
                    }
                    if (s2 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s0 = peg$f72();
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 6) === peg$c92) {
                      s1 = peg$c92;
                      peg$currPos += 6;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e107); }
                    }
                    if (s1 !== peg$FAILED) {
                      s2 = peg$currPos;
                      peg$silentFails++;
                      s3 = input.charAt(peg$currPos);
                      if (peg$r8.test(s3)) {
                        peg$currPos++;
                      } else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e33); }
                      }
                      peg$silentFails--;
                      if (s3 === peg$FAILED) {
                        s2 = undefined;
                      } else {
                        peg$currPos = s2;
                        s2 = peg$FAILED;
                      }
                      if (s2 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s0 = peg$f73();
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseOnesDigit() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4) === peg$c93) {
      s1 = peg$c93;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e108); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = input.charAt(peg$currPos);
      if (peg$r8.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e33); }
      }
      peg$silentFails--;
      if (s3 === peg$FAILED) {
        s2 = undefined;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f74();
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c94) {
        s1 = peg$c94;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e109); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = input.charAt(peg$currPos);
        if (peg$r8.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e33); }
        }
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = undefined;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f75();
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 3) === peg$c95) {
          s1 = peg$c95;
          peg$currPos += 3;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e110); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          peg$silentFails++;
          s3 = input.charAt(peg$currPos);
          if (peg$r8.test(s3)) {
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e33); }
          }
          peg$silentFails--;
          if (s3 === peg$FAILED) {
            s2 = undefined;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f76();
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 5) === peg$c96) {
            s1 = peg$c96;
            peg$currPos += 5;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e111); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            peg$silentFails++;
            s3 = input.charAt(peg$currPos);
            if (peg$r8.test(s3)) {
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e33); }
            }
            peg$silentFails--;
            if (s3 === peg$FAILED) {
              s2 = undefined;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f77();
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 4) === peg$c97) {
              s1 = peg$c97;
              peg$currPos += 4;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e112); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$currPos;
              peg$silentFails++;
              s3 = input.charAt(peg$currPos);
              if (peg$r8.test(s3)) {
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e33); }
              }
              peg$silentFails--;
              if (s3 === peg$FAILED) {
                s2 = undefined;
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f78();
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 4) === peg$c98) {
                s1 = peg$c98;
                peg$currPos += 4;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e113); }
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$currPos;
                peg$silentFails++;
                s3 = input.charAt(peg$currPos);
                if (peg$r8.test(s3)) {
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e33); }
                }
                peg$silentFails--;
                if (s3 === peg$FAILED) {
                  s2 = undefined;
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f79();
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 3) === peg$c99) {
                  s1 = peg$c99;
                  peg$currPos += 3;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e114); }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$currPos;
                  peg$silentFails++;
                  s3 = input.charAt(peg$currPos);
                  if (peg$r8.test(s3)) {
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e33); }
                  }
                  peg$silentFails--;
                  if (s3 === peg$FAILED) {
                    s2 = undefined;
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s0 = peg$f80();
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 5) === peg$c100) {
                    s1 = peg$c100;
                    peg$currPos += 5;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e115); }
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = peg$currPos;
                    peg$silentFails++;
                    s3 = input.charAt(peg$currPos);
                    if (peg$r8.test(s3)) {
                      peg$currPos++;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e33); }
                    }
                    peg$silentFails--;
                    if (s3 === peg$FAILED) {
                      s2 = undefined;
                    } else {
                      peg$currPos = s2;
                      s2 = peg$FAILED;
                    }
                    if (s2 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s0 = peg$f81();
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 5) === peg$c101) {
                      s1 = peg$c101;
                      peg$currPos += 5;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e116); }
                    }
                    if (s1 !== peg$FAILED) {
                      s2 = peg$currPos;
                      peg$silentFails++;
                      s3 = input.charAt(peg$currPos);
                      if (peg$r8.test(s3)) {
                        peg$currPos++;
                      } else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e33); }
                      }
                      peg$silentFails--;
                      if (s3 === peg$FAILED) {
                        s2 = undefined;
                      } else {
                        peg$currPos = s2;
                        s2 = peg$FAILED;
                      }
                      if (s2 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s0 = peg$f82();
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      if (input.substr(peg$currPos, 4) === peg$c102) {
                        s1 = peg$c102;
                        peg$currPos += 4;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e117); }
                      }
                      if (s1 !== peg$FAILED) {
                        s2 = peg$currPos;
                        peg$silentFails++;
                        s3 = input.charAt(peg$currPos);
                        if (peg$r8.test(s3)) {
                          peg$currPos++;
                        } else {
                          s3 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$e33); }
                        }
                        peg$silentFails--;
                        if (s3 === peg$FAILED) {
                          s2 = undefined;
                        } else {
                          peg$currPos = s2;
                          s2 = peg$FAILED;
                        }
                        if (s2 !== peg$FAILED) {
                          peg$savedPos = s0;
                          s0 = peg$f83();
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                      if (s0 === peg$FAILED) {
                        s0 = peg$currPos;
                        if (input.substr(peg$currPos, 4) === peg$c93) {
                          s1 = peg$c93;
                          peg$currPos += 4;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$e108); }
                        }
                        if (s1 !== peg$FAILED) {
                          s2 = peg$currPos;
                          peg$silentFails++;
                          s3 = input.charAt(peg$currPos);
                          if (peg$r8.test(s3)) {
                            peg$currPos++;
                          } else {
                            s3 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$e33); }
                          }
                          peg$silentFails--;
                          if (s3 === peg$FAILED) {
                            s2 = undefined;
                          } else {
                            peg$currPos = s2;
                            s2 = peg$FAILED;
                          }
                          if (s2 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s0 = peg$f84();
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseTeensDigit() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6) === peg$c103) {
      s1 = peg$c103;
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e118); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = input.charAt(peg$currPos);
      if (peg$r8.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e33); }
      }
      peg$silentFails--;
      if (s3 === peg$FAILED) {
        s2 = undefined;
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f85();
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c104) {
        s1 = peg$c104;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e119); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = input.charAt(peg$currPos);
        if (peg$r8.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e33); }
        }
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = undefined;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f86();
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 97) {
          s1 = peg$c39;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e52); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          peg$silentFails++;
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            s5 = input.charAt(peg$currPos);
            if (peg$r12.test(s5)) {
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e94); }
            }
            if (s5 !== peg$FAILED) {
              if (input.substr(peg$currPos, 6) === peg$c81) {
                s6 = peg$c81;
                peg$currPos += 6;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e95); }
              }
              if (s6 !== peg$FAILED) {
                s4 = [s4, s5, s6];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          peg$silentFails--;
          if (s3 === peg$FAILED) {
            s2 = undefined;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            peg$silentFails++;
            s4 = peg$currPos;
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s6 = input.charAt(peg$currPos);
              if (peg$r7.test(s6)) {
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e25); }
              }
              if (s6 !== peg$FAILED) {
                if (input.substr(peg$currPos, 7) === peg$c82) {
                  s7 = peg$c82;
                  peg$currPos += 7;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e96); }
                }
                if (s7 !== peg$FAILED) {
                  s5 = [s5, s6, s7];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            peg$silentFails--;
            if (s4 === peg$FAILED) {
              s3 = undefined;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$currPos;
              peg$silentFails++;
              s5 = peg$currPos;
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = input.charAt(peg$currPos);
                if (peg$r13.test(s7)) {
                  peg$currPos++;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e97); }
                }
                if (s7 !== peg$FAILED) {
                  if (input.substr(peg$currPos, 6) === peg$c83) {
                    s8 = peg$c83;
                    peg$currPos += 6;
                  } else {
                    s8 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e98); }
                  }
                  if (s8 !== peg$FAILED) {
                    s6 = [s6, s7, s8];
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
              peg$silentFails--;
              if (s5 === peg$FAILED) {
                s4 = undefined;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_();
                if (s5 !== peg$FAILED) {
                  if (input.substr(peg$currPos, 5) === peg$c105) {
                    s6 = peg$c105;
                    peg$currPos += 5;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e120); }
                  }
                  if (s6 !== peg$FAILED) {
                    s7 = peg$currPos;
                    peg$silentFails++;
                    s8 = input.charAt(peg$currPos);
                    if (peg$r8.test(s8)) {
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e33); }
                    }
                    peg$silentFails--;
                    if (s8 === peg$FAILED) {
                      s7 = undefined;
                    } else {
                      peg$currPos = s7;
                      s7 = peg$FAILED;
                    }
                    if (s7 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s0 = peg$f87();
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 8) === peg$c106) {
            s1 = peg$c106;
            peg$currPos += 8;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e121); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            peg$silentFails++;
            s3 = input.charAt(peg$currPos);
            if (peg$r8.test(s3)) {
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e33); }
            }
            peg$silentFails--;
            if (s3 === peg$FAILED) {
              s2 = undefined;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f88();
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 8) === peg$c107) {
              s1 = peg$c107;
              peg$currPos += 8;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e122); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$currPos;
              peg$silentFails++;
              s3 = input.charAt(peg$currPos);
              if (peg$r8.test(s3)) {
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e33); }
              }
              peg$silentFails--;
              if (s3 === peg$FAILED) {
                s2 = undefined;
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
              if (s2 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f89();
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 7) === peg$c108) {
                s1 = peg$c108;
                peg$currPos += 7;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e123); }
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$currPos;
                peg$silentFails++;
                s3 = input.charAt(peg$currPos);
                if (peg$r8.test(s3)) {
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e33); }
                }
                peg$silentFails--;
                if (s3 === peg$FAILED) {
                  s2 = undefined;
                } else {
                  peg$currPos = s2;
                  s2 = peg$FAILED;
                }
                if (s2 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s0 = peg$f90();
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 7) === peg$c109) {
                  s1 = peg$c109;
                  peg$currPos += 7;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e124); }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$currPos;
                  peg$silentFails++;
                  s3 = input.charAt(peg$currPos);
                  if (peg$r8.test(s3)) {
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e33); }
                  }
                  peg$silentFails--;
                  if (s3 === peg$FAILED) {
                    s2 = undefined;
                  } else {
                    peg$currPos = s2;
                    s2 = peg$FAILED;
                  }
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s0 = peg$f91();
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 9) === peg$c110) {
                    s1 = peg$c110;
                    peg$currPos += 9;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e125); }
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = peg$currPos;
                    peg$silentFails++;
                    s3 = input.charAt(peg$currPos);
                    if (peg$r8.test(s3)) {
                      peg$currPos++;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e33); }
                    }
                    peg$silentFails--;
                    if (s3 === peg$FAILED) {
                      s2 = undefined;
                    } else {
                      peg$currPos = s2;
                      s2 = peg$FAILED;
                    }
                    if (s2 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s0 = peg$f92();
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 8) === peg$c111) {
                      s1 = peg$c111;
                      peg$currPos += 8;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e126); }
                    }
                    if (s1 !== peg$FAILED) {
                      s2 = peg$currPos;
                      peg$silentFails++;
                      s3 = input.charAt(peg$currPos);
                      if (peg$r8.test(s3)) {
                        peg$currPos++;
                      } else {
                        s3 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e33); }
                      }
                      peg$silentFails--;
                      if (s3 === peg$FAILED) {
                        s2 = undefined;
                      } else {
                        peg$currPos = s2;
                        s2 = peg$FAILED;
                      }
                      if (s2 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s0 = peg$f93();
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      if (input.substr(peg$currPos, 8) === peg$c112) {
                        s1 = peg$c112;
                        peg$currPos += 8;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e127); }
                      }
                      if (s1 !== peg$FAILED) {
                        s2 = peg$currPos;
                        peg$silentFails++;
                        s3 = input.charAt(peg$currPos);
                        if (peg$r8.test(s3)) {
                          peg$currPos++;
                        } else {
                          s3 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$e33); }
                        }
                        peg$silentFails--;
                        if (s3 === peg$FAILED) {
                          s2 = undefined;
                        } else {
                          peg$currPos = s2;
                          s2 = peg$FAILED;
                        }
                        if (s2 !== peg$FAILED) {
                          peg$savedPos = s0;
                          s0 = peg$f94();
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseDigitSeparator() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5) === peg$c31) {
      s1 = peg$c31;
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e43); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c113) {
        s1 = peg$c113;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e128); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 44) {
          s1 = peg$c5;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e9); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$currPos;
          peg$silentFails++;
          s2 = peg$currPos;
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c20) {
              s4 = peg$c20;
              peg$currPos += 2;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e29); }
            }
            if (s4 === peg$FAILED) {
              if (input.substr(peg$currPos, 4) === peg$c38) {
                s4 = peg$c38;
                peg$currPos += 4;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e50); }
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              peg$silentFails++;
              s6 = input.charAt(peg$currPos);
              if (peg$r8.test(s6)) {
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e33); }
              }
              peg$silentFails--;
              if (s6 === peg$FAILED) {
                s5 = undefined;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
              if (s5 !== peg$FAILED) {
                s3 = [s3, s4, s5];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          peg$silentFails--;
          if (s2 === peg$FAILED) {
            s1 = undefined;
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s1 = [s1, s2];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
      }
    }

    return s0;
  }

  function peg$parseStringLiteral() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    s2 = input.charAt(peg$currPos);
    if (peg$r14.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e129); }
    }
    if (s2 !== peg$FAILED) {
      s3 = [];
      s4 = input.charAt(peg$currPos);
      if (peg$r15.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e130); }
      }
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = input.charAt(peg$currPos);
        if (peg$r15.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e130); }
        }
      }
      s4 = input.charAt(peg$currPos);
      if (peg$r16.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e131); }
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$parse_();
        if (s5 === peg$FAILED) {
          s5 = null;
        }
        peg$savedPos = s0;
        s0 = peg$f95(s3);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseCharLiteral() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parse_();
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (input.charCodeAt(peg$currPos) === 39) {
      s2 = peg$c114;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e132); }
    }
    if (s2 !== peg$FAILED) {
      s3 = input.charAt(peg$currPos);
      if (peg$r17.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e133); }
      }
      if (s3 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 39) {
          s4 = peg$c114;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e132); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parse_();
          if (s5 === peg$FAILED) {
            s5 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f96(s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parse_() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r18.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e135); }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = input.charAt(peg$currPos);
        if (peg$r18.test(s1)) {
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e135); }
        }
      }
    } else {
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e134); }
    }

    return s0;
  }

  function peg$parse__() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r19.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e137); }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = input.charAt(peg$currPos);
        if (peg$r19.test(s1)) {
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e137); }
        }
      }
    } else {
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e136); }
    }

    return s0;
  }


	class MemoSyntaxError extends Error {
		constructor(msg, code, details) { 
			super(msg);
			this.code = code;
			this.details = details;
		}
	}
	function flattenToString(input) {
		return Array.isArray(input)
			? input.flat(Infinity).join('')
			: String(input);
	}

  peg$result = peg$startRuleFunction();

  if (options.peg$library) {
    return /** @type {any} */ ({
      peg$result,
      peg$currPos,
      peg$FAILED,
      peg$maxFailExpected,
      peg$maxFailPos
    });
  }
  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

  root.memo.parser = {
    StartRules: ["Command"],
    SyntaxError: peg$SyntaxError,
    parse: peg$parse
  };
})(this);

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
                    deps = deps.concat(oi.getDependencies(node.exp));
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
            case "FloatLiteral":
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

    // Helper function to recursively replace a variable with its value in an AST
    const replaceVariableInAST = (node, varToReplace, replacement) => {
        if (!node) return node;

        // If this is a reference to the variable we're replacing, return the replacement
        if (node.type === "VariableName" && node.name && node.name.varname === varToReplace) {
            return oi.deepClone(replacement);
        }

        // Clone the node to avoid modifying the original
        const result = oi.deepClone(node);

        // Recursively replace in child nodes
        if (result.type === "Additive" || result.type === "Multiplicative") {
            result.left = replaceVariableInAST(result.left, varToReplace, replacement);
            result.right = replaceVariableInAST(result.right, varToReplace, replacement);
        } else if (result.type === "Comparison") {
            result.left = replaceVariableInAST(result.left, varToReplace, replacement);
            result.right = replaceVariableInAST(result.right, varToReplace, replacement);
        } else if (result.type === "Conditional") {
            result.comp = replaceVariableInAST(result.comp, varToReplace, replacement);
            result.exp = replaceVariableInAST(result.exp, varToReplace, replacement);
            if (result.f_else) {
                result.f_else = replaceVariableInAST(result.f_else, varToReplace, replacement);
            }
        } else if (result.type === "List" && Array.isArray(result.exp)) {
            result.exp = result.exp.map(item => replaceVariableInAST(item, varToReplace, replacement));
        } else if (result.type === "ForLoop") {
            if (result.range) {
                result.range = replaceVariableInAST(result.range, varToReplace, replacement);
            }
            if (result.exp) {
                result.exp = replaceVariableInAST(result.exp, varToReplace, replacement);
            }
        } else if (result.type === "Range") {
            result.start = replaceVariableInAST(result.start, varToReplace, replacement);
            result.end = replaceVariableInAST(result.end, varToReplace, replacement);
            if (result.step) {
                result.step = replaceVariableInAST(result.step, varToReplace, replacement);
            }
        } else if (result.type === "VariableWithParam") {
            // Don't replace the function name itself, but replace in the parameter
            if (result.param) {
                result.param = replaceVariableInAST(result.param, varToReplace, replacement);
            }
        }

        return result;
    };

    // Helper to resolve direct dependents only (no recursion)
    // When clearing 'a', only variables that directly depend on 'a' get 'a' inlined
    // Variables that depend on those (like c->b->a) maintain their dependency on b
    const resolveDependents = (varname) => {
        const varValue = memo.varlist[varname];
        if (!varValue) return;

        for (const depKey in memo.varlist) {
            if (memo.varlist[depKey].deps && memo.varlist[depKey].deps.includes(varname)) {
                // Replace just this variable in the dependent's AST
                const updated = replaceVariableInAST(memo.varlist[depKey], varname, varValue);
                if (updated) {
                    const oldParams = memo.varlist[depKey].params || [];
                    const oldFade = memo.varlist[depKey].fade || 1;
                    // Remove only this variable from deps
                    const newDeps = memo.varlist[depKey].deps.filter(d => d !== varname);

                    // If there are no remaining dependencies, evaluate to a constant
                    // Otherwise keep the expression with updated AST
                    if (newDeps.length === 0) {
                        // Fully evaluate since there are no more dependencies
                        const resolved = oi.evalExp(updated, undefined, true);
                        if (resolved) {
                            let inlined;
                            if (resolved.type === "IntLiteral" || resolved.type === "FloatLiteral") {
                                inlined = oi.deepClone(resolved);
                            } else if (resolved.type === "List" || resolved.type === "StringLiteral" || resolved.type === "CharLiteral") {
                                inlined = { type: "StringLiteral", value: memo.tools.stringifyList(resolved, true) };
                            } else {
                                inlined = oi.deepClone(resolved);
                            }
                            memo.varlist[depKey] = inlined;
                            memo.varlist[depKey].fade = oldFade;
                            memo.varlist[depKey].params = oldParams;
                            memo.varlist[depKey].deps = [];
                        }
                    } else {
                        // Keep the expression with the variable replaced
                        memo.varlist[depKey] = updated;
                        memo.varlist[depKey].fade = oldFade;
                        memo.varlist[depKey].params = oldParams;
                        memo.varlist[depKey].deps = newDeps;
                    }
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

        // Add period if response doesn't end with punctuation
        if (response && typeof response === 'string' && response.length > 0) {
            const lastChar = response[response.length - 1];
            if (!/[.!?,;:>]/.test(lastChar)) {
                response = response.trim() + '.';
            }
        }

        return response;
    }

})(memo.interpreter);
