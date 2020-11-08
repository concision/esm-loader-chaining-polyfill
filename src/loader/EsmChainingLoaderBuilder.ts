import {
    EsmLoaderHook,
    GlobalPreloadCodeHook,
    ModuleFormatHook,
    ResolveHook,
    SourceHook,
    TransformSourceHook,
} from "../typings";
import {
    ArrayPrototypePush,
    ArrayPrototypeSplice,
    ObjectValues,
    PromiseResolve,
    StringPrototypeStartsWith,
    URLPrototypeToString,
} from "../internal/Primordials.js";
import {ExtractedEsmLoaderHooks, newEsmLoaderFromHooks} from "./EsmChainingLoader.js";
import {createRequire} from "module";
import {resolve} from "path";
import {pathToFileURL} from "url";
import {parseNodeOptions} from "../internal/NodeOptions.js";


export function createEsmLoader(settings: { async: false }): EsmLoaderHook;

export function createEsmLoader(settings: { async: true }): Promise<EsmLoaderHook>;

export function createEsmLoader({async}: { async: boolean }): EsmLoaderHook | Promise<EsmLoaderHook> {
    // collect Node.js arguments
    const nodeArgs: string[] = [...parseNodeOptions(process.env.NODE_OPTIONS || ""), ...process.execArgv];

    // parse Node.js VM flags for --loader or --experimental-loader
    const esmLoaderNames: string[] = [];
    for (let i = 0; i < nodeArgs.length; i++) {
        const nodeArg = nodeArgs[i];

        let loaderName;
        if (nodeArg === "--loader" || nodeArg === "--experimental-loader") {
            loaderName = nodeArgs[i + 1];
        } else if (nodeArg.startsWith("--loader=") || nodeArg.startsWith("--experimental-loader=")) {
            loaderName = nodeArg.substring(nodeArg.indexOf("=") + 1);
        }
        if (typeof loaderName !== "undefined") {
            esmLoaderNames.push(loaderName);
        }
    }


    // no-op validation checks
    let noopLoader = false;
    // no other loaders specified
    if (esmLoaderNames.length <= 1) noopLoader = true;
    // if this ESM loader is not the last loader in the list, but is still somehow loaded, ESM loader chaining must be natively supported
    // therefore, all operations should no-op to not duplicate calls
    // if (esmLoaderNames[esmLoaderNames.length - 1] !== "esm-loader-chaining") noopLoader = true;
    // TODO: no-op if the current version has nodejs/node#33812 merged
    // if the ESM loader should no-op, return no hooks
    if (noopLoader) {
        if (async) {
            return PromiseResolve({});
        } else {
            return {};
        }
    }


    // ESM loaders
    const esmLoaders: Array<EsmLoaderHook | Promise<EsmLoaderHook>> = [];
    // extracted loader hooks
    const hooks: ExtractedEsmLoaderHooks = {
        getGlobalPreloadCode: [],
        resolve: [],
        getFormat: [],
        getSource: [],
        transformSource: [],
    };

    // create a CommonJS require import function in the current working directory
    const currentWorkingDirectory: string = process.cwd();
    const require = createRequire(currentWorkingDirectory);
    // synchronously import all CommonJS ESM loaders
    // note: any future invoked code may manipulate object prototypes - all code beyond here should invoke only primordials
    for (let i = 0; i < esmLoaderNames.length; i++) {
        let loaderName: string = esmLoaderNames[i];
        // skip self ESM loader
        if (loaderName === "esm-loader-chaining" || loaderName === "esm-loader-chaining/no-tla") continue;

        let esmLoader;
        try { // CommonJS
            // try importing as a CommonJS module
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            esmLoader = require(loaderName);
        } catch (error) { // ESM
            // rethrow error if not ERR_REQUIRE_ESM or MODULE_NOT_FOUND
            if (!(error?.code === "ERR_REQUIRE_ESM" || error?.code === "MODULE_NOT_FOUND")) {
                throw error;
            }

            // resolve relative paths in current working directory
            if (
                StringPrototypeStartsWith(loaderName, "./") ||
                StringPrototypeStartsWith(loaderName, "../") ||
                (process.platform === "win32" && (
                    StringPrototypeStartsWith(loaderName, ".\\") ||
                    StringPrototypeStartsWith(loaderName, "..\\")
                ))
            ) {
                // resolve as file:// specifier
                loaderName = URLPrototypeToString(pathToFileURL(resolve(currentWorkingDirectory, loaderName)));
            }
            // try ES dynamic module import
            esmLoader = import(loaderName);
        }

        // extract hooks
        ArrayPrototypePush(esmLoaders, esmLoader);
    }
    // compile all known CommonJS hooks
    extractEsmLoaderHooks(hooks, esmLoaders);

    // asynchronously import all ES module ESM loaders
    const asynchronousInitialization: Promise<void> = (async () => {
        // await all asynchronously imported ES modules
        for (let i = 0; i < esmLoaders.length; i++) {
            const esmLoader = esmLoaders[i];
            if (esmLoader instanceof Promise) {
                esmLoaders[i] = await esmLoader;
            }
        }

        // recompile all known hooks
        extractEsmLoaderHooks(hooks, esmLoaders);
    })();


    if (async) {
        return (async () => {
            await asynchronousInitialization;
            return newEsmLoaderFromHooks(hooks, asynchronousInitialization);
        })();
    } else {
        return newEsmLoaderFromHooks(hooks, asynchronousInitialization);
    }
}


function extractEsmLoaderHooks(hooks: ExtractedEsmLoaderHooks, esmLoaders: Array<EsmLoaderHook | Promise<EsmLoaderHook>>) {
    // clear extracted hooks
    for (const hookArray of ObjectValues(hooks)) {
        ArrayPrototypeSplice(hookArray, 0, hookArray.length);
    }

    // (re)compile extracted hooks
    for (let i = 0; i < esmLoaders.length; i++) {
        const esmLoader = esmLoaders[i];

        // ignore if ESM loader is currently a Promise
        if (esmLoader instanceof Promise) continue;

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
