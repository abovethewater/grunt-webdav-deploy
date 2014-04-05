/*
 * grunt-webdav-deploy
 * https://github.com/abovethewater/grunt-webdav-deploy
 *
 * Copyright (c) 2013-2014 Joe
 * Licensed under the MIT license.
 * Master http://abovethewater.mit-license.org/
 *
 *
 */
 'use strict';

 var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    JSZip = require('node-zip');

function addFileToZip(grunt, zip, filepath) {
  if(fs.lstatSync(filepath).isDirectory()) {
    grunt.log.writeln("Adding folder", filepath);
    zip.folder(filepath);
    var directory = fs.readdirSync(filepath);
    directory.forEach(function(subfilepath) {
      addFileToZip(grunt, zip, path.join(filepath,subfilepath));
    });
  } else {
    grunt.log.writeln("Adding file", filepath);
    zip.file(filepath, fs.readFileSync(filepath), { binary : true });
  }
}

function performHTTPActions(httpOptions) {

    var http = httpOptions.http;
    var grunt = httpOptions.grunt;

    var req = http.request(httpOptions, function(res) {

      grunt.log.write('Status: ' + res.statusCode + '\n');

      if (httpOptions.method === 'DELETE') {
        if (res.statusCode === 204) {
          grunt.log.ok('Remote file removed');
        } else if (res.statusCode === 401) {
          grunt.log.writeln('Authentication failed');
          httpOptions.done(false);
          return;
        } else if (res.statusCode === 404) {
          grunt.log.writeln('Remote file did not exist');
        } else if (res.statusCode === 405) {
          grunt.log.error('Remote server does not support webdav!');
          httpOptions.done(false);
          return;
        } else {
          grunt.log.error('Unknown error occurred!');
          httpOptions.done(false);
          return;
        }
        grunt.log.writeln();
        httpOptions.method = 'PUT';
        performHTTPActions(httpOptions);
      } else {
        if (res.statusCode === 201 || res.statusCode === 200) {
          grunt.log.writeln(httpOptions.dest);
          grunt.log.subhead('Successfully deployed');
        } else if (res.statusCode === 204) {
          grunt.log.error('Remote file exists!');
          httpOptions.done(false);
          return;
        } else if (res.statusCode === 401) {
          grunt.log.writeln('Authentication failed');
          httpOptions.done(false);
          return;
        } else if (res.statusCode === 405) {
          grunt.log.error('Remote server does not support webdav!');
          httpOptions.done(false);
          return;
        } else {
          grunt.log.error('Unknown error occurred!');
          httpOptions.done(false);
          return;
        }
        httpOptions.done();
      }
    });

    req.on('error', function(e) {
      grunt.log.error('problem with request: ' + e.message);
      grunt.log.error(e.stack);
      throw e;
    });

    if (httpOptions.method === 'DELETE') {
      grunt.log.writeln('Removing existing zip');
      req.end();
    } else {
      grunt.log.writeln('Deploying zip to ' + httpOptions.dest);
      req.end(httpOptions.data, 'binary');
    }
}

module.exports = function(grunt) {

  grunt.registerMultiTask('webdav_deploy', function() {

    if (this.filesSrc.length === 0) {
      grunt.log.error("Requires src files.");
      return false;
    }

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      basic_auth : false,
      strategy : 'SNAPSHOT',
      snapshot_filename : 'SNAPSHOT',
      overwrite_release : false,
      suffix : 'zip',
      baseDir : './'
    });

    if (typeof options.strategy !== "string" ||
      typeof options.snapshot_filename  !== "string" || options.overwrite_release === undefined ||
      typeof options.suffix !== 'string') {
      grunt.log.error("Missing required option!");
      return false;
    }

    var dest, initialMethod;

    if ('SNAPSHOT' === options.strategy.toUpperCase()) {
      if (typeof options.snapshot_path !== "string") {
        grunt.log.error("Missing snapshot_path!");
        return false;
      }

      initialMethod = 'DELETE';

      dest = options.snapshot_path + "/" + options.snapshot_filename + "." + options.suffix;

    } else if ('RELEASE' === options.strategy.toUpperCase()) {
      if (typeof options.release_path !== "string") {
        grunt.log.error("Missing release_path!");
        return false;
      }

      if (options.overwrite_release === true) {
        grunt.log.warn('Release will be overwritten');
        initialMethod = 'DELETE';
      } else {
        initialMethod = 'PUT';
      }

      var version = grunt.file.readJSON('./package.json').version;
      var name = grunt.file.readJSON('./package.json').name;

      dest = options.release_path + "/" + name + "-" + version + "." + options.suffix;

    } else {
      grunt.log.error("Unknown strategy " + options.strategy.toUpperCase());
      return false;
    }

    var http;

    var deconstructedDest = url.parse(dest);

    switch (deconstructedDest.protocol) {
      case 'http:' :
        http = require('http');
        break;
      case 'https:' :
        http = require('https');
        break;
      default :
        grunt.log.error("Invalid transport " + dest);
        return false;
    }

    var httpOptions = {
      http : http,
      'method' : initialMethod,
      hostname : deconstructedDest.hostname,
      port : deconstructedDest.port,
      path : deconstructedDest.path,
      dest : dest,
      grunt : grunt,
      done : this.async()
    };

    if (options.basic_auth === true) {
      var user = process.env.WEBDAV_USER;
      var pass = process.env.WEBDAV_PASS;

      if ('RELEASE' === options.strategy.toUpperCase()) {
        if (process.env.WEBDAV_RELEASE_USER !== undefined) {
          user = process.env.WEBDAV_RELEASE_USER;
        }
        if (process.env.WEBDAV_RELEASE_PASS !== undefined) {
          pass = process.env.WEBDAV_RELEASE_PASS;
        }
      }

      if (typeof user !== "string" || typeof pass !== "string") {
        grunt.log.error("basic_auth specified, but not provided");
        return false;
      }

      httpOptions.auth = user + ":" + pass;
    }

    grunt.log.writeln('Creating zip..');

    var zip = new JSZip();
    this.filesSrc.forEach(function(f) {
      var origDir;

      if (options.baseDir !== undefined && options.baseDir !== './' && options.baseDir !== './') {
        origDir = process.cwd();

        process.chdir(options.baseDir);

        f = path.relative(options.baseDir, f);
      }

      addFileToZip(grunt, zip, f);

      if (origDir !== undefined) {
        process.chdir(origDir);
      }

    });
    grunt.log.writeln('');

    var data = zip.generate({base64:false,compression:'DEFLATE'});

    httpOptions.data = data;

    performHTTPActions(httpOptions);

  });

};
