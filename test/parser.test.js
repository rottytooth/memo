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
});
