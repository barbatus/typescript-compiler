Package.describe({
  name: 'barbatus:typescript-compiler',
  version: '0.9.8',
  summary: 'TypeScript Compiler for Meteor',
  git: 'https://github.com/barbatus/typescript-compiler',
  documentation: 'README.md'
});

Npm.depends({
  'meteor-typescript': '0.8.6',
  'async': '1.4.0',
  'colors': '1.1.2',
});

Package.onUse(function(api) {
  api.versionsFrom('1.4.1');

  api.use([
    'ecmascript@0.4.0',
    'check@1.0.5',
    'underscore@1.0.4',
  ], 'server');

  api.addFiles([
    'logger.js',
    'file-utils.js',
    'typescript-compiler.js',
    'typescript.js',
    'utils.js',
  ], 'server');

  api.export([
    'TypeScript',
    'TypeScriptCompiler',
  ], 'server');
});

Package.onTest(function(api) {
  api.use([
    'tinytest',
    'ecmascript',
    'underscore',
    'practicalmeteor:sinon',
    'practicalmeteor:chai',
    'practicalmeteor:mocha',
    'dispatch:mocha-phantomjs',
  ]);
  api.use('barbatus:typescript-compiler');

  api.addFiles([
    'tests/server/unit/input-file.js',
    'tests/server/unit/compiler-tests_spec.js',
  ], 'server');
});
