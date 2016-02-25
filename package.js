Package.describe({
  name: 'barbatus:typescript-compiler',
  version: '0.5.0-beta.4',
  summary: 'TypeScript Compiler for Meteor',
  git: 'https://github.com/barbatus/ts-compilers',
  documentation: 'README.md'
});

Npm.depends({
  'meteor-typescript': '0.6.0-beta.1',
  'async': '1.4.0'
});

Package.onUse(function(api) {
  api.use(['ecmascript', 'check', 'underscore'], 'server');

  api.addFiles([
    'typescript-compiler.js',
    'typescript.js'
  ], 'server');

  api.export([
    'TypeScript', 'TypeScriptCompiler'
  ], 'server');
});

Package.onTest(function(api) {
  api.use(['tinytest', 'underscore']);
  api.use('ecmascript');
  api.use('barbatus:typescript-compiler');

  api.addFiles('compiler-tests.js', 'server');
});
