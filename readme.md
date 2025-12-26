# []memo

An interpreter that only performs what it can see. Code flows off the screen into oblivion.

## Sample program

Remember Say with n as if n is zero then "No more bottles", else if n is one then "one bottle", else n plus " bottles".

Remember Next with n as if n is one then "no more bottles", else if n is zero then "ninety nine bottles", else n minus one, " bottles".

Remember Action with n as if n is zero then "Go to the store and buy some more", else "Take one down and pass it around".

Remember Print99 as for beer in ninety-nine to zero, beer's Say, " of beer on the wall, ", beer's Say, " of beer.\n", beer's Action, "\n", beer's Next, " of beer on the wall.\n".

Tell me about Print99.

## To Use

`memo.js` is the (non-minimized) production file.

## To Contribute

Please don't update `memo.js` or `memo.parser.js` directly. Update in src folder and then build with `grunt build`. 

PEG is optimized for PeggyJs. 

### Setting up the project

* Clone the <a href="https://github.com/rottytooth/esonatlangtools">esonatlangtools</a> to the `packages/esonatlangtools` folder.
* Run `npm install`
* For the web interface, download the [Hack font](https://www.dafont.com/hack.font) to `/web/fonts`.
