
TsCompiler = class TsCompiler extends TsBasicCompiler  {
  constructor() {
    super();

    this._cachingCompiler = new TsCachingCompiler(this.tsconfig);
    this._batchCompiler = new TsBatchCompiler(this.tsconfig);
  }

  processFilesForTarget(files) {
    if (this.tsconfig.compilerOptions &&
        _.isBoolean(this.tsconfig.compilerOptions.useCache) &&
        this.tsconfig.compilerOptions.useCache === false) {
      this._batchCompiler.processFilesForTarget(files);
      return;
    }

    this._cachingCompiler.processFilesForTarget(files);
  }
}
