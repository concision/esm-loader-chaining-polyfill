<h1 align="center">
    ESM Loader Chaining Polyfill
</h1>

<p align="center">
    <a href="https://github.com/concision/esm-loader-chaining-polyfill/blob/master/LICENSE">
        <img alt="repository license" src="https://img.shields.io/github/license/concision/esm-loader-chaining-polyfill?style=for-the-badge"/>
    </a>
    <img alt="Node.js engine compatibility" src="https://img.shields.io/node/v/esm-loader-chaining-polyfill?color=green&logo=node.js&logoColor=green&style=for-the-badge"/>
    <a href="https://www.npmjs.com/package/esm-loader-chaining-polyfill">
        <img alt="npm package: esm-loader-chaining-polyfill" src="https://img.shields.io/npm/v/esm-loader-chaining-polyfill?color=red&logo=npm&style=for-the-badge"/>
    </a>
    <a href="https://bundlephobia.com/result?p=esm-loader-chaining-polyfill">
        <img alt="bundlephobia: esm-loader-chaining-polyfill" src="https://img.shields.io/bundlephobia/min/esm-loader-chaining-polyfill?color=green&label=Size&logo=node.js&logoColor=green&style=for-the-badge"/>
    </a>
</p>

<p align="center">
    <i>A <a href="https://nodejs.org/">Node.js</a> polyfill of <a href="https://github.com/devsnek">@devsnek</a>'s "<a href="https://github.com/nodejs/node/pull/33812/">esm: loader chaining</a>" proposal for chaining several cooperative <a href="https://nodejs.org/api/esm.html#esm_experimental_loaders">experimental EcmaScript module loaders</a>.</i>
</p>


