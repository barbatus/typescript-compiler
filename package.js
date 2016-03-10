Package.describe({
  name: 'barbatus:ng2-typescript-compiler',
  version: '0.5.0-beta.1',
  summary: 'Meteor TypeScript Compiler for Angular 2',
  git: 'https://github.com/barbatus/typesctipt-compiler/tree/ts-compilers',
  documentation: 'README.md'
});

Npm.depends({
  'typescript': '1.7.5',
  'mkdirp': '0.5.0',
  'chalk': '1.1.1'
});

var server = 'server';

Package.onUse(function(api) {
  api.versionsFrom('1.2.0.1');

  api.use([
    'barbatus:typescript-compiler@0.5.0-beta.6',
    'ecmascript@0.1.4',
    'check@1.0.5',
    'underscore@1.0.4'
  ], server);

  api.addFiles([
    'file-mixin.js',
    'logger.js',
    'typescript-compiler.js'
  ], server);

  api.export(['TypeScriptCompiler'], server);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('barbatus:ng2-typescript-compiler');
});
