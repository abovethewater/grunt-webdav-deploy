/*
 * grunt-webdav-deploy
 * https://github.com/abovethewater/grunt-webdav-deploy
 *
 * Copyright (c) 2013-2016 Joe Mathews
 * Licensed under the MIT license.
 * http://abovethewater.mit-license.org/
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Configuration to be run (and then tested).
    webdav_deploy: {
      options: {
        snapshot_path : 'http://example.com/snapshot',
        release_path : 'http://example.com/version',
        // basic_auth : false,
        // snapshot_filename : 'SNAPSHOT',
        // overwrite_release : false
        // suffix : 'zip'
      },
      snapshot: {
        options: {
          strategy : 'SNAPSHOT',
        },
        files: {
          src: ['test/fixtures/testing', 'test/fixtures/123'],
        }
      },
      release: {
        options: {
          strategy : 'RELEASE',
        },
        files: {
          src: ['test/fixtures/testing', 'test/fixtures/123'],
        }
      },
    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['default', 'webdav_deploy']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint']);

};
