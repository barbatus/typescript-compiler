'use strict';

const meteorTS = Npm.require('meteor-typescript');

TypeScript = {
  validateOptions(options) {
    if (! options) return;

    meteorTS.convertOptionsOrThrow(options);
  },

  // Extra options are the same compiler options
  // but passed in the compiler constructor.
  validateExtraOptions(options) {
    if (! options) return;

    meteorTS.convertOptionsOrThrow({
      compilerOptions: options
    });
  },

  getDefaultOptions: meteorTS.getDefaultOptions,

  getCompilerOptions(options, extraOptions) {
    let compilerOptions = options ||
      meteorTS.getDefaultOptions().compilerOptions;
    compilerOptions = _.clone(options);

    if (extraOptions) {
      for (let option in extraOptions) {
        if (extraOptions.hasOwnProperty(option)) {
          compilerOptions[option] = extraOptions[option];
        }
      }
    }

    return compilerOptions;
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
