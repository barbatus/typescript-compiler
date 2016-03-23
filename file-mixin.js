FileMixin = {
  isDeclaration() {
    return TypeScript.isDeclarationFile(this.getBasename());
  },

  isPackageFile() {
    return !!this.getPackageName();
  },

  isPkgDeclaration() {
    return this.isDeclaration() && this.isPackageFile();
  },

  isAppDeclaration() {
    return this.isDeclaration() && !this.isPackageFile();
  },

  getOnePackageName() {
    let pkgName = this.getPackageName();
    if (pkgName.indexOf(':') !== -1) {
      pkgName = pkgName.split(':')[1];
    }
    return pkgName;
  },

  getES6ModuleName() {
    let packageName = this.getPackageName();
    packageName = packageName ? `{${packageName}}/` : '';
    let inputFilePath = this.getPathInPackage();
    return packageName + TypeScript.removeTsExt(inputFilePath);
  }
};
