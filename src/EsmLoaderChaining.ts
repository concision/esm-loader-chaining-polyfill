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

// test top level await
let isTopLevelAwaitEnabled = false;
try {
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


// checks
let noopLoader = false;
// if this ESM loader is not the last loader in the list, but is still somehow loaded, ESM loader chaining must be supported in this node version
// therefore, all operations should no-op to not reduplicate calls
if (loaderNames[loaderNames.length - 1] !== "esm-loader-chaining") {
    noopLoader = true;
}
// TODO: check if the current version has nodejs/node#33812 merged, and no-op if so


// resolve
const esmLoaders: EsmLoaderHook[] = [];
const importEsmLoadersPromise: Promise<EsmLoaderHook[]> = new Promise(async (resolve, reject) => {
    try {
        for (const loaderName of loaderNames) {
            if (loaderName !== "esm-loader-chaining") {
                esmLoaders.push(await import(loaderName));
            }
        }
        resolve();
    } catch (exception) {
        reject(exception);
    }
});


if (!noopLoader && isTopLevelAwaitEnabled) {
    eval(`await importEsmLoadersPromise;`);
}
export const getGlobalPreloadCode: GlobalPreloadCodeHook = (): string => {
    if (noopLoader || !isTopLevelAwaitEnabled) return "";

    const preloadCodeList: string[] = [];
    // retrieve global preload code from all hooks
    for (const esmLoader of esmLoaders) {
        const globalPreloadCodeHook: unknown = esmLoader.getGlobalPreloadCode;
        if (typeof globalPreloadCodeHook === "function") {
            // set 'this' to null and invoke to retrieve preload code
            const preloadCode: unknown = globalPreloadCodeHook.bind(null)();
            // ignore null return values
            if (preloadCode !== null) {
                // validate preload return value
                if (typeof preloadCode !== "string") {
                    throw new ERR_INVALID_RETURN_VALUE("string", "loader getGlobalPreloadCode", preloadCode);
                }
                // add global preload code to list
                preloadCodeList.push(preloadCode);
            }
        }
    }

    // return wrapper for global preload code
    return `
        for (const preloadCode of [${preloadCodeList.map(code => JSON.stringify(code)).join(",")}]) {
            const {compileFunction} = require("vm");
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
    if (!isTopLevelAwaitEnabled) await importEsmLoadersPromise;

    return nextResolve(specifier, context, nextResolve);
};

export const getFormat: ModuleFormatHook = async (
    url: string,
    context: ModuleFormatContext,
    nextFormat: ModuleFormatHook,
): Promise<ModuleFormatResult> => {
    if (noopLoader) return await nextFormat(url, context, nextFormat);

    // await until all loaders are resolved
    if (!isTopLevelAwaitEnabled) await importEsmLoadersPromise;

    return await nextFormat(url, context, nextFormat);
};

export const getSource: SourceHook = async (
    url: string,
    context: SourceContext,
    nextSource: SourceHook,
): Promise<SourceResult> => {
    if (noopLoader) return await nextSource(url, context, nextSource);

    // await until all loaders are resolved
    if (!isTopLevelAwaitEnabled) await importEsmLoadersPromise;

    return await nextSource(url, context, nextSource);
};

export const transformSource: TransformSourceHook = async (
    source: Source,
    context: TransformSourceContext,
    nextTransformSource: TransformSourceHook,
): Promise<TransformSourceResult> => {
    if (noopLoader) return await nextTransformSource(source, context, nextTransformSource);

    // await until all loaders are resolved
    if (!isTopLevelAwaitEnabled) await importEsmLoadersPromise;

    return await nextTransformSource(source, context, nextTransformSource);
};
