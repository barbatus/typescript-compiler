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

  getCompilerOptions(arch, options, ...extraOptions) {
    let { compilerOptions } = meteorTS.getDefaultOptions(arch);
    let resOptions = options || compilerOptions;

    // Apply extra options.
    for (let extra of extraOptions) {
      if (extra) {
        Object.assign(resultOptions, extra);
      }
    }

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