## Table of Contents
- [About](#about)
- [Usage](#usage)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Example ESM Loaders](#example-esm-loaders)
- [Implementation Details](#implementation-details)
  - [Limitations](#limitations)
- [Issues](#issues)
- [License](#license)


## About
[Node.js](https://nodejs.org/) offers experimental support for [EcmaScript modules (ESM)](https://nodejs.org/api/esm.html#esm_modules_ecmascript_modules) and additionally [EcmaScript module loader hooks](https://nodejs.org/api/esm.html#esm_experimental_loaders) (analogous to CommonJS's `require._extensions`/`require("module")._extensions`). ESM loader hooks are useful in development environments when sources are desired to be preprocessed on-the-fly during program execution, rather than upfront precompilation. However, currently only a single ESM loader can be specified and used by a Node.js process - this limitation prevents more sophisticated source loading mechanisms (e.g. mixed-language sources).

[@devsnek](https://github.com/devsnek) has implemented a proposal [nodejs/node#33812: "esm: loader chaining"](https://github.com/nodejs/node/pull/33812/) that would resolve this limitation by enabling several cooperative chained ESM loaders. Unfortunately, the pull request appears to have lost significant traction and is, at the time of writing, dead in the water.

This repository implements an experimental Node.js polyfill for <a href="https://github.com/devsnek">@devsnek</a>'s [proposed ESM loader hook specification](https://github.com/nodejs/node/blob/9c1c17a84168c5742084c34ac3395ca38bc182eb/doc/api/esm.md#experimental-loaders), which have not yet landed in an official release.

> ***Note***: All features mentioned here are considered experimental - EcmaScript modules, ESM loader hooks, and this library. Use with caution, and do not rely on forwards compatibility with future Node.js releases.


## Usage

### Installation
This library is available on [npm](https://www.npmjs.com/) as [`esm-loader-chaining-polyfill`](https://www.npmjs.com/package/esm-loader-chaining-polyfill) and is installable with the following commands:
- **Production**:
  - [npm](https://docs.npmjs.com/cli/v6): 
    ```
    npm install esm-loader-chaining-polyfill
    ```
  - [yarn](https://yarnpkg.com/cli/): 
    ```
    yarn add esm-loader-chaining-polyfill
    ```
- **Development**:
  - [npm](https://docs.npmjs.com/cli/v6): 
    ```
    npm install -D esm-loader-chaining-polyfill
    ```
  - [yarn](https://yarnpkg.com/cli/): 
    ```
    yarn add -D esm-loader-chaining-polyfill
    ```

Alternatively, a `.tgz` archive can be sourced and installed from the project [releases](https://github.com/concision/esm-loader-chaining-polyfill/releases). Read your preferred package manager's documentation on installing from a tarball.


### Configuration
The library's ESM loader must be specified with `--experimental-loader` (or `--loader`, if supported by the runtime), and must take precedence _last_. Note that CLI argument flags take precedence over the `NODE_OPTIONS` environment variable. Other ESM loaders must be specified _in the desired order_ with `--experimental-loader` (or `--loader`, if supported by the runtime), _prior_ to the library's ESM loader.

For example, if `./lib/https-loader.mjs`, `typescript`, and `coffeescript` are ESM loaders:
```
node --experimental-loader=./lib/https-loader.mjs --experimental-loader=typescript --experimental-loader=coffeescript --experimental-loader=esm-loader-chaining-polyfill/tla ...
```

There are two ESM loaders provided by this library with important distinctions on Node.js compatibility:
- `esm-loader-chaining-polyfill`/`esm-loader-chaining-polyfill/tla` (14.3.0+):  This loader is only compatible with Node.js 14.3.0+ `--experimental-top-level-await`, 14.8.0+ `--harmony-top-level-await`, or automatic top-level-await support. Ensure the correct CLI flags for top-level-await are set, otherwise a syntax error will occur during JavaScript parsing. For prior Node.js versions, `esm-loader-chaining-polyfill/no-tla` must be instead used, with limitations with the `getGlobalPreloadCode()` hook.

- `esm-loader-chaining-polyfill/no-tla` (12.0.0-14.2.x): Node.js released several versions of experimental EcmaScript modules _without_ support for top-level-await - dynamic imports cannot be awaited and will cause syntax errors originating from the JavaScript parser. This ESM loader will not `await` at the top-level, but this comes with [limitations](#limitations).
 
  If an ESM loader is implemented as an EcmaScript module (rather than a CommonJS module), the `getGlobalPreloadCode()` hook is impossible to be correctly implemented since dynamic imports cannot be resolved before the hook is invoked by Node.js.


## Example ESM Loaders
- npm package [`ts-node`](https://github.com/TypeStrong/ts-node): "TypeScript execution and REPL for node.js" (see [TypeStrong/ts-node#1007: "ESM support: soliciting feedback"](https://github.com/TypeStrong/ts-node/issues/1007)).
- [GeoffreyBooth/node-loaders](https://github.com/GeoffreyBooth/node-loaders): "Examples demonstrating the Node.js ECMAScript Modules Loaders API "


## Implementation Details
`--loader` and `--experimental-loader` flags are parsed from the `NODE_OPTIONS` environment variable and [`process.execArgv`](https://nodejs.org/api/process.html#process_process_execargv), in the stated order. Each successive loader flag overwrites the previous one - leaving the library's ESM loader as the configured loader for the runtime, as it is specified last. The extracted loaders are resolved from the current working directory (i.e. [`process.cwd()`](https://nodejs.org/api/process.html#process_process_cwd)); loaders are initially attempted to be synchronously loaded through CommonJS via `require(...)`, and fallback to an asynchronous dynamic ESM [`import()`](https://nodejs.org/api/esm.html#esm_import_expressions) upon failure. All supported Node.js hooks (as of v14) are extracted and ordered by the order that the loaders are declared in the CLI args.
 
 The `getGlobalPreloadCode()` hook will return a source snippet with all collected results of `getGlobalPreloadCode()` hooks. Upon an ESM loader source hook invocation from Node.js' internals, the library iteratively delegates the invocation to the extracted hooks until an ESM loader hook returns a result.


### Limitations
- The ESM loader API implementation has been marked experimental and is subject to breaking changes. From the [documentation](https://nodejs.org/api/esm.html#esm_experimental_loaders):
  > Note: The loaders API is being redesigned. This hook may disappear or its signature may change. Do not rely on the API described....

- Node.js versions prior to 14.3.0 cannot fully support the `getGlobalPreloadCode()` hook due to lack of [top-level-await](https://github.com/tc39/proposal-top-level-await) support. The `getGlobalPreloadCode()` is non-asynchronous and executed after the library's ESM loader script is loaded. The library asynchronously dynamically imports other ESM loader hooks, but the imports cannot be resolved before the library's `getGlobalPreloadCode()` hook is executed by Node.js. There is no backwards-compatible mechanism for `await`'ing at the top-level, if supported by the runtime.

- ESM loader hooks must behave cooperatively by delegating to the `default`/`next` tail parameter function. ESM loader hooks that blindly consume an invocation without delegating might prevent other ESM loader hooks from receiving the hook event.

- Forwards compatibility _cannot_ be guaranteed with future Node.js versions:
  - If Node.js lands the proposal [nodejs/node#33812: "esm: loader chaining"](https://github.com/nodejs/node/pull/33812/), some hooks may be invoked twice due to this library's delegation to hooks parsed from the vm's CLI args or `NODE_OPTIONS` environment variable.
  - If Node.js lands the proposal [nodejs/node#31229: "Move ESM loaders to worker thread"](https://github.com/nodejs/node/pull/31229), there may be compatibility issues with module loading.


## Issues
This is currently an experimental library/project - issues are to be expected. If you experience an issue with this project that you believe to be a bug, consider [reporting a new issue on GitHub](https://github.com/concision/esm-loader-chaining-polyfill/issues/new) and I ([@concision](https://github.com/concision)) will try to work on resolving it with you.


## License
Licensed under [MIT license](https://choosealicense.com/licenses/mit/).
