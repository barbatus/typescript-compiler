const crypto = Npm.require('crypto');

function sha1(content) {
  let hash = crypto.createHash('sha1');
  hash.update(content);
  return hash.digest('hex');
}

InputFile = class InputFile {
  constructor(source, fileName, arch = 'os') {
    this.source = source;
    this.fileName = fileName;
    this.result = null;
    this.arch = arch;
  }

  getContentsAsString() {
    return this.source;
  }

  getPackageName() {
    return null;
  }

  getPathInPackage() {
    return this.fileName;
  }

  getBasename() {
    return this.fileName;
  }

  getFileOptions() {
    return this.options;
  }

  getSourceHash() {
    return sha1(this.getContentsAsString());
  }

  addJavaScript(result) {
    this.result = result;
  }

  getArch() {
    return this.arch;
  }

  warn(error) {
    this.error = error;
  }
}

ConfigFile = class ConfigFile extends InputFile {
  constructor(config, path, arch = 'web') {
    super(JSON.stringify(config), path || 'tsconfig.json', arch);
    for (let key in config) {
      this[key] = config[key];
    }
  }

  getContentsAsString() {
    return JSON.stringify(this);
  }
}
