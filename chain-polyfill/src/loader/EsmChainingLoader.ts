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
} from "@esm-loaders/types";
import {
    ArrayPrototypeJoin,
    ArrayPrototypePop,
    ArrayPrototypePush,
    FunctionPrototypeBind,
    JSONStringify,
} from "../internal/Primordials.js";
import {ERR_INVALID_RETURN_VALUE} from "../internal/NodeErrors.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Head<T extends any[]> = T extends [...infer H, any] ? H : any[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;

export type ExtractedEsmLoaderHooks = { [H in keyof EsmLoaderHook]-?: Array<Required<EsmLoaderHook>[H]> };

export function newEsmLoaderFromHooks(hooks: ExtractedEsmLoaderHooks, asynchronousInitialization: Promise<void>): Required<EsmLoaderHook> {
    const precompiledHooks: Omit<EsmLoaderHook, "getGlobalPreloadCode"> = {};

    const compileHooks = <H extends Required<EsmLoaderHook>[keyof Omit<EsmLoaderHook, "getGlobalPreloadCode">]>(hooks: H[]): H => {
        // mutable reference
        const reference: { defaultHook?: H } = {};

        // build chain hook
        let chainHook = async function (...args: Head<Parameters<H>>): Promise<AsyncReturnType<H>> {
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return <AsyncReturnType<H>>await reference.defaultHook!(...args, reference.defaultHook!);
        };
        // compose hooks
        for (let i = hooks.length - 1; 0 <= i; i--) {
            // closure definitions
            const currentHook = hooks[i];
            const nextChainHook = chainHook;

            // try resolution or cascade
            const selfChainHook = chainHook = async function (...args: Head<Parameters<H>>): Promise<AsyncReturnType<H>> {
                // if default specified hook is self, strip it to prevent infinite recursion
                if (args[args.length - 1] === selfChainHook) {
                    ArrayPrototypePop(args);
                }

                // @ts-ignore
                const result = await currentHook(...args, nextChainHook);
                if (result === null) {
                    return await nextChainHook(...args);
                }
                return <AsyncReturnType<H>>result;
            };
        }

        // invoke chain hook with the correct default parameter
        return <H><unknown>async function (...args: [...Head<Parameters<H>>, H]): Promise<AsyncReturnType<H>> {
            const hookArgs = <Head<Parameters<H>>><unknown>args;
            const defaultHook: H = ArrayPrototypePop(args);

            // restored if any hook imports another module
            const previousDefaultHook = reference.defaultHook;
            reference.defaultHook = defaultHook;
            try {
                return <AsyncReturnType<H>>await chainHook(...hookArgs);
            } finally {
                reference.defaultHook = previousDefaultHook;
            }
        };
    };

    return {
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
                const {compileFunction} = getBuiltin("vm");
                const preloadCode = [${ArrayPrototypeJoin(escapedPreloadCode, ",")}];
                for (let i = 0; i < preloadCode.length; i++) {
                    compileFunction(preloadCode[i], ["getBuiltin"], {filename: "<preload>"})
                        .call(globalThis, getBuiltin);
                }
            `;
        },

        async resolve(specifier: string, context: ResolveContext, defaultResolve: ResolveHook): Promise<ResolveResult> {
            // await for all asynchronously-loaded ESM loaders to be imported
            await asynchronousInitialization;

            return await (precompiledHooks.resolve ??= compileHooks(hooks.resolve))(specifier, context, defaultResolve);
        },

        async getFormat(url: string, context: ModuleFormatContext, defaultFormat: ModuleFormatHook): Promise<ModuleFormatResult> {
            // await for all asynchronously-loaded ESM loaders to be imported
            await asynchronousInitialization;

            return await (precompiledHooks.getFormat ??= compileHooks(hooks.getFormat))(url, context, defaultFormat);
        },

        async getSource(url: string, context: SourceContext, defaultSource: SourceHook): Promise<SourceResult> {
            // await for all asynchronously-loaded ESM loaders to be imported
            await asynchronousInitialization;

            return await (precompiledHooks.getSource ??= compileHooks(hooks.getSource))(url, context, defaultSource);
        },

        async transformSource(source: Source, context: TransformSourceContext, defaultTransformSource: TransformSourceHook): Promise<TransformSourceResult> {
            // await for all asynchronously-loaded ESM loaders to be imported
            await asynchronousInitialization;

            return await (precompiledHooks.transformSource ??= compileHooks(hooks.transformSource))(source, context, defaultTransformSource);
        },
    };
}
