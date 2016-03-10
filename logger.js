const chalk = Npm.require('chalk');

class Logger_ {
  info(msg) {
    console.log(chalk.green(msg));
  }

  warn(msg) {
    console.log(chalk.yellow(msg));
  }
};

Logger = new Logger_();
