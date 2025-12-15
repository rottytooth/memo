# Memo Parser Tests

This directory contains tests for the Memo language parser and interpreter.

## Setup

Install dependencies:
```bash
npm install
```

## Running Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode (re-runs on file changes):
```bash
npm run test:watch
```

## Test Structure

### `parser.test.js`
Tests for parsing Memo language constructs including:
- Variable assignments with parameters
- Arithmetic expressions (addition, subtraction, multiplication, division)
- Range expressions
- Number parsing (simple numbers, large numbers, millions)
- Error handling (unknown variables, syntax errors, reserved words)
- Print commands
- Complex nested expressions

## Test Cases

The test suite includes tests for these specific Memo lines:

1. `Remember x with p as y with g.` - Variable with parameter
2. `Remember test as thirty times twenty-five divided by seventeen.` - Arithmetic
3. `Remember another with p as p times twenty plus test.` - Parameter with expression
4. `Remember z with a and b as a plus b plus seven divided by one hundred and fourteen.` - Multiple parameters
5. `Remember g as the range from zero to a million.` - Range expression

## Adding New Tests

To add new tests, follow this pattern:

```javascript
test('Description of what is being tested', () => {
    const input = 'Memo code to test.';
    const result = memo.interpreter.parse(input);
    
    expect(result).toContain('expected output');
    // Add more assertions as needed
});
```

## Coverage

Run tests with coverage:
```bash
npm test -- --coverage
```
