
const path = Plugin.path;
const fs = Plugin.fs;
const ts = Npm.require('typescript');
const mkdirp = Npm.require('mkdirp');
const chalk = Npm.require('chalk');

TsCachingCompiler =
class TsCachingCompiler extends MultiFileCachingCompiler {
  constructor(tsconfig) {
    super({
      compilerName: 'ts-caching-compiler',
      defaultCacheSize: 1024 * 1024 * 10
    });

    this.init(tsconfig);
  }

  getCacheKey(file) {
    return file.getSourceHash();
  }

  compileResultSize(result) {
    return result.data.length;
  }

  processFilesForTarget(files) {
    this.processFilesForTargetInternal(files);

    // Filters package typings.
    // Other files should be processed.
    files = files.filter(file => {
      return !(this.isDeclarationFile(file) &&
        file.getPackageName());
    });
    super.processFilesForTarget(files);
  }

  compileOneFile(file, allFiles) {
    // We don't compile typings themselves,
    // only make compiler to watch them
    // and then recompiles dependent .ts-file
    // when appropriate custom typings are changed.
    if (this.isDeclarationFile(file)) {
      let compileResult = {
        type: 'd',
        data: file.getContentsAsString(),
        path: file.getPathInPackage()
      };

      return {
        compileResult: compileResult,
        referencedImportPaths: []
      }
    }

    let result = TypeScript.transpile(file.getContentsAsString(), {
        ...this.tsconfig,
        filePath: file.getPathInPackage(),
        moduleName: this.getAbsoluteImportPath(file, true)
      });

    this.processDiagnostics(file, result.diagnostics);

    // Moves a source map belonging to some package to
    // the standard (in Meteor) packages directory.
    let packageName = file.getPackageName();
    if (packageName && result.sourceMap) {
      let path = result.sourceMap.sources[0];
      result.sourceMap.sources = ['packages/' + path];
    }

    let referencedPaths = [];
    // Reference paths are not supported for packages
    // for time being. 
    if (!packageName) {
      referencedPaths = result.referencedPaths;
    }

    let compileResult = {
      type: 'ts',
      data: result.data,
      sourceMap: result.sourceMap,
      path: this.getJsPathInPackage(file)
    };

    return {
      compileResult: compileResult,
      referencedImportPaths: referencedPaths
    }
  }

  addCompileResult(file, result) {
    var type = result.type;

    switch (type) {
      case 'ts': return file.addJavaScript(result);
    }
  }
}

utils.classMixin(TsCachingCompiler, TsBasicCompiler);
