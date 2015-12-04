
const path = Plugin.path;
const fs = Plugin.fs;
const ts = Npm.require('typescript');
const chalk = Npm.require('chalk');

TsBasicCompiler = class TsBasicCompiler {
  constructor(tsconfig) {
    this.init(tsconfig);
  }

  init(tsconfig) {
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
    let customConfig = this._readConfig();

    this._defaultConfig = {
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

    this._tsconfig = _.extend({},
      this._defaultConfig, customConfig);
  }

  _readConfig() {
    let tsconfigFs = path.resolve('./.tsconfig');
    if (fs.existsSync(tsconfigFs)) {
      try {
        let tsconfig = JSON.parse(
          fs.readFileSync(tsconfigFs, 'utf8'));
        // Support original config structure.
        if (tsconfig.compilerOptions) {
          tsconfig = tsconfig.compilerOptions;
        }
        return this._convertOriginal(tsconfig);
      } catch(err) {
        throw new Error('Format of the tsconfig is invalid');
      }
    }
    return null;
  }

  // Converts to the original format.
  _convertOriginal(tsconfig) {
    if (tsconfig.module) {
      switch (tsconfig.module) {
        case 'commonjs':
          tsconfig.module = ts.ModuleKind.CommonJS;
          break;
        case 'amd':
          tsconfig.module = ts.ModuleKind.AMD;
          break;
        case 'umd':
          tsconfig.module = ts.ModuleKind.UMD;
          break;
        case 'system':
          tsconfig.module = ts.ModuleKind.System;
          break;
        case 'es6':
          tsconfig.module = ts.ModuleKind.ES6;
          break;
        case 'es2015':
          tsconfig.module = ts.ModuleKind.ES2015;
          break;
        case 'none':
          tsconfig.module = ts.ModuleKind.None;
          break;
        default:
          throw new Error('[TypeScript Compiler]: uknown module option');
      }
    }
    return tsconfig;
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
    diagnostics.syntactic.forEach(diagnostic => {
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
      diagnostics.semantic.forEach(diagnostic => {
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
      diagnostics.logSemantic();
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
};
