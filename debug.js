const util = Npm.require('util');

DebugLog = class DebugLog {
  constructor(event) {
    this.debug = process.env.TYPESCRIPT_DEBUG; 
    this.event = event;
    this.start();
  }

  start() {
    if (this.debug) {
      console.log('%s started', this.event);
      console.time(util.format('%s time', this.event));
    }
  }


  log(msg, ...args) {
    if (this.debug) {
      console.log.apply(null, [msg].concat(args));
    }
  }

  end() {
    if (this.debug) {
      console.timeEnd(util.format('%s time', this.event));
    }
  }
};
