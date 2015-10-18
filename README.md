## TypeScript compilers for Meteor.

Package exposes two TypeScript compilers: one basic compiler `TsCompiler` and one caching compiler `TsCachingCompiler` to be used in a Meteor compiler plugin.

[This](https://github.com/barbatus/typescript) TypeScript package is used as a TypeScript provider.

### Getting Started
Register a TS plugin with one of two provided compilers as follows: 
````ts
Plugin.registerCompiler({
  extensions: ['ts'],
}, () => new TsCachingCompiler());
````
And you are all set.

### Compilers
#### TsCompiler
Compilales all passed `.ts`-files at once using internally `TypeScript.transpileFiles`.

One of its potential benefits is faster compilation speed on the initial Meteor run. Given that all files are provided to the TypeScript transpiler in a batch, TypeScript can transpile them more effiently using internal cache.

#### TsCachingCompiler
Extends Meteor's [`MultiFileCachingCompiler`](https://atmospherejs.com/meteor/caching-compiler) and compiles one file content per time using this method [`TypeScript.transpile`](https://github.com/barbatus/typescript/blob/master/typescript.js#L96) internally.

#### TypeScript Config
Compilers can be configured via `.tsconfig` in the app root folder.
Format of the `.tsconfig` follows the `compilerOptions` part with the same options as you can fine in the standard `.tsconfig` file [here](https://github.com/Microsoft/TypeScript/wiki/tsconfig.json); `files` part is omitted.

Some of the TypeScript options are preset to be always turned on or off having in mind details of the Meteor environment. You can read about exceptions [here](https://github.com/barbatus/typescript).

A couple of additional options have been added: `alwaysThrow` and `useCache`.

When `alwaysThrow` is set, the compiler will always throw exceptions whenever syntactic or symantic error
occurs. Otherwise, it throws by default only on syntactic errors,
semantic ones (like module resolution errors, unknown variables etc) are just printed to the terminal.

`useCache` simple says compiler to turn on/off caching results.

#### Compilation Speed-up
`noResolve` configuration option is responsible for module resolution process same as the original option is designated for.
One of the reason to have it is that module resolution can greately slow down the compilation speed. Taking this into account, one can consider switching it on, i.e. `noResolve: true`, during intensive period of the app development and having Meteor running at the same time.
TypeScript will skip resolving each module while continue cursing on syntactic errors. This can greately increase speed of the Meteor re-start on each file change.

From time to time you can switch `noResolve` back to false with the `useCache` set to false and re-start Meteor. Havind done this, you'll see all possible mistakes you could have made including missing modules errors or incorrect API usage etc. You can treat it as the way compilation process goes with the non-script languages like Java etc. Usually you make changes first there, then you compile the code to check if there is any mistakes.

#### Example of usage
Please, check Angular2's demo called Socially [here](https://github.com/Urigo/Meteor-Angular2/tree/master/examples/parties). It's built fully in TypeScript and uses `.tsconfig` as well.
