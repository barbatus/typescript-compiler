import {chai} from 'meteor/practicalmeteor:chai';
import {sinon} from 'meteor/practicalmeteor:sinon';

const should = chai.should();
const expect = chai.expect;

describe('typescript-compiler', () => {
  let testCodeLine = 'export const foo = "foo"';

  describe('TypeScriptCompiler API', () => {
    let compiler = new TypeScriptCompiler();
    expect(compiler.getFilesToProcess).to.be.a('function');
    expect(compiler.getBuildOptions).to.be.a('function');
  });

  describe('testing options', () => {
    it('should have commonjs by default', () => {
      let compiler = new TypeScriptCompiler();

      let inputFile = new InputFile(testCodeLine, 'foo1.ts');
      compiler.processFilesForTarget([inputFile]);

      expect(inputFile.result).to.not.be.null;
      expect(inputFile.result.data).to.contain('exports.foo');
    });

    it('should have dom lib set by default for the web', () => {
      let compiler = new TypeScriptCompiler();

      let inputFile = new InputFile('document.createElement("div")', 'foo.ts', 'web');
      compiler.processFilesForTarget([inputFile]);
      inputFile.warn = sinon.spy();

      expect(inputFile.calledOnce).to.not.be.true;
    });

    it('should apply extra compiler options', () => {
      let compiler = new TypeScriptCompiler({
        module: 'system'
      });

      let inputFile = new InputFile(testCodeLine, 'foo2.ts');
      compiler.processFilesForTarget([inputFile]);

      expect(inputFile.result.data).to.contain('System.register(\"foo2\"');
    });

    it('should exclude from node_modules by default', () => {
      let compiler = new TypeScriptCompiler();

      let inputFile = new InputFile(testCodeLine, 'node_modules/foo3.ts');
      compiler.processFilesForTarget([inputFile]);

      expect(inputFile.result).to.be.null;
    });
  });

  describe('testing tsconfig.json', () => {
    it('config should be recognized and watched', () => {
      let compiler = new TypeScriptCompiler();

      let configFile = new ConfigFile({
        compilerOptions: {
          module: 'system'
        }
      });
      let inputFile = new InputFile(testCodeLine, 'foo3.ts');
      compiler.processFilesForTarget([inputFile, configFile]);

      expect(inputFile.result.data).to.contain('System.register(\"foo3\"');

      // Change config and test.
      configFile.compilerOptions.module = 'commonjs';
      compiler.processFilesForTarget([inputFile, configFile]);
      expect(inputFile.result.data).to.contain('exports.foo');
    });


    it('should skip any other tsconfig.json', () => {
      let serverFile = new InputFile(testCodeLine, 'foo.ts', 'os');

      let configFile = new ConfigFile({
        compilerOptions: {
          module: 'system'
        }
      }, 'node_modules/foo/tsconfig.json');
      let compiler = new TypeScriptCompiler();
      compiler.processFilesForTarget([serverFile, configFile]);
      expect(serverFile.result.data).not.to.contain('System.register(\"foo\"');
    });

    // TODO: check out why for-of loop raises warning here.
    it('should apply target from the server tsconfig.json', () => {
      let code = `
        async function test() {}
      `;
      let serverFile = new InputFile(code, 'foo.ts', 'os');
      serverFile.warn = sinon.spy();

      let configFile = new ConfigFile({
        compilerOptions: {
          target: 'es6'
        }
      }, 'server/tsconfig.json', 'os');
      let compiler = new TypeScriptCompiler();
      compiler.processFilesForTarget([serverFile, configFile]);
      expect(serverFile.warn.calledOnce).to.not.be.true;
    });

    describe('tsconfig.exclude', () => {
      it('should exclude files using glob and flat directory patterns', () => {
        let compiler = new TypeScriptCompiler();

        let configFile = new ConfigFile({
          exclude: ['foo1/**', 'foo2']
        });
        let inputFile1 = new InputFile(testCodeLine, 'foo1/foo.ts');
        let inputFile2 = new InputFile(testCodeLine, 'foo2/foo.ts');
        compiler.processFilesForTarget([inputFile1, inputFile2, configFile]);

        expect(inputFile1.result).to.be.null;
        expect(inputFile2.result).to.be.null;
      });

      it('should exclude a file', () => {
        let compiler = new TypeScriptCompiler();

        let configFile = new ConfigFile({
          exclude: ['foo3/foo.ts']
        });
        let inputFile = new InputFile(testCodeLine, 'foo3/foo.ts');
        compiler.processFilesForTarget([inputFile, configFile]);

        expect(inputFile.result).to.be.null;
      });
    });
  });

  describe('testing diagnostics', () => {
    it('should log out diagnostics by default', () => {
      let compiler = new TypeScriptCompiler();

      let configFile = new ConfigFile({
        compilerOptions: {
          module: 'system'
        }
      });
      let wrongImport = 'import {api} from "lib";';
      let inputFile = new InputFile(wrongImport, 'foo4.ts');
      inputFile.warn = sinon.spy();
      compiler.processFilesForTarget([inputFile, configFile]);

      expect(inputFile.warn.calledOnce).to.be.true;
      expect(inputFile.warn.args[0][0]).to.be.an('object');
    });
  });

  describe('testing modules', () => {
    it('should render bare source code if module set to none', () => {
      let compiler = new TypeScriptCompiler();
      let configFile = new ConfigFile({
        compilerOptions: {
          module: 'none'
        }
      });
      let moduleFoo = 'module foo {}';
      let inputFile = new InputFile(moduleFoo, 'foo5.ts');
      compiler.processFilesForTarget([inputFile, configFile]);

      expect(inputFile.result.bare).to.be.true;
    });

    it('should resolve module path that starts with /', () => {
      let compiler = new TypeScriptCompiler();
      let file1 = 'import {api} from "/imports/foo7"';
      let inputFile1 = new InputFile(file1, 'client/foo6.ts');
      inputFile1.warn = sinon.spy();

      let file2 = 'export const api = {}';
      let inputFile2 = new InputFile(file2, 'imports/foo7.ts');

      compiler.processFilesForTarget([inputFile1, inputFile2]);

      expect(inputFile1.warn.calledOnce).to.not.be.true;
    });
  });

  describe('testing architecture separation', () => {
    it('typings from typings/browser is used for the browser arch only', () => {
      let clientCode = 'var client: API.Client';
      let serverCode = 'var server: API.Client';
      let clientTypings = 'declare module API { interface Client {} };';
      let serverTypings = 'declare module API { interface Server {} };';

      let clientFile = new InputFile(clientCode, 'client.ts', 'web');
      clientFile.warn = sinon.spy();
      let typingsFile1 = new InputFile(clientTypings, 'typings/browser/client.d.ts', 'web');
      let typingsFile2 = new InputFile(serverTypings, 'typings/main/server.d.ts', 'web');

      let serverFile = new InputFile(serverCode, 'server.ts', 'os');
      serverFile.warn = sinon.spy();
      let typingsFile3 = new InputFile(clientTypings, 'typings/browser/client.d.ts', 'os');
      let typingsFile4 = new InputFile(serverTypings, 'typings/main/server.d.ts', 'os');
      let compiler = new TypeScriptCompiler();
      compiler.processFilesForTarget([clientFile, typingsFile1, typingsFile2]);
      compiler.processFilesForTarget([serverFile, typingsFile3, typingsFile4]);

      expect(clientFile.warn.calledOnce).to.not.be.true;
      expect(serverFile.warn.calledOnce).to.be.true;
      expect(serverFile.warn.args[0][0].message).to.contain('Client');
    });

    it('same diagnostics messages are not more than once', () => {
      let wrongImport = 'import {api} from "lib";';
      let clientFile = new InputFile(wrongImport, 'common.ts', 'web');
      clientFile.warn = sinon.spy();
      let serverFile = new InputFile(wrongImport, 'common.ts', 'os');
      serverFile.warn = sinon.spy();

      let compiler = new TypeScriptCompiler();
      compiler.processFilesForTarget([clientFile]);
      compiler.processFilesForTarget([serverFile]);
      expect(clientFile.warn.calledOnce).to.be.true;
      expect(serverFile.warn.calledOnce).to.not.be.true;
    });
  });
});
