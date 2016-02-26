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
      let logger = jasmine.createSpy();
      let compiler = new TypeScriptCompiler(null, null, logger);

      let configFile = new ConfigFile({
        compilerOptions: {
          module: 'system'
        }
      });
      let wrongImport = 'import {api} from "lib";';
      let inputFile = new InputFile(wrongImport, 'foo4.ts');
      compiler.processFilesForTarget([inputFile, configFile]);

      expect(logger).toHaveBeenCalled();
      expect(logger.calls.first().args[0]).toBeDefined();
    });
  });

  describe('testing modules', () => {
    it('should render bare source code if module is none', () => {
      let compiler = new TypeScriptCompiler({
        module: 'none'
      });
      let moduleFoo = 'module foo {}';
      let inputFile = new InputFile(moduleFoo, 'foo5.ts');
      compiler.processFilesForTarget([inputFile]);

      expect(inputFile.result.bare).toBe(true);
    });
  });
});
