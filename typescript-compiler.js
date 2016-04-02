const ts = Npm.require('typescript');
const mkdirp = Npm.require('mkdirp');

TypeScriptCompiler = class TypeScriptCompiler extends TypeScriptCompiler {
  constructor(extraOptions) {
    super(_.extend({
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      moduleResolution: 'classic',
      module: 'system'
    }, extraOptions));

    this.typingsMap = new Map();
    this.typingsRegEx = /^typings\/.*\.d\.ts$/;
  }

  isDevRunCommand() {
    var auxCommands = {
      'test-packages': 1,
      'publish': 1,
      'build': 1
    };

    var len = process.argv.length;
    if(process.argv.length > 2) {
      var command = process.argv[2];
      if (auxCommands[command]) return false;
    }

    return process.argv.indexOf('--production') == -1;
  }

  /**
   * Copies declaration files from packages to apps.
   * File updates are evaluated based on the source hash.
   * Allows only files from the "typings" folder in packages
   * and copies them to the "typings" folder in the app.
   */
  processTypings(files) {
    // Set hashes of the app's typings.
    files.forEach(file => {
      let path = file.getPathInPackage();
      if (file.isAppDeclaration() && ! this.typingsMap.has(path)) {
        this.typingsMap.set(path, file.getSourceHash());
      }
    });

    // Process package typings.
    let copiedFiles = [];
    files.forEach(file => {
      if (file.isPkgDeclaration()) {
        let path = file.getPathInPackage();
        // Files should be in the "typings" folder.
        if (! this.typingsRegEx.test(path)) {
          Logger.warn('Typings path ${path} doesn\'t start with "typings"');
          return;
        }

        var stdPath = this.getStandardDeclarationPath(file);
        let oldHash = this.typingsMap.get(stdPath);
        let newHash = file.getSourceHash();
        // Copy file if it's not existed or has been updated.
        if (oldHash !== newHash) {
          this.copyTypings(stdPath, file.getContentsAsString());
          this.typingsMap.set(stdPath, newHash);
          copiedFiles.push(stdPath);
        }
      }
    });

    // Report about added/updated typings.
    if (copiedFiles.length) {
      Logger.info('***** Typings that have been added/updated *****');
      copiedFiles.forEach(path => Logger.info(path));
    }
  }

  /**
   * Gets standardized declaration file path, i.e.,
   * path that contains package name inside.
   * if package "foo" has a declaration file typings/foo.d.ts,
   * then standardized path will be typings/foo/foo.d.ts.
   */
  getStandardDeclarationPath(file) {
    let path = file.getPathInPackage();
    let dirPath = ts.getDirectoryPath(
      ts.normalizePath(path)).replace(/^typings\/?/, '');
    let pkgName = file.getOnePackageName();
    let pkgTest = new RegExp(`^\/?${pkgName}(\/.+|$)`);
    // Check if the path starts with the package name.
    if (pkgTest.test(dirPath) === false) {
      let pkgDirPath = ts.combinePaths(
        ts.combinePaths('typings', pkgName), dirPath);
      let fileName = ts.getBaseFileName(path);
      path = ts.combinePaths(pkgDirPath, fileName);
    }

    return path;
  }

  copyTypings(filePath, content) {
    const fs = Plugin.fs;
    let dirPath = ts.getDirectoryPath(filePath);
    if (! fs.existsSync(dirPath)) {
      mkdirp.sync(Plugin.convertToOSPath(dirPath));
    }
    fs.writeFileSync(filePath, content);
  }

  processFilesForTarget(files) {
    this.extendFiles(files, FileMixin);

    // Process typings from packages only in dev mode.
    if (this.isDevRunCommand()) {
      this.processTypings(files);
    }

    super.processFilesForTarget(files);
  }
}
