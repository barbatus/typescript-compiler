const async = Npm.require('async');
const Future = Npm.require('fibers/future');
const TSBuild = Npm.require('meteor-typescript').TSBuild;

TypeScriptCompiler = class TypeScriptCompiler {
  constructor(extraOptions, maxParallelism) {
    TypeScript.validateExtraOptions(extraOptions);

    this.extraOptions = extraOptions;
    this.maxParallelism = maxParallelism || 10;
    this.tsconfig = TypeScript.getDefaultOptions();
    this.cfgHash = null;
  }

  processFilesForTarget(inputFiles) {
    this.extendFiles(inputFiles);

    // If tsconfig.json has changed, create new one.
    this.processConfig(inputFiles);

    let archMap = {};
    let filesMap = {};
    inputFiles.forEach((inputFile, index) => {
      if (this.isConfigFile(inputFile)) return;

      let arch = inputFile.getArch();
      let archFiles = archMap[arch];
      if (! archFiles) {
        archFiles = [];
        archMap[arch] = archFiles;
      }
      archFiles.push(inputFile);
      filesMap[this.getExtendedPath(inputFile)] = index;
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
    let buildOptions = { compilerOptions, typings };

    let compileDebug = new DebugLog('compilation');
    const future = new Future;
    async.each(_.keys(archMap), (arch, cb) => {
      let archFiles = archMap[arch];
      let filePaths = archFiles.map(inputFile => this.getExtendedPath(inputFile));
      compileDebug.log('process files: %s', filePaths);
      buildOptions.arch = arch;

      let buildDebug = new DebugLog('tsBuild');
      let tsBuild = new TSBuild(filePaths, getFileContent, buildOptions);

      archFiles.forEach(inputFile => {
        if (this.isDeclarationFile(inputFile)) return;

        let co = compilerOptions;
        let source = inputFile.getContentsAsString();
        let inputFilePath = inputFile.getPathInPackage();
        let outputFilePath = removeTsExt(inputFilePath) + '.js';
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

        let emitDebug = new DebugLog('tsEmit');
        let result = tsBuild.emit(filePath, moduleName);
        this.processDiagnostics(inputFile, result.diagnostics, co);
        emitDebug.end();

        toBeAdded.data = result.code;
        toBeAdded.bare = toBeAdded.bare || ! result.isExternal;
        toBeAdded.hash = result.hash;
        toBeAdded.sourceMap = result.sourceMap;

        inputFile.addJavaScript(toBeAdded);
      });

      cb();

      buildDebug.end();
    }, future.resolver());

    future.wait();

    compileDebug.end();
  }

  extendFiles(inputFiles) {
    inputFiles.forEach(inputFile => _.defaults(inputFile, FileMixin));
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

  getExtendedPath(inputFile, noExt) {
    let packageName = inputFile.getPackageName();
    let inputFilePath = inputFile.getPathInPackage();

    let filePath = packageName ?
      ('packages/' + packageName + '/' + inputFilePath) : inputFilePath;

    return noExt ? removeTsExt(filePath) : filePath;
  }

  getFileModuleName(inputFile, options) {
    return options.module !== 'none' ?
      this.getExtendedPath(inputFile, true): null;
  }

  isDeclarationFile(inputFile) {
    return TypeScript.isDeclarationFile(inputFile.getBasename());
  }

  isConfigFile(inputFile) {
    return inputFile.getBasename() === 'tsconfig.json';
  }

  processConfig(inputFiles) {
    let cfgFile = inputFiles.filter(
      inputFile => this.isConfigFile(inputFile))[0];
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
      if (tsconfig.files) {
        // Allow only typings in the "files" array.
        tsconfig.typings = this.getTypings(tsconfig.files);
      }

      return tsconfig;
    } catch(err) {
      throw new Error(`Format of the tsconfig is invalid: ${err}`);
    }
  }

  getTypings(filePaths) {
    check(filePaths, Array);

    return filePaths.filter(filePath => {
      return TypeScript.isDeclarationFile(filePath);
    });
  }
}

function removeTsExt(path) {
  return path.replace(/(\.tsx|\.ts)$/g, '');
}
