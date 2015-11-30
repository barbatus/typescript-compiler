
var path = Plugin.path;
var fs = Plugin.fs;
var ts = Npm.require('typescript');
var mkdirp = Npm.require('mkdirp');
var chalk = Npm.require('chalk');

TsCachingCompiler =
class TsCachingCompiler extends MultiFileCachingCompiler {
  constructor() {
    super({
      compilerName: 'ts-caching-compiler',
      defaultCacheSize: 1024 * 1024 * 10
    });

    this.init();
  }

  getCacheKey(file) {
    return this.tsconfig.useCache ?
      file.getSourceHash() : Date.now();
  }

  compileResultSize(result) {
    return result.data.length;
  }

  processFilesForTarget(files) {
    if (this.tsconfig.includePackageTypings) {
      this._processTypings(files);
    }

    files = files.filter(file => {
      return !this.isDeclarationFile(file) ||
        !file.getPackageName();
    });
    super.processFilesForTarget(files);
  }

  _processTypings(files) {
    let dtFiles = files.filter(file => {
      return this.isDeclarationFile(file) &&
        !!file.getPackageName();
    });
    let absent = false;
    for (let file of dtFiles) {
      if (!fs.existsSync(file.getPathInPackage())) {
        absent = true;
        break;
      }
    }
    if (absent) {
      dtFiles.forEach(file => {
        this._createTypings(file);
      });
      console.log(chalk.green('***** New TypeScript typings have been created *****'));
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

  compileOneFile(file, allFiles) {
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
