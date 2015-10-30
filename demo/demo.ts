'use strict';

class HelloWorld {
  constructor(public name: string = 'World') {}

  toString() {
    return `Hello ${this.name}`;
  }
}

console.log(new HelloWorld().toString());
