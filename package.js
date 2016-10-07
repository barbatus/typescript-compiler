Package.describe({
  name: 'barbatus:typescript-compiler',
  version: '0.8.1',
  summary: 'TypeScript Compiler for Meteor',
  git: 'https://github.com/barbatus/ts-compilers',
  documentation: 'README.md'
});

Npm.depends({
  'meteor-typescript': '0.7.1',
  'async': '1.4.0'
});

Package.onUse(function(api) {
  api.versionsFrom('1.4.1');

  api.use([
    'ecmascript@0.4.2',
    'check@1.0.5',
    'underscore@1.0.4'
  ], 'server');

  api.addFiles([
    'logger.js',
    'file-mixin.js',
    'typescript-compiler.js',
    'typescript.js'
  ], 'server');

  api.export([
    'TypeScript', 'TypeScriptCompiler'
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
    'dispatch:mocha-phantomjs'
  ]);
  api.use('barbatus:typescript-compiler');

  api.addFiles([
    'tests/server/unit/input-file.js',
    'tests/server/unit/compiler-tests_spec.js'
  ], 'server');
});
