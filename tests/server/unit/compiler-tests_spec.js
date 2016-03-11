describe('ng2-typescript-compiler', () => {
  let testCodeLine = 'export const foo = "foo"';

  describe('testing default options', () => {
    it('should use SystemJS by default', () => {
      let compiler = new TypeScriptCompiler();

      let inputFile = new InputFile(testCodeLine, 'foo1.ts');
      compiler.processFilesForTarget([inputFile]);

      expect(inputFile.result.data).toContain('System.register(\"foo1\"');
    });
  });
});
