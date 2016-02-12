## TypeScript compiler for Meteor.

Exports two symbols:
  - `TypeScriptCompiler` - a compiler to be registered using `registerBuildPlugin` 
     to compile TypeScript files.

  - `TypeScript` - an object with `compile` method.
     Use `TypeScript.compile(source, options)` to compile with preset options.
