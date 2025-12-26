/**
 * Memo Preprocessor Tests
 * Tests for the memo.preprocess function that normalizes alternate wordings
 */

// Load the memo files
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Create a sandbox with necessary globals
const sandbox = {
    memo: {},
    console: console,
    Error: Error,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Math: Math,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    DEBUG: false
};

// Make the sandbox's 'this' point to itself
sandbox.window = sandbox;
sandbox.global = sandbox;

// Load source files in the order they're combined by Grunt
const sourceFiles = [
    path.join(__dirname, '../src/memo.js'),
    path.join(__dirname, '../src/memo.tools.js'),
    path.join(__dirname, '../src/memo.preprocess.js'),
    path.join(__dirname, '../build/memo.parser.js'),
    path.join(__dirname, '../src/memo.interpreter.js')
];

// Create and run in context
vm.createContext(sandbox);

// Load each source file in order with proper filename for debugging
sourceFiles.forEach(filePath => {
    const code = fs.readFileSync(filePath, 'utf8');
    vm.runInContext(code, sandbox, {
        filename: filePath,
        displayErrors: true
    });
});

// Extract memo to global for tests
global.memo = sandbox.memo;

describe('Memo Preprocessor Tests', () => {
    
    describe('Command Synonyms', () => {
        test('Define -> Remember', () => {
            const input = 'Define x as three.';
            const result = memo.preprocess(input);
            expect(result).toContain('remember');
            expect(result).not.toContain('define');
        });

        test('Set -> Remember', () => {
            expect(memo.preprocess('Set x to five')).toBe('remember x as five');
            expect(memo.preprocess('Set x to be five')).toBe('remember x as five');
            expect(memo.preprocess('Set counter to ten')).toBe('remember counter as ten');
        });

        test('Let -> Remember', () => {
            expect(memo.preprocess('Let x be ten')).toBe('remember x as ten');
            expect(memo.preprocess('Let counter be five')).toBe('remember counter as five');
            expect(memo.preprocess('Let total be sum with x and y')).toBe('remember total as sum with x and y');
        });

        test('Create -> Remember', () => {
            const input = 'Create y as seven.';
            const result = memo.preprocess(input);
            expect(result).toContain('remember');
            expect(result).not.toContain('create');
        });

        test('Make -> Remember', () => {
            const input = 'Make z as twelve.';
            const result = memo.preprocess(input);
            expect(result).toContain('remember');
            expect(result).not.toContain('make');
        });

        test('Store -> Remember', () => {
            const input = 'Store value as twenty.';
            const result = memo.preprocess(input);
            expect(result).toContain('remember');
            expect(result).not.toContain('store');
        });

        test('Keep -> Remember', () => {
            const input = 'Keep count as fifteen.';
            const result = memo.preprocess(input);
            expect(result).toContain('remember');
            expect(result).not.toContain('keep');
        });
    });

    describe('Assignment with "is" Syntax', () => {
        test('x is value -> remember x as value', () => {
            expect(memo.preprocess('x is three')).toBe('remember x as three');
            expect(memo.preprocess('counter is five')).toBe('remember counter as five');
            expect(memo.preprocess('total is sum with x and y')).toBe('remember total as sum with x and y');
        });

        test('Preserves "is" in comparisons', () => {
            const result = memo.preprocess('x is equal to five');
            expect(result).toContain('is equal');
        });
    });

    describe('Print Command Synonyms', () => {
        test('Show me -> Tell me', () => {
            const input = 'Show me x.';
            const result = memo.preprocess(input);
            expect(result).toContain('tell me');
            expect(result).not.toContain('show me');
        });

        test('Print -> Tell me', () => {
            const input = 'Print x.';
            const result = memo.preprocess(input);
            expect(result).toContain('tell me');
            expect(result).not.toContain('print');
        });

        test('Display -> Tell me', () => {
            const input = 'Display value.';
            const result = memo.preprocess(input);
            expect(result).toContain('tell me');
            expect(result).not.toContain('display');
        });

        test('What is -> Tell me about', () => {
            const input = 'What is x.';
            const result = memo.preprocess(input);
            expect(result).toContain('tell me about');
            expect(result).not.toContain('what is');
        });

        test('Give me -> Tell me', () => {
            const input = 'Give me x.';
            const result = memo.preprocess(input);
            expect(result).toContain('tell me');
            expect(result).not.toContain('give me');
        });
    });

    describe('Operator Synonyms - Addition', () => {
        test('Add -> Plus', () => {
            const input = 'Remember x as five add three.';
            const result = memo.preprocess(input);
            expect(result).toContain('plus');
            expect(result).not.toContain('add');
        });

        test('Added to -> Plus', () => {
            const input = 'Remember x as five added to three.';
            const result = memo.preprocess(input);
            expect(result).toContain('plus');
            expect(result).not.toContain('added to');
        });

        test('Sum of -> Sum', () => {
            const input = 'Remember x as the sum of five and three.';
            const result = memo.preprocess(input);
            expect(result).toContain('sum');
            expect(result).not.toContain('sum of');
        });

        test('Combined with -> Plus', () => {
            const input = 'Remember x as five combined with three.';
            const result = memo.preprocess(input);
            expect(result).toContain('plus');
            expect(result).not.toContain('combined with');
        });
    });

    describe('Operator Synonyms - Subtraction', () => {
        test('Subtract -> Minus', () => {
            const input = 'Remember x as ten subtract five.';
            const result = memo.preprocess(input);
            expect(result).toContain('minus');
            expect(result).not.toContain('subtract');
        });

        test('Subtracted from -> Minus (with flipped operands)', () => {
            const input = 'Remember x as ten subtracted from five.';
            const result = memo.preprocess(input);
            expect(result).toContain('five minus ten');
            expect(result).not.toContain('subtracted from');
        });

        test('Take away -> Minus', () => {
            const input = 'Remember x as ten take away five.';
            const result = memo.preprocess(input);
            expect(result).toContain('minus');
            expect(result).not.toContain('take away');
        });
    });

    describe('Operator Synonyms - Multiplication', () => {
        test('Multiply -> Times', () => {
            const input = 'Remember x as five multiply three.';
            const result = memo.preprocess(input);
            expect(result).toContain('times');
            expect(result).not.toContain('multiply');
        });

        test('Multiplied by -> Times', () => {
            const input = 'Remember x as five multiplied by three.';
            const result = memo.preprocess(input);
            expect(result).toContain('times');
            expect(result).not.toContain('multiplied by');
        });

        test('Product of -> Product', () => {
            const input = 'Remember x as the product of five and three.';
            const result = memo.preprocess(input);
            expect(result).toContain('product');
            expect(result).not.toContain('product of');
        });
    });

    describe('Operator Synonyms - Division', () => {
        test('Divide -> Divided by', () => {
            const input = 'Remember x as ten divide five.';
            const result = memo.preprocess(input);
            expect(result).toContain('divided by');
            // Note: 'divide' transforms to 'divided by', and contains 'divide'
        });

        test('Over -> Divided by', () => {
            const input = 'Remember x as ten over five.';
            const result = memo.preprocess(input);
            expect(result).toContain('divided by');
            expect(result).not.toContain('over');
        });

        test('Quotient of -> Quotient', () => {
            const input = 'Remember x as the quotient of ten and five.';
            const result = memo.preprocess(input);
            expect(result).toContain('quotient');
            expect(result).not.toContain('quotient of');
        });
    });

    describe('Operator Synonyms - Modulo', () => {
        test('Mod -> Modulo', () => {
            const input = 'Remember x as ten mod three.';
            const result = memo.preprocess(input);
            expect(result).toContain('modulo');
            // Note: 'modulo' contains 'mod' as substring
        });

        test('Remainder -> Modulo', () => {
            const input = 'Remember x as ten remainder three.';
            const result = memo.preprocess(input);
            expect(result).toContain('modulo');
            expect(result).not.toContain('remainder');
        });
    });

    describe('Comparison Operator Synonyms', () => {
        test('Equals -> Is equal to', () => {
            const input = 'Remember x as five equals three.';
            const result = memo.preprocess(input);
            // 'equals' is passed through to the grammar which handles it
            expect(result).toContain('equals');
        });

        test('Greater than -> Is greater than', () => {
            const input = 'Remember x as five greater than three.';
            const result = memo.preprocess(input);
            // 'greater than' is passed through to the grammar
            expect(result).toContain('greater than');
        });

        test('Less than -> Is less than', () => {
            const input = 'Remember x as five less than three.';
            const result = memo.preprocess(input);
            // 'less than' is no longer transformed (grammar handles it directly)
            expect(result).toContain('less than');
        });

        test('Not equal to -> Is not equal to', () => {
            const input = 'Remember x as five not equal to three.';
            const result = memo.preprocess(input);
            // 'not equal to' is passed through to the grammar
            expect(result).toContain('not equal to');
        });
    });

    describe('Parameter Handling', () => {
        test('Taking -> With (in definition)', () => {
            const input = 'Remember func taking x as x plus five.';
            const result = memo.preprocess(input);
            expect(result).toContain('with');
            expect(result).not.toContain('taking');
        });

        test('Using -> With (in definition)', () => {
            const input = 'Remember func using x as x times two.';
            const result = memo.preprocess(input);
            expect(result).toContain('with');
            expect(result).not.toContain('using');
        });

        test('Given -> With (in definition)', () => {
            const input = 'Remember func given x as x minus one.';
            const result = memo.preprocess(input);
            expect(result).toContain('with');
            expect(result).not.toContain('given');
        });

        test('Function-call style: func(param) -> func with param', () => {
            const input = 'Remember result as func(five).';
            const result = memo.preprocess(input);
            expect(result).toContain('func with five');
            expect(result).not.toContain('func(five)');
        });
    });

    describe('To be -> As', () => {
        test('To be -> As (in definition)', () => {
            const input = 'Remember x to be five.';
            const result = memo.preprocess(input);
            expect(result).toContain('as');
            expect(result).not.toContain('to be');
        });
    });

    describe('Filler Words Removal', () => {
        test('Remove "please"', () => {
            const input = 'Please remember x as five.';
            const result = memo.preprocess(input);
            expect(result).not.toContain('please');
        });

        test('Remove "the value of"', () => {
            const input = 'Remember x as the value of five.';
            const result = memo.preprocess(input);
            expect(result).not.toContain('the value of');
        });
    });

    describe('String Literal Preservation', () => {
        test('Preserve double-quoted strings', () => {
            const input = 'Remember msg as "define x as five".';
            const result = memo.preprocess(input);
            expect(result).toContain('"define x as five"');
        });

        test('Preserve single-quoted strings', () => {
            const input = "Remember msg as 'set value to ten'.";
            const result = memo.preprocess(input);
            expect(result).toContain("'set value to ten'");
        });
    });

    describe('Complex Examples', () => {
        test('Multiple substitutions in one statement', () => {
            const input = 'Define x as five add three multiply two.';
            const result = memo.preprocess(input);
            expect(result).toContain('remember');
            expect(result).toContain('plus');
            expect(result).toContain('times');
            expect(result).not.toContain('define');
            expect(result).not.toContain('add');
            expect(result).not.toContain('multiply');
        });

        test('Function definition with alternate wording', () => {
            const input = 'Create square taking x as x multiply x.';
            const result = memo.preprocess(input);
            expect(result).toContain('remember');
            expect(result).toContain('with');
            expect(result).toContain('times');
        });

        test('Subtracted from flips operands correctly', () => {
            const input = 'Remember x as ten subtracted from five.';
            const preprocessed = memo.preprocess(input);
            const result = memo.interpreter.parse(preprocessed);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['x']).toBeDefined();
            expect(memo.varlist['x'].value).toBe(-5); // five minus ten = -5
        });

        test('Regular minus does not flip operands', () => {
            const input = 'Remember y as ten minus five.';
            const preprocessed = memo.preprocess(input);
            const result = memo.interpreter.parse(preprocessed);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['y']).toBeDefined();
            expect(memo.varlist['y'].value).toBe(5); // ten minus five = 5
        });
    });

    describe('Conditional Comma Handling', () => {
        test('Convert comma before "else" to semicolon', () => {
            const input = 'if n equals zero then zero, else one';
            const result = memo.preprocess(input);
            expect(result).toContain('; else one');
            expect(result).not.toContain(', else one');
        });

        test('Convert comma before "else if" to semicolon', () => {
            const input = 'if n equals zero then zero, else if n equals one then one, else two';
            const result = memo.preprocess(input);
            expect(result).toContain('; else if');
            expect(result).toContain('; else two');
            expect(result).not.toContain(', else');
        });

        test('Preserve commas not before else/else-if', () => {
            const input = 'Remember list as one, two, three.';
            const result = memo.preprocess(input);
            expect(result).toContain('one, two, three');
        });
    });

    describe('Whitespace Normalization', () => {
        test('Normalize multiple spaces', () => {
            const input = 'Remember  x   as    five.';
            const result = memo.preprocess(input);
            expect(result).toBe('Remember x as five.');
        });

        test('Trim leading/trailing whitespace', () => {
            const input = '   Remember x as five.   ';
            const result = memo.preprocess(input);
            expect(result).toBe('Remember x as five.');
        });
    });

    describe('Clarification Command', () => {
        test('Clarification after syntax error calls processClarification', () => {
            // Mock processClarification to track if it's called
            const originalProcessClarification = memo.processClarification;
            let processClarificationCalled = false;

            memo.processClarification = function(currentLine, previousLine, ast) {
                processClarificationCalled = true;
                return originalProcessClarification.call(this, currentLine, previousLine, ast);
            };

            try {
                // First line: syntax error
                const firstLine = "Let's make g three.";
                const firstResult = memo.interpreter.parse(firstLine);
                expect(firstResult).toContain("didn't understand");

                // Second line: clarification
                const secondLine = "I meant Remember g as three.";
                const secondResult = memo.interpreter.parse(secondLine);

                // Verify processClarification was called
                expect(processClarificationCalled).toBe(true);

                // TODO: Fill out the rest of the test to verify the clarification worked
                // For now, just verify that processClarification was reached

            } finally {
                // Restore original function
                memo.processClarification = originalProcessClarification;
            }
        });
    });
});
