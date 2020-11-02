import {
    GlobalPreloadCodeHook,
    ModuleFormatContext,
    ModuleFormatHook,
    ModuleFormatResult,
    RemovedTailParameter,
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

// test top level await
let topLevelAwaitEnabled = false;
try {
    eval("await Promise.resolve();");
    topLevelAwaitEnabled = true;
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

// resolve
const loaders: any[] = [];
const loaderPromise = new Promise(async (resolve, reject) => {
    try {
        for (const loaderName of loaderNames) {
            if (loaderName !== "esm-loader-chaining") {
                loaders.push(await import(loaderName));
            }
        }
        resolve();
    } catch (exception) {
        reject(exception);
    }
});

if (topLevelAwaitEnabled) {
    eval("await loaderPromise;");
}


export const getGlobalPreloadCode: GlobalPreloadCodeHook = (): string => {
    if (!topLevelAwaitEnabled) {
        return "";
    }

    return ``;
};

export const resolve: ResolveHook = async (
    specifier: string,
    context: ResolveContext,
    nextResolve: RemovedTailParameter<ResolveHook>,
): Promise<ResolveResult> => {
    // await until all loaders are resolved
    if (!topLevelAwaitEnabled) {
        await loaderPromise;
    }

    return nextResolve(specifier, context);
};

export const getFormat: ModuleFormatHook = async (
    url: string,
    context: ModuleFormatContext,
    nextFormat: RemovedTailParameter<ModuleFormatHook>,
): Promise<ModuleFormatResult> => {
    // await until all loaders are resolved
    if (!topLevelAwaitEnabled) {
        await loaderPromise;
    }

    return await nextFormat(url, context);
};

export const getSource: SourceHook = async (
    url: string,
    context: SourceContext,
    nextSource: RemovedTailParameter<SourceHook>,
): Promise<SourceResult> => {
    // await until all loaders are resolved
    if (!topLevelAwaitEnabled) {
        await loaderPromise;
    }

    return await nextSource(url, context);
};

export const transformSource: TransformSourceHook = async (
    source: Source,
    context: TransformSourceContext,
    nextTransformSource: RemovedTailParameter<TransformSourceHook>,
): Promise<TransformSourceResult> => {
    // await until all loaders are resolved
    if (!topLevelAwaitEnabled) {
        await loaderPromise;
    }

    return await nextTransformSource(source, context);
};
