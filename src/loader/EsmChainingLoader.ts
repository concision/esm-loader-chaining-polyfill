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
import {ArrayPrototypeJoin, ArrayPrototypePush, FunctionPrototypeBind, JSONStringify} from "../internal/Primordials";
import {ERR_INVALID_RETURN_VALUE} from "../internal/NodeErrors";

export type ExtractedEsmLoaderHooks = { [H in keyof EsmLoaderHook]-?: Array<Required<EsmLoaderHook>[H]> };

export const newEsmLoaderFromHooks = (hooks: ExtractedEsmLoaderHooks, asynchronousInitialization: Promise<void>): Required<EsmLoaderHook> => ({
    getGlobalPreloadCode(): string {
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
            const preloadCode = [${ArrayPrototypeJoin(escapedPreloadCode, ",")}];
            for (let i = 0; i < preloadCode.length; i++) {
                compileFunction(preloadCode[i], ["getBuiltin"], {filename: "<preload>"})
                    .call(globalThis, require);
            }
        `;
    },
    async resolve(specifier: string, context: ResolveContext, defaultResolve: ResolveHook): Promise<ResolveResult> {
        // await for all asynchronously-loaded ESM loaders to be imported
        await asynchronousInitialization;

        return defaultResolve(specifier, context, defaultResolve);
    },
    async getFormat(url: string, context: ModuleFormatContext, defaultFormat: ModuleFormatHook): Promise<ModuleFormatResult> {
        // await for all asynchronously-loaded ESM loaders to be imported
        await asynchronousInitialization;

        return await defaultFormat(url, context, defaultFormat);
    },
    async getSource(url: string, context: SourceContext, defaultSource: SourceHook): Promise<SourceResult> {
        // await for all asynchronously-loaded ESM loaders to be imported
        await asynchronousInitialization;

        return await defaultSource(url, context, defaultSource);
    },
    async transformSource(source: Source, context: TransformSourceContext, defaultTransformSource: TransformSourceHook): Promise<TransformSourceResult> {
        // await for all asynchronously-loaded ESM loaders to be imported
        await asynchronousInitialization;

        return await defaultTransformSource(source, context, defaultTransformSource);
    },
});
