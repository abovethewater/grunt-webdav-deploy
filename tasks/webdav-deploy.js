/*
 * grunt-webdav
 * https://github.com/abovethewater/grunt-webdav
 *
 * Copyright (c) 2013 Joe
 * Licensed under the MIT license.
 *
 * Man this is ugly.. refactor
 *
 * Now even worse, but finally found a zip solution that works
 *
 */

 'use strict';

 var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    archiver = require('archiver');

function addFileToZip(grunt, zip, filepath) {
  if(fs.lstatSync(filepath).isDirectory()) {
    grunt.log.writeln("Adding folder", filepath);
    var directory = fs.readdirSync(filepath);
    directory.forEach(function(subfilepath) {
      addFileToZip(grunt, zip, path.join(filepath,subfilepath));
    });
  } else {
    grunt.log.writeln("Adding file", filepath);
    zip.append(fs.createReadStream(filepath), { name: filepath });
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
        } else if (res.statusCode === 404) {
          grunt.log.writeln('Remote file did not exist');
        }
        grunt.log.writeln();
        httpOptions.method = 'PUT';
        performHTTPActions(httpOptions);
      } else {
        if (res.statusCode === 201) {
          grunt.log.writeln(httpOptions.dest);
          grunt.log.subhead('Successfully deployed');
        } else if (res.statusCode === 204) {
          grunt.log.error('Remote file exists!');
          httpOptions.done(false);
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
      grunt.log.writeln('Deploying zip');
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

      dest = options.release_path + "/" + version + "." + options.suffix;

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
      grunt : grunt
    };

    if (options.basic_auth === true) {
      var auth = grunt.file.readJSON('./.webdav_auth.json');
      var user = auth[options.strategy.toLowerCase()].user;
      var pass = auth[options.strategy.toLowerCase()].pass;

      if (typeof user !== "string") {
        user = auth.user;
      }

      if (typeof pass !== "string") {
        pass = auth.pass;
      }

      if (typeof user !== "string" || typeof pass !== "string") {
        grunt.log.error("basic_auth specified, but not provided");
        return false;
      }

      httpOptions.auth = user + ":" + pass;
    }

    grunt.log.writeln('Creating zip..');
    var zip = new archiver('zip');
    zip.on('error', function(err) {
      throw err;
    });

    var tmpFile = __dirname + '/../deploy-tmp.zip';

    var output = fs.createWriteStream(tmpFile);

    zip.pipe(output);

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

    var done = this.async();

    zip.finalize(function(err, bytes) {

      if (err) {
        throw err;
      }

      grunt.log.writeln(bytes + ' total bytes');

      var data = fs.readFileSync(tmpFile);

      httpOptions.data = data;
      httpOptions.done = function() {
        fs.unlink(tmpFile);
        done();
      };

      performHTTPActions(httpOptions);
    });

  });

};
