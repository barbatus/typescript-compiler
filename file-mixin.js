
FileMixin = {
  getShortArch() {
    let arch = this.getArch();
    return /^web/.test(arch) ? 'web' : 'os';
  },

  warn(error) {
    console.log(`${error.sourcePath} (${error.line}, ${error.column}): ${error.message}`);
  },

  isBare() {
    let fileOptions = this.getFileOptions();
    return fileOptions && fileOptions.bare;
  },

  // Get root app config.
  isMainConfig() {
    let filePath = this.getPathInPackage();
    return /^tsconfig\.json$/.test(filePath);
  },

  isConfig() {
    let filePath = this.getPathInPackage();
    return /tsconfig\.json$/.test(filePath);
  },

  isServerConfig() {
    let filePath = this.getPathInPackage();
    return /^server\/tsconfig\.json$/.test(filePath);
  },

  isDeclaration() {
    return TypeScript.isDeclarationFile(this.getBasename());
  },

  // Get path with package prefix if any.
  getPackagePrefixPath() {
    let packageName = this.getPackageName();
    packageName = packageName ?
      (packageName.replace(':', '_') + '/') : '';
    let inputFilePath = this.getPathInPackage();
    return packageName + inputFilePath;
  },

  getES6ModuleName() {
    let packaged = this.getPackagePrefixPath();
    return TypeScript.removeTsExt(packaged);
  }
};
