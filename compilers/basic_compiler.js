
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

    this._tsconfig = tsconfig;

    if (!tsconfig) {
      this._initConfig();
    }
  }

  get tsconfig() {
    return this._tsconfig;
  }

  _initConfig() {
    let defaultOptions = {
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

    let userConfig = this._readConfig();
    if (userConfig) {
      this._tsconfig = {
        compilerOptions: _.extend(defaultOptions,
          userConfig.compilerOptions),
        typings: userConfig.typings
      }
    } else {
      this._tsconfig = {
        compilerOptions: defaultOptions
      }
    }
  }

  _readConfig() {
    let tsconfigFs = path.resolve('./tsconfig.json');
    if (fs.existsSync(tsconfigFs)) {
      try {
        let tsconfig = JSON.parse(
          fs.readFileSync(tsconfigFs, 'utf8'));

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
        throw new Error('Format of the tsconfig is invalid');
      }
    }
    return null;
  }

  // Converts given compiler options to the original format.
  _convertOriginal(compilerOptions) {
    if (compilerOptions.module) {
      switch (compilerOptions.module) {
        case 'commonjs':
          compilerOptions.module = ts.ModuleKind.CommonJS;
          break;
        case 'amd':
          compilerOptions.module = ts.ModuleKind.AMD;
          break;
        case 'umd':
          compilerOptions.module = ts.ModuleKind.UMD;
          break;
        case 'system':
          compilerOptions.module = ts.ModuleKind.System;
          break;
        case 'es6':
          compilerOptions.module = ts.ModuleKind.ES6;
          break;
        case 'es2015':
          compilerOptions.module = ts.ModuleKind.ES2015;
          break;
        case 'none':
          compilerOptions.module = ts.ModuleKind.None;
          break;
        default:
          throw new Error('[TypeScript Compiler]: uknown module option');
      }
    }

    if (compilerOptions.target) {
      switch (compilerOptions.target) {
        case 'es5':
          compilerOptions.target = ts.ScriptTarget.ES5;
          break;
        case 'es6':
          compilerOptions.target = ts.ScriptTarget.ES6;
          break;
        default:
          compilerOptions.target = ts.ScriptTarget.ES3;
          break;
      }
    }

    return compilerOptions;
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

  isRunCommand() {
    var auxCommands = {'test-packages': 1, 'publish': 1};
    if(process.argv.length > 2) {
      var command = process.argv[2];
      return !auxCommands[command];
    }
    return true;
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
      console.log(chalk.green('***** New typings have been added *****'));
      missingFiles.forEach(file => {
        console.log(chalk.green(file.getPathInPackage()));
      });
      console.log(chalk.green('***** Please re-start your app *****'));
      process.exit(0);
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
        message: diagnostic.message,
        // Path with package name prefix to 
        // show package where this error happened.
        sourcePath: this.getAbsoluteImportPath(file),
        line: diagnostic.line,
        column: diagnostic.column
      });
    });

    // Disables package diagnostics if the devMode is turned off.
    let pkgName = file.getPackageName();
    if (!this.tsconfig.pkgMode && pkgName) return;

    if (this.tsconfig.alwaysThrow) {
      diagnostics.forEachSemantic(diagnostic => {
        file.error({
          message: diagnostic.message,
          sourcePath: this.getAbsoluteImportPath(file),
          line: diagnostic.line,
          column: diagnostic.column
        });
      });
      return;
    }

    if (this.tsconfig.diagnostics) {
      diagnostics.forEachSemantic(diagnostic =>
        console.log(chalk.yellow(diagnostic.formattedMsg)));
    }
  }

  isDeclarationFile(file) {
    return TypeScript.isDeclarationFile(
      file.getBasename());
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
    console.log('\n');

    if (this.tsconfig.includePackageTypings && this.isRunCommand()) {
      this.processTypings(files);
    }
  }
};
