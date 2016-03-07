FileMixin = {
  warn(error) {
    console.log(`${error.sourcePath} (${error.line}, ${error.column}): ${error.message}`);
  },

  isBare() {
    let fileOptions = this.getFileOptions();
    return fileOptions.bare;
  }
};
