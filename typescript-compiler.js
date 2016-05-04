const async = Npm.require('async');
const Future = Npm.require('fibers/future');
const minimatch = Npm.require('minimatch');
const TSBuild = Npm.require('meteor-typescript').TSBuild;

TypeScriptCompiler = class TypeScriptCompiler {
  constructor(extraOptions, maxParallelism) {
    TypeScript.validateExtraOptions(extraOptions);

    this.extraOptions = extraOptions;
    this.maxParallelism = maxParallelism || 10;
    this.tsconfig = TypeScript.getDefaultOptions();
    this.defExclude = ['node_modules/**'];
    this.tsconfig.exclude = this.defExclude;
    this.cfgHash = null;
  }

  processFilesForTarget(inputFiles) {
    this.extendFiles(inputFiles);

    // If tsconfig.json has changed, create new one.
    this.processConfig(inputFiles);

    inputFiles = this.excludeFiles(inputFiles);

    let filesMap = {}, archMap = {};
    inputFiles.forEach((inputFile, index) => {
      filesMap[this.getExtendedPath(inputFile)] = index;
      archMap[inputFile.getArch()] = [];
    });

    _.keys(archMap).forEach(arch => {
      let archFiles = this.getArchFiles(inputFiles, arch);
      archMap[arch] = archFiles;
    });

    let getFileContent = filePath => {
      let index = filesMap[filePath];
      return index !== undefined ?
        inputFiles[index].getContentsAsString() : null;
    };

    // Assemble options.
    let typings = this.tsconfig.typings;
    let compilerOptions = this.tsconfig.compilerOptions;
    compilerOptions = TypeScript.getCompilerOptions(
      compilerOptions, this.extraOptions);
    let useCache = this.tsconfig.useCache;
    let buildOptions = { compilerOptions, typings, useCache };

    let pcompile = Logger.newProfiler('compilation');
    _.keys(archMap).forEach((arch, cb) => {
      let archFiles = archMap[arch];
      let filePaths = archFiles.map(inputFile => this.getExtendedPath(inputFile));
      Logger.log('process files: %s', filePaths);
      buildOptions.arch = arch;
      let pbuild = Logger.newProfiler('tsBuild');
      let tsBuild = new TSBuild(filePaths, getFileContent, buildOptions);
      pbuild.end();

      let pfiles = Logger.newProfiler('tsEmitFiles');
      let future = new Future;
      // Don't emit typings.
      archFiles = archFiles.filter(inputFile => !inputFile.isDeclaration());
      async.eachLimit(archFiles, this.maxParallelism, (inputFile, cb) => {
        let co = compilerOptions;
        let source = inputFile.getContentsAsString();
        let inputFilePath = inputFile.getPathInPackage();
        let outputFilePath = TypeScript.removeTsExt(inputFilePath) + '.js';
        let toBeAdded = {
          sourcePath: inputFilePath,
          path: outputFilePath,
          data: source,
          hash: inputFile.getSourceHash(),
          sourceMap: null,
          bare: inputFile.isBare()
        };

        let filePath = this.getExtendedPath(inputFile);
        let moduleName = this.getFileModuleName(inputFile, co);

        let pemit = Logger.newProfiler('tsEmit');
        let result = tsBuild.emit(filePath, moduleName);
        this.processDiagnostics(inputFile, result.diagnostics, co);
        pemit.end();

        toBeAdded.data = result.code;
        let module = compilerOptions.module;
        toBeAdded.bare = toBeAdded.bare || module === 'none';
        toBeAdded.hash = result.hash;
        toBeAdded.sourceMap = result.sourceMap;
        inputFile.addJavaScript(toBeAdded);

        cb();
      }, future.resolver());

      pfiles.end();

      future.wait();
    });

    pcompile.end();
  }

  extendFiles(inputFiles, mixins) {
    mixins = _.extend({}, FileMixin, mixins);
    inputFiles.forEach(inputFile => _.defaults(inputFile, mixins));
  }

  processDiagnostics(inputFile, diagnostics, compilerOptions) {
    // Always throw syntax errors.
    diagnostics.syntacticErrors.forEach(diagnostic => {
      inputFile.error({
        message: diagnostic.message,
        sourcePath: this.getExtendedPath(inputFile),
        line: diagnostic.line,
        column: diagnostic.column
      });
    });

    let packageName = inputFile.getPackageName();
    if (packageName) return;

    // And log out other errors except package files.
    if (compilerOptions && compilerOptions.diagnostics) {
      diagnostics.semanticErrors.forEach(diagnostic => {
        inputFile.warn({
          message: diagnostic.message,
          sourcePath: this.getExtendedPath(inputFile),
          line: diagnostic.line,
          column: diagnostic.column
        });
      });
    }
  }

  getExtendedPath(inputFile) {
    let packageName = inputFile.getPackageName();
    let packagedPath = inputFile.getPackagePrefixPath();

    let filePath = packageName ?
      ('packages/' + packagedPath) : packagedPath;

    return filePath;
  }

  getFileModuleName(inputFile, options) {
    if (options.module === 'none') return null;

    return inputFile.getES6ModuleName();
  }

  processConfig(inputFiles) {
    let cfgFile = inputFiles.filter(
      inputFile => inputFile.isConfig())[0];
    if (cfgFile) {
      let source = cfgFile.getContentsAsString();
      let hash = cfgFile.getSourceHash();
      // If hashes differ, create new tsconfig. 
      if (hash !== this.cfgHash) {
        this.tsconfig = this.parseConfig(source);
        this.cfgHash = hash;
      }
    }
  }

  parseConfig(cfgContent) {
    try {
      let tsconfig = JSON.parse(cfgContent);

      let files = tsconfig.files || [];
      if (! _.isArray(files)) {
        throw new Error('[tsconfig]: files is not array');
      }
      // Allow only typings in the "files" array.
      tsconfig.typings = this.getTypings(files);

      let exclude = tsconfig.exclude || [];
      if (! _.isArray(exclude)) {
        throw new Error('[tsconfig]: exclude is not array');
      }
      tsconfig.exclude = exclude.concat(this.defExclude);

      return tsconfig;
    } catch(err) {
      throw new Error(`Format of the tsconfig is invalid: ${err}`);
    }
  }

  excludeFiles(inputFiles) {
    let resultFiles = inputFiles;

    let pexclude = Logger.newProfiler('exclude');
    for (let ex of this.tsconfig.exclude) {
      resultFiles = resultFiles.filter(inputFile => {
        let path = inputFile.getPathInPackage();
        Logger.assert('exclude pattern %s: %s', ex, path);
        return ! minimatch(path, ex);
      });
    }
    pexclude.end();

    return resultFiles;
  }

  getArchFiles(inputFiles, arch) {
    let archFiles = inputFiles.filter((inputFile, index) => {
      if (inputFile.isConfig()) return false;

      return inputFile.getArch() === arch;
    });

    // Include only typings that current arch needs,
    // typings/main is for the server only and
    // typings/browser - for the client.
    let excludes = arch.startsWith('web') ?
      ['typings/main/**', 'typings/main.d.ts'] :
      ['typings/browser/**', 'typings/browser.d.ts'];

    for (let ex of excludes) {
      archFiles = archFiles.filter(inputFile => {
        let path = inputFile.getPathInPackage();
        return ! minimatch(path, ex);
      });
    }

    return archFiles;
  }

  getTypings(filePaths) {
    check(filePaths, Array);

    return filePaths.filter(filePath => {
      return TypeScript.isDeclarationFile(filePath);
    });
  }
}
