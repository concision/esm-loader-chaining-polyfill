import {
    ModuleFormatContext,
    ModuleFormatHook,
    ModuleFormatResult,
    ResolveContext,
    ResolveHook,
    ResolveResult,
    Source,
    TransformSourceContext,
    TransformSourceHook,
    TransformSourceResult,
} from "@esm-loaders/types";

export const resolve: ResolveHook = async (specifier: string, context: ResolveContext, nextResolve: ResolveHook): Promise<ResolveResult> => {
    return await nextResolve(specifier, context, nextResolve);
};

export const getFormat: ModuleFormatHook = async (url: string, context: ModuleFormatContext, nextFormat: ModuleFormatHook): Promise<ModuleFormatResult> => {
    return nextFormat(url, context, nextFormat);
};

export const transformSource: TransformSourceHook = async (source: Source, context: TransformSourceContext, nextTransformSource: TransformSourceHook): Promise<TransformSourceResult> => {
    return nextTransformSource(source, context, nextTransformSource);
};
