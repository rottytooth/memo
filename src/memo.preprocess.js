memo.preprocess = function(input) {
    // Preserve string literals - we don't want to modify them
    const stringLiterals = [];
    let processed = input.replace(/(["'"])[^"']*\1/g, (match) => {
        stringLiterals.push(match);
        return `__STRING_${stringLiterals.length - 1}__`;
    });

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    // Handle clarification command variants
    // "I meant: command" -> "clarify command"
    // "I meant command" -> "clarify command"
    // "I mean command" -> "clarify command"
    // "That means command" -> "clarify command"
    // "To mean command" -> "clarify command"
    processed = processed.replace(/\b(I\s+meant|I\s+mean|That\s+means|To\s+mean):?\s+/gi, 'clarify ');

    // Handle forget/clear variants - both now require a variable name
    // "forget x" -> "clear x"
    processed = processed.replace(/\bforget\b/gi, 'clear');

    // Handle "x is value" assignment syntax -> "remember x as value"
    // Match: identifier followed by "is" followed by value/expression
    // But not when "is" is part of "what is" or comparison operators
    // And not when "is" appears after "if", "then", or "else" (inside conditionals)
    // And not when "is" appears after "where" or "when" (inside filter expressions)
    // And not when "is" appears after arithmetic operators (plus, minus, times, divided by, modulo)
    processed = processed.replace(
        /\b(?!what\s+)(?<!if\s)(?<!then\s)(?<!else\s)(?<!where\s)(?<!when\s)(?<!plus\s)(?<!minus\s)(?<!times\s)(?<!by\s)(?<!modulo\s)([a-zA-Z_][a-zA-Z0-9_]*)\s+is\s+(?!equal|greater|less|than|not|more|fewer|the\s+same|different)(.+)/gi,
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

    const operatorSynonyms = {
        // Addition
        'add': 'plus',
        'added to': 'plus',
        'adding': 'plus',
        'combined with': 'plus',

        // Subtraction
        'subtract': 'minus',
        // 'subtracted from' is handled in preprocessing with operand flipping
        'subtracting': 'minus',
        'take away': 'minus',

        // Multiplication
        'multiply': 'times',
        'multiplied by': 'times',
        'mult': 'times',

        // Division
        'divide': 'divided by',
        'div': 'divided by',
        'over': 'divided by',

        // Modulo
        'mod': 'modulo',
        'remainder': 'modulo',
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

    // Protect reduce expressions from 'of' → 'with' conversion
    // Replace "the sum of", "sum of", "product of", etc. with temporary markers
    const reduceMarkers = [];
    processed = processed.replace(/\b(the\s+)?(sum|product|quotient|modulus|total|minimum|maximum|count|average)\s+of\s+/gi, (match) => {
        reduceMarkers.push(match);
        return `__REDUCE_MARKER_${reduceMarkers.length - 1}__`;
    });

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

    // Restore reduce expressions
    reduceMarkers.forEach((marker, index) => {
        processed = processed.replace(`__REDUCE_MARKER_${index}__`, marker);
    });

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

/**
 * Extract variable names and expressions from AST
 */
memo.extractPlaceholders = function(ast) {
    const placeholders = [];

    if (ast.cmd === 'let') {
        // Assignment command: "Remember x as value"
        placeholders.push({ type: 'varname', value: ast.varname });

        // Extract expression (could be a literal, variable reference, etc.)
        if (ast.exp) {
            const expStr = memo.tools.expToStr(ast.exp, false);
            placeholders.push({ type: 'expression', value: expStr });
        }
    } else if (ast.cmd === 'print') {
        // Print command: "Tell me x"
        if (ast.exp) {
            const expStr = memo.tools.expToStr(ast.exp, false);
            placeholders.push({ type: 'expression', value: expStr });
        }
    }

    return placeholders;
};

/**
 * Create a pattern from previousLine with placeholders for variables/expressions
 */
memo.createPattern = function(previousLine, placeholders) {
    let pattern = previousLine;

    // Replace each placeholder value with a placeholder token
    placeholders.forEach((placeholder, index) => {
        const token = `{${placeholder.type}${index}}`;
        // Try to find and replace the placeholder value in the pattern
        // Use case-insensitive search
        const regex = new RegExp(placeholder.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        pattern = pattern.replace(regex, token);
    });

    return pattern;
};

/**
 * Store learned pattern in local storage
 */
memo.learnPattern = function(pattern, commandType, placeholders) {
    // Initialize learned patterns if not exists
    if (typeof localStorage !== 'undefined') {
        let learnedPatterns = localStorage.getItem('memo.learnedPatterns');
        learnedPatterns = learnedPatterns ? JSON.parse(learnedPatterns) : [];

        learnedPatterns.push({
            pattern: pattern,
            commandType: commandType, // 'remember' or 'tell'
            placeholders: placeholders,
            timestamp: Date.now()
        });

        localStorage.setItem('memo.learnedPatterns', JSON.stringify(learnedPatterns));
    }
};

/**
 * Process a clarification command
 *
 * Clarifications can only be run immediately after a syntax error, or after
 * a series of clarifications following a syntax error.
 *
 * @param {string} currentLine - The current input line being processed
 * @param {string} previousLine - The previous line that caused a syntax error
 * @param {object} ast - The parsed AST from the parser
 * @returns {object} - Result containing either the processed command or an error
 */
memo.processClarification = function(currentLine, previousLine, ast) {
    // Get the previous error from memo.lastError
    const previousError = memo.lastError;

    // Validate that we're in a clarification context
    if (!previousError) {
        return {
            error: true,
            message: "I can only clarify after a syntax error."
        };
    }

    // Verify this is a clarification command
    if (!ast || ast.cmd !== 'clarify') {
        return {
            error: true,
            message: "This is not a clarification command."
        };
    }

    // Check that the previous error was a syntax error
    if (previousError.name !== 'SyntaxError' && !previousError.isSyntaxError) {
        return {
            error: true,
            message: "I can only clarify after a syntax error, not a runtime error."
        };
    }

    // Extract the inner command from the clarification
    const innerCommand = ast.innerCommand;

    if (!innerCommand) {
        return {
            error: true,
            message: "Clarification must contain a complete command."
        };
    }

    // Learn the pattern: map previousLine to the correct command
    const placeholders = memo.extractPlaceholders(innerCommand);
    const pattern = memo.createPattern(previousLine, placeholders);

    // Determine command type
    let commandType = null;
    if (innerCommand.cmd === 'let') {
        commandType = 'remember';
    } else if (innerCommand.cmd === 'print') {
        commandType = 'tell';
    }

    // Store the learned pattern
    if (commandType) {
        memo.learnPattern(pattern, commandType, placeholders);
    }

    // Return the inner command to be processed normally
    return {
        error: false,
        ast: innerCommand,
        message: null
    };
};

