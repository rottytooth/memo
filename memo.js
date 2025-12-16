memo = {};

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

memo.tools.rangeToList = (range) => {
    let step = 1;
    if (range.end.value < range.start.value) {
        step = -1;
    }
    return { type: "List", exp: Array.from({length: range.end.value - range.start.value + 1}, (_, i) => ({type: "IntLiteral", value: range.start.value + i * step})) };
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
        case "Lambda":
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

    // Handle clear/reset variants -> "clear"
    processed = processed.replace(/\bforget\s+all\b/gi, 'clear');
    processed = processed.replace(/\breset\b/gi, 'clear');
    processed = processed.replace(/\bforget\b/gi, 'clear');

    // Handle "x is value" assignment syntax -> "remember x as value"
    // Match: identifier followed by "is" followed by value/expression
    // But not when "is" is part of "what is" or comparison operators
    processed = processed.replace(
        /\b(?!what\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s+is\s+(?!equal|greater|less|than)(.+)/gi,
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
        'for': 'with',
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

    // Function-call style notation: identifier(param) -> identifier with param
    // Only in expression context (not in definitions)
    processed = processed.replace(
        /\b([a-zA-Z_][a-zA-Z0-9_]*)\(([a-zA-Z_][a-zA-Z0-9_]*)\)(?!\s+as)/g,
        '$1 with $2'
    );

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
        'less': 'minus',
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

    // Comparison operator variations
    const comparisonSynonyms = {
        'equals': 'is equal to',
        'equal to': 'is equal to',
        
        'not equal to': 'is not equal to',
        'doesn\'t equal': 'is not equal to',
        'does not equal': 'is not equal to',
        
        'greater than': 'is greater than',
        'less than': 'is less than',
    };

    for (const [variant, canonical] of Object.entries(comparisonSynonyms)) {
        const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
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
  var peg$c19 = "remember";
  var peg$c20 = "million";
  var peg$c21 = "thousand";
  var peg$c22 = "hundred";
  var peg$c23 = "billion";
  var peg$c24 = "lambda";
  var peg$c25 = ", and";
  var peg$c26 = "if";
  var peg$c27 = "then";
  var peg$c28 = "else";
  var peg$c29 = "for";
  var peg$c30 = "in";
  var peg$c31 = ":";
  var peg$c32 = "the";
  var peg$c33 = "a";
  var peg$c34 = "range";
  var peg$c35 = "count";
  var peg$c36 = "from";
  var peg$c37 = "to";
  var peg$c38 = "is equal to";
  var peg$c39 = "equals";
  var peg$c40 = "is the same as";
  var peg$c41 = "is";
  var peg$c42 = "is not equal to";
  var peg$c43 = "is different from";
  var peg$c44 = "is not";
  var peg$c45 = "is greater than";
  var peg$c46 = "is more than";
  var peg$c47 = "is less than";
  var peg$c48 = "is fewer than";
  var peg$c49 = "is less";
  var peg$c50 = "than";
  var peg$c51 = "or equal to";
  var peg$c52 = "or the same as";
  var peg$c53 = "is greater _";
  var peg$c54 = "is more";
  var peg$c55 = "he";
  var peg$c56 = "of";
  var peg$c57 = "plus";
  var peg$c58 = "sum";
  var peg$c59 = "minus";
  var peg$c60 = "difference";
  var peg$c61 = "times";
  var peg$c62 = "product";
  var peg$c63 = "divided by";
  var peg$c64 = "quotient";
  var peg$c65 = "modulo";
  var peg$c66 = "modulus";
  var peg$c67 = "string";
  var peg$c68 = "float";
  var peg$c69 = "int";
  var peg$c70 = "integer";
  var peg$c71 = "number";
  var peg$c72 = "boolean";
  var peg$c73 = "bool";
  var peg$c74 = "'s";
  var peg$c75 = "variable";
  var peg$c76 = "var";
  var peg$c77 = "vessel";
  var peg$c78 = "-";
  var peg$c79 = "illion";
  var peg$c80 = "housand";
  var peg$c81 = "undred";
  var peg$c82 = "ten";
  var peg$c83 = "twenty";
  var peg$c84 = "thirty";
  var peg$c85 = "forty";
  var peg$c86 = "fifty";
  var peg$c87 = "sixty";
  var peg$c88 = "seventy";
  var peg$c89 = "eighty";
  var peg$c90 = "ninety";
  var peg$c91 = "zero";
  var peg$c92 = "one";
  var peg$c93 = "two";
  var peg$c94 = "three";
  var peg$c95 = "four";
  var peg$c96 = "five";
  var peg$c97 = "six";
  var peg$c98 = "seven";
  var peg$c99 = "eight";
  var peg$c100 = "nine";
  var peg$c101 = "eleven";
  var peg$c102 = "twelve";
  var peg$c103 = "dozen";
  var peg$c104 = "thirteen";
  var peg$c105 = "fourteen";
  var peg$c106 = "fifteen";
  var peg$c107 = "sixteen";
  var peg$c108 = "seventeen";
  var peg$c109 = "eighteen";
  var peg$c110 = "nineteen";
  var peg$c111 = " and";
  var peg$c112 = "'";

  var peg$r0 = /^[Cc]/;
  var peg$r1 = /^[Ff]/;
  var peg$r2 = /^[Rr]/;
  var peg$r3 = /^[Uu]/;
  var peg$r4 = /^[Ii]/;
  var peg$r5 = /^[Ss]/;
  var peg$r6 = /^[Aa]/;
  var peg$r7 = /^[Tt]/;
  var peg$r8 = /^[a-zA-Z\xE4\xF6\xFC\xDF\xC4\xD6\xDC_]/;
  var peg$r9 = /^[a-z0-9A-Z\xE4\xF6\xFC\xDF\xC4\xD6\xDC_]/;
  var peg$r10 = /^[Mm]/;
  var peg$r11 = /^[Hh]/;
  var peg$r12 = /^["\u201C]/;
  var peg$r13 = /^[^"]/;
  var peg$r14 = /^["\u201D]/;
  var peg$r15 = /^[^']/;
  var peg$r16 = /^[ \r\n\t]/;
  var peg$r17 = /^[\r\n]/;

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
  var peg$e28 = peg$literalExpectation("remember", false);
  var peg$e29 = peg$literalExpectation("million", false);
  var peg$e30 = peg$literalExpectation("thousand", false);
  var peg$e31 = peg$literalExpectation("hundred", false);
  var peg$e32 = peg$literalExpectation("billion", false);
  var peg$e33 = peg$classExpectation([["a", "z"], ["A", "Z"], "\xE4", "\xF6", "\xFC", "\xDF", "\xC4", "\xD6", "\xDC", "_"], false, false);
  var peg$e34 = peg$classExpectation([["a", "z"], ["0", "9"], ["A", "Z"], "\xE4", "\xF6", "\xFC", "\xDF", "\xC4", "\xD6", "\xDC", "_"], false, false);
  var peg$e35 = peg$literalExpectation("lambda", false);
  var peg$e36 = peg$literalExpectation(", and", false);
  var peg$e37 = peg$literalExpectation("if", false);
  var peg$e38 = peg$literalExpectation("then", false);
  var peg$e39 = peg$literalExpectation("else", false);
  var peg$e40 = peg$literalExpectation("for", false);
  var peg$e41 = peg$literalExpectation("in", false);
  var peg$e42 = peg$literalExpectation(":", false);
  var peg$e43 = peg$literalExpectation("the", false);
  var peg$e44 = peg$literalExpectation("a", false);
  var peg$e45 = peg$literalExpectation("range", false);
  var peg$e46 = peg$literalExpectation("count", false);
  var peg$e47 = peg$literalExpectation("from", false);
  var peg$e48 = peg$literalExpectation("to", false);
  var peg$e49 = peg$literalExpectation("is equal to", false);
  var peg$e50 = peg$literalExpectation("equals", false);
  var peg$e51 = peg$literalExpectation("is the same as", false);
  var peg$e52 = peg$literalExpectation("is", false);
  var peg$e53 = peg$literalExpectation("is not equal to", false);
  var peg$e54 = peg$literalExpectation("is different from", false);
  var peg$e55 = peg$literalExpectation("is not", false);
  var peg$e56 = peg$literalExpectation("is greater than", false);
  var peg$e57 = peg$literalExpectation("is more than", false);
  var peg$e58 = peg$literalExpectation("is less than", false);
  var peg$e59 = peg$literalExpectation("is fewer than", false);
  var peg$e60 = peg$literalExpectation("is less", false);
  var peg$e61 = peg$literalExpectation("than", false);
  var peg$e62 = peg$literalExpectation("or equal to", false);
  var peg$e63 = peg$literalExpectation("or the same as", false);
  var peg$e64 = peg$literalExpectation("is greater _", false);
  var peg$e65 = peg$literalExpectation("is more", false);
  var peg$e66 = peg$literalExpectation("he", false);
  var peg$e67 = peg$literalExpectation("of", false);
  var peg$e68 = peg$literalExpectation("plus", false);
  var peg$e69 = peg$literalExpectation("sum", false);
  var peg$e70 = peg$literalExpectation("minus", false);
  var peg$e71 = peg$literalExpectation("difference", false);
  var peg$e72 = peg$literalExpectation("times", false);
  var peg$e73 = peg$literalExpectation("product", false);
  var peg$e74 = peg$literalExpectation("divided by", false);
  var peg$e75 = peg$literalExpectation("quotient", false);
  var peg$e76 = peg$literalExpectation("modulo", false);
  var peg$e77 = peg$literalExpectation("modulus", false);
  var peg$e78 = peg$literalExpectation("string", false);
  var peg$e79 = peg$literalExpectation("float", false);
  var peg$e80 = peg$literalExpectation("int", false);
  var peg$e81 = peg$literalExpectation("integer", false);
  var peg$e82 = peg$literalExpectation("number", false);
  var peg$e83 = peg$literalExpectation("boolean", false);
  var peg$e84 = peg$literalExpectation("bool", false);
  var peg$e85 = peg$literalExpectation("'s", false);
  var peg$e86 = peg$literalExpectation("variable", false);
  var peg$e87 = peg$literalExpectation("var", false);
  var peg$e88 = peg$literalExpectation("vessel", false);
  var peg$e89 = peg$literalExpectation("-", false);
  var peg$e90 = peg$classExpectation(["M", "m"], false, false);
  var peg$e91 = peg$literalExpectation("illion", false);
  var peg$e92 = peg$literalExpectation("housand", false);
  var peg$e93 = peg$classExpectation(["H", "h"], false, false);
  var peg$e94 = peg$literalExpectation("undred", false);
  var peg$e95 = peg$literalExpectation("ten", false);
  var peg$e96 = peg$literalExpectation("twenty", false);
  var peg$e97 = peg$literalExpectation("thirty", false);
  var peg$e98 = peg$literalExpectation("forty", false);
  var peg$e99 = peg$literalExpectation("fifty", false);
  var peg$e100 = peg$literalExpectation("sixty", false);
  var peg$e101 = peg$literalExpectation("seventy", false);
  var peg$e102 = peg$literalExpectation("eighty", false);
  var peg$e103 = peg$literalExpectation("ninety", false);
  var peg$e104 = peg$literalExpectation("zero", false);
  var peg$e105 = peg$literalExpectation("one", false);
  var peg$e106 = peg$literalExpectation("two", false);
  var peg$e107 = peg$literalExpectation("three", false);
  var peg$e108 = peg$literalExpectation("four", false);
  var peg$e109 = peg$literalExpectation("five", false);
  var peg$e110 = peg$literalExpectation("six", false);
  var peg$e111 = peg$literalExpectation("seven", false);
  var peg$e112 = peg$literalExpectation("eight", false);
  var peg$e113 = peg$literalExpectation("nine", false);
  var peg$e114 = peg$literalExpectation("eleven", false);
  var peg$e115 = peg$literalExpectation("twelve", false);
  var peg$e116 = peg$literalExpectation("dozen", false);
  var peg$e117 = peg$literalExpectation("thirteen", false);
  var peg$e118 = peg$literalExpectation("fourteen", false);
  var peg$e119 = peg$literalExpectation("fifteen", false);
  var peg$e120 = peg$literalExpectation("sixteen", false);
  var peg$e121 = peg$literalExpectation("seventeen", false);
  var peg$e122 = peg$literalExpectation("eighteen", false);
  var peg$e123 = peg$literalExpectation("nineteen", false);
  var peg$e124 = peg$literalExpectation(" and", false);
  var peg$e125 = peg$classExpectation(["\"", "\u201C"], false, false);
  var peg$e126 = peg$classExpectation(["\""], true, false);
  var peg$e127 = peg$classExpectation(["\"", "\u201D"], false, false);
  var peg$e128 = peg$literalExpectation("'", false);
  var peg$e129 = peg$classExpectation(["'"], true, false);
  var peg$e130 = peg$otherExpectation("whitespace");
  var peg$e131 = peg$classExpectation([" ", "\r", "\n", "\t"], false, false);
  var peg$e132 = peg$otherExpectation("newline");
  var peg$e133 = peg$classExpectation(["\r", "\n"], false, false);

  var peg$f0 = function(c) {
	return c;
};
  var peg$f1 = function() {
	return {
    	cmd: "clear"
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
        varname: flattenToString(v)
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
  var peg$f17 = function(id, r, e) {
	if (DEBUG) console.log("in For");
	return {
		cmd: "for",
		varname: id.varname,
		exp: e,
		range: r
	};
};
  var peg$f18 = function(id, i, e) {
	if (DEBUG) console.log("in For");
	return {
		cmd: "for",
		varname: id.varname,
		exp: e,
		varname: i
	};
};
  var peg$f19 = function(s, e) {
	if (DEBUG) console.log("in Range");
	return {
		type: "Range",
		start: s,
		end: e
	};
};
  var peg$f20 = function(left, op, right) {
	if (DEBUG) console.log("in Comparison");
	return {
		type: "Comparison",
		operator: op,
		left: left,
		right: right
	};
};
  var peg$f21 = function() { return "=="; };
  var peg$f22 = function() { return "!="; };
  var peg$f23 = function() { return ">"; };
  var peg$f24 = function() { return "<"; };
  var peg$f25 = function() { return "<="; };
  var peg$f26 = function() { return ">="; };
  var peg$f27 = function(left, op, right) {
	if (DEBUG) console.log("in AdditiveExpression");
	return {
		type: "Additive", 
		operator: op,
		left: left,
		right: right
    };
};
  var peg$f28 = function(op, left, right) {
	if (DEBUG) console.log("in AdditiveExpression DirectObject");
	return {
		type: "Additive", 
		operator: op,
		left: left,
		right: right
    };
};
  var peg$f29 = function(left, op, right) { 
	if (DEBUG) console.log("in MultiplicativeExpression");
	return {
    	type: "Multiplicative", 
    	operator: op,
    	left: left,
    	right: right
    };
};
  var peg$f30 = function(op, left, right) { 
	if (DEBUG) console.log("in MultiplicativeExpression DirectObject");
	return {
    	type: "Multiplicative", 
    	operator: op,
    	left: left,
    	right: right
    };
};
  var peg$f31 = function() { return "+"; };
  var peg$f32 = function() { return "+"; };
  var peg$f33 = function() { return "-"; };
  var peg$f34 = function() { return "-"; };
  var peg$f35 = function() { return "*"; };
  var peg$f36 = function() { return "*"; };
  var peg$f37 = function() { return "/"; };
  var peg$f38 = function() { return "/"; };
  var peg$f39 = function() { return "%"; };
  var peg$f40 = function() { return "%"; };
  var peg$f41 = function(g, c) {
	if (!!c) {
		g.type_coerce = c;
	}
	return g;
};
  var peg$f42 = function(type) {
	return type;
};
  var peg$f43 = function(p, id) {
	if (DEBUG) console.log("in VarWithParam");
	return {
    	type: "VariableWithParam",
        name: id,
        param: p
    };
};
  var peg$f44 = function(id, p) {
	if (DEBUG) console.log("in VarWithParam");
	return {
    	type: "VariableWithParam",
        name: id,
        param: p
    };
};
  var peg$f45 = function(id) { 
	if (DEBUG) console.log("in VariableName");
	return {
		type: "VariableName",
        name: id 
    };
};
  var peg$f46 = function(mil, thou, hun, end) {
	if (DEBUG) console.log("in NumberLiteral Millions");
	let retval = mil;
    if (thou) retval += thou;
    if (hun) retval += hun;
    if (end) retval += end;
	return { type: "IntLiteral", value: retval };
};
  var peg$f47 = function(thou, hun, end) {
	if (DEBUG) console.log("in NumberLiteral Thousands");
	let retval = thou;
    if (hun) retval += hun;
    if (end) retval += end;
	return { type: "IntLiteral", value: retval };
};
  var peg$f48 = function(hun, end) {
	if (DEBUG) console.log("in NumberLiteral Hundreds");
	let retval = hun;
    if (end) retval += end;
	return { type: "IntLiteral", value: retval };
};
  var peg$f49 = function(end) {
	if (DEBUG) console.log("in NumberLiteral EndDigit");
	return { type: "IntLiteral", value: end };
};
  var peg$f50 = function(end) {
	if (DEBUG) console.log("in MillionsDigit");
	if (end == "a") 
		end = 1;
	return end * 1000000;
};
  var peg$f51 = function(hun, end) {
	if (DEBUG) console.log("in ThousandsDigit");
	let retval = 0;
    if (end) retval += end;
    if (hun) retval += hun;
	return retval * 1000;
};
  var peg$f52 = function(end) {
	if (DEBUG) console.log("in EndDigit");
	return end * 1000;
};
  var peg$f53 = function() {
	return 1000;
};
  var peg$f54 = function(end) {
	return end * 100;
};
  var peg$f55 = function() {
	return 100;
};
  var peg$f56 = function(tens, ones) {
	let retval = 0;
	if (tens) retval += tens;
	if (ones) retval += ones;
	return retval;
};
  var peg$f57 = function() { return 10; };
  var peg$f58 = function() { return 20; };
  var peg$f59 = function() { return 30; };
  var peg$f60 = function() { return 40; };
  var peg$f61 = function() { return 50; };
  var peg$f62 = function() { return 60; };
  var peg$f63 = function() { return 70; };
  var peg$f64 = function() { return 80; };
  var peg$f65 = function() { return 90; };
  var peg$f66 = function() { return 0; };
  var peg$f67 = function() { return 1; };
  var peg$f68 = function() { return 2; };
  var peg$f69 = function() { return 3; };
  var peg$f70 = function() { return 4; };
  var peg$f71 = function() { return 5; };
  var peg$f72 = function() { return 6; };
  var peg$f73 = function() { return 7; };
  var peg$f74 = function() { return 8; };
  var peg$f75 = function() { return 9; };
  var peg$f76 = function() { return 0; };
  var peg$f77 = function() { return 11; };
  var peg$f78 = function() { return 12; };
  var peg$f79 = function() { return 12; };
  var peg$f80 = function() { return 13; };
  var peg$f81 = function() { return 14; };
  var peg$f82 = function() { return 15; };
  var peg$f83 = function() { return 16; };
  var peg$f84 = function() { return 17; };
  var peg$f85 = function() { return 18; };
  var peg$f86 = function() { return 19; };
  var peg$f87 = function(val) { 
	return {
		type: 'StringLiteral',
		value: val.join("") 
    };
};
  var peg$f88 = function(val) { 
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
      peg$savedPos = s0;
      s1 = peg$f1();
    }
    s0 = s1;

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
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parseNumberLiteral();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f9(s1);
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 8) === peg$c19) {
        s1 = peg$c19;
        peg$currPos += 8;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e28); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c20) {
          s1 = peg$c20;
          peg$currPos += 7;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e29); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 8) === peg$c21) {
            s1 = peg$c21;
            peg$currPos += 8;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e30); }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 7) === peg$c22) {
              s1 = peg$c22;
              peg$currPos += 7;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e31); }
            }
            if (s1 === peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c23) {
                s1 = peg$c23;
                peg$currPos += 7;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e32); }
              }
            }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$f10(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = input.charAt(peg$currPos);
        if (peg$r8.test(s2)) {
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e33); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = input.charAt(peg$currPos);
          if (peg$r9.test(s4)) {
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e34); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = input.charAt(peg$currPos);
            if (peg$r9.test(s4)) {
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e34); }
            }
          }
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f11(s1);
        }
        s0 = s1;
      }
    }

    return s0;
  }

  function peg$parseLambda() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6) === peg$c24) {
      s1 = peg$c24;
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e35); }
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
      if (input.substr(peg$currPos, 5) === peg$c25) {
        s5 = peg$c25;
        peg$currPos += 5;
      } else {
        s5 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e36); }
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
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 2) === peg$c26) {
      s1 = peg$c26;
      peg$currPos += 2;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e37); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseComparison();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c27) {
              s5 = peg$c27;
              peg$currPos += 4;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e38); }
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
                  s9 = peg$parseElse();
                  if (s9 === peg$FAILED) {
                    s9 = null;
                  }
                  peg$savedPos = s0;
                  s0 = peg$f15(s3, s7, s9);
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

    return s0;
  }

  function peg$parseElse() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4) === peg$c28) {
      s1 = peg$c28;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e39); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseExpression();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s0 = peg$f16(s2);
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
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c29) {
      s1 = peg$c29;
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e40); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseIdentifier();
        if (s3 !== peg$FAILED) {
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c30) {
              s5 = peg$c30;
              peg$currPos += 2;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e41); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseRange();
                if (s7 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 58) {
                    s8 = peg$c31;
                    peg$currPos++;
                  } else {
                    s8 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e42); }
                  }
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parse_();
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parseExpression();
                      if (s10 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s0 = peg$f17(s3, s7, s10);
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
      if (input.substr(peg$currPos, 3) === peg$c29) {
        s1 = peg$c29;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e40); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseIdentifier();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c30) {
                s5 = peg$c30;
                peg$currPos += 2;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e41); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseIdentifier();
                  if (s7 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 58) {
                      s8 = peg$c31;
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e42); }
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parse_();
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parseExpression();
                        if (s10 !== peg$FAILED) {
                          peg$savedPos = s0;
                          s0 = peg$f18(s3, s7, s10);
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
        s0 = peg$parseRange();
        if (s0 === peg$FAILED) {
          s0 = peg$parseComparison();
        }
      }
    }

    return s0;
  }

  function peg$parseRange() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c32) {
      s3 = peg$c32;
      peg$currPos += 3;
    } else {
      s3 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e43); }
    }
    if (s3 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 97) {
        s3 = peg$c33;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e44); }
      }
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
      s2 = null;
    }
    if (input.substr(peg$currPos, 5) === peg$c34) {
      s3 = peg$c34;
      peg$currPos += 5;
    } else {
      s3 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e45); }
    }
    if (s3 === peg$FAILED) {
      if (input.substr(peg$currPos, 5) === peg$c35) {
        s3 = peg$c35;
        peg$currPos += 5;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e46); }
      }
    }
    if (s3 !== peg$FAILED) {
      s4 = peg$parse_();
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
    if (s1 === peg$FAILED) {
      s1 = null;
    }
    if (input.substr(peg$currPos, 4) === peg$c36) {
      s2 = peg$c36;
      peg$currPos += 4;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e47); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parseExpression();
      if (s3 !== peg$FAILED) {
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c37) {
            s5 = peg$c37;
            peg$currPos += 2;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e48); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseExpression();
              if (s7 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f19(s3, s7);
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

    return s0;
  }

  function peg$parseComparison() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parseAdditiveExpression();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
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
        if (s4 === peg$FAILED) {
          s4 = null;
        }
        s5 = peg$parseExpression();
        if (s5 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f20(s1, s3, s5);
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
    if (input.substr(peg$currPos, 11) === peg$c38) {
      s1 = peg$c38;
      peg$currPos += 11;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e49); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 6) === peg$c39) {
        s1 = peg$c39;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e50); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 14) === peg$c40) {
          s1 = peg$c40;
          peg$currPos += 14;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e51); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c41) {
            s1 = peg$c41;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e52); }
          }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f21();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseNotEqualTo() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 15) === peg$c42) {
      s1 = peg$c42;
      peg$currPos += 15;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e53); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 17) === peg$c43) {
        s1 = peg$c43;
        peg$currPos += 17;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e54); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c44) {
          s1 = peg$c44;
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e55); }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f22();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseGreaterThan() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 15) === peg$c45) {
      s1 = peg$c45;
      peg$currPos += 15;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e56); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 12) === peg$c46) {
        s1 = peg$c46;
        peg$currPos += 12;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e57); }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f23();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseLessThan() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 12) === peg$c47) {
      s1 = peg$c47;
      peg$currPos += 12;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e58); }
    }
    if (s1 === peg$FAILED) {
      if (input.substr(peg$currPos, 13) === peg$c48) {
        s1 = peg$c48;
        peg$currPos += 13;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e59); }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f24();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseLessThanEqualTo() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.substr(peg$currPos, 7) === peg$c49) {
      s2 = peg$c49;
      peg$currPos += 7;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e60); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s4 = peg$currPos;
        if (input.substr(peg$currPos, 4) === peg$c50) {
          s5 = peg$c50;
          peg$currPos += 4;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e61); }
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
        if (input.substr(peg$currPos, 11) === peg$c51) {
          s5 = peg$c51;
          peg$currPos += 11;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e62); }
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
      if (input.substr(peg$currPos, 7) === peg$c49) {
        s2 = peg$c49;
        peg$currPos += 7;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e60); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          if (input.substr(peg$currPos, 4) === peg$c50) {
            s5 = peg$c50;
            peg$currPos += 4;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e61); }
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
          if (input.substr(peg$currPos, 14) === peg$c52) {
            s5 = peg$c52;
            peg$currPos += 14;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e63); }
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
      s1 = peg$f25();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseGreaterThanEqualTo() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    s1 = peg$currPos;
    if (input.substr(peg$currPos, 12) === peg$c53) {
      s2 = peg$c53;
      peg$currPos += 12;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e64); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c50) {
        s4 = peg$c50;
        peg$currPos += 4;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e61); }
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$parse_();
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
      if (input.substr(peg$currPos, 11) === peg$c51) {
        s4 = peg$c51;
        peg$currPos += 11;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e62); }
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
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      if (input.substr(peg$currPos, 7) === peg$c54) {
        s2 = peg$c54;
        peg$currPos += 7;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e65); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$currPos;
          if (input.substr(peg$currPos, 4) === peg$c50) {
            s5 = peg$c50;
            peg$currPos += 4;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e61); }
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
          if (input.substr(peg$currPos, 14) === peg$c52) {
            s5 = peg$c52;
            peg$currPos += 14;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e63); }
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
      s1 = peg$f26();
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
        if (input.substr(peg$currPos, 2) === peg$c55) {
          s2 = peg$c55;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e66); }
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
            if (input.substr(peg$currPos, 2) === peg$c56) {
              s6 = peg$c56;
              peg$currPos += 2;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e67); }
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
                      s0 = peg$f28(s4, s8, s12);
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
          s0 = peg$f29(s1, s3, s5);
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
        if (input.substr(peg$currPos, 2) === peg$c55) {
          s2 = peg$c55;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e66); }
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
            if (input.substr(peg$currPos, 2) === peg$c56) {
              s6 = peg$c56;
              peg$currPos += 2;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e67); }
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
                      s0 = peg$f30(s4, s8, s12);
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
    if (input.substr(peg$currPos, 4) === peg$c57) {
      s1 = peg$c57;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e68); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f31();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseAdditionOpDirectObject() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c58) {
      s1 = peg$c58;
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e69); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f32();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseSubtractionOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5) === peg$c59) {
      s1 = peg$c59;
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e70); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f33();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseSubtractionOpDirectObject() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 10) === peg$c60) {
      s1 = peg$c60;
      peg$currPos += 10;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e71); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f34();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseMultiplicationOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5) === peg$c61) {
      s1 = peg$c61;
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e72); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f35();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseMultiplicationOpDirectObject() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 7) === peg$c62) {
      s1 = peg$c62;
      peg$currPos += 7;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e73); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f36();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseDivisionOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 10) === peg$c63) {
      s1 = peg$c63;
      peg$currPos += 10;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e74); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f37();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseDivisionOpDirectObject() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 8) === peg$c64) {
      s1 = peg$c64;
      peg$currPos += 8;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e75); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f38();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseModuloOp() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6) === peg$c65) {
      s1 = peg$c65;
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e76); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f39();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseModuloOpDirectObject() {
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 7) === peg$c66) {
      s1 = peg$c66;
      peg$currPos += 7;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e77); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f40();
    }
    s0 = s1;

    return s0;
  }

  function peg$parseUnaryExpression() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseLiteral();
    if (s1 === peg$FAILED) {
      s1 = peg$parseVarWithParam();
      if (s1 === peg$FAILED) {
        s1 = peg$parseVariableName();
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseTypeConvert();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      peg$savedPos = s0;
      s0 = peg$f41(s1, s2);
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
        if (input.substr(peg$currPos, 6) === peg$c67) {
          s4 = peg$c67;
          peg$currPos += 6;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e78); }
        }
        if (s4 === peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c68) {
            s4 = peg$c68;
            peg$currPos += 5;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e79); }
          }
          if (s4 === peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c69) {
              s4 = peg$c69;
              peg$currPos += 3;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e80); }
            }
            if (s4 === peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c70) {
                s4 = peg$c70;
                peg$currPos += 7;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e81); }
              }
              if (s4 === peg$FAILED) {
                if (input.substr(peg$currPos, 6) === peg$c71) {
                  s4 = peg$c71;
                  peg$currPos += 6;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e82); }
                }
                if (s4 === peg$FAILED) {
                  if (input.substr(peg$currPos, 7) === peg$c72) {
                    s4 = peg$c72;
                    peg$currPos += 7;
                  } else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e83); }
                  }
                  if (s4 === peg$FAILED) {
                    if (input.substr(peg$currPos, 4) === peg$c73) {
                      s4 = peg$c73;
                      peg$currPos += 4;
                    } else {
                      s4 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e84); }
                    }
                  }
                }
              }
            }
          }
        }
        if (s4 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f42(s4);
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
    s1 = peg$parseIdentifier();
    if (s1 !== peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c74) {
        s2 = peg$c74;
        peg$currPos += 2;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e85); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseIdentifier();
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f43(s1, s4);
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
              s5 = peg$parseIdentifier();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s0 = peg$f44(s1, s5);
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
    if (input.substr(peg$currPos, 3) === peg$c32) {
      s2 = peg$c32;
      peg$currPos += 3;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e43); }
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        if (input.substr(peg$currPos, 8) === peg$c75) {
          s4 = peg$c75;
          peg$currPos += 8;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e86); }
        }
        if (s4 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c76) {
            s4 = peg$c76;
            peg$currPos += 3;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e87); }
          }
          if (s4 === peg$FAILED) {
            if (input.substr(peg$currPos, 6) === peg$c77) {
              s4 = peg$c77;
              peg$currPos += 6;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e88); }
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
      s0 = peg$f45(s2);
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
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseMillionsDigit();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseDigitSeparator();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = peg$parseThousandsDigit();
      if (s3 === peg$FAILED) {
        s3 = null;
      }
      s4 = peg$parseDigitSeparator();
      if (s4 === peg$FAILED) {
        s4 = null;
      }
      s5 = peg$parseHundredsDigit();
      if (s5 === peg$FAILED) {
        s5 = null;
      }
      s6 = peg$parseDigitSeparator();
      if (s6 === peg$FAILED) {
        s6 = null;
      }
      s7 = peg$parseEndDigit();
      if (s7 === peg$FAILED) {
        s7 = null;
      }
      peg$savedPos = s0;
      s0 = peg$f46(s1, s3, s5, s7);
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseThousandsDigit();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseDigitSeparator();
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s3 = peg$parseHundredsDigit();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        s4 = peg$parseDigitSeparator();
        if (s4 === peg$FAILED) {
          s4 = null;
        }
        s5 = peg$parseEndDigit();
        if (s5 === peg$FAILED) {
          s5 = null;
        }
        peg$savedPos = s0;
        s0 = peg$f47(s1, s3, s5);
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseHundredsDigit();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseDigitSeparator();
          if (s2 === peg$FAILED) {
            s2 = null;
          }
          s3 = peg$parseEndDigit();
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f48(s1, s3);
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseEndDigit();
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f49(s1);
          }
          s0 = s1;
        }
      }
    }

    return s0;
  }

  function peg$parseMillionsDigit() {
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parseHundredsDigit();
    if (s1 === peg$FAILED) {
      s1 = peg$parseEndDigit();
      if (s1 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 97) {
          s1 = peg$c33;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e44); }
        }
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s2 = peg$c78;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e89); }
        }
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = input.charAt(peg$currPos);
      if (peg$r10.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e90); }
      }
      if (s3 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c79) {
          s4 = peg$c79;
          peg$currPos += 6;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e91); }
        }
        if (s4 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f50(s1);
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

  function peg$parseThousandsDigit() {
    var s0, s1, s2, s3, s4, s5;

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
            s2 = peg$c78;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e89); }
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
      s4 = input.charAt(peg$currPos);
      if (peg$r7.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e25); }
      }
      if (s4 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c80) {
          s5 = peg$c80;
          peg$currPos += 7;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e92); }
        }
        if (s5 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f51(s1, s3);
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
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 45) {
            s2 = peg$c78;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e89); }
          }
        }
        if (s2 === peg$FAILED) {
          s2 = null;
        }
        s3 = input.charAt(peg$currPos);
        if (peg$r7.test(s3)) {
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e25); }
        }
        if (s3 !== peg$FAILED) {
          if (input.substr(peg$currPos, 7) === peg$c80) {
            s4 = peg$c80;
            peg$currPos += 7;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e92); }
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f52(s1);
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
          s1 = peg$c33;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e44); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            if (input.substr(peg$currPos, 8) === peg$c21) {
              s3 = peg$c21;
              peg$currPos += 8;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e30); }
            }
            if (s3 !== peg$FAILED) {
              peg$savedPos = s0;
              s0 = peg$f53();
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
    var s0, s1, s2, s3, s4;

    s0 = peg$currPos;
    s1 = peg$parseEndDigit();
    if (s1 !== peg$FAILED) {
      s2 = peg$parse_();
      if (s2 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s2 = peg$c78;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e89); }
        }
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      s3 = input.charAt(peg$currPos);
      if (peg$r11.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e93); }
      }
      if (s3 !== peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c81) {
          s4 = peg$c81;
          peg$currPos += 6;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e94); }
        }
        if (s4 !== peg$FAILED) {
          peg$savedPos = s0;
          s0 = peg$f54(s1);
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
        s1 = peg$c33;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e44); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 7) === peg$c22) {
            s3 = peg$c22;
            peg$currPos += 7;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e31); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s0 = peg$f55();
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
              s2 = peg$c78;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e89); }
            }
            if (s2 === peg$FAILED) {
              s2 = peg$parse_();
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
        s0 = peg$f56(s1, s3);
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
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 3) === peg$c82) {
      s1 = peg$c82;
      peg$currPos += 3;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e95); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f57();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c83) {
        s1 = peg$c83;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e96); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$f58();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 6) === peg$c84) {
          s1 = peg$c84;
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e97); }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f59();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 5) === peg$c85) {
            s1 = peg$c85;
            peg$currPos += 5;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e98); }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f60();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 5) === peg$c86) {
              s1 = peg$c86;
              peg$currPos += 5;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e99); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$f61();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 5) === peg$c87) {
                s1 = peg$c87;
                peg$currPos += 5;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e100); }
              }
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$f62();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 7) === peg$c88) {
                  s1 = peg$c88;
                  peg$currPos += 7;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e101); }
                }
                if (s1 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$f63();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 6) === peg$c89) {
                    s1 = peg$c89;
                    peg$currPos += 6;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e102); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$f64();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 6) === peg$c90) {
                      s1 = peg$c90;
                      peg$currPos += 6;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e103); }
                    }
                    if (s1 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$f65();
                    }
                    s0 = s1;
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
    var s0, s1;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 4) === peg$c91) {
      s1 = peg$c91;
      peg$currPos += 4;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e104); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f66();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c92) {
        s1 = peg$c92;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e105); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$f67();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 3) === peg$c93) {
          s1 = peg$c93;
          peg$currPos += 3;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e106); }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$f68();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 5) === peg$c94) {
            s1 = peg$c94;
            peg$currPos += 5;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e107); }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f69();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 4) === peg$c95) {
              s1 = peg$c95;
              peg$currPos += 4;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e108); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$f70();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 4) === peg$c96) {
                s1 = peg$c96;
                peg$currPos += 4;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e109); }
              }
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$f71();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 3) === peg$c97) {
                  s1 = peg$c97;
                  peg$currPos += 3;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e110); }
                }
                if (s1 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$f72();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 5) === peg$c98) {
                    s1 = peg$c98;
                    peg$currPos += 5;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e111); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$f73();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 5) === peg$c99) {
                      s1 = peg$c99;
                      peg$currPos += 5;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e112); }
                    }
                    if (s1 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$f74();
                    }
                    s0 = s1;
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      if (input.substr(peg$currPos, 4) === peg$c100) {
                        s1 = peg$c100;
                        peg$currPos += 4;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e113); }
                      }
                      if (s1 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$f75();
                      }
                      s0 = s1;
                      if (s0 === peg$FAILED) {
                        s0 = peg$currPos;
                        if (input.substr(peg$currPos, 4) === peg$c91) {
                          s1 = peg$c91;
                          peg$currPos += 4;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$e104); }
                        }
                        if (s1 !== peg$FAILED) {
                          peg$savedPos = s0;
                          s1 = peg$f76();
                        }
                        s0 = s1;
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
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 6) === peg$c101) {
      s1 = peg$c101;
      peg$currPos += 6;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e114); }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$f77();
    }
    s0 = s1;
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c102) {
        s1 = peg$c102;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e115); }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$f78();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 97) {
          s1 = peg$c33;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e44); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            if (input.substr(peg$currPos, 5) === peg$c103) {
              s3 = peg$c103;
              peg$currPos += 5;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e116); }
            }
            if (s3 !== peg$FAILED) {
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
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 8) === peg$c104) {
            s1 = peg$c104;
            peg$currPos += 8;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$e117); }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$f80();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 8) === peg$c105) {
              s1 = peg$c105;
              peg$currPos += 8;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$e118); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$f81();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 7) === peg$c106) {
                s1 = peg$c106;
                peg$currPos += 7;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$e119); }
              }
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$f82();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 7) === peg$c107) {
                  s1 = peg$c107;
                  peg$currPos += 7;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$e120); }
                }
                if (s1 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$f83();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 9) === peg$c108) {
                    s1 = peg$c108;
                    peg$currPos += 9;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$e121); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$f84();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 8) === peg$c109) {
                      s1 = peg$c109;
                      peg$currPos += 8;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$e122); }
                    }
                    if (s1 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$f85();
                    }
                    s0 = s1;
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      if (input.substr(peg$currPos, 8) === peg$c110) {
                        s1 = peg$c110;
                        peg$currPos += 8;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$e123); }
                      }
                      if (s1 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$f86();
                      }
                      s0 = s1;
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
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.substr(peg$currPos, 5) === peg$c25) {
      s1 = peg$c25;
      peg$currPos += 5;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e36); }
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
      if (input.substr(peg$currPos, 4) === peg$c111) {
        s1 = peg$c111;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e124); }
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
          s0 = peg$parse_();
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
    if (peg$r12.test(s2)) {
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e125); }
    }
    if (s2 !== peg$FAILED) {
      s3 = [];
      s4 = input.charAt(peg$currPos);
      if (peg$r13.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e126); }
      }
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = input.charAt(peg$currPos);
        if (peg$r13.test(s4)) {
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e126); }
        }
      }
      s4 = input.charAt(peg$currPos);
      if (peg$r14.test(s4)) {
        peg$currPos++;
      } else {
        s4 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e127); }
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$parse_();
        if (s5 === peg$FAILED) {
          s5 = null;
        }
        peg$savedPos = s0;
        s0 = peg$f87(s3);
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
      s2 = peg$c112;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e128); }
    }
    if (s2 !== peg$FAILED) {
      s3 = input.charAt(peg$currPos);
      if (peg$r15.test(s3)) {
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$e129); }
      }
      if (s3 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 39) {
          s4 = peg$c112;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e128); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parse_();
          if (s5 === peg$FAILED) {
            s5 = null;
          }
          peg$savedPos = s0;
          s0 = peg$f88(s3);
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
    if (peg$r16.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e131); }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = input.charAt(peg$currPos);
        if (peg$r16.test(s1)) {
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e131); }
        }
      }
    } else {
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e130); }
    }

    return s0;
  }

  function peg$parse__() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    s1 = input.charAt(peg$currPos);
    if (peg$r17.test(s1)) {
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e133); }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = input.charAt(peg$currPos);
        if (peg$r17.test(s1)) {
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$e133); }
        }
      }
    } else {
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$e132); }
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
