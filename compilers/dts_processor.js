var path = Plugin.path;
var fs = Plugin.fs;
var ts = Npm.require('typescript');
var mkdirp = Npm.require('mkdirp');

TypingsProcessor = class TypingsProcessor extends CachingCompiler  {
  constructor() {
    super({
      compilerName: 'TypingsProcessor',
      defaultCacheSize: 1024
    });
  }

  getCacheKey(file) {
    return file.getSourceHash();
  }

  compileResultSize(result) {
    return 10;
  }

  processFilesForPackage(files) {

    // Process only files from packages.
    let filtered = files.filter(file => {
      let pkgName = file.getPackageName();
      return !!pkgName;
    });

    // Since file object in linters for
    // some reason doesn't have file.getDisplayMethod,
    // processFilesForTarget throws an exception.
    filtered.forEach(file => {
      const cacheKey = this._deepHash(this.getCacheKey(file));
      let fileCache = this._cache.get(cacheKey);

      if (!fileCache) {
        fileCache = this._readCache(cacheKey);
      }

      if (!fileCache) {
        this._cache.set(cacheKey, {});
        this._writeCacheAsync(cacheKey, {});

        this._createTypings(file);
      }
    });
  }

  _createTypings(file) {
    let filePath = file.getPathInPackage();
    let dirPath = ts.getDirectoryPath(filePath);
    if (!fs.existsSync(dirPath)) {
      mkdirp.sync(dirPath);
    }
    fs.writeFileSync(filePath, file.getContentsAsString());
  }
}

utils.classMixin(TypingsProcessor, TsBasicCompiler);
