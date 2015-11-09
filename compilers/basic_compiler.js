
var path = Plugin.path;
var fs = Plugin.fs;
var ts = Npm.require('typescript');

TsBasicCompiler = class TsBasicCompiler {
  constructor() {
    this.init();
  }

  init() {
    var customConfig = this._readConfig();

    this._defaultConfig = {
      module : ts.ModuleKind.System,
      target: ts.ScriptTarget.ES5,
      sourceMap: true,
      // By default TS will resolve all modules.
      noResolve: false,
      diagnostics: true,
      useCashe: true,
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

  get tsconfig() {
    return this._tsconfig;
  }

  _readConfig() {
    let tsconfigFs = path.resolve('./.tsconfig');
    if (fs.existsSync(tsconfigFs)) {
      try {
        let tsconfig = JSON.parse(
          fs.readFileSync(tsconfigFs, 'utf8'));
        return this._convert(tsconfig);
      } catch(err) {
        throw new Error('Format of the tsconfig is invalid');
      }
    }
    return null;
  }

  // Converts to the original format.
  _convert(tsconfig) {
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

    // Disables package diagnostics for time being.
    let pkgName = file.getPackageName();
    if (pkgName) return;

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
