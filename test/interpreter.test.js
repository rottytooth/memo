    describe('Filtered Expression Evaluation', () => {
        test('filters a list using a where condition', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember g as from one to three.');
            memo.interpreter.parse('Remember h with n as g where n is less than two.');
            const output = memo.interpreter.parse('Tell me about h.');
            expect(output).toBe('one.');
        });

        test('filters a single item that passes the condition', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember x as five.');
            memo.interpreter.parse('Remember y with n as x where n is greater than three.');
            const output = memo.interpreter.parse('Tell me about y.');
            expect(output).toBe('five.');
        });

        test('filters a single item that fails the condition (returns Nothing)', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember x as two.');
            memo.interpreter.parse('Remember y with n as x where n is greater than five.');
            const output = memo.interpreter.parse('Tell me about y.');
            expect(output).toBe('Nothing.');
        });

        test('filters a single item with equality check', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember x as ten.');
            memo.interpreter.parse('Remember y with n as x where n is equal to ten.');
            const output = memo.interpreter.parse('Tell me about y.');
            expect(output).toBe('ten.');
        });

        test('filtered expression displays correctly and tracks dependencies', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember g as from one to five.');
            const output = memo.interpreter.parse('Remember h with n as g where n is greater than two.');
            // Check that the assignment message shows the full expression
            expect(output).toContain('I will remember h');
            // Check that the stored variable has dependencies
            expect(memo.varlist.h.deps).toContain('g');
            // Check the expression stringifies correctly
            const expStr = memo.tools.expToStr(memo.varlist.h, false);
            expect(expStr).toContain('where');
            expect(expStr).toContain('greater than');
        });
    });

    describe('Reduce Expression Evaluation', () => {
        test('sum of a list of numbers', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to five.');

            memo.interpreter.parse('Remember total as the sum of nums.');
            const output = memo.interpreter.parse('Tell me about total.');
            expect(output).toBe('fifteen.'); // 1+2+3+4+5 = 15
        });

        test('sum of a single number', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember x as seven.');
            memo.interpreter.parse('Remember total as the sum of x.');
            const output = memo.interpreter.parse('Tell me about total.');
            expect(output).toBe('seven.');
        });

        test('sum of a range', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember total as the sum of from one to ten.');
            const output = memo.interpreter.parse('Tell me about total.');
            expect(output).toBe('fifty-five.'); // 1+2+...+10 = 55
        });

        test('Reduce tracks dependencies correctly', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to five.');
            memo.interpreter.parse('Remember total as the sum of nums.');

            // Check dependencies
            expect(memo.varlist.total.deps).toContain('nums');

            // Check expression display
            const expStr = memo.tools.expToStr(memo.varlist.total, false);
            expect(expStr).toContain('sum');
            expect(expStr).toContain('nums');
        });

        test('Reduce updates when dependency changes', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to three.');
            memo.interpreter.parse('Remember total as the sum of nums.');

            let output = memo.interpreter.parse('Tell me about total.');
            expect(output).toBe('six.'); // 1+2+3 = 6

            // Update the dependency
            memo.interpreter.parse('Remember nums as from one to five.');
            output = memo.interpreter.parse('Tell me about total.');
            expect(output).toBe('fifteen.'); // 1+2+3+4+5 = 15
        });

        test('sum of empty list returns zero', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to three.');
            memo.interpreter.parse('Remember big as one hundred.');
            memo.interpreter.parse('Remember empty with n as nums where n is greater than big.');
            memo.interpreter.parse('Remember total as the sum of empty.');
            const output = memo.interpreter.parse('Tell me about total.');
            expect(output).toBe('zero.');
        });

        test('Reduce expression displays correctly', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to five.');
            const assignOutput = memo.interpreter.parse('Remember total as the sum of nums.');

            // Should show assignment message
            expect(assignOutput).toContain('I will remember total');

            // Expression should stringify correctly
            const expStr = memo.tools.expToStr(memo.varlist.total, false);
            expect(expStr).toBe('the sum of nums');
        });

        test('sum of the squares of the even numbers in a list', () => {
            // Equivalent to Python:
            // nums = [1,2,3,4,5,6]
            // evens = filter(lambda x: x % 2 == 0, nums)
            // squares = map(lambda x: x*x, evens)
            // total = reduce(lambda a,b: a+b, squares, 0)
            // print(total)  # 56

            memo.varlist = {}; // Reset state

            // Create the list
            const r1 = memo.interpreter.parse('Remember nums as from one to six.');
            console.log('Step 1:', r1);

            // Filter: get even numbers (where x modulo 2 equals 0)
            const r2 = memo.interpreter.parse('Remember evens with x as nums where x modulo two is zero.');
            console.log('Step 2:', r2);

            // Map: square each even number (for loop creates list of squares)
            const r3 = memo.interpreter.parse('Remember squares as for x in evens, x times x.');
            console.log('Step 3:', r3);

            // Reduce: sum all the squares
            const r4 = memo.interpreter.parse('Remember total as the sum of squares.');
            console.log('Step 4:', r4);

            // Verify the result
            const output = memo.interpreter.parse('Tell me about total.');
            expect(output).toBe('fifty-six.'); // 2^2 + 4^2 + 6^2 = 4 + 16 + 36 = 56
        });

        test('product of a list of numbers', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from two to five.');
            memo.interpreter.parse('Remember total as the product of nums.');
            const output = memo.interpreter.parse('Tell me about total.');
            expect(output).toBe('one hundred twenty.'); // 2*3*4*5 = 120
        });

        test('product of empty list returns one', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to three.');
            memo.interpreter.parse('Remember big as one hundred.');
            memo.interpreter.parse('Remember empty with n as nums where n is greater than big.');
            memo.interpreter.parse('Remember total as the product of empty.');
            const output = memo.interpreter.parse('Tell me about total.');
            expect(output).toBe('one.');
        });

        test('minimum of a list of numbers', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from three to eight.');
            memo.interpreter.parse('Remember result as the minimum of nums.');
            const output = memo.interpreter.parse('Tell me about result.');
            expect(output).toBe('three.');
        });

        test('maximum of a list of numbers', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from three to eight.');
            memo.interpreter.parse('Remember result as the maximum of nums.');
            const output = memo.interpreter.parse('Tell me about result.');
            expect(output).toBe('eight.');
        });

        test('minimum of empty list returns nothing', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to three.');
            memo.interpreter.parse('Remember big as one hundred.');
            memo.interpreter.parse('Remember empty with n as nums where n is greater than big.');
            memo.interpreter.parse('Remember result as the minimum of empty.');
            const output = memo.interpreter.parse('Tell me about result.');
            expect(output).toBe('Nothing.');
        });

        test('maximum of empty list returns nothing', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to three.');
            memo.interpreter.parse('Remember big as one hundred.');
            memo.interpreter.parse('Remember empty with n as nums where n is greater than big.');
            memo.interpreter.parse('Remember result as the maximum of empty.');
            const output = memo.interpreter.parse('Tell me about result.');
            expect(output).toBe('Nothing.');
        });

        test('count of a list', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to ten.');
            memo.interpreter.parse('Remember result as the count of nums.');
            const output = memo.interpreter.parse('Tell me about result.');
            expect(output).toBe('ten.');
        });

        test('count of empty list returns zero', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to three.');
            memo.interpreter.parse('Remember big as one hundred.');
            memo.interpreter.parse('Remember empty with n as nums where n is greater than big.');
            memo.interpreter.parse('Remember result as the count of empty.');
            const output = memo.interpreter.parse('Tell me about result.');
            expect(output).toBe('zero.');
        });

        test('average of a list', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from two to six.');
            memo.interpreter.parse('Remember result as the average of nums.');
            const output = memo.interpreter.parse('Tell me about result.');
            expect(output).toBe('four.'); // (2+3+4+5+6)/5 = 20/5 = 4
        });

        test('average of empty list returns zero', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to three.');
            memo.interpreter.parse('Remember big as one hundred.');
            memo.interpreter.parse('Remember empty with n as nums where n is greater than big.');
            memo.interpreter.parse('Remember result as the average of empty.');
            const output = memo.interpreter.parse('Tell me about result.');
            expect(output).toBe('zero.');
        });
    });

    describe('Reduce vs Binary Operator Disambiguation', () => {
        test('sum of list uses Reduce', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember nums as from one to five.');
            memo.interpreter.parse('Remember total as the sum of nums.');
            const output = memo.interpreter.parse('Tell me about total.');
            expect(output).toBe('fifteen.'); // 1+2+3+4+5 = 15
            // Verify it's stored as Reduce expression
            expect(memo.varlist.total.type).toBe('Reduce');
            expect(memo.varlist.total.operator).toBe('sum');
        });

        test('sum of two expressions uses binary addition', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as the sum of one and two.');
            const output = memo.interpreter.parse('Tell me about x.');
            // Should compute correctly via fallback
            expect(output).toBe('three.');
        });

        test('product of two expressions uses binary multiplication', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as the product of five and three.');
            const output = memo.interpreter.parse('Tell me about x.');
            // Should compute correctly via fallback
            expect(output).toBe('fifteen.');
        });

        test('quotient of two expressions uses binary division', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as the quotient of ten and five.');
            const output = memo.interpreter.parse('Tell me about x.');
            // Should compute correctly via fallback
            expect(output).toBe('two.');
        });

        test('sum of two variables uses binary addition with fallback', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember a as five.');
            memo.interpreter.parse('Remember b as three.');
            memo.interpreter.parse('Remember x as the sum of a and b.');
            const output = memo.interpreter.parse('Tell me about x.');
            expect(output).toBe('eight.');
            // Verify it uses Additive expression (since it has dependencies)
            expect(memo.varlist.x.type).toBe('Additive');
            expect(memo.varlist.x.operator).toBe('+');
        });
    });

    describe('Nothing vs Zero Behavior', () => {
        test('Zero value displays as "zero", not "Nothing"', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember x as zero.');
            const output = memo.interpreter.parse('Tell me about x.');
            expect(output).toBe('zero.');
        });

        test('Empty list displays as "Nothing"', () => {
            memo.varlist = {}; // Reset state
            // Create an empty list through filtering
            memo.interpreter.parse('Remember nums as from one to three.');
            memo.interpreter.parse('Remember threshold as one hundred.');
            memo.interpreter.parse('Remember empty with n as nums where n is greater than threshold.');
            const output = memo.interpreter.parse('Tell me about empty.');
            expect(output).toBe('Nothing.');
        });

        test('List containing zero displays zero correctly', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember listwithzero as from zero to two.');
            const output = memo.interpreter.parse('Tell me about listwithzero.');
            expect(output).toContain('zero');
            expect(output).toContain('one');
            expect(output).toContain('two');
            expect(output).not.toBe('Nothing.');
        });

        test('NothingLiteral from failed filter is not the same as zero', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember a as five.');
            memo.interpreter.parse('Remember nothing_val with n as a where n is greater than ten.');
            memo.interpreter.parse('Remember zero_val as zero.');

            const nothingOutput = memo.interpreter.parse('Tell me about nothing_val.');
            const zeroOutput = memo.interpreter.parse('Tell me about zero_val.');

            expect(nothingOutput).toBe('Nothing.');
            expect(zeroOutput).toBe('zero.');
            expect(nothingOutput).not.toBe(zeroOutput);
        });

        test('Empty filtered list displays as Nothing', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to five.');
            memo.interpreter.parse('Remember big as fifty.');
            memo.interpreter.parse('Remember filtered with n as nums where n is greater than big.');
            const output = memo.interpreter.parse('Tell me about filtered.');
            expect(output).toBe('Nothing.');
        });

        test('Non-empty filtered list does not display as Nothing', () => {
            memo.varlist = {}; // Reset state
            memo.interpreter.parse('Remember nums as from one to ten.');
            memo.interpreter.parse('Remember filtered with n as nums where n is greater than five.');
            const output = memo.interpreter.parse('Tell me about filtered.');
            expect(output).not.toBe('Nothing.');
            expect(output).toContain('six');
        });
    });
