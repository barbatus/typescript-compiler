'use strict';

Plugin.registerCompiler({
  extensions: ['ts'],
  filenames: ['tsconfig.json']
}, () => new TsCachingCompiler());
