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

  getRightPkgName() {
    let pkgName = this.getPackageName();
    if (pkgName.indexOf(':') != -1) {
      pkgName = pkgName.split(':')[1];
    }
    return pkgName;
  }
};
