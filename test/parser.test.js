            describe('Filtered Expression Parsing', () => {
                test('parses expression with where filter', () => {
                    const code = 'Remember z as n where n is greater than zero.';
                    const preprocessed = memo.preprocess(code);
                    const parsed = memo.parser.parse(preprocessed);
                    expect(parsed.cmd).toBe('let');
                    expect(parsed.varname).toBe('z');
                    expect(parsed.exp.type).toBe('FilteredExpression');
                    expect(parsed.exp.exp.type).toBe('VariableName');
                    expect(parsed.exp.exp.name.varname).toBe('n');
                    expect(parsed.exp.filter.type).toBe('Comparison');
                    expect(parsed.exp.filter.left.type).toBe('VariableName');
                    expect(parsed.exp.filter.left.name.varname).toBe('n');
                    expect(parsed.exp.filter.operator).toBe('>');
                    expect(parsed.exp.filter.right.value).toBe(0);
                });
                test('parses expression with when filter', () => {
                    const code = 'Remember z as n when n is less than ten.';
                    const preprocessed = memo.preprocess(code);
                    const parsed = memo.parser.parse(preprocessed);
                    expect(parsed.exp.type).toBe('FilteredExpression');
                    expect(parsed.exp.filter.operator).toBe('<');
                });
            });
        
    describe('Conditional Parsing', () => {
        test('if/otherwise parses as if/else', () => {
            const code = 'Remember x as if five is five then "yes" otherwise "no".';
            const preprocessed = memo.preprocess(code);
            const parsed = memo.parser.parse(preprocessed);
            expect(parsed.cmd).toBe('let');
            expect(parsed.varname).toBe('x');
            expect(parsed.exp.type).toBe('Conditional');
            expect(parsed.exp.comp.left.value).toBe(5);
            expect(parsed.exp.comp.operator).toBe('==');
            expect(parsed.exp.comp.right.value).toBe(5);
            expect(parsed.exp.exp.value).toBe('yes');
            expect(parsed.exp.f_else.value).toBe('no');
        });

        test('if/otherwise if/otherwise parses as if/else if/else', () => {
            const code = 'Remember y as if five is four then "no" otherwise if five is five then "yes" otherwise "maybe".';
            const preprocessed = memo.preprocess(code);
            const parsed = memo.parser.parse(preprocessed);
            expect(parsed.cmd).toBe('let');
            expect(parsed.varname).toBe('y');
            expect(parsed.exp.type).toBe('Conditional');
            // First condition: five is four
            expect(parsed.exp.comp.left.value).toBe(5);
            expect(parsed.exp.comp.operator).toBe('==');
            expect(parsed.exp.comp.right.value).toBe(4);
            expect(parsed.exp.exp.value).toBe('no');
            // Else if: five is five
            expect(parsed.exp.f_else.type).toBe('Conditional');
            expect(parsed.exp.f_else.comp.left.value).toBe(5);
            expect(parsed.exp.f_else.comp.operator).toBe('==');
            expect(parsed.exp.f_else.comp.right.value).toBe(5);
            expect(parsed.exp.f_else.exp.value).toBe('yes');
            // Else: "maybe"
            expect(parsed.exp.f_else.f_else.value).toBe('maybe');
        });
    });
