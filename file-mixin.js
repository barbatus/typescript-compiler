FileMixin = {
  warn(error) {
    console.log(`${error.sourcePath} (${error.line}, ${error.column}): ${error.message}`);
  },

  isBare() {
    let fileOptions = this.getFileOptions();
    return fileOptions && fileOptions.bare;
  },

  isConfig() {
    return this.getBasename() === 'tsconfig.json';
  },

  isDeclaration() {
    return TypeScript.isDeclarationFile(this.getBasename());
  }
};
