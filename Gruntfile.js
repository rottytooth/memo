module.exports = function(grunt) {

    grunt.initConfig({
        copy: {
            main: {
              files: [
                {expand: true, src: ['memo.js'], dest: 'web'},
              ],
            },
        },
        concat: {
            options: {
              separator: '\n'
            },
            dist1 : {
              src: ['src/memo.start.pegjs','packages/esonatlangtools/expressions.pegjs','packages/esonatlangtools/literals.pegjs','packages/esonatlangtools/whitespace.pegjs'],
              dest: 'build/memo.pegjs'
            },
            dist2 : {
              src: ['src/memo.js','memo.tools.js','build/memo.parser.js','src/memo.interpreter.js'],
              dest: 'memo.js'
            },
        },
        run: {
            peggy: {
              cmd: 'npx',
              args: [
                'peggy','-o',
                'build/memo.parser.js',
                'build/memo.pegjs',
                '--format','globals',
                '-e','memo.parser'
              ]
            }
          }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-run');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.registerTask('build', ['concat:dist1', 'run', 'concat:dist2', 'copy']);
};
