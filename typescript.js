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

  getCompilerOptions(arch, compilerOptions, ...extraOptions) {
    let dco = meteorTS.getDefaultOptions(arch).compilerOptions;
    let resultOptions = compilerOptions ? _.clone(compilerOptions) : dco;

    // TODO: move it to meteor-typescript.
    // Apply default options.
    _.defaults(resultOptions, dco);
    // Combine lib values.
    resultOptions.lib = resultOptions.lib.concat(dco.lib);

    // Apply extra options.
    for (let extra of extraOptions) {
      Object.assign(resultOptions, extra);
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
