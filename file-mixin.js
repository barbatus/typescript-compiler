FileMixin = {
  warn(error) {
    console.log(`${error.sourcePath} (${error.line}, ${error.column}): ${error.message}`);
  },

  isBare() {
    let fileOptions = this.getFileOptions();
    return fileOptions && fileOptions.bare;
  },

  // Get root app config.
  isConfig() {
    return this.getPathInPackage() === 'tsconfig.json';
  },

  isDeclaration() {
    return TypeScript.isDeclarationFile(this.getBasename());
  },

  // Get path with package prefix if any.
  getPackagedPath() {
    let packageName = this.getPackageName();
    packageName = packageName ? packageName + '/' : '';
    let inputFilePath = this.getPathInPackage();
    return packageName + inputFilePath;
  }
};
