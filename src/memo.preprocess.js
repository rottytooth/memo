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

    // Normalize multiple spaces back to single space
    processed = processed.replace(/\s+/g, ' ').trim();

    // Restore string literals
    stringLiterals.forEach((literal, index) => {
        processed = processed.replace(`__STRING_${index}__`, literal);
    });

    return processed;
};

