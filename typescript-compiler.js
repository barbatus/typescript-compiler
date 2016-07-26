'use strict';

import async from 'async';
import path from 'path';
import Future from 'fibers/future';
import {
  TSBuild,
  validateTsConfig,
  getExcludeRegExp
} from 'meteor-typescript';
import {createHash} from 'crypto';

// Default exclude paths.
const defExclude = ['node_modules/**'];

// Paths to exclude when compiling for the server.
const exlWebRegExp = new RegExp(
  getExcludeRegExp(['typings/main/**', 'typings/main.d.ts']));

// Paths to exclude when compiling for the client.
const exlMainRegExp = new RegExp(
  getExcludeRegExp(['typings/browser/**', 'typings/browser.d.ts']));

TypeScriptCompiler = class TypeScriptCompiler {
  constructor(extraOptions, maxParallelism) {
    TypeScript.validateExtraOptions(extraOptions);

    this.extraOptions = extraOptions;
    this.maxParallelism = maxParallelism || 10;
    this.serverTarget = null;
    this.tsconfig = TypeScript.getDefaultOptions();
    this.tsconfig.exclude = new RegExp(
      getExcludeRegExp(defExclude));
    this.cfgHash = null;
    this.diagHash = new Set;
    this.archSet = new Set;
  }

  processFilesForTarget(inputFiles) {
    this.extendFiles(inputFiles);

    // If tsconfig.json has changed, create new one.
    this.processConfig(inputFiles);

    inputFiles = this.excludeFiles(inputFiles);

    if (! inputFiles.length) return;

    let filesMap = new Map;
    inputFiles.forEach((inputFile, index) => {
      filesMap.set(this.getExtendedPath(inputFile), index);
    });

    let getFileContent = filePath => {
      let index = filesMap.get(filePath);
      if (index === undefined) {
        let filePathNoRootSlash = filePath.replace(/^\//, '');
        index = filesMap.get(filePathNoRootSlash);
      }
      return index !== undefined ?
        inputFiles[index].getContentsAsString() : null;
    };

    // Assemble options.
    let arch = inputFiles[0].getArch();
    let typings = this.tsconfig.typings;
    let compilerOptions = this.tsconfig.compilerOptions;
    if (!arch.startsWith('web') && this.serverTarget) {
      compilerOptions.target = this.serverTarget;
    }
    compilerOptions = TypeScript.getCompilerOptions(
      arch, compilerOptions, this.extraOptions);

    let useCache = this.tsconfig.useCache;
    let buildOptions = { compilerOptions, typings, useCache };

    let pcompile = Logger.newProfiler('compilation');
    let archFiles = this.filterArchFiles(inputFiles, arch);
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
      let throwSyntax = this.processDiagnostics(inputFile,
        result.diagnostics, co);
      pemit.end();

      if (! throwSyntax) {
        toBeAdded.data = result.code;
        let module = compilerOptions.module;
        toBeAdded.bare = toBeAdded.bare || module === 'none';
        toBeAdded.hash = result.hash;
        toBeAdded.sourceMap = result.sourceMap;
        inputFile.addJavaScript(toBeAdded);
      }

      cb();
    }, future.resolver());

    pfiles.end();

    future.wait();

    pcompile.end();
  }

  extendFiles(inputFiles, mixins) {
    mixins = _.extend({}, FileMixin, mixins);
    inputFiles.forEach(inputFile => _.defaults(inputFile, mixins));
  }

  processDiagnostics(inputFile, diagnostics, compilerOptions) {
    // Remove duplicated warnings for shared files
    // by saving hashes of already shown warnings.
    let reduce = (diagnostic, cb) => {
      let dob = {
        message: diagnostic.message,
        sourcePath: this.getExtendedPath(inputFile),
        line: diagnostic.line,
        column: diagnostic.column
      };
      let arch = inputFile.getArch();
      // TODO: find out how to get list of architectures.
      this.archSet.add(arch);

      let shown = false;
      for (let key of this.archSet.keys()) {
        if (key !== arch) {
          dob.arch = key;
          let hash = this.getShallowHash(dob);
          if (this.diagHash.has(hash)) {
            shown = true; break;
          }
        }
      }
      if (! shown) {
        dob.arch = arch;
        let hash = this.getShallowHash(dob);
        this.diagHash.add(hash);
        cb(dob);
      }
    }

    // Always throw syntax errors.
    let throwSyntax = !! diagnostics.syntacticErrors.length;
    diagnostics.syntacticErrors.forEach(diagnostic => {
      reduce(diagnostic, dob => inputFile.error(dob));
    });

    let packageName = inputFile.getPackageName();
    if (packageName) return throwSyntax;

    // And log out other errors except package files.
    if (compilerOptions && compilerOptions.diagnostics) {
      diagnostics.semanticErrors.forEach(diagnostic => {
        reduce(diagnostic, dob => inputFile.warn(dob));
      });
    }

    return throwSyntax;
  }

  getShallowHash(ob) {
    let hash = createHash('sha1');
    let keys = Object.keys(ob);
    keys.sort();

    keys.forEach(key => {
      hash.update(key).update('' + ob[key]);
    });

    return hash.digest('hex');
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
    let cfgFiles = inputFiles.filter(
      inputFile => inputFile.isConfig());

    for (let cfgFile of cfgFiles) {
      let path = cfgFile.getPathInPackage();

      // Parse root config.
      if (path === 'tsconfig.json') {
        let source = cfgFile.getContentsAsString();
        let hash = cfgFile.getSourceHash();
        // If hashes differ, create new tsconfig. 
        if (hash !== this.cfgHash) {
          this.tsconfig = this.parseConfig(source);
          this.cfgHash = hash;
        }
      }

      // Parse server config, and take target value. 
      if (path === 'server/tsconfig.json') {
        let  source= cfgFile.getContentsAsString();
        let tsconfig = this.parseConfig(source);
        this.serverTarget = tsconfig.compilerOptions &&
          tsconfig.compilerOptions.target;
      }
    }
  }

  parseConfig(cfgContent) {
    let tsconfig = null;

    try {
      tsconfig = JSON.parse(cfgContent);

      validateTsConfig(tsconfig);
    } catch(err) {
      throw new Error(`Format of the tsconfig is invalid: ${err}`);
    }

    let exclude = tsconfig.exclude || [];
    exclude = exclude.concat(defExclude);

    try {
      let regExp = getExcludeRegExp(exclude);
      tsconfig.exclude = regExp && new RegExp(regExp);
    } catch(err) {
      throw new Error(`Format of an exclude path is invalid: ${err}`);
    }

    return tsconfig;
  }

  excludeFiles(inputFiles) {
    let resultFiles = inputFiles;

    let pexclude = Logger.newProfiler('exclude');
    if (this.tsconfig.exclude) {
      resultFiles = resultFiles.filter(inputFile => {
        let path = inputFile.getPathInPackage();
        // There seems to an issue with getRegularExpressionForWildcard:
        // result regexp always starts with /.
        return ! this.tsconfig.exclude.test('/' + path);
      });
    }
    pexclude.end();

    return resultFiles;
  }

  getArchCompilerOptions(arch) {
    check(arch, String);

    if (!arch.startsWith('web') && this.serverTarget) {
      return { target: this.serverTarget };
    }
  }

  filterArchFiles(inputFiles, arch) {
    check(arch, String);

    let archFiles = inputFiles.filter((inputFile, index) => {
      if (inputFile.isConfig()) return false;

      return inputFile.getArch() === arch;
    });

    // Include only typings that current arch needs,
    // typings/main is for the server only and
    // typings/browser - for the client.
    let exclude = arch.startsWith('web') ?
      exlWebRegExp : exlMainRegExp;

    archFiles = archFiles.filter(inputFile => {
      let path = inputFile.getPathInPackage();
      return ! exclude.test('/' + path);
    });

    return archFiles;
  }

  getTypings(filePaths) {
    check(filePaths, Array);

    return filePaths.filter(filePath => {
      return TypeScript.isDeclarationFile(filePath);
    });
  }
}
