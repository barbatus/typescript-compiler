
const crypto = Npm.require('crypto');

function sha1(content) {
  let hash = crypto.createHash('sha1');
  hash.update(content);
  return hash.digest('hex');
}

class InputFile {
  constructor(source, fileName, options) {
    this.source = source;
    this.fileName = fileName;
    this.options = options || {};
  }

  getContentsAsString() {
    return this.source;
  }

  getPackageName() {
    return null;
  }

  getPathInPackage() {
    return this.fileName;
  }

  getBasename() {
    return this.fileName;
  }

  getFileOptions() {
    return this.options;
  }

  getSourceHash() {
    return sha1(this.source);
  }

  addJavaScript(result) {
    this.result = result;
  }
}

let testCodeLine = 'export const foo = "foo"';

Tinytest.add('typescript - compiler - default options', (test) => {
  let compiler = new TypeScriptCompiler();

  let inputFile = new InputFile(testCodeLine, 'foo.ts');
  compiler.processFilesForTarget([inputFile]);

  test.isNotNull(inputFile.result,
    'compilation result is null');
  test.include(inputFile.result.data, 'exports.foo',
    'compilation result is wrong');
});

Tinytest.add('typescript - compiler - extra options', (test) => {
  let compiler = new TypeScriptCompiler({
    module: 'system'
  });

  let inputFile = new InputFile(testCodeLine, 'foo.ts');
  compiler.processFilesForTarget([inputFile]);

  test.include(inputFile.result.data, 'System.register(\"foo\"',
    'compilation result is wrong');
});

function getConfig() {
   return {
    compilerOptions: {
      module: 'system'
    }
  }
}

Tinytest.add('typescript - compiler - tsconfig.json - config recognized', (test) => {
  let compiler = new TypeScriptCompiler();

  let config = getConfig();
  let configFile = new InputFile(JSON.stringify(config), 'tsconfig.json');
  let inputFile = new InputFile(testCodeLine, 'foo.ts');
  compiler.processFilesForTarget([inputFile, configFile]);

  test.include(inputFile.result.data, 'System.register(\"foo\"',
    'compilation result is wrong');
});


Tinytest.add('typescript - compiler - tsconfig.json - config watched', (test) => {
  let compiler = new TypeScriptCompiler();

  let config = getConfig();
  let configFile = new InputFile(JSON.stringify(config), 'tsconfig.json');
  let inputFile = new InputFile(testCodeLine, 'foo.ts');
  compiler.processFilesForTarget([inputFile, configFile]);

  config.compilerOptions.module = 'commonjs';
  configFile = new InputFile(JSON.stringify(config), 'tsconfig.json');
  compiler.processFilesForTarget([inputFile, configFile]);
  test.include(inputFile.result.data, 'exports.foo',
    'module change has no affect');
});
