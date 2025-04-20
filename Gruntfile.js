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
            dist : {
              src: ['src/memo.js','memo.tools.js','gen/memo.parser.js','src/memo.interpreter.js'],
              dest: 'memo.js'
            },
        },
        run: {
            peggy: {
              cmd: 'npx',
              args: [
                'peggy','-o',
                'gen/memo.parser.js',
                'src/memo.pegjs',
                '--format','globals',
                '-e','memo.parser'
              ]
            }
          }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-run');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.registerTask('build', ['run', 'concat', 'copy']);
};
