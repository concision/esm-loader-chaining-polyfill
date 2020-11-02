import {
    FormatContext,
    FormatResult,
    ResolveContext,
    ResolveResult,
    Source,
    SourceContext,
    SourceResult,
    TransformSourceContext,
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


export function getGlobalPreloadCode(): string {
    if (!topLevelAwaitEnabled) {
        return ``;
    }
    return ``;
}

export async function resolve(specifier: string, context: ResolveContext, nextResolve: typeof resolve): Promise<ResolveResult> {
    if (!topLevelAwaitEnabled) await loaderPromise;
    return nextResolve(specifier, context, nextResolve);
}

export async function getFormat(url: string, context: FormatContext, nextFormat: typeof getFormat): Promise<FormatResult> {
    if (!topLevelAwaitEnabled) await loaderPromise;
    return await nextFormat(url, context, nextFormat);
}

export async function getSource(url: string, context: SourceContext, nextSource: typeof getSource): Promise<SourceResult> {
    if (!topLevelAwaitEnabled) await loaderPromise;
    return await nextSource(url, context, nextSource);
}

export async function transformSource(source: Source, context: TransformSourceContext, nextTransformSource: typeof transformSource): Promise<TransformSourceResult> {
    if (!topLevelAwaitEnabled) await loaderPromise;
    return await nextTransformSource(source, context, nextTransformSource);
}
