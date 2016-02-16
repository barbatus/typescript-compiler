Package.describe({
  name: 'barbatus:typescript-compiler',
  version: '0.5.0-beta.1',
  summary: 'TypeScript Compiler for Meteor',
  git: 'https://github.com/barbatus/ts-compilers',
  documentation: 'README.md'
});

Npm.depends({
  'meteor-typescript': '0.5.7',
  'async': '1.4.0'
});

Package.onUse(function(api) {
  api.use([
    'ecmascript@0.1.4',
    'check@1.0.5',
    'underscore@1.0.4'
  ], 'server');

  api.addFiles([
    'typescript-compiler.js',
    'typescript.js'
  ], 'server');

  api.export([
    'TypeScript', 'TypeScriptCompiler'
  ], 'server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('barbatus:ts-compilers');
});
