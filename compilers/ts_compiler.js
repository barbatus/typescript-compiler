
TsCompiler = class TsCompiler extends TsBasicCompiler  {
  constructor() {
    super();

    this._cachingCompiler = new TsCachingCompiler(this.tsconfig);
    this._batchCompiler = new TsBatchCompiler(this.tsconfig);
  }

  processFilesForTarget(files) {
    if (this.tsconfig.useCache) {
      this._cachingCompiler.processFilesForTarget(files);
      return;
    }

    this._batchCompiler.processFilesForTarget(files);
  }
}
