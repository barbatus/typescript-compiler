## Meteor TypeScript Compiler for Angular 2.

Based on https://github.com/barbatus/typescript-compiler.

It has predefined compiler options as follows:
```
{
  module: "system",
  moduleResolution: "classic",
  emitDecoratorMetadata: true
}
```

Recognizes and installs declaration files added to packages, where installation means copying into them the `typings` folder of the app.
