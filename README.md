# grunt-webdav-deploy

> Deploy a zipped archive to your webdav repository for use with build systems such as bower

## Warning ##

> This plugin contains destructive default options.

## Getting Started
This plugin requires Grunt `~0.4.1`

Install the [grunt-webdav-deploy](https://github.com/abovethewater/grunt-webdav-deploy) plugin with this command:

```shell
npm install grunt-webdav-deploy --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with:

```js
grunt.loadNpmTasks('grunt-webdav-deploy');
```

## The "webdav_deploy" task

### Overview
In your project's Gruntfile, add a section named `webdav_deploy` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  webdav_deploy: {
    options: {
      // Task-specific options go here.
      snapshot_path : 'https://example.com/snapshot',
      release_path : 'https://example.com/version',
      baseDir : './'
      basic_auth: false,
      strategy : 'SNAPSHOT',
      snapshot_filename : 'SNAPSHOT',
      overwrite_release : false,
    },
    deploy: {
      // Target-specific file lists and/or options go here.
      files: {
        src: ['a/file', 'a/directory', 'all/files/in/dir/*', '*glob*'],
      }
    },
  },
})
```



### Options

#### options.snapshot_path
Type: `String`
Default value: `none`
Required: `(release === SNAPSHOT)`

A string value that defines the repository path for snapshots.

http and https are supported

#### options.basic_auth
Type: `Boolean`
Default value: `none`
Required: `false`

Basic auth of the form `user:password@` is supported.

The username and password are expected to be available in a the file `.webdav_auth.json` with the structure

{
  user : "user",
  pass : "pass"
}


#### options.release_path
Type: `String`
Default value: `none`
Required: `(release === RELEASE)`

A string value that defines the repository path for releases.

http and https are supported, as is basic auth of the form:

  user:password@

#### options.strategy
Type: `String`
Default value: `SNAPSHOT`
Required : `false`

The deployment strategy, SNAPSHOT or RELEASE

## Warning ##

> The current archive at `${snapshot_path}/${snapshot_filename}.zip` will be removed and replaced

A value of `RELEASE` will produce an archive `${VERSION}.zip` where `VERSION` is taken from the module's package.json

#### options.snapshot_filename
Type: `String`
Default value: `SNAPSHOT`
Required : `false`

The generated filename on the repository when using the `SNAPSHOT` strategy.

A value of `TIMESTAMP` will produce a file name representing the current timestamp (new Date().getTime()).

#### options.suffix
Type `String`
Default value: `zip`
Required : `false`

The suffix for the generated zip file

#### options.basedir
Type `String`
Default value : './'
Required : 'false'

The root directory to base the created zip file from

#### options.overwrite_release
Type: `Boolean`
Default value: `false`
Required: `false`

Whether the archive produced by the RELEASE strategy will be overwritten if it exists.

## Warning ##

>  This is obviously destructive and will nag if set.

### Usage Examples

#### Snapshot Options
In this example, the contents of the dev directory are put into SNAPSHOT.zip on the remote webdav archive

```js
grunt.initConfig({
  webdav: {
    options: {
      snapshot_path : 'me:user@http://example.com/incoming/snapshots/myrepo'
    },
    files: {
      'production/**/*'
    },
  },
})
```

#### Release Options

In this example, the contents of the production directory are put into 0.0.1.zip on the remote webdav archive

```js
grunt.initConfig({
  webdav: {
    options: {
      release_path : 'me:user@https://example.com/incoming/releases/myrepo'
      strategy : 'RELEASE'
    },
    files: {
      'production/**/*'
    },
  },
})
```

Using the following package.json

```js
{
  "name": "mymodule",
  "description": "An example of a module using the grunt-deploy-webdav plugin",
  "version": "0.0.1",
  ...
}
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History

* 0.1.0 Initial release to NPM
* 0.1.1 Added support for baseDir
