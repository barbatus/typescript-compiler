
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
    return sha1(this.getContentsAsString());
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

class ConfigFile extends InputFile {
  constructor(config) {
    super(JSON.stringify(config), 'tsconfig.json');
    for (let key in config) {
      this[key] = config[key];
    }
  }

  getContentsAsString() {
    return JSON.stringify(this);
  }
}

Tinytest.add('typescript - compiler - tsconfig.json - config applied and watched', (test) => {
  let compiler = new TypeScriptCompiler();

  let configFile = new ConfigFile({
    compilerOptions: {
      module: 'system'
    }
  });
  let inputFile = new InputFile(testCodeLine, 'foo.ts');
  compiler.processFilesForTarget([inputFile, configFile]);

  test.include(inputFile.result.data, 'System.register(\"foo\"',
    'compilation result is wrong');

  // Testing that config changes are watched.
  configFile.compilerOptions.module = 'commonjs';
  compiler.processFilesForTarget([inputFile, configFile]);
  test.include(inputFile.result.data, 'exports.foo',
    'module change has no affect');
});


Tinytest.add('typescript - compiler - diagnostics - always turned on by default', (test) => {
  let logged = false;
  let compiler = new TypeScriptCompiler(null, null, msg => {
    logged = msg !== undefined;
  });

  let configFile = new ConfigFile({
    compilerOptions: {
      module: 'system'
    }
  });
  let wrongImport = 'import {api} from "lib"';
  let inputFile = new InputFile(wrongImport, 'foo.ts');
  compiler.processFilesForTarget([inputFile, configFile]);

  test.isTrue(logged, 'Diagnostics was not logged');
});

