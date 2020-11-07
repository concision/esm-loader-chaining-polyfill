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
import {ERR_INVALID_RETURN_VALUE} from "../internal/NodeErrors.js";

// source: https://stackoverflow.com/a/63790089
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OptionalTailElement<T extends any[]> = T extends [...infer H, infer L] ? [...H, L?] : any[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OptionalTailParameter<T extends (...args: any[]) => any> = (...args: OptionalTailElement<Parameters<T>>) => ReturnType<T>;

export type ExtractedEsmLoaderHooks = { [H in keyof EsmLoaderHook]-?: Array<Required<EsmLoaderHook>[H]> };

export function newEsmLoaderFromHooks(hooks: ExtractedEsmLoaderHooks, asynchronousInitialization: Promise<void>): Required<EsmLoaderHook> {
    const precompiledHooks: Omit<EsmLoaderHook, "getGlobalPreloadCode"> = {};

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

            // compile loader hook chain
            if (typeof precompiledHooks.resolve === "undefined") {
                // mutable reference
                const container: { defaultHook?: ResolveHook } = {};

                // build chain hook
                let resolveChain: OptionalTailParameter<ResolveHook> = async function (this: unknown, specifier: string, context: ResolveContext) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    return await Reflect.apply(container.defaultHook!, this, [specifier, context, container.defaultHook!]);
                };
                for (let i = hooks.resolve.length - 1; 0 <= i; i--) {
                    // closure definitions
                    const resolve = hooks.resolve[i];
                    const nextResolve = resolveChain;

                    // try resolution or cascade
                    resolveChain = async function (specifier: string, context: ResolveContext) {
                        const result = await resolve(specifier, context, nextResolve);
                        if (result === null) {
                            return nextResolve(specifier, context);
                        }
                        return result;
                    };
                }

                // create precompiled hook with a specified default
                precompiledHooks.resolve = async function (specifier: string, context: ResolveContext, defaultResolve: ResolveHook): Promise<ResolveResult> {
                    // restored if any hook imports another module
                    const previousDefaultHook = container.defaultHook;
                    container.defaultHook = defaultResolve;
                    try {
                        return await resolveChain(specifier, context);
                    } finally {
                        container.defaultHook = previousDefaultHook;
                    }
                };
            }

            // execute hook with a specified default hook
            return await precompiledHooks.resolve(specifier, context, defaultResolve);
        },

        async getFormat(url: string, context: ModuleFormatContext, defaultFormat: ModuleFormatHook): Promise<ModuleFormatResult> {
            // await for all asynchronously-loaded ESM loaders to be imported
            await asynchronousInitialization;

            // compile loader hook chain
            if (typeof precompiledHooks.getFormat === "undefined") {
                // mutable reference
                const container: { defaultHook?: ModuleFormatHook } = {};

                // build chain hook
                let formatChain: OptionalTailParameter<ModuleFormatHook> = async function (this: unknown, url: string, context: ModuleFormatContext) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    return await Reflect.apply(container.defaultHook!, this, [url, context, container.defaultHook!]);
                };
                for (let i = hooks.getFormat.length - 1; 0 <= i; i--) {
                    // closure definitions
                    const format = hooks.getFormat[i];
                    const nextFormat = formatChain;

                    // try resolution or cascade
                    formatChain = async function (url: string, context: ModuleFormatContext) {
                        const result = await format(url, context, nextFormat);
                        if (result === null) {
                            return nextFormat(url, context);
                        }
                        return result;
                    };
                }

                // create precompiled hook with a specified default
                precompiledHooks.getFormat = async function (url: string, context: ModuleFormatContext, defaultResolve: ModuleFormatHook): Promise<ModuleFormatResult> {
                    // restored if any hook imports another module
                    const previousDefaultHook = container.defaultHook;
                    container.defaultHook = defaultResolve;
                    try {
                        return await formatChain(url, context);
                    } finally {
                        container.defaultHook = previousDefaultHook;
                    }
                };
            }

            // execute hook with a specified default hook
            return await precompiledHooks.getFormat(url, context, defaultFormat);
        },

        async getSource(url: string, context: SourceContext, defaultSource: SourceHook): Promise<SourceResult> {
            // await for all asynchronously-loaded ESM loaders to be imported
            await asynchronousInitialization;

            // compile loader hook chain
            if (typeof precompiledHooks.getSource === "undefined") {
                // mutable reference
                const container: { defaultHook?: SourceHook } = {};

                // build chain hook
                let sourceChain: OptionalTailParameter<SourceHook> = async function (this: unknown, url: string, context: SourceContext) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    return await Reflect.apply(container.defaultHook!, this, [url, context, container.defaultHook!]);
                };
                for (let i = hooks.getSource.length - 1; 0 <= i; i--) {
                    // closure definitions
                    const source = hooks.getSource[i];
                    const nextSource = sourceChain;

                    // try resolution or cascade
                    sourceChain = async function (url: string, context: SourceContext) {
                        const result = await source(url, context, nextSource);
                        if (result === null) {
                            return nextSource(url, context);
                        }
                        return result;
                    };
                }

                // create precompiled hook with a specified default
                precompiledHooks.getSource = async function (url: string, context: SourceContext, defaultResolve: SourceHook): Promise<SourceResult> {
                    // restored if any hook imports another module
                    const previousDefaultHook = container.defaultHook;
                    container.defaultHook = defaultResolve;
                    try {
                        return await sourceChain(url, context);
                    } finally {
                        container.defaultHook = previousDefaultHook;
                    }
                };
            }

            // execute hook with a specified default hook
            return await precompiledHooks.getSource(url, context, defaultSource);
        },

        async transformSource(source: Source, context: TransformSourceContext, defaultTransformSource: TransformSourceHook): Promise<TransformSourceResult> {
            // await for all asynchronously-loaded ESM loaders to be imported
            await asynchronousInitialization;

            // compile loader hook chain
            if (typeof precompiledHooks.transformSource === "undefined") {
                // mutable reference
                const container: { defaultHook?: TransformSourceHook } = {};

                // build chain hook
                let formatChain: OptionalTailParameter<TransformSourceHook> = async function (this: unknown, source: Source, context: TransformSourceContext) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    return await Reflect.apply(container.defaultHook!, this, [source, context, container.defaultHook!]);
                };
                for (let i = hooks.transformSource.length - 1; 0 <= i; i--) {
                    // closure definitions
                    const transformSource = hooks.transformSource[i];
                    const nextTransformSource = formatChain;

                    // try resolution or cascade
                    formatChain = async function (source: Source, context: TransformSourceContext) {
                        const result = await transformSource(source, context, nextTransformSource);
                        if (result === null) {
                            return nextTransformSource(source, context);
                        }
                        return result;
                    };
                }

                // create precompiled hook with a specified default
                precompiledHooks.transformSource = async function (source: Source, context: TransformSourceContext, defaultResolve: TransformSourceHook): Promise<TransformSourceResult> {
                    // restored if any hook imports another module
                    const previousDefaultHook = container.defaultHook;
                    container.defaultHook = defaultResolve;
                    try {
                        return await formatChain(source, context);
                    } finally {
                        container.defaultHook = previousDefaultHook;
                    }
                };
            }

            // execute hook with a specified default hook
            return await precompiledHooks.transformSource(source, context, defaultTransformSource);
        },
    };
}
