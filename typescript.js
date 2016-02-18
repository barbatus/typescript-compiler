'use strict';

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
    let resultOptions = compilerOptions ? _.clone(compilerOptions) : 
      meteorTS.getDefaultOptions().compilerOptions;

    // If diagnostics no defined, set it to true.
    _.defaults(resultOptions, {
      diagnostics: true
    });

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
  }
}
