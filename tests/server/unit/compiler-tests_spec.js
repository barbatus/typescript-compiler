describe('typescript-compiler', () => {
  let testCodeLine = 'export const foo = "foo"';

  describe('testing options', () => {
    it('should have commonjs by default', () => {
      let compiler = new TypeScriptCompiler();

      let inputFile = new InputFile(testCodeLine, 'foo1.ts');
      compiler.processFilesForTarget([inputFile]);

      expect(inputFile.result).not.toBeNull();
      expect(inputFile.result.data).toContain('exports.foo');
    });

    it('should apply extra compiler options', () => {
      let compiler = new TypeScriptCompiler({
        module: 'system'
      });

      let inputFile = new InputFile(testCodeLine, 'foo2.ts');
      compiler.processFilesForTarget([inputFile]);

      expect(inputFile.result.data).toContain('System.register(\"foo2\"');
    });

    it('should exclude from node_modules by default', () => {
      let compiler = new TypeScriptCompiler();

      let inputFile = new InputFile(testCodeLine, 'foo/node_modules/foo3.ts');
      compiler.processFilesForTarget([inputFile]);

      expect(inputFile.result).toBeNull();
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

      expect(inputFile.result.data).toContain('System.register(\"foo3\"');

      // Change config and test.
      configFile.compilerOptions.module = 'commonjs';
      compiler.processFilesForTarget([inputFile, configFile]);
      expect(inputFile.result.data).toContain('exports.foo');
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

        expect(inputFile1.result).toBeNull();
        expect(inputFile2.result).toBeNull();
      });

      it('should exclude a file', () => {
        let compiler = new TypeScriptCompiler();

        let configFile = new ConfigFile({
          exclude: ['foo3/foo.ts']
        });
        let inputFile = new InputFile(testCodeLine, 'foo3/foo.ts');
        compiler.processFilesForTarget([inputFile, configFile]);

        expect(inputFile.result).toBeNull();
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
      inputFile.warn = jasmine.createSpy();
      compiler.processFilesForTarget([inputFile, configFile]);

      expect(inputFile.warn).toHaveBeenCalled();
      expect(inputFile.warn.calls.first().args[0]).toBeDefined();
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

      expect(inputFile.result.bare).toBe(true);
    });
  });

  describe('testing architecture separation', () => {
    it('typings from typings/browser is used for the browser arch only', () => {
      let clientCode = 'var client: API.Client';
      let serverCode = 'var server: API.Client';
      let clientTypings = 'declare module API { interface Client {} };';
      let serverTypings = 'declare module API { interface Server {} };';

      let clientFile = new InputFile(clientCode, 'client.ts', 'web');
      clientFile.warn = jasmine.createSpy();
      let typingsFile1 = new InputFile(clientTypings, 'typings/browser/client.d.ts', 'web');
      let typingsFile2 = new InputFile(serverTypings, 'typings/main/server.d.ts', 'web');

      let serverFile = new InputFile(serverCode, 'server.ts', 'os');
      serverFile.warn = jasmine.createSpy();
      let typingsFile3 = new InputFile(clientTypings, 'typings/browser/client.d.ts', 'os');
      let typingsFile4 = new InputFile(serverTypings, 'typings/main/server.d.ts', 'os');
      let compiler = new TypeScriptCompiler();
      compiler.processFilesForTarget([clientFile, typingsFile1, typingsFile2]);
      compiler.processFilesForTarget([serverFile, typingsFile3, typingsFile4]);

      expect(clientFile.warn).not.toHaveBeenCalled();
      expect(serverFile.warn).toHaveBeenCalled();
      expect(serverFile.warn.calls.first().args[0].message).toContain('Client');
    });

    it('same diagnostics messages are not more than once', () => {
      let wrongImport = 'import {api} from "lib";';
      let clientFile = new InputFile(wrongImport, 'common.ts', 'web');
      clientFile.warn = jasmine.createSpy();
      let serverFile = new InputFile(wrongImport, 'common.ts', 'os');
      serverFile.warn = jasmine.createSpy();

      let compiler = new TypeScriptCompiler();
      compiler.processFilesForTarget([clientFile]);
      compiler.processFilesForTarget([serverFile]);
      expect(clientFile.warn).toHaveBeenCalled();
      expect(serverFile.warn).not.toHaveBeenCalled();
    });
  });
});
