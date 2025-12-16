/**
 * Memo Parser Tests
 * Tests for parsing various Memo language constructs
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
// Order from Gruntfile.js dist2: ['src/memo.js','src/memo.tools.js','build/memo.parser.js','src/memo.interpreter.js']
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

    describe('Variable Assignment with Parameters', () => {
        test('Remember x with p as y with g', () => {
            const input = 'Remember x with p as y with g.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['x']).toBeDefined();
            expect(memo.varlist['x'].params).toBeDefined();
            expect(memo.varlist['x'].params.length).toBe(1);
            expect(memo.varlist['x'].params[0].varname).toBe('p');
        });
    });

    describe('Arithmetic Expression - Resolved', () => {
        test('Remember test as thirty times twenty-five divided by seventeen', () => {
            const input = 'Remember test as thirty times twenty-five divided by seventeen.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['test']).toBeDefined();
            // for an expression the interpreter can resolve, it resolves to a literal
            expect(memo.varlist['test'].type).toBe('FloatLiteral');
            
            // The expression should be: (30 * 25) / 17
            expect(memo.varlist['test'].value).toBeCloseTo(44.117, 2);
        });

        test('Remember another with p as p times twenty plus two', () => {
            const input = 'Remember another with p as p times twenty plus two.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['another']).toBeDefined();
            expect(memo.varlist['another'].params).toBeDefined();
            expect(memo.varlist['another'].params.length).toBe(1);
            expect(memo.varlist['another'].params[0].varname).toBe('p');
        });

        test('Remember z with a and b as a plus b plus seven divided by one hundred and fourteen', () => {
            const input = 'Remember z with a and b as a plus b plus seven divided by one hundred and fourteen.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['z']).toBeDefined();
            expect(memo.varlist['z'].params).toBeDefined();
            expect(memo.varlist['z'].params.length).toBe(2);
            expect(memo.varlist['z'].params[0].varname).toBe('a');
            expect(memo.varlist['z'].params[1].varname).toBe('b');
        });
    });

    describe('Range Expressions', () => {
        test('Remember g as the range from zero to a million', () => {
            const input = 'Remember g as the range from zero to a million.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['g']).toBeDefined();
            expect(memo.varlist['g'].type).toBe('Range');
            expect(memo.varlist['g'].start.value).toBe(0);
            expect(memo.varlist['g'].end.value).toBe(1000000);
        });

            test('Remember countdown as the range from eleven to one', () => {
            const input = 'Remember countdown as the range from eleven to one.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['countdown']).toBeDefined();
            expect(memo.varlist['countdown'].type).toBe('Range');
            expect(memo.varlist['countdown'].start.value).toBe(11);
            expect(memo.varlist['countdown'].end.value).toBe(1);
        });

        test('Remember countdown as the range from ten to one', () => {
            const input = 'Remember countdown as the range from ten to one.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['countdown']).toBeDefined();
            expect(memo.varlist['countdown'].type).toBe('Range');
            expect(memo.varlist['countdown'].start.value).toBe(10);
            expect(memo.varlist['countdown'].end.value).toBe(1);
        });
    });

    describe('Number Parsing', () => {
        test('Parse simple numbers', () => {
            const input = 'Remember num as forty-two.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['num']).toBeDefined();
            expect(memo.varlist['num'].value).toBe(42);
        });

        test('Parse large numbers', () => {
            const input = 'Remember big as one thousand two hundred thirty-four.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['big']).toBeDefined();
            expect(memo.varlist['big'].value).toBe(1234);
        });

        test('Parse millions', () => {
            const input = 'Remember huge as five million.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['huge']).toBeDefined();
            expect(memo.varlist['huge'].value).toBe(5000000);
        });
    });

    describe('Error Handling', () => {
        test('Handle unknown variables', () => {
            const input = 'Print unknown.';
            const result = memo.interpreter.parse(input);
            
            expect(result.includes("don't remember") || result.includes("didn't understand")).toBe(true);
        });

        test('Handle syntax errors', () => {
            const input = 'Remember x as';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain("didn't understand");
        });

        test('Handle reserved word conflicts', () => {
            const input = 'Remember five as ten.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain("remember");
            expect(result).toContain("differently");
        });
    });

    describe('Print Command', () => {
        test('Print a defined variable', () => {
            memo.interpreter.parse('Remember x as ten.');
            const result = memo.interpreter.parse('Tell me about x.');
            
            expect(result).toContain('ten');
        });

        test('Print undefined variable', () => {
            const result = memo.interpreter.parse('Tell me about missing.');
            
            expect(result).toContain("don't remember missing");
        });
    });

    describe('Complex Expressions', () => {
        test('Nested arithmetic operations', () => {
            const input = 'Remember calc as five plus three times two.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['calc']).toBeDefined();
        });

        test('Multiple parameters with arithmetic', () => {
            const input = 'Remember func with x and y as x times y plus ten.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['func']).toBeDefined();
            expect(memo.varlist['func'].params.length).toBe(2);
        });
    });
});
