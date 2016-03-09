const util = Npm.require('util');

class Logger_ {
  constructor() {
    this.llevel = process.env.TYPESCRIPT_LOG; 
  }

  newDebug(name) {
    let debug = new Debug(name);
    if (this.isDebug) debug.start();
    return debug;
  }

  get isDebug() {
    return this.llevel >= 2;
  }

  log(msg) {
    if (this.llevel >= 1) {
      console.log(msg);
    }
  }

  debug(msg) {
    if (this.isDebug) {
      console.log(msg);
    }
  }
};

Logger = new Logger_();

class Debug {
  constructor(name) {
    this.name = name;
  }

  start() {
    console.log('%s started', this.name);
    console.time(util.format('%s time', this.name));
    this._started = true;
  }

  log(msg, ...args) {
    if (this._started) {
      console.log.apply(null, [msg].concat(args));
    }
  }

  end() {
    if (this._started) {
      console.timeEnd(util.format('%s time', this.name));
    }
  }
}
