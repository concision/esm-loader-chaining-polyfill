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
} from "../typings";
import {ArrayPrototypeJoin, ArrayPrototypePush, FunctionPrototypeBind, JSONStringify} from "../internal/Primordials.js";
import {createRequire} from "module";
import {ERR_INVALID_RETURN_VALUE} from "../internal/NodeErrors";


type ExtractedEsmLoaderHooks = { [P in keyof EsmLoaderHook]-?: Array<Required<EsmLoaderHook>[P]> };


export function createEsmLoader(settings: { async: false }): EsmLoaderHook;

export function createEsmLoader(settings: { async: true }): Promise<EsmLoaderHook>;

export function createEsmLoader({async}: { async: boolean }): EsmLoaderHook | Promise<EsmLoaderHook> {
    // emit warnings
    if (!async) {
        process.emitWarning("esm-loader-chaining: --experimental-top-level-await or --harmony-top-level-await must be specified to properly support the getGlobalPreloadCode hook");
    }

    // parse Node.js VM flags
    const esmLoaderNames: string[] = extractLoaderNames(process.execArgv);


    // no-op validation checks
    let noopLoader = false;
    // if this ESM loader is not the last loader in the list, but is still somehow loaded, ESM loader chaining must be natively supported
    // therefore, all operations should no-op to not duplicate calls
    if (esmLoaderNames[esmLoaderNames.length - 1] !== "esm-loader-chaining") {
        noopLoader = true;
    }
    // TODO: no-op if the current version has nodejs/node#33812 merged
    // if the ESM loader should no-op, return no hooks
    if (noopLoader) {
        if (async) {
            return Promise.resolve({});
        } else {
            return {};
        }
    }


    // extracted loader hooks
    const hooks: ExtractedEsmLoaderHooks = {
        getGlobalPreloadCode: [],
        resolve: [],
        getFormat: [],
        getSource: [],
        transformSource: [],
    };

    // create a CommonJS require import function in the current working directory
    const require = createRequire(process.cwd());

    const esmLoaders: EsmLoaderHook[] = [];
    const unimportedEsmLoaders: string[] = [];

    // synchronously import all CommonJS ESM loaders
    for (let i = 0; i < esmLoaderNames.length; i++) {
        const loaderName: string = esmLoaderNames[i];
        // skip self ESM loader
        if (loaderName === "esm-loader-chaining") continue;

        try {
            // try importing as a CommonJS module and extract hooks
            ArrayPrototypePush(hooks, require(loaderName));
        } catch (error) {
            // rethrow if not ERR_REQUIRE_ESM: https://nodejs.org/api/errors.html#errors_err_require_esm
            if (!(error?.constructor?.name === "NodeError" && error.code === "ERR_REQUIRE_ESM")) {
                throw error;
            }
            // delegate to ESM import
            ArrayPrototypePush(unimportedEsmLoaders, loaderName);
        }
    }
    compileHooks(hooks, esmLoaders);

    // initialize all ESM loaders and extract hooks
    // note: any future invoked code may manipulate object prototypes - all code beyond here should invoke only primordials
    const initializationPromise: Promise<never> = new Promise(async (resolve, reject) => {
        try {
            // import all ESM loaders
            const esmLoaders: EsmLoaderHook[] = [];
            for (let i = 0; i < esmLoaderNames.length; i++) {
                const loaderName: string = esmLoaderNames[i];
                if (loaderName !== "esm-loader-chaining") {
                    try {
                        const module = require(loaderName);
                    } catch (error) {

                    }


                    ArrayPrototypePush(esmLoaders, <EsmLoaderHook>await import(loaderName));
                }
            }

            // recompile hooks
            for (let hookArray of Object.values(hooks)) {
                hookArray.splice(0, hookArray.length);
            }
            compileHooks(hooks, esmLoaders);

            resolve();
        } catch (exception) {
            reject(exception);
        }
    });


    // TODO: implement stub
    const compiledHooks: EsmLoaderHook = {
        getGlobalPreloadCode: (): string => {
            const escapedPreloadCode: string[] = [];
            // retrieve global preload code from all hooks
            for (let i = 0; i < hooks.getGlobalPreloadCode.length; i++) {
                const globalPreloadCodeHook: GlobalPreloadCodeHook = hooks.getGlobalPreloadCode[i];

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
        },
        resolve: async (
            specifier: string,
            context: ResolveContext,
            nextResolve: ResolveHook,
        ): Promise<ResolveResult> => {
            return nextResolve(specifier, context, nextResolve);
        },
        getFormat: async (
            url: string,
            context: ModuleFormatContext,
            nextFormat: ModuleFormatHook,
        ): Promise<ModuleFormatResult> => {
            return await nextFormat(url, context, nextFormat);
        },
        getSource: async (
            url: string,
            context: SourceContext,
            nextSource: SourceHook,
        ): Promise<SourceResult> => {
            return await nextSource(url, context, nextSource);
        },
        transformSource: async (
            source: Source,
            context: TransformSourceContext,
            nextTransformSource: TransformSourceHook,
        ): Promise<TransformSourceResult> => {
            return await nextTransformSource(source, context, nextTransformSource);
        },
    };


    // TODO: implement
    if (async) {
        return Promise.resolve(compiledHooks);
    } else {
        return compiledHooks;
    }
}

function extractLoaderNames(nodeArgs: string[]): string[] {
    const esmLoaderImports: string[] = [];
    for (let i = 0; i < nodeArgs.length; i++) {
        const nodeArg = nodeArgs[i];

        let loaderName;
        if (nodeArg === "--loader" || nodeArg === "--experimental-loader") {
            loaderName = nodeArgs[i + 1];
        } else if (nodeArg.startsWith("--loader=") || nodeArg.startsWith("--experimental-loader=")) {
            loaderName = nodeArg.substring(nodeArg.indexOf("=") + 1);
        }
        if (typeof loaderName !== "undefined") {
            esmLoaderImports.push(loaderName);
        }
    }
    return esmLoaderImports;
}

function compileHooks(hooks: ExtractedEsmLoaderHooks, esmLoaders: EsmLoaderHook[]) {
    for (let i = 0; i < esmLoaders.length; i++) {
        const esmLoader = esmLoaders[i];

        const globalPreloadCodeHook: unknown = esmLoader.getGlobalPreloadCode;
        if (typeof globalPreloadCodeHook === "function") {
            ArrayPrototypePush(hooks.getGlobalPreloadCode, <GlobalPreloadCodeHook>globalPreloadCodeHook);
        }
        const resolveHook: unknown = esmLoader.resolve;
        if (typeof resolveHook === "function") {
            ArrayPrototypePush(hooks.resolve, <ResolveHook>resolveHook);
        }
        const moduleFormatHook: unknown = esmLoader.getFormat;
        if (typeof moduleFormatHook === "function") {
            ArrayPrototypePush(hooks.getFormat, <ModuleFormatHook>moduleFormatHook);
        }
        const sourceHook: unknown = esmLoader.getSource;
        if (typeof sourceHook === "function") {
            ArrayPrototypePush(hooks.getSource, <SourceHook>sourceHook);
        }
        const transformSourceHook: unknown = esmLoader.transformSource;
        if (typeof transformSourceHook === "function") {
            ArrayPrototypePush(hooks.transformSource, <TransformSourceHook>transformSourceHook);
        }
    }
}
