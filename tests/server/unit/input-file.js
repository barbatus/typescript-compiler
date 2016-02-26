const crypto = Npm.require('crypto');

function sha1(content) {
  let hash = crypto.createHash('sha1');
  hash.update(content);
  return hash.digest('hex');
}

InputFile = class InputFile {
  constructor(source, fileName, options) {
    this.source = source;
    this.fileName = fileName;
    this.options = options || {};
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
}

ConfigFile = class ConfigFile extends InputFile {
  constructor(config) {
    super(JSON.stringify(config), 'tsconfig.json');
    for (let key in config) {
      this[key] = config[key];
    }
  }

  getContentsAsString() {
    return JSON.stringify(this);
  }
}
