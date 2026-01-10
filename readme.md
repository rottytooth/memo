# []memo

An interpreter that only performs what it can see. Code flows off the screen into oblivion.

## Sample program

### Simple Arithmetic
[With responses from the interpreter]

Remember number as one million, five-hundred and thirteen thousand, eight hundred, sixty-two.
> I will remember number as one million five hundred thirteen thousand eight hundred sixty-two.

Tell me about number times two.
> Three million twenty-seven thousand seven hundred twenty-four.

Tell me about number times number.
> A lot.

### Sum of Squares

Remember nums as from one to six.

Remember evens with x as nums where x modulo two is zero.

Remember squares as for x in evens, x times x.

Remember total as the sum of squares.

Tell me about total.

### 99 Bottles

Remember say with n as n and " bottles of beer on the wall, " and n and " bottles of beer! Take one down, pass it around, " and n minus one and " bottles of beer on the wall! ".

Remember print99 as for beer in ninety-nine to zero, if beer is greater than zero then beer's say else "all out, motherfuckers!".

Tell me about Print99.

More.

More.

More.

[repeat More. until it responds with "There is nothing more."]

## To Use

`memo.js` is the (non-minimized) production file.

## To Contribute

Please don't update `memo.js` or `memo.parser.js` directly. Update in src folder and then build with `grunt build`. 

### Setting up the project

* Clone the <a href="https://github.com/rottytooth/esonatlangtools">esonatlangtools</a> to the `packages/esonatlangtools` folder.
* Run `npm install`
* For the web interface, download the [Hack font](https://www.dafont.com/hack.font) to `/web/fonts`.
