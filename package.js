Package.describe({
  name: 'barbatus:typescript-compiler',
  version: '0.7.0',
  summary: 'TypeScript Compiler for Meteor',
  git: 'https://github.com/barbatus/ts-compilers',
  documentation: 'README.md'
});

Npm.depends({
  'meteor-typescript': 'https://github.com/barbatus/meteor-typescript/tarball/devel/91dc20da219abd8e169f7b5aed90e68be6abdf30',
  'async': '1.4.0',
  'minimatch': '3.0.0'
});

Package.onUse(function(api) {
  api.versionsFrom('1.4');

  api.use([
    'ecmascript@0.1.6',
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
    'velocity:html-reporter@0.10.1',
    'sanjo:jasmine@1.0.1']);
  api.use('barbatus:typescript-compiler');

  api.addFiles([
    'tests/server/unit/input-file.js',
    'tests/server/unit/compiler-tests_spec.js'
  ], 'server');
});
