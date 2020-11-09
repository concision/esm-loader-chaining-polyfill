import {
    ModuleFormatContext,
    ModuleFormatHook,
    ModuleFormatResult,
    ResolveContext,
    ResolveHook,
    ResolveResult,
    SourceContext,
    SourceHook,
    SourceResult,
} from "@esm-loaders/types";

export const resolve: ResolveHook = async (specifier: string, context: ResolveContext, defaultResolve: ResolveHook): Promise<ResolveResult> => {
    return await defaultResolve(specifier, context, defaultResolve);
};

export const getFormat: ModuleFormatHook = async (url: string, context: ModuleFormatContext, defaultFormat: ModuleFormatHook): Promise<ModuleFormatResult> => {
    return defaultFormat(url, context, defaultFormat);
};

export const getSource: SourceHook = async (url: string, context: SourceContext, defaultSource: SourceHook): Promise<SourceResult> => {
    return defaultSource(url, context, defaultSource);
};