/**
 * Memo Parser Tests
 * Tests for parsing (AST structure only, no evaluation)
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
    DEBUG: false  // Add DEBUG flag
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

describe('Memo Parser Tests', () => {
    
    beforeEach(() => {
        // Reset varlist before each test
        memo.varlist = {};
    });

    describe('ForLoop Parsing', () => {
        beforeEach(() => {
            memo.varlist = {};
        });

        test('Simple for-loop with number to number range', () => {
            // Note: Parser only test - interpreter evaluation not yet implemented
            const code = 'Remember Test as for n in zero to five, n.';
            const preprocessed = memo.preprocess(code);
            const parsed = memo.parser.parse(preprocessed);
            
            expect(parsed.cmd).toBe('let');
            expect(parsed.varname).toBe('test');
            expect(parsed.exp.type).toBe('ForLoop');
            expect(parsed.exp.varname).toBe('n');
            expect(parsed.exp.range).toBeDefined();
            expect(parsed.exp.range.type).toBe('Range');
            expect(parsed.exp.range.start.value).toBe(0);
            expect(parsed.exp.range.end.value).toBe(5);
            expect(parsed.exp.exp.type).toBe('VariableName');
            expect(parsed.exp.exp.name.varname).toBe('n');
        });

        test('For-loop with function calls in body', () => {
            // Note: Parser only test - interpreter evaluation not yet implemented
            const code = 'Remember BottlesArray as for n in zero to ninety-nine, Say with n, Next with n, Action with n.';
            const preprocessed = memo.preprocess(code);
            const parsed = memo.parser.parse(preprocessed);
            
            expect(parsed.cmd).toBe('let');
            expect(parsed.varname).toBe('bottlesarray');
            expect(parsed.exp.type).toBe('ForLoop');
            expect(parsed.exp.varname).toBe('n');
            expect(parsed.exp.range.start.value).toBe(0);
            expect(parsed.exp.range.end.value).toBe(99);
            expect(parsed.exp.exp.type).toBe('List');
            expect(parsed.exp.exp.exp.length).toBe(3);
            
            // Verify the list contains function calls
            expect(parsed.exp.exp.exp[0].type).toBe('VariableWithParam');
            expect(parsed.exp.exp.exp[0].name.varname).toBe('say');
            expect(parsed.exp.exp.exp[1].name.varname).toBe('next');
            expect(parsed.exp.exp.exp[2].name.varname).toBe('action');
        });

        test('For-loop with number-to-number range', () => {
            // Note: Parser only test - uses "ninety-eight to ninety-nine" to avoid ambiguity
            // (numbers like "ten" can continue as "ten thousand", causing parse issues)
            const code = 'Remember Test as for x in ninety-eight to ninety-nine, x plus one.';
            const preprocessed = memo.preprocess(code);
            const parsed = memo.parser.parse(preprocessed);
            
            expect(parsed.cmd).toBe('let');
            expect(parsed.varname).toBe('test');
            expect(parsed.exp.type).toBe('ForLoop');
            expect(parsed.exp.varname).toBe('x');
            expect(parsed.exp.range.type).toBe('Range');
            expect(parsed.exp.range.start.value).toBe(98);
            expect(parsed.exp.range.end.value).toBe(99);
            expect(parsed.exp.exp.type).toBe('Additive');
            expect(parsed.exp.exp.operator).toBe('+');
        });

        test('For-loop with larger number range', () => {
            // Note: Parser only test - interpreter evaluation not yet implemented
            const code = 'Remember Countdown as for i in fifty to one, i.';
            const preprocessed = memo.preprocess(code);
            const parsed = memo.parser.parse(preprocessed);

            expect(parsed.cmd).toBe('let');
            expect(parsed.varname).toBe('countdown');
            expect(parsed.exp.type).toBe('ForLoop');
            expect(parsed.exp.varname).toBe('i');
            expect(parsed.exp.range.type).toBe('Range');
            expect(parsed.exp.range.start.value).toBe(50);
            expect(parsed.exp.range.end.value).toBe(1);
        });

        test('For-loop with colon separator', () => {
            const code = 'Remember Test as for i in one to five: i.';
            const preprocessed = memo.preprocess(code);
            const parsed = memo.parser.parse(preprocessed);

            expect(parsed.cmd).toBe('let');
            expect(parsed.varname).toBe('test');
            expect(parsed.exp.type).toBe('ForLoop');
            expect(parsed.exp.varname).toBe('i');
            expect(parsed.exp.range.type).toBe('Range');
            expect(parsed.exp.range.start.value).toBe(1);
            expect(parsed.exp.range.end.value).toBe(5);
        });

        test('For-loop with no separator', () => {
            const code = 'Remember Test as for i in one to five i.';
            const preprocessed = memo.preprocess(code);
            const parsed = memo.parser.parse(preprocessed);

            expect(parsed.cmd).toBe('let');
            expect(parsed.varname).toBe('test');
            expect(parsed.exp.type).toBe('ForLoop');
            expect(parsed.exp.varname).toBe('i');
            expect(parsed.exp.range.type).toBe('Range');
            expect(parsed.exp.range.start.value).toBe(1);
            expect(parsed.exp.range.end.value).toBe(5);
        });
    });

    describe('Range Parsing', () => {
        test('Large descending range from a million to one', () => {
            const code = 'Remember c as from a million to one.';
            const preprocessed = memo.preprocess(code);
            const parsed = memo.parser.parse(preprocessed);

            expect(parsed.cmd).toBe('let');
            expect(parsed.varname).toBe('c');
            expect(parsed.exp.type).toBe('Range');
            expect(parsed.exp.start.type).toBe('IntLiteral');
            expect(parsed.exp.start.value).toBe(1000000);
            expect(parsed.exp.end.type).toBe('IntLiteral');
            expect(parsed.exp.end.value).toBe(1);
            expect(parsed.exp.step.type).toBe('IntLiteral');
            expect(parsed.exp.step.value).toBe(-1);
        });
    });
});
