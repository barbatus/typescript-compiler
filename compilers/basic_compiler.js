
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

      parsedConfig.typings = [];
      if (tsconfig.files) {
        parsedConfig.typings = this._parseTypings(tsconfig.files);
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

  // Parses "files" property of the config
  // sifting out everything except declaration files
  // in the typings folder.
  _parseTypings(files) {
    check(files, Array);

    return files.filter(file => {
      return this._typingsRegEx.test(file);
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
      if (cfgHash !== this._cfgHash) {
        this._tsconfig = this._createConfig(cfgFile.getContentsAsString());
        this._cfgHash = cfgHash;
      }
    }
  }

  processTypings(files) {
    let dtFiles = files.filter(file => {
      return this.isDeclarationFile(file) &&
        this.isPackageFile(file) &&
          !this._typingsMap.has(path);
    });
    let missingFiles = [];
    for (let file of dtFiles) {
      let path = file.getPathInPackage();
      // Resolve typings file relatively the current app folder.
      if (!fs.existsSync(path)) {
        missingFiles.push(file);
      }
    }
    if (missingFiles.length) {
      missingFiles.forEach(file => {
        this._createTypings(file);
        this._typingsMap.set(file.getPathInPackage());
      });

      // Report about newly installed typings.
      console.log(chalk.green('***** New typings have been added *****'));
      missingFiles.forEach(file => {
        console.log(chalk.green(file.getPathInPackage()));
      });
      console.log(chalk.green(
        'Add typings in tsconfig.json or by references in files.'));
    }
  }

  _createTypings(file) {
    let filePath = file.getPathInPackage();
    let dirPath = ts.getDirectoryPath(filePath);
    if (!fs.existsSync(dirPath)) {
      mkdirp.sync(Plugin.convertToOSPath(dirPath));
    }
    fs.writeFileSync(filePath, file.getContentsAsString());
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
        console.log(chalk.yellow(diagnostic.formattedMsg)));
    }
  }

  isDeclarationFile(file) {
    return TypeScript.isDeclarationFile(
      file.getBasename());
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
