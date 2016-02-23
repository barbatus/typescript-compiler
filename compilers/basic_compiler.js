
const path = Plugin.path;
const fs = Plugin.fs;
const ts = Npm.require('typescript');
const mkdirp = Npm.require('mkdirp');
const chalk = Npm.require('chalk');

TsBasicCompiler = class TsBasicCompiler {
  constructor(tsconfig) {
    this.init(tsconfig);
  }

  init(tsconfig) {
    this._typingsRegEx = /^typings\/.*\.d\.ts$/;

    // Installed typings map.
    this._typingsMap = new Map();

    this._defaultOptions = {
      module : ts.ModuleKind.System,
      target: ts.ScriptTarget.ES5,
      sourceMap: true,
      // By default TS will resolve all modules.
      noResolve: false,
      diagnostics: true,
      useCache: true,
      // Will always emit class metadata,
      // especially useful in Angular2
      emitDecoratorMetadata: true,
      // Will copy typings from packages to
      // the typings folder.
      includePackageTypings: true
    };

    // Config hash.
    this._cfgHash = null;

    this._tsconfig = tsconfig || {
      compilerOptions: this._defaultOptions
    };
  }

  get tsconfig() {
    return this._tsconfig;
  }

  get compilerOptions() {
    return this._tsconfig && this._tsconfig.compilerOptions;
  }

  _createConfig(cfgContent) {
    let userConfig = this._parseConfig(cfgContent);

    return {
      compilerOptions: _.extend(this._defaultOptions,
        userConfig.compilerOptions),
      typings: userConfig.typings
    }
  }

  _parseConfig(cfgContent) {
    try {
      let tsconfig = JSON.parse(cfgContent);

      let parsedConfig = {
        compilerOptions: {}
      };
      // Parse standard TypeScript options.
      if (tsconfig.compilerOptions) {
        parsedConfig.compilerOptions = this._convertOriginal(
          tsconfig.compilerOptions);
      }

      // Parse additional options, used by this package.
      if (tsconfig.meteorCompilerOptions) {
        parsedConfig.compilerOptions = {
          ...parsedConfig.compilerOptions,
          ...tsconfig.meteorCompilerOptions
        };
      }

      // Reads "files" property of the config.
      // Filter out everything except declaration files
      // in the "typings" folder.
      parsedConfig.typings = [];
      if (tsconfig.files) {
        parsedConfig.typings = this.filterTypings(tsconfig.files);
      }

      return parsedConfig;
    } catch(err) {
      throw new Error(chalk.red(`Format of the tsconfig is invalid ${err}`));
    }
  }

  // Converts given compiler options to the original format.
  _convertOriginal(compilerOptions) {
    let options = {
      compilerOptions: compilerOptions,
      files: []
    };

    let result = ts.parseJsonConfigFileContent(options);

    if (result.errors && result.errors.length) {
      throw new Error(result.errors[0].messageText);
    }

    return result.options;
  }

  filterTypings(filePaths) {
    check(filePaths, Array);

    return filePaths.filter(filePath => {
      return this._typingsRegEx.test(filePath);
    });
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

  processConfig(files) {
    let cfgFile = _.first(files.filter(file => this.isConfigFile(file)));
    if (cfgFile) {
      let cfgHash = cfgFile.getSourceHash();
      // If config has changed,
      // create and apply new one. 
      if (cfgHash !== this._cfgHash) {
        this._tsconfig = this._createConfig(cfgFile.getContentsAsString());
        this._cfgHash = cfgHash;
      }
    }
  }

  // Gets standardized declaration file path, i.e.,
  // path that contains package name inside.
  // if package "foo" has a declaration file typings/foo.d.ts,
  // then standardized path will be typings/foo/foo.d.ts.
  _getStandardTypingsFilePath(file) {
    let filePath = file.getPathInPackage();
    let dirPath = ts.getDirectoryPath(
      ts.normalizePath(filePath)).replace(/^typings\/?/, '');
    let pkgName = file.getPackageName();
    if (pkgName.indexOf(':') != -1) {
      pkgName = pkgName.split(':')[1];
    }
    let pkgTest = new RegExp(`^\/?${pkgName}(\/.+|$)`);
    // Check if the path starts with the package name.
    if (pkgTest.test(dirPath) === false) {
      let pkgDirPath = ts.combinePaths(
        ts.combinePaths('typings', pkgName), dirPath);
      let fileName = ts.getBaseFileName(filePath);
      filePath = ts.combinePaths(pkgDirPath, fileName);
    }

    return filePath;
  }

  // Copies declaration files from packages to apps.
  // File updates are evaluated based on the source hash.
  // Allows only files from the "typings" folder in packages
  // and copies them to the "typings" folder in the app.
  processTypings(files) {
    // Set hashes of the app's typings.
    files.forEach(file => {
      let isAppTypings = this.isDeclarationFile(file) &&
        !this.isPackageFile(file);

      let path = file.getPathInPackage();
      if (isAppTypings && !this._typingsMap.has(path)) {
        this._typingsMap.set(path, file.getSourceHash());
      }
    });

    let copiedFiles = [];
    // Process package typings.
    files.forEach(file => {
      // Check if it's a package declaration file.
      let isPkgTypings = this.isDeclarationFile(file) &&
        this.isPackageFile(file);

      if (isPkgTypings) {
        let path = file.getPathInPackage();
        // Check if the file is in the "typings" folder.
        if (!this._typingsRegEx.test(path)) {
          console.log('Typings path ${path} doesn\'t start with "typings"');
          return;
        }

        let filePath = this._getStandardTypingsFilePath(file);
        let oldHash = this._typingsMap.get(filePath);
        let newHash = file.getSourceHash();
        // Copy file if it doesn't exist or has been updated.
        if (oldHash !== newHash) {
          this._copyTypings(filePath, file.getContentsAsString());
          this._typingsMap.set(filePath, newHash);
          copiedFiles.push(filePath);
        }
      }
    });

    if (copiedFiles.length) {
      // Report about added/updated typings.
      console.log(chalk.green('***** Typings that have been added/updated *****'));
      copiedFiles.forEach(filePath => {
        console.log(chalk.green(filePath));
      });
      console.log(chalk.green(
        'Add typings in tsconfig.json or by references in files.'));
    }
  }

  _copyTypings(filePath, content) {
    let dirPath = ts.getDirectoryPath(filePath);
    if (!fs.existsSync(dirPath)) {
      mkdirp.sync(Plugin.convertToOSPath(dirPath));
    }
    fs.writeFileSync(filePath, content);
  }

  processDiagnostics(file, diagnostics) {
    diagnostics.forEachSyntactic(diagnostic => {
      file.error({
        message: chalk.red(diagnostic.message),
        // Path with package name prefix to 
        // show package where this error happened.
        sourcePath: this.getAbsoluteImportPath(file),
        line: diagnostic.line,
        column: diagnostic.column
      });
    });

    // Disables package diagnostics if the pkgMode is turned off.
    let pkgName = file.getPackageName();
    if (!this.compilerOptions.pkgMode && pkgName) return;

    if (this.compilerOptions.alwaysThrow) {
      diagnostics.forEachSemantic(diagnostic => {
        file.error({
          message: chalk.red(diagnostic.message),
          sourcePath: this.getAbsoluteImportPath(file),
          line: diagnostic.line,
          column: diagnostic.column
        });
      });
      return;
    }

    if (this.compilerOptions.diagnostics) {
      diagnostics.forEachSemantic(diagnostic =>
        console.log(chalk.yellow(
          `[${file.getArch()}] ${diagnostic.formattedMsg}`)));
    }
  }

  isDeclarationFile(file) {
    return TypeScript.isDeclarationFile(file.getBasename());
  }

  isConfigFile(file) {
    return file.getPathInPackage() === 'tsconfig.json';
  }

  isPackageFile(file) {
    return !!file.getPackageName();
  }

  getAbsoluteImportPath(file, noExtension) {
    let packageName = file.getPackageName();
    let packagePrefix = packageName ? '{' + packageName + '}/' : '';
    let resultPath = packagePrefix + file.getPathInPackage();

    return noExtension ? ts.removeFileExtension(resultPath) : resultPath;
  }

  getJsPathInPackage(file) {
    let path = file.getPathInPackage();
    return ts.removeFileExtension(path) + '.js';
  }

  processFilesForTargetInternal(files) {
    this.processConfig(files);

    // Process typings from packages only when associated options
    // set in the config (be default - true) and in development mode.
    if (this.compilerOptions.includePackageTypings &&
        this.isDevRunCommand()) {
      this.processTypings(files);
    }

    // Filters out typings and tsconfig.
    // Other files should be compiled.
    let tsFiles = files.filter(file => 
      !(this.isConfigFile(file) || this.isDeclarationFile(file)));

    return tsFiles;
  }
};
