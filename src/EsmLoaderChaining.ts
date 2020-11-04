import {
    EsmLoaderHook,
    GlobalPreloadCodeHook,
    ModuleFormatContext,
    ModuleFormatHook,
    ModuleFormatResult,
    ResolveContext,
    ResolveHook,
    ResolveResult,
    Source,
    SourceContext,
    SourceHook,
    SourceResult,
    TransformSourceContext,
    TransformSourceHook,
    TransformSourceResult,
} from "./index";
import {ERR_INVALID_RETURN_VALUE} from "./internal/Errors";

// primordials: https://github.com/nodejs/node/blob/master/lib/internal/per_context/primordials.js
const ReflectApply = Reflect.apply;
const uncurryThis = <T, A extends any[], R>(func: (this: T, ...args: A) => R): ((this: void, thisArg: T, ...args: A) => R) => {
    return (thisArg: T, ...args: A) => ReflectApply(func, thisArg, args);
};
const ArrayPrototypeJoin = uncurryThis(Array.prototype.join);
const ArrayPrototypePush = uncurryThis(Array.prototype.push);
const JSONStringify = JSON.stringify;
const FunctionPrototypeBind = uncurryThis(Function.prototype.bind);


// test top level await
let isTopLevelAwaitEnabled = false;
try {
    // if top-level await is not supported, parsing errors will occur with 'await' keyword
    eval(`await Promise.resolve();`);
    isTopLevelAwaitEnabled = true;
} catch (ignored) {
    process.emitWarning("--experimental-top-level-await or --harmony-top-level-await must be specified to support the getGlobalPreloadCode hook");
}


// parse loaders
const loaderNames: string[] = [];
for (let i = 0; i < process.execArgv.length; i++) {
    const nodeArg = process.execArgv[i];

    let loaderName;
    if (nodeArg === "--loader" || nodeArg === "--experimental-loader") {
        loaderName = process.execArgv[i + 1];
    } else if (nodeArg.startsWith("--loader=") || nodeArg.startsWith("--experimental-loader=")) {
        loaderName = nodeArg.substring(nodeArg.indexOf("=") + 1);
    }
    if (typeof loaderName !== "undefined") {
        loaderNames.push(loaderName);
    }
}


// no-op validation checks
let noopLoader = false;
// if this ESM loader is not the last loader in the list, but is still somehow loaded, ESM loader chaining must be supported in this node version
// therefore, all operations should no-op to not reduplicate calls
if (loaderNames[loaderNames.length - 1] !== "esm-loader-chaining") {
    noopLoader = true;
}
// TODO: no-op if the current version has nodejs/node#33812 merged


// extracted loader hooks
const globalPreloadCodeHooks: GlobalPreloadCodeHook[] = [];
const resolveHooks: ResolveHook[] = [];
const moduleFormatHooks: ModuleFormatHook[] = [];
const sourceHooks: SourceHook[] = [];
const transformSourceHooks: TransformSourceHook[] = [];

// initialize all ESM loaders and extract hooks
// note: any future invoked code may manipulate object prototypes - all code beyond here should invoke only primordials
const initializationPromise: Promise<never> = new Promise(async (resolve, reject) => {
    try {
        // import all ESM loaders
        const esmLoaders: EsmLoaderHook[] = [];
        for (let i = 0; i < loaderNames.length; i++) {
            const loaderName: string = loaderNames[i];
            if (loaderName !== "esm-loader-chaining") {
                ArrayPrototypePush(esmLoaders, <EsmLoaderHook>await import(loaderName));
            }
        }

        // extract all hooks
        for (let i = 0; i < esmLoaders.length; i++) {
            const esmLoader: EsmLoaderHook = esmLoaders[i];

            const globalPreloadCodeHook: unknown = esmLoader.getGlobalPreloadCode;
            if (typeof globalPreloadCodeHook === "function") {
                ArrayPrototypePush(globalPreloadCodeHooks, <GlobalPreloadCodeHook>globalPreloadCodeHook);
            }
            const resolveHook: unknown = esmLoader.resolve;
            if (typeof resolveHook === "function") {
                ArrayPrototypePush(resolveHooks, <ResolveHook>resolveHook);
            }
            const moduleFormatHook: unknown = esmLoader.getFormat;
            if (typeof moduleFormatHook === "function") {
                ArrayPrototypePush(moduleFormatHooks, <ModuleFormatHook>moduleFormatHook);
            }
            const sourceHook: unknown = esmLoader.getSource;
            if (typeof sourceHook === "function") {
                ArrayPrototypePush(sourceHooks, <SourceHook>sourceHook);
            }
            const transformSourceHook: unknown = esmLoader.transformSource;
            if (typeof transformSourceHook === "function") {
                ArrayPrototypePush(transformSourceHooks, <TransformSourceHook>transformSourceHook);
            }
        }

        resolve();
    } catch (exception) {
        reject(exception);
    }
});

