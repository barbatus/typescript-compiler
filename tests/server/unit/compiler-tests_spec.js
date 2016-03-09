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
    it('should render bare source code if there is no ES6 exports', () => {
      let compiler = new TypeScriptCompiler();
      let moduleFoo = 'module foo {}';
      let inputFile = new InputFile(moduleFoo, 'foo5.ts');
      compiler.processFilesForTarget([inputFile]);

      expect(inputFile.result.bare).toBe(true);
    });
  });

  describe('testing architecture separation', () => {
    it('should render diagnostics for some arch files using typings of the same arch', () => {
      let compiler = new TypeScriptCompiler();
      let clientCode = 'var client: API.Client';
      let clientTypings = 'declare module API { interface Client {} };';
      let clientFile = new InputFile(clientCode, 'client.ts', 'web');
      clientFile.warn = jasmine.createSpy();
      let typingsFile1 = new InputFile(clientTypings, 'client/client.d.ts', 'web');

      let serverCode = 'var server: API.Client1';
      let serverTypings = 'declare module API { interface Server {} };';
      let serverFile = new InputFile(serverCode, 'server.ts', 'os');
      serverFile.warn = jasmine.createSpy();
      let typingsFile2 = new InputFile(serverTypings, 'server/server.d.ts', 'os');
      compiler.processFilesForTarget([clientFile, typingsFile1, typingsFile2, serverFile]);

      expect(clientFile.warn).not.toHaveBeenCalled();
      expect(serverFile.warn).toHaveBeenCalled();
      expect(serverFile.warn.calls.first().args[0].message).toContain('Client1');
    });
  });
});
