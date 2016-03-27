const meteorTS = Npm.require('meteor-typescript');

TypeScript = {
  validateOptions(options) {
    if (! options) return;

    meteorTS.validateAndConvertOptions(options);
  },

  // Extra options are the same compiler options
  // but passed in the compiler constructor.
  validateExtraOptions(options) {
    if (! options) return;

    meteorTS.validateAndConvertOptions({
      compilerOptions: options
    });
  },

  getDefaultOptions: meteorTS.getDefaultOptions,

  getCompilerOptions(compilerOptions, extraOptions) {
    let dco = meteorTS.getDefaultOptions().compilerOptions;
    let resultOptions = compilerOptions ? _.clone(compilerOptions) : dco;

    // First, default undefined values, e.g.,
    // if diagnostics undefined, set it to true, etc.
    _.defaults(resultOptions, dco);

    // Second, apply extra options, i.e.,
    // options passed in the compiler constructor.
    _.extend(resultOptions, extraOptions);

    return resultOptions;
  },

  compile(source, options) {
    options = options || meteorTS.getDefaultOptions();
    return meteorTS.compile(source, options);
  },

  setCacheDir(cacheDir) {
    meteorTS.setCacheDir(cacheDir);
  },

  isDeclarationFile(filePath) {
    return filePath.match(/^.*\.d\.ts$/);
  },

  removeTsExt(path) {
    return path && path.replace(/(\.tsx|\.ts)$/g, '');
  }
}