// if possible, await until all ESM loader hooks are collected
if (!noopLoader && isTopLevelAwaitEnabled) {
    eval(`await initializationPromise;`);
}


export const getGlobalPreloadCode: GlobalPreloadCodeHook = (): string => {
    // unable to generate preload code; return nothing
    if (noopLoader || !isTopLevelAwaitEnabled) return "";

    const escapedPreloadCode: string[] = [];
    // retrieve global preload code from all hooks
    for (let i = 0; i < globalPreloadCodeHooks.length; i++) {
        const globalPreloadCodeHook: GlobalPreloadCodeHook = globalPreloadCodeHooks[i];

        // set 'this' to null and invoke to retrieve preload code
        const preloadCode: unknown = FunctionPrototypeBind(globalPreloadCodeHook, null)();
        // ignore null return values
        if (preloadCode !== null) {
            // validate preload return value
            if (typeof preloadCode !== "string") {
                throw new ERR_INVALID_RETURN_VALUE("string", "loader getGlobalPreloadCode", preloadCode);
            }
            // add global preload code to list
            ArrayPrototypePush(escapedPreloadCode, JSONStringify(preloadCode));
        }
    }
    // return wrapper for global preload code
    return `
        const {compileFunction} = require("vm");
        for (const preloadCode of [${ArrayPrototypeJoin(escapedPreloadCode, ",")}]) {
            compileFunction(preloadCode, ["getBuiltin"], {filename: "<preload>"})
                .call(globalThis, require);
        }
    `;
};

export const resolve: ResolveHook = async (
    specifier: string,
    context: ResolveContext,
    nextResolve: ResolveHook,
): Promise<ResolveResult> => {
    if (noopLoader) return await nextResolve(specifier, context, nextResolve);

    // await until all loaders are resolved
    if (!isTopLevelAwaitEnabled) await initializationPromise;

    return nextResolve(specifier, context, nextResolve);
};

export const getFormat: ModuleFormatHook = async (
    url: string,
    context: ModuleFormatContext,
    nextFormat: ModuleFormatHook,
): Promise<ModuleFormatResult> => {
    if (noopLoader) return await nextFormat(url, context, nextFormat);

    // await until all loaders are resolved
    if (!isTopLevelAwaitEnabled) await initializationPromise;

    return await nextFormat(url, context, nextFormat);
};

export const getSource: SourceHook = async (
    url: string,
    context: SourceContext,
    nextSource: SourceHook,
): Promise<SourceResult> => {
    if (noopLoader) return await nextSource(url, context, nextSource);

    // await until all loaders are resolved
    if (!isTopLevelAwaitEnabled) await initializationPromise;

    return await nextSource(url, context, nextSource);
};

export const transformSource: TransformSourceHook = async (
    source: Source,
    context: TransformSourceContext,
    nextTransformSource: TransformSourceHook,
): Promise<TransformSourceResult> => {
    if (noopLoader) return await nextTransformSource(source, context, nextTransformSource);

    // await until all loaders are resolved
    if (!isTopLevelAwaitEnabled) await initializationPromise;

    return await nextTransformSource(source, context, nextTransformSource);
};