/**
 * Memo Interpreter Tests
 * Tests for interpreter evaluation and execution
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

describe('Memo Interpreter Tests', () => {
    
    beforeEach(() => {
        // Reset varlist before each test
        memo.varlist = {};
    });

    describe('Variable Assignment with Parameters', () => {
        test('Downstream variables update when dependencies change', () => {
            memo.varlist = {}; // Reset state
            
            // Define x as one
            memo.interpreter.parse('Remember x as one.');
            expect(memo.varlist['x'].value).toBe(1);
            
            // Define y as x plus one
            memo.interpreter.parse('Remember y as x plus one.');
            
            // Check y's initial value - should be 2 (1 + 1)
            let output = memo.interpreter.parse('Tell me about y.');
            expect(output).toBe('two.');
            
            // Redefine x as two
            memo.interpreter.parse('Remember x as two.');
            expect(memo.varlist['x'].value).toBe(2);
            
            // Check that y has been updated to 3 (2 + 1)
            output = memo.interpreter.parse('Tell me about y.');
            expect(output).toBe('three.');
        });

        test('Remember x with p as y with g', () => {
            const input = 'Remember x with p as y with g.';

            memo.interpreter.parse("Remember y with m as m plus two.");
            memo.interpreter.parse("Remember g as five.");

            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['x']).toBeDefined();
            expect(memo.varlist['x'].params).toBeDefined();
            expect(memo.varlist['x'].params.length).toBe(1);
            expect(memo.varlist['x'].params[0].varname).toBe('p');
        });

        test('Pass literal as parameter: ffun with two', () => {
            memo.varlist = {}; // Reset state
            
            // Define a function that takes a parameter
            const defineResult = memo.interpreter.parse('Remember ffun with x as x plus five.');
            expect(defineResult).toContain('I will remember');
            expect(memo.varlist['ffun']).toBeDefined();
            expect(memo.varlist['ffun'].params.length).toBe(1);
            
            // Call the function with a literal value "two"
            const callResult = memo.interpreter.parse('Remember gfun as ffun with two.');
            expect(callResult).toContain('I will remember');
            expect(memo.varlist['gfun']).toBeDefined();
            
            // Verify the result is 2 + 5 = 7
            expect(memo.varlist['gfun'].value).toBe(7);
        });

        test('Pass literal as parameter: ffun with ten', () => {
            memo.varlist = {}; // Reset state
            
            // Define a function
            const defineResult = memo.interpreter.parse('Remember addthree with n as n plus three.');
            expect(defineResult).toContain('I will remember');
            
            // Call with literal "ten"
            const callResult = memo.interpreter.parse('Remember result as addthree with ten.');
            expect(callResult).toContain('I will remember');
            expect(memo.varlist['result'].value).toBe(13);
        });

        test('Function call displays correctly and tracks dependencies', () => {
            memo.varlist = {}; // Reset state
            
            // Define a function a with parameter n
            const defineA = memo.interpreter.parse('Remember a with n as n plus three.');
            expect(defineA).toContain('I will remember');
            expect(memo.varlist['a']).toBeDefined();
            
            // Call a with literal "four" and store in c
            const defineC = memo.interpreter.parse('Remember c as a with four.');
            expect(defineC).toContain('I will remember');
            expect(defineC).toContain('a with four'); // Should display the expression
            expect(memo.varlist['c']).toBeDefined();
            expect(memo.varlist['c'].value).toBe(7); // 4 + 3 = 7
            
            // Check that c depends on a
            expect(memo.varlist['c'].deps).toBeDefined();
            expect(memo.varlist['c'].deps).toContain('a');
        });

        test('Function call with variable parameter tracks both dependencies', () => {
            memo.varlist = {}; // Reset state
            
            // Define a variable x
            memo.interpreter.parse('Remember x as five.');
            expect(memo.varlist['x'].value).toBe(5);
            
            // Define a function that takes a parameter
            memo.interpreter.parse('Remember double with n as n times two.');
            expect(memo.varlist['double']).toBeDefined();
            
            // Call the function with variable x
            const result = memo.interpreter.parse('Remember y as double with x.');
            expect(result).toContain('I will remember');
            expect(result).toContain('double with x');
            expect(memo.varlist['y'].value).toBe(10); // 5 * 2
            
            // Check that y depends on both 'double' and 'x'
            expect(memo.varlist['y'].deps).toBeDefined();
            expect(memo.varlist['y'].deps).toContain('double');
            expect(memo.varlist['y'].deps).toContain('x');
        });

        test('Pass range as parameter', () => {
            memo.varlist = {}; // Reset state
            
            // Define a function that takes a parameter and returns its length
            // In this case, we'll just return the parameter itself (a range object)
            memo.interpreter.parse('Remember myfunc with r as r.');
            expect(memo.varlist['myfunc']).toBeDefined();
            
            // Call the function with a range
            const result = memo.interpreter.parse('Remember myrange as myfunc with the range from one to ten.');
            expect(result).toContain('I will remember');
            expect(memo.varlist['myrange']).toBeDefined();
            
            // The result should be a List (ranges are evaluated to lists)
            expect(memo.varlist['myrange'].value).toBeDefined();
            expect(memo.varlist['myrange'].value.type).toBe('List');
            expect(memo.varlist['myrange'].value.exp).toHaveLength(10);
            expect(memo.varlist['myrange'].value.exp[0].value).toBe(1);
            expect(memo.varlist['myrange'].value.exp[9].value).toBe(10);
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

        test('Remember c as from a million to one (short form)', () => {
            const input = 'Remember c as from a million to one.';
            const result = memo.interpreter.parse(input);

            expect(result).toContain('I will remember');
            expect(memo.varlist['c']).toBeDefined();
            expect(memo.varlist['c'].type).toBe('Range');
            expect(memo.varlist['c'].start.value).toBe(1000000);
            expect(memo.varlist['c'].end.value).toBe(1);
        });

        test('Remember c as the range from a million to one', () => {
            const input = 'Remember c as the range from a million to one.';
            const result = memo.interpreter.parse(input);

            expect(result).toContain('I will remember');
            expect(memo.varlist['c']).toBeDefined();
            expect(memo.varlist['c'].type).toBe('Range');
            expect(memo.varlist['c'].start.value).toBe(1000000);
            expect(memo.varlist['c'].end.value).toBe(1);
        });

        test('Remember c as from one million to one', () => {
            const input = 'Remember c as from one million to one.';
            const result = memo.interpreter.parse(input);

            expect(result).toContain('I will remember');
            expect(memo.varlist['c']).toBeDefined();
            expect(memo.varlist['c'].type).toBe('Range');
            expect(memo.varlist['c'].start.value).toBe(1000000);
            expect(memo.varlist['c'].end.value).toBe(1);
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

    describe('Forgotten Variable Dependencies', () => {
        test('Dependent variable resolves when dependency is forgotten', () => {
            memo.varlist = {}; // Reset state
            
            // Define a as one
            memo.interpreter.parse('Remember a as one.');
            expect(memo.varlist['a'].value).toBe(1);
            
            // Define b as a plus one (b depends on a)
            memo.interpreter.parse('Remember b as a plus one.');
            
            // Check b's value while a still exists - should be 2
            let output = memo.interpreter.parse('Tell me about b.');
            expect(output).toBe('two.');
            
            // Simulate 12 unrelated commands to fade out 'a'
            for (let i = 0; memo.varlist['b'].fade < 11; i++) {
                memo.interpreter.parse(`Remember temp${i} as ${i}.`);
            }
            expect(memo.varlist['a']).toBeUndefined();
            // b should now store the resolved value of 2
            expect(memo.varlist['b']).toBeDefined();
            output = memo.interpreter.parse('Tell me about b.');
            expect(output).toBe('two.');
        });

        test('Chained dependencies resolve when intermediate variable is forgotten', () => {
            memo.varlist = {}; // Reset state
            
            // Define a as five
            memo.interpreter.parse('Remember a as five.');
            
            // Define b as a plus two (b depends on a)
            memo.interpreter.parse('Remember b as a plus two.');
            
            // Define c as b times three (c depends on b, which depends on a)
            memo.interpreter.parse('Remember c as b times three.');

            // redefine a so it will outlast b
            // (removed in revert)

            // Check values before forgetting
            let outputB = memo.interpreter.parse('Tell me about b.');
            expect(outputB).toBe('seven.'); // 5 + 2 = 7
            
            let outputC = memo.interpreter.parse('Tell me about c.');
            expect(["twenty-one.", "twenty one."]).toContain(outputC); // 7 * 3 = 21
            
            // Simulate 12 unrelated commands to fade out 'b'
            for (let i = 0; i < 12; i++) {
                memo.interpreter.parse(`Remember temp${i} as ${i}.`);
            }
            expect(memo.varlist['b']).toBeDefined();
            expect(memo.varlist['b'].type).toBe('IntLiteral');
            outputC = memo.interpreter.parse('Tell me about c.');
            expect(["twenty-one.", "twenty one."]).toContain(outputC);
        });

        test('Multiple dependent variables resolve when shared dependency is forgotten', () => {
            memo.varlist = {}; // Reset state
            
            // Define x as ten
            memo.interpreter.parse('Remember x as ten.');
            
            // Define y as x plus five
            memo.interpreter.parse('Remember y as x plus five.');
            
            // Define z as x times two
            memo.interpreter.parse('Remember z as x times two.');
            
            // Check initial values
            let outputY = memo.interpreter.parse('Tell me about y.');
            expect(outputY).toBe('fifteen.'); // 10 + 5 = 15
            
            let outputZ = memo.interpreter.parse('Tell me about z.');
            expect(outputZ).toBe('twenty.'); // 10 * 2 = 20
            
            // Simulate 12 unrelated commands to fade out 'x'
            for (let i = 0; i < 12; i++) {
                memo.interpreter.parse(`Remember temp${i} as ${i}.`);
            }
            expect(memo.varlist['x']).toBeUndefined();
            // Both y and z should retain their resolved values
            outputY = memo.interpreter.parse('Tell me about y.');
            expect(outputY).toBe('fifteen.');
            outputZ = memo.interpreter.parse('Tell me about z.');
            expect(outputZ).toBe('twenty.');
        });

        test('Full chain resolves when first variable is forgotten', () => {
            memo.varlist = {}; // Reset state
            
            // Create chain: a -> b -> c
            memo.interpreter.parse('Remember a as three.');
            memo.interpreter.parse('Remember b as a plus one.');
            memo.interpreter.parse('Remember c as b plus one.');
            
            // Verify chain before forgetting
            let output = memo.interpreter.parse('Tell me about c.');
            expect(output).toBe('five.'); // 3 + 1 + 1 = 5
            
            // Simulate 12 unrelated commands to fade out 'a'
            for (let i = 0; i < 12; i++) {
                memo.interpreter.parse(`Remember temp${i} as ${i}.`);
            }
            // b should resolve to 4 and c should resolve to 5
            let outputB = memo.interpreter.parse('Tell me about b.');
            expect(outputB).toBe('four.');
            let outputC = memo.interpreter.parse('Tell me about c.');
            expect(outputC).toBe('five.');
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

    describe('Print Floats and Fractions', () => {
        test('Print positive float < 0.2 as "more than [whole]"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as five divided by thirty.');
            const result = memo.interpreter.parse('Tell me about x.');
            // 5/30 = 0.166... → "more than zero"
            expect(result).toBe('more than zero.');
        });

        test('Print positive float 0.2-0.4 as "a third"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as one divided by three.');
            const result = memo.interpreter.parse('Tell me about x.');
            // 1/3 = 0.333... → "a third"
            expect(result).toBe('a third.');
        });

        test('Print positive float 0.4-0.6 as "a half"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as one divided by two.');
            const result = memo.interpreter.parse('Tell me about x.');
            // 1/2 = 0.5 → "a half"
            expect(result).toBe('a half.');
        });

        test('Print positive float 0.6-0.8 as "more than a half"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as two divided by three.');
            const result = memo.interpreter.parse('Tell me about x.');
            // 2/3 = 0.666... → "more than a half"
            expect(result).toBe('more than a half.');
        });

        test('Print positive float >= 0.8 as "almost [next]"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as five divided by six.');
            const result = memo.interpreter.parse('Tell me about x.');
            // 5/6 = 0.833... → "almost one"
            expect(result).toBe('almost one.');
        });

        test('Print positive float with whole part as "[whole] and a half"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as three divided by two.');
            const result = memo.interpreter.parse('Tell me about x.');
            // 3/2 = 1.5 → "one and a half"
            expect(result).toBe('one and a half.');
        });

        test('Print negative float < -0.2 as "more than [whole] negative"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as zero minus five divided by thirty.');
            const result = memo.interpreter.parse('Tell me about x.');
            // -5/30 = -0.166... → "more than zero negative"
            expect(result).toBe('more than zero negative.');
        });

        test('Print negative float -0.2 to -0.4 as "a third negative"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as zero minus one divided by three.');
            const result = memo.interpreter.parse('Tell me about x.');
            // -1/3 = -0.333... → "a third negative"
            expect(result).toBe('a third negative.');
        });

        test('Print negative float -0.4 to -0.6 as "a half negative"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as zero minus one divided by two.');
            const result = memo.interpreter.parse('Tell me about x.');
            // -1/2 = -0.5 → "a half negative"
            expect(result).toBe('a half negative.');
        });

        test('Print negative float -0.6 to -0.8 as "more than a half negative"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as zero minus two divided by three.');
            const result = memo.interpreter.parse('Tell me about x.');
            // -2/3 = -0.666... → "more than a half negative"
            expect(result).toBe('more than a half negative.');
        });

        test('Print negative float <= -0.8 as "almost [next] negative"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as zero minus five divided by six.');
            const result = memo.interpreter.parse('Tell me about x.');
            // -5/6 = -0.833... → "almost one negative"
            expect(result).toBe('almost one negative.');
        });

        test('Print negative float with whole part as "more than [whole] negative"', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember x as zero minus three divided by two.');
            const result = memo.interpreter.parse('Tell me about x.');
            // -3/2 = -1.5 → should be handled as negative with whole part
            // Based on floatToStr logic, this should produce something for negative with whole
            expect(result).toContain('negative');
        });
    });


    describe('Print with Smart List Stringification', () => {
        test('Print list without strings shows normal format', () => {
            memo.varlist = {}; // Reset state

            // Create a list of numbers
            memo.interpreter.parse('Remember nums as one, two, three.');

            // Print it - should show normal list format
            const output = memo.interpreter.parse('Tell me about nums.');

            expect(output).toContain('<');
            expect(output).toContain('>');
            expect(output).toContain('one');
            expect(output).toContain('two');
            expect(output).toContain('three');
        });

        test('Print list with strings concatenates values', () => {
            memo.varlist = {}; // Reset state

            // Create a list containing strings
            memo.interpreter.parse('Remember greeting as "Hello", ", ", "world", "!".');

            // Print it - should concatenate into a string
            const output = memo.interpreter.parse('Tell me about greeting.');

            expect(output).toBe('Hello, world!');
            expect(output).not.toContain('<');
            expect(output).not.toContain('>');
        });

        test('Print nested list with strings flattens and concatenates', () => {
            memo.varlist = {}; // Reset state

            // Create nested lists with strings
            memo.interpreter.parse('Remember part1 as "Hello", ", ".');
            memo.interpreter.parse('Remember part2 as "World", "!".');
            memo.interpreter.parse('Remember message as part1, part2.');

            // Print it - should flatten and concatenate
            const output = memo.interpreter.parse('Tell me about message.');

            expect(output).toBe('Hello, World!');
        });

        test('Print list mixing strings and numbers concatenates all', () => {
            memo.varlist = {}; // Reset state

            // Create a list mixing strings and numbers
            memo.interpreter.parse('Remember mixed as "Count: ", three, " items".');

            // Print it - should concatenate everything with numbers converted to words
            const output = memo.interpreter.parse('Tell me about mixed.');

            expect(output).toBe('Count: three items.');
        });

        test('Print list with chars concatenates them', () => {
            memo.varlist = {}; // Reset state

            // Create a list of characters
            memo.interpreter.parse("Remember word as 'H', 'e', 'l', 'l', 'o'.");

            // Print it - should concatenate into a string
            const output = memo.interpreter.parse('Tell me about word.');

            expect(output).toBe('Hello.');
        });

        test('Print long stringified list truncates with more', () => {
            memo.varlist = {}; // Reset state

            // Create a very long string (over 2000 characters)
            const longString = 'a'.repeat(2500);
            memo.interpreter.parse(`Remember longtext as "${longString}".`);

            // Print it - should truncate
            const output = memo.interpreter.parse('Tell me about longtext.');

            expect(output.length).toBeLessThan(2100);
            expect(output).toContain('...');
            expect(memo.moreText).toBeDefined();
            expect(memo.moreText.length).toBeGreaterThan(0);

            // Get more text
            const moreOutput = memo.interpreter.parse('Tell me more.');
            expect(moreOutput).toBeTruthy();
        });

        test('99 bottles with for-loop and functions converts numbers to words', () => {
            memo.varlist = {}; // Reset state

            // Define the helper functions (using "one" instead of "1" to avoid hardcoded digits)
            memo.interpreter.parse('Remember Say with n as if n is zero then "No more bottles", else if n is one then "one bottle", else n as string plus " bottles".');
            memo.interpreter.parse('Remember Next with n as if n is one then "no more bottles", else if n is zero then "ninety-nine bottles", else if n is two then "one bottle", else n as string plus " bottles".');
            memo.interpreter.parse('Remember Action with n as if n is zero then "Go to the store and buy some more", else "Take one down and pass it around".');

            // Define the for-loop that generates the song (just first 3 verses to keep test manageable)
            memo.interpreter.parse('Remember Print99 as for beer in three to one, beer\'s Say, " of beer on the wall, ", beer\'s Say, " of beer.\\n", beer\'s Action, "\\n", beer\'s Next, " of beer on the wall.\\n".');

            // Print it - should have no unquoted digits (numbers converted to words via "as string")
            const output = memo.interpreter.parse('Tell me about Print99.');

            // Check that output doesn't contain unquoted digits
            // The "as string" coercion should convert numbers to words
            expect(output).not.toMatch(/\b\d+\b/); // No standalone digits
            expect(output).toContain('bottle'); // Should contain bottle references
            expect(output).toContain('three bottles'); // Verify number-to-word conversion worked
            expect(output).toContain('two bottles');
        });

        test('Tell me about Print99. (exact case)', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember Say with n as if n is zero then "No more bottles", else if n is one then "one bottle", else n as string plus " bottles".');
            memo.interpreter.parse('Remember Next with n as if n is one then "no more bottles", else if n is zero then "ninety-nine bottles", else if n is two then "one bottle", else n as string plus " bottles".');
            memo.interpreter.parse('Remember Action with n as if n is zero then "Go to the store and buy some more", else "Take one down and pass it around".');
            memo.interpreter.parse('Remember Print99 as for beer in three to one, beer\'s Say, " of beer on the wall, ", beer\'s Say, " of beer.\\n", beer\'s Action, "\\n", beer\'s Next, " of beer on the wall.\\n".');
            const output = memo.interpreter.parse('Tell me about Print99.');
            expect(typeof output).toBe('string');
            expect(output.length).toBeGreaterThan(0);
            expect(output).toContain('bottle'); // Should contain bottle references
            expect(output).toContain('three bottles'); // Verify number-to-word
            expect(output).not.toMatch(/I am feeling confused|I am unsure/i);
        });

        test('Tell me about print99. (lowercase)', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember Say with n as if n is zero then "No more bottles", else if n is one then "one bottle", else n as string plus " bottles".');
            memo.interpreter.parse('Remember Next with n as if n is one then "no more bottles", else if n is zero then "ninety-nine bottles", else if n is two then "one bottle", else n as string plus " bottles".');
            memo.interpreter.parse('Remember Action with n as if n is zero then "Go to the store and buy some more", else "Take one down and pass it around".');
            memo.interpreter.parse('Remember Print99 as for beer in three to one, beer\'s Say, " of beer on the wall, ", beer\'s Say, " of beer.\\n", beer\'s Action, "\\n", beer\'s Next, " of beer on the wall.\\n".');
            const output = memo.interpreter.parse('Tell me about print99.');
            expect(typeof output).toBe('string');
            expect(output.length).toBeGreaterThan(0);
            // Accept either a valid output or a specific error message
            // If error, should be a clear message, not generic confusion
            expect(output).not.toMatch(/I am feeling confused|I am unsure/i);
        });

        test('Print: Ints should be spelled out', () => {
            memo.varlist = {};
            memo.interpreter.parse('Remember Say with n as if n is zero then "No more bottles", else if n is one then "one bottle", else n as string plus " bottles".');
            memo.interpreter.parse('Remember Next with n as if n is one then "no more bottles", else if n is zero then "ninety-nine bottles", else if n is two then "one bottle", else n as string plus " bottles".');
            memo.interpreter.parse('Remember Action with n as if n is zero then "Go to the store and buy some more", else "Take one down and pass it around".');
            memo.interpreter.parse('Remember Print99 as for beer in three to one, beer\'s Say, " of beer on the wall, ", beer\'s Say, " of beer.\\n", beer\'s Action, "\\n", beer\'s Next, " of beer on the wall.\\n".');
            const output = memo.interpreter.parse('Tell me about Print99.');
            expect(typeof output).toBe('string');
            expect(output.length).toBeGreaterThan(0);
            expect(output).toContain('bottle'); // Should contain bottle references
            expect(output).toContain('three bottles'); // Verify number-to-word
            expect(output).not.toContain('3'); // Verify number-to-word
            expect(output).not.toMatch(/I am feeling confused|I am unsure/i);
        });

        test('99 bottles - Print99 evaluated after Say forgotten through empty statements', () => {
            memo.varlist = {}; // Reset state

            // Define the helper functions
            memo.interpreter.parse('Remember Say with n as if n is zero then "No more bottles", else if n is one then "one bottle", else n as string plus " bottles".');
            memo.interpreter.parse('Remember Next with n as if n is one then "no more bottles", else if n is zero then "ninety-nine bottles", else if n is two then "one bottle", else n as string plus " bottles".');
            memo.interpreter.parse('Remember Action with n as if n is zero then "Go to the store and buy some more", else "Take one down and pass it around".');

            // Define Print99 that depends on Say, Next, and Action
            memo.interpreter.parse('Remember Print99 as for beer in three to one, beer\'s Say, " of beer on the wall, ", beer\'s Say, " of beer.\\n", beer\'s Action, "\\n", beer\'s Next, " of beer on the wall.\\n".');

            // Verify dependencies
            expect(memo.varlist['say']).toBeDefined();
            expect(memo.varlist['print99']).toBeDefined();
            expect(memo.varlist['print99'].deps).toContain('say');

            // Execute statements to cause Say to fade out, while keeping Print99 alive
            for (let i = 0; i < 6; i++) {
                memo.interpreter.parse(`Remember temp${i} as ${i}.`);
                // Keep Print99 alive by referencing it
                if (i === 0) {
                    memo.interpreter.parse('Remember keepalive as Print99.');
                }
            }

            // Verify Say has been forgotten
            expect(memo.varlist['say']).toBeUndefined();

            // Print99 should still exist (was kept alive)
            expect(memo.varlist['print99']).toBeDefined();

            // The key test: Can we evaluate Print99 after Say is forgotten?
            const output = memo.interpreter.parse('Tell me about Print99.');

            // If the fix is implemented, this is what we expect
            expect(output).toContain('bottle');
            expect(output).toContain('three bottles');
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

        test('Very large numbers return "a lot"', () => {
            const input = 'Remember big as one million times one million.';
            const result = memo.interpreter.parse(input);
            
            expect(result).toContain('I will remember');
            expect(result).toContain('a lot');
            expect(result).not.toContain('undefined');
        });
    });

    describe('Conditionals', () => {
        beforeEach(() => {
            memo.varlist = {}; // Reset state before each test
        });

        test('Simple conditional with else', () => {
            memo.interpreter.parse('Remember g as five.');
            memo.interpreter.parse('Remember h as ten.');
            
            const result = memo.interpreter.parse('Remember r with n as if n then g else h.');
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['r']).toBeDefined();
            expect(memo.varlist['r'].params).toEqual([{type: "Variable", varname: "n"}]);
        });

        test('Conditional with equals comparison', () => {
            const result = memo.interpreter.parse('Remember r with n as if n equals zero then n plus one.');
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['r']).toBeDefined();
            expect(memo.varlist['r'].params).toEqual([{type: "Variable", varname: "n"}]);
        });

        test('Conditional with less than comparison and else', () => {
            memo.interpreter.parse('Remember g as five.');
            memo.interpreter.parse('Remember h as ten.');
            
            const result = memo.interpreter.parse('Remember r with n as if n is less than five then g else h.');
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['r']).toBeDefined();
            expect(memo.varlist['r'].params).toEqual([{type: "Variable", varname: "n"}]);
        });

        test('Simple else if conditional', () => {
            const result = memo.interpreter.parse('Remember r with n as if n equals zero then zero, else if n equals one then one, else two.');
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['r']).toBeDefined();
            expect(memo.varlist['r'].params).toEqual([{type: "Variable", varname: "n"}]);
            
            // Test evaluation with different values
            memo.interpreter.parse('Remember test0 as r with zero.');
            expect(memo.varlist['test0'].value).toBe(0);
            
            memo.interpreter.parse('Remember test1 as r with one.');
            expect(memo.varlist['test1'].value).toBe(1);
            
            memo.interpreter.parse('Remember test2 as r with two.');
            expect(memo.varlist['test2'].value).toBe(2);
        });

        test('Complex else if with string operations', () => {
            // Note: Using five/ten instead of zero/one to avoid NumberLiteral reserved word conflicts
            // Commas before else/else-if are converted to semicolons by the preprocessor
            const result = memo.interpreter.parse('Remember Stay with n as if n equals five then "No more bottles", else if n equals ten then "1 bottle", else "many bottles".');
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['stay']).toBeDefined();
            expect(memo.varlist['stay'].params).toEqual([{type: "Variable", varname: "n"}]);
            
            // Test with five
            const result5 = memo.interpreter.parse('Tell me about Stay with five.');
            expect(result5).toContain('No more bottles');
            
            // Test with ten
            const result10 = memo.interpreter.parse('Tell me about Stay with ten.');
            expect(result10).toContain('1 bottle');
            
            // Test with other number
            const result3 = memo.interpreter.parse('Tell me about Stay with three.');
            expect(result3).toContain('many bottles');
        });

        test('Else if with pure semicolons (no comma conversion)', () => {
            // Test that semicolons work directly without preprocessor conversion
            const result = memo.interpreter.parse('Remember Status with n as if n equals zero then zero; else if n equals one then one; else two.');
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['status']).toBeDefined();
            expect(memo.varlist['status'].params).toEqual([{type: "Variable", varname: "n"}]);
            
            // Test evaluation with different values
            memo.interpreter.parse('Remember s0 as Status with zero.');
            expect(memo.varlist['s0'].value).toBe(0);
            
            memo.interpreter.parse('Remember s1 as Status with one.');
            expect(memo.varlist['s1'].value).toBe(1);
            
            memo.interpreter.parse('Remember s2 as Status with two.');
            expect(memo.varlist['s2'].value).toBe(2);
        });

        test('Multiple else-if with "is" comparisons and expressions', () => {
            // Test complex conditional with bare "is" comparison and string concatenation
            const result = memo.interpreter.parse('Remember Next with n as if n is one then "no more bottles", else if n is zero then "99 bottles", else if n is two then "one bottle", else n plus " bottles".');
            
            expect(result).toContain('I will remember');
            expect(memo.varlist['next']).toBeDefined();
            expect(memo.varlist['next'].params).toEqual([{type: "Variable", varname: "n"}]);
            
            // Test with 1
            const result1 = memo.interpreter.parse('Tell me about Next with one.');
            expect(result1).toContain('no more bottles');
            
            // Test with 0
            const result0 = memo.interpreter.parse('Tell me about Next with zero.');
            expect(result0).toContain('99 bottles');
            
            // Test with 2
            const result2 = memo.interpreter.parse('Tell me about Next with two.');
            expect(result2).toContain('one bottle');
            
            // Test with other number
            const result5 = memo.interpreter.parse('Tell me about Next with five.');
            expect(result5).toContain('five bottles');
        });
    });

    describe('ForLoop Evaluation', () => {
        test('Simple for-loop creates a list with evaluated expressions', () => {
            memo.varlist = {}; // Reset state
            
            // Define a simple function
            memo.interpreter.parse('Remember Double with n as n times two.');
            
            // Create a for-loop that applies Double to numbers 0-3
            const assignResult = memo.interpreter.parse('Remember MyList as for i in zero to three, Double with i.');
            
            // Check that MyList exists and is properly formed
            expect(memo.varlist['mylist']).toBeDefined();
            expect(memo.varlist['mylist'].type).toBe('ForLoop');
            expect(memo.varlist['mylist'].deps).toContain('double');
            
            // Evaluate the list
            const result = memo.interpreter.parse('Tell me about MyList.');
            // Should evaluate to [0, 2, 4, 6] which displays as "zero, two, four, six"
            expect(result).toContain('zero');
            expect(result).toContain('two');
            expect(result).toContain('four');
            expect(result).toContain('six');
        });

        test('For-loop with multiple expressions creates list of lists', () => {
            memo.varlist = {}; // Reset state
            
            // Define helper functions
            memo.interpreter.parse('Remember Say with n as n plus " bottles".');
            memo.interpreter.parse('Remember Next with n as n minus one.');
            memo.interpreter.parse('Remember Action with n as n times two.');
            
            // Create a for-loop with multiple expressions
            memo.interpreter.parse('Remember BottlesArray as for n in zero to two, Say with n, Next with n, Action with n.');
            
            // Check dependencies
            expect(memo.varlist['bottlesarray']).toBeDefined();
            expect(memo.varlist['bottlesarray'].deps).toContain('say');
            expect(memo.varlist['bottlesarray'].deps).toContain('next');
            expect(memo.varlist['bottlesarray'].deps).toContain('action');
            expect(memo.varlist['bottlesarray'].deps).not.toContain('n'); // Iterator var should not be a dependency
        });

        test('For-loop updates when dependencies change', () => {
            memo.varlist = {}; // Reset state

            memo.interpreter.parse('Remember x as two.');
            
            // Define a function
            memo.interpreter.parse('Remember AddX with n as n plus x.');
            memo.interpreter.parse('Remember x as one.');
            
            // Create a for-loop using the function
            memo.interpreter.parse('Remember results as for i in zero to two, AddX with i.');
            
            // Check initial values - should be [1, 2, 3]
            let output = memo.interpreter.parse('Tell me about results.');
            expect(output).toContain('one');
            expect(output).toContain('two');
            expect(output).toContain('three');
            
            // Change x
            memo.interpreter.parse('Remember x as ten.');
            
            // Results should now be [10, 11, 12]
            output = memo.interpreter.parse('Tell me about Results.');
            expect(output).toContain('ten');
            expect(output).toContain('eleven');
            expect(output).toContain('twelve');
        });
    });

    describe('ForLoop with Step', () => {
        test('For-loop with positive step counts by twos', () => {
            memo.varlist = {}; // Reset state
            
            // Create a for-loop with step 2
            memo.interpreter.parse('Remember evens as for n in zero to ten step two, n.');
            
            // Should get [0, 2, 4, 6, 8, 10]
            const output = memo.interpreter.parse('Tell me about evens.');
            expect(output).toContain('zero');
            expect(output).toContain('two');
            expect(output).toContain('four');
            expect(output).toContain('six');
            expect(output).toContain('eight');
            expect(output).toContain('ten');
            
            // Should not contain odd numbers
            expect(output).not.toContain('one');
            expect(output).not.toContain('three');
            expect(output).not.toContain('five');
        });

        test('For-loop with "by" synonym for step', () => {
            memo.varlist = {}; // Reset state
            
            // Use "by" instead of "step"
            memo.interpreter.parse('Remember multiples as for n in zero to twelve by four, n.');
            
            // Should get [0, 4, 8, 12]
            const output = memo.interpreter.parse('Tell me about multiples.');
            expect(output).toContain('zero');
            expect(output).not.toContain('one');
            expect(output).not.toContain('two');
            expect(output).not.toContain('three');
            expect(output).toContain('four');
            expect(output).not.toContain('five');
            expect(output).not.toContain('six');
            expect(output).not.toContain('seven');
            expect(output).toContain('eight');
            expect(output).not.toContain('nine');
            expect(output).not.toContain('ten');
            expect(output).not.toContain('eleven');
            expect(output).toContain('twelve');
        });

        test('For-loop with negative step counts down', () => {
            memo.varlist = {}; // Reset state
            
            // Define a function to use in the loop
            memo.interpreter.parse('Remember identity with x as x.');
            
            // Create a countdown with negative step
            memo.interpreter.parse('Remember countdown as for n in ten to zero step negative two, identity with n.');
            
            // Should get [10, 8, 6, 4, 2, 0]
            const output = memo.interpreter.parse('Tell me about countdown.');
            expect(output).toContain('ten');
            expect(output).not.toContain('nine');
            expect(output).toContain('eight');
            expect(output).toContain('six');
            expect(output).toContain('four');
            expect(output).toContain('two');
            expect(output).toContain('zero');
            
            // Should not contain odd numbers
            expect(output).not.toContain('nine');
            expect(output).not.toContain('seven');
        });

        test('For-loop with Range and step', () => {
            memo.varlist = {}; // Reset state
            
            // Create a for-loop using Range syntax with step
            memo.interpreter.parse('Remember values as for n in the range from zero to fifteen step five, n.');
            
            // Should get [0, 5, 10, 15]
            const output = memo.interpreter.parse('Tell me about values.');
            expect(output).toContain('zero');
            expect(output).not.toContain('one');
            expect(output).not.toContain('two');
            expect(output).toContain('five');
            expect(output).toContain('ten');
            expect(output).toContain('fifteen');
        });

        test('For-loop using range defined in previous variable', () => {
            memo.varlist = {}; // Reset state
            
            // Define a range variable
            memo.interpreter.parse('Remember myrange as the range from zero to twenty.');
            
            // Define step variable
            memo.interpreter.parse('Remember mystep as five.');
            
            // Use the range in a for-loop with step
            memo.interpreter.parse('Remember fives as for n in myrange step mystep, n.');
            
            // Should get [0, 5, 10, 15, 20]
            const output = memo.interpreter.parse('Tell me about fives.');
            expect(output).toContain('zero');
            expect(output).not.toContain('one');
            expect(output).not.toContain('two');
            expect(output).toContain('five');
            expect(output).toContain('ten');
            expect(output).toContain('fifteen');
            expect(output).toContain('twenty');
        });

        test('Error: counting up with negative step', () => {
            memo.varlist = {}; // Reset state
            
            // Try to count up with negative step - should error
            const output = memo.interpreter.parse('Remember bad as for n in zero to ten step negative one, n.');
            
            expect(output).toContain('Step must be positive when counting upward');
        });

        test('Error: counting down with positive step', () => {
            memo.varlist = {}; // Reset state

            // Try to count down with positive step - should error
            const output = memo.interpreter.parse('Remember bad as for n in ten to zero step one, n.');

            expect(output).toContain('Step must be negative when counting downward');
        });
    });

    describe('ForLoop with VarWithParam range', () => {
        test('Parser test for VarWithParam in for loop', () => {
            memo.varlist = {}; // Reset state

            // Test parsing the for loop with VarWithParam
            const code = 'Remember Result as for item in five\'s BottleList, item.';
            const preprocessed = memo.preprocess(code);
            const parsed = memo.parser.parse(preprocessed);

            // Check structure
            expect(parsed.cmd).toBe('let');
            expect(parsed.varname).toBe('result');
            expect(parsed.exp.type).toBe('ForLoop');
            expect(parsed.exp.varname).toBe('item');
            expect(parsed.exp.range.type).toBe('VariableWithParam');
            expect(parsed.exp.range.name.varname).toBe('bottlelist');
            expect(parsed.exp.range.param.type).toBe('IntLiteral');
            expect(parsed.exp.range.param.value).toBe(5);
        });

        test('For-loop with VarWithParam evaluates correctly', () => {
            memo.varlist = {}; // Reset state

            // Create a function that returns a list
            memo.interpreter.parse('Remember BottleList with n as one, two, three.');

            // Use VarWithParam as the range using apostrophe-s syntax
            const result = memo.interpreter.parse('Remember Result as for item in five\'s BottleList, item.');
            console.log('Evaluation result:', result);
            console.log('Result in varlist:', JSON.stringify(memo.varlist['result'], null, 2));

            // Should have created the variable
            expect(memo.varlist['result']).toBeDefined();
        });

        test('For-loop with conditional and descending range outputs list format', () => {
            memo.varlist = {}; // Reset state

            // Define a function with a conditional
            memo.interpreter.parse('Remember nt with n as if n is one then "it\'s a one!!!" else "".');

            memo.interpreter.parse('Remember printt as for n in three to one, nt with n.');

            // Print the result - should output as list format since it contains a string
            const output = memo.interpreter.parse('Tell me about printt.');

            expect(output).toBe('it\'s a one!!!');
        });
    });

    describe('Clear command', () => {
        test('Clear removes a single variable', () => {
            memo.varlist = {}; // Reset state

            // Create some variables
            memo.interpreter.parse('Remember x as five.');
            memo.interpreter.parse('Remember y as ten.');
            memo.interpreter.parse('Remember z as fifteen.');

            // Verify they exist
            expect(memo.varlist['x']).toBeDefined();
            expect(memo.varlist['y']).toBeDefined();
            expect(memo.varlist['z']).toBeDefined();

            // Clear one variable
            const result = memo.interpreter.parse('Clear x.');

            // Check the result message
            expect(result).toBe('I have forgotten x.');

            // Verify x is gone but y and z remain
            expect(memo.varlist['x']).toBeUndefined();
            expect(memo.varlist['y']).toBeDefined();
            expect(memo.varlist['z']).toBeDefined();
        });

        test('Clear with forget keyword works', () => {
            memo.varlist = {}; // Reset state

            memo.interpreter.parse('Remember myvar as twenty.');
            expect(memo.varlist['myvar']).toBeDefined();

            const result = memo.interpreter.parse('Forget myvar.');

            expect(result).toBe('I have forgotten myvar.');
            expect(memo.varlist['myvar']).toBeUndefined();
        });

        test('Clear on non-existent variable returns appropriate message', () => {
            memo.varlist = {}; // Reset state

            const result = memo.interpreter.parse('Clear nonexistent.');

            expect(result).toBe("I don't remember nonexistent.");
        });

        test('Clearing a variable resolves dependent variables first', () => {
            memo.varlist = {}; // Reset state

            // Create dependent variables
            memo.interpreter.parse('Remember a as five.');
            memo.interpreter.parse('Remember b as a plus ten.');

            // Verify both exist and b depends on a
            expect(memo.varlist['a']).toBeDefined();
            expect(memo.varlist['b']).toBeDefined();

            // Clear the dependency
            memo.interpreter.parse('Clear a.');

            // a should be gone
            expect(memo.varlist['a']).toBeUndefined();

            // b should still exist and be resolved to a literal value (15)
            expect(memo.varlist['b']).toBeDefined();
            expect(memo.varlist['b'].type).toBe('IntLiteral');
            expect(memo.varlist['b'].value).toBe(15);

            // b should evaluate correctly even though a is gone
            const bValue = memo.interpreter.parse('Tell me about b.');
            expect(bValue).toBe('fifteen.');
        });

        test('Clear handles case-insensitive variable names', () => {
            memo.varlist = {}; // Reset state

            memo.interpreter.parse('Remember MyVariable as seven.');
            expect(memo.varlist['myvariable']).toBeDefined(); // Variables are stored lowercase

            const result = memo.interpreter.parse('Clear MyVariable.');

            expect(result).toBe('I have forgotten myvariable.');
            expect(memo.varlist['myvariable']).toBeUndefined();
        });

        test('For-loop with range variable resolves when range is forgotten', () => {
            memo.varlist = {}; // Reset state

            // Create a range variable
            memo.interpreter.parse('Remember nttt as from three to one.');
            expect(memo.varlist['nttt']).toBeDefined();
            expect(memo.varlist['nttt'].type).toBe('Range');

            // Create a for-loop that depends on the range variable
            memo.interpreter.parse('Remember x as for g in nttt, g plus "blah".');
            expect(memo.varlist['x']).toBeDefined();
            expect(memo.varlist['x'].deps).toContain('nttt');

            // Simulate 12 unrelated commands to fade out 'nttt' but keep 'x' alive
            for (let i = 0; i < 12; i++) {
                memo.interpreter.parse(`Remember temp${i} as ${i}.`);
                // Keep x alive by referencing it periodically
                if (i % 3 === 0) {
                    memo.interpreter.parse('Remember keepalive as x.');
                }
            }

            // nttt should be forgotten
            expect(memo.varlist['nttt']).toBeUndefined();

            // x should still exist and work correctly
            expect(memo.varlist['x']).toBeDefined();

            // Evaluate x - should still produce the correct output
            const output = memo.interpreter.parse('Tell me about x.');

            // Should concatenate "blah" with each number: "3blah", "2blah", "1blah" -> "3blah2blah1blah"
            expect(output).toBe('threeblahtwoblahoneblah.');
        });
    });

    describe('Undefined variable detection', () => {
        test('Assignment with undefined variable returns error', () => {
            memo.varlist = {}; // Reset state

            // Try to assign x to undefined y
            const result = memo.interpreter.parse('Remember x as y.');
            expect(result).toBe("I don't remember y.");

            // x should not have been created
            expect(memo.varlist['x']).toBeUndefined();
        });

        test('Assignment with undefined variable in expression returns error', () => {
            memo.varlist = {}; // Reset state

            memo.interpreter.parse('Remember a as five.');

            // Try to use undefined variable b in expression
            const result = memo.interpreter.parse('Remember result as a plus b.');
            expect(result).toBe("I don't remember b.");

            // result should not have been created
            expect(memo.varlist['result']).toBeUndefined();
        });

        test('Assignment with all defined variables succeeds', () => {
            memo.varlist = {}; // Reset state

            memo.interpreter.parse('Remember a as five.');
            memo.interpreter.parse('Remember b as ten.');

            // This should succeed
            const result = memo.interpreter.parse('Remember result as a plus b.');
            expect(result).toContain('I will remember result');
            expect(memo.varlist['result']).toBeDefined();
        });

        test('For-loop with undefined range variable returns error', () => {
            memo.varlist = {}; // Reset state

            // Try to use undefined range in for-loop
            const result = memo.interpreter.parse('Remember result as for i in myrange, i.');
            expect(result).toBe("I don't remember myrange.");

            // result should not have been created
            expect(memo.varlist['result']).toBeUndefined();
        });

        test('Conditional with undefined variable returns error', () => {
            memo.varlist = {}; // Reset state

            // Try to use undefined variable in conditional
            const result = memo.interpreter.parse('Remember result as if x is five then ten else twenty.');
            expect(result).toBe("I don't remember x.");

            // result should not have been created
            expect(memo.varlist['result']).toBeUndefined();
        });
    });

    describe('Throws error when assigning undefined variable', () => {
        test('Assignment with undefined variable returns error', () => {
            memo.varlist = {}; // Reset state

            // Try to assign x to undefined y
            const result = memo.interpreter.parse('Remember x as y.');
            expect(result).toMatch(/don\'t remember y|not defined|syntax error/i);

            // x should not have been created
            expect(memo.varlist['x']).toBeUndefined();
        });
    });
});
