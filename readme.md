# []memo

An interpreter that only performs what it can see. Code flows off the screen to oblivion.

## Contributors

Uses Peggyjs.

Don't update memo.js or memo.parser.js directly. Update in src folder and then build `memo.js` with `grunt build`. This will generate memo.parser.js from memo.pegjs and then concat all the js together in memo.js, which is a non-minimized, production file. It is built to both the root and the web folder.
