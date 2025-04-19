module.exports = function(grunt) {

	grunt.initConfig({
	    concat: {
			options: {
				separator: '\n'
			},
			dist : {
				src: ['src/memo.js','gen/memo.parser.js','src/memo.interpreter.js'],
				dest: 'memo.js',
				},
		},
        run: {
            options: {
              // Task-specific options go here.
            },
            your_target: {
              cmd: 'npx',
              args: [
                'peggy','-o',
                'gen/memo.parser.js',
                'src/memo.pegjs'
              ]
            }
          }
	});

    grunt.loadNpmTasks('grunt-run');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.registerTask('build', ['run', 'concat']);
};
