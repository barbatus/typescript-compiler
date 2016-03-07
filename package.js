Package.describe({
  name: 'barbatus:typescript-compiler',
  version: '0.5.0-beta.6',
  summary: 'TypeScript Compiler for Meteor',
  git: 'https://github.com/barbatus/ts-compilers',
  documentation: 'README.md'
});

Npm.depends({
  'meteor-typescript': 'https://github.com/barbatus/meteor-typescript/tarball/52fc6c7f3b5b5df9483a927bc96e7a901b61c4ab',
  'async': '1.4.0'
});

Package.onUse(function(api) {
  api.use([
    'ecmascript@0.1.6',
    'check@1.0.5',
    'underscore@1.0.4'
  ], 'server');

  api.addFiles([
    'debug.js',
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
    'sanjo:jasmine@0.18.0']);
  api.use('barbatus:typescript-compiler');

  api.addFiles([
    'tests/server/unit/input-file.js',
    'tests/server/unit/compiler-tests_spec.js'
  ], 'server');
});
