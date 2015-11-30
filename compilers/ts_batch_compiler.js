
TsBatchCompiler = class TsBatchCompiler extends TsBasicCompiler  {
  constructor(tsconfig) {
    super(tsconfig);
  }

  processFilesForTarget(files) {
    if (this.tsconfig.includePackageTypings) {
      this.processTypings(files);
    }

    let tsFiles = files.filter(file => !this.isDeclarationFile(file));

    TypeScript.transpileFiles(tsFiles, {
      ...this.tsconfig,
      filePath: file => this.getAbsoluteImportPath(file),
      moduleName: file => this.getAbsoluteImportPath(file, true)
    }, (file, referencedPaths, diagnostics, result) => {
      this.processDiagnostics(file, diagnostics);

      file.addJavaScript(result);
    });
  }
}
