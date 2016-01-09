## TypeScript compilers for Meteor.

Package exposes three TypeScript compilers: `TsBatchCompiler`, `TsCachingCompiler` and `TsCompiler` to be used in a Meteor compiler plugin.

TypeScript is provided by this [package](https://github.com/barbatus/typescript), which is a wrapper package over the TypeScript NPM with API devised for the Meteor environment.

## Getting Started
Add new package (into the packages folder) and register new Meteor plugin there:
````js
Package.registerBuildPlugin({
  name: 'TSBuilder',
  sources: [
    'ts_handler.js'
  ],
  use: [
    'barbatus:ts-compilers@0.1.8',
    'ecmascript@0.1.4'
  ]
});
````
In `ts_handler.js`, add one of two provided compilers as follows:

````js
Plugin.registerCompiler({
  extensions: ['ts'],
}, () => new TsCachingCompiler());
````

Please, check out how everything works in the demo app.

## Compilers
### TsBatchCompiler
Compiles all passed `.ts`-files at once using [`TypeScript.transpileFiles`](https://github.com/barbatus/typescript/blob/master/typescript.js#L87) method internally.

TypeScript can potentially transpile all files together a bit more effiently using internal cache.

### TsCachingCompiler
Extends Meteor's [`MultiFileCachingCompiler`](https://atmospherejs.com/meteor/caching-compiler) and compiles one file content at a time using [`TypeScript.transpile`](https://github.com/barbatus/typescript/blob/master/typescript.js#L96) internally.

This compiler smartely watches, not only for the .ts-files changes, but also for the declaration files as well.
So, if a declaration file has been changed, all dependant .ts-files will be re-compiled. Hence, it makes sense to 
keep custom declaration files separated logically into smaller pieces.

### TsCompiler
Main compiler that wraps two above compilers and use a particular one at a moment depending on the configuration provided.
Currently, if `useCache` is set then `TsCachingCompiler` is used, otherwise - `TsBatchCompiler`.

## TypeScript Config
Compilers can be configured via [`tsconfig.json`](https://github.com/Microsoft/TypeScript/wiki/tsconfig.json) in the app root folder.
The structure of the file is exactly the same as the original one: `compilerOptions` and `files`.

`files` works only for the .d.ts-files in the _typings_ folder. These files are passed then to the TypeScript transpiler along with the TypeScript files, so you don't need to reference typigns directly.

Some of the TypeScript options are preset to be always turned on or off according to details of the Meteor environment. You can read about exceptions [here](https://github.com/barbatus/typescript#compiler-options).

There have been added additional section `meteorCompilerOptions` for Meteor environment needs.
This sections accept two options: `alwaysThrow` and `useCache`.

When `alwaysThrow` is set, the compiler will always throw exceptions whenever syntactic or symantic error occurs. Otherwise, it throws by default only on syntactic errors, semantic ones (like module resolution errors, unknown variables etc) are just logged out in the terminal.

`useCache` simple says compiler to turn on/off caching results.

An example of the correct _tsconfig.json_ might look like this:

````
{
  "compilerOptions": {
    "module": "system",
    "target": "es5"
  },
  "meteorCompilerOptions": {
    "alwaysThrow": true
  },
  "typings": ["typings/angular2.d.ts"]
}
````

## Package Development

To switch diagnostics on for the packages, you'll need to specify `pkgMode: true` in the config.
Unfortunately, it can't compile package files relatively to the package folder, which require you to specify 
full file paths in the typings references if you want to avoid errors in the terminal. Though, I plan to add this feature (relative compilation) in the future versions.

Another feature, that one might consider useful, is an installation of the declaration files.
If you want to add a specific declation file with API provided by your package to the user app, just
add a `d.ts`-file in the package.js:

````js
api.addFiles([
    'typings/path_to_file/foo.d.ts',
  ], server);
````

The package will recognize and copy added file to the user app at the same path as it is located in your package, i.e. `typings/path_to_file`.

## Compilation Speed-up
`noResolve` is designated to turn on/off module resolution process. During that process TypeScript checks availability of each module and verify that API usage is correct as well, which can be quite time assuming especially
for big apps because each imported module's file is being read and parsed.

Therefor, you might consider turning it off during intensive development when Meteor is running and changes applied just-in-time. TypeScript will skip resolving each module but will continue cursing on syntactic errors.
From time to time you can switch `noResolve` back to false with the `useCache` set to false and re-start Meteor.
You'll see all mistakes (if any) you have made including missing modules errors or incorrect API usage etc.

## Example of usage
Please, check Angular2's demo called Socially [here](https://github.com/Urigo/Meteor-Angular2/tree/master/examples/parties). This  demo is built fully in TypeScript and uses `tsconfig.json` as well. Angular2-Meteor package itself bases on the compilers of this package.
