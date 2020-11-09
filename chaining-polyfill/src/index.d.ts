import {
    GlobalPreloadCodeHook,
    ModuleFormatHook,
    ResolveHook,
    SourceHook,
    TransformSourceHook,
} from "@esm-loaders/types";

export const getGlobalPreloadCode: GlobalPreloadCodeHook;
export const resolve: ResolveHook;
export const getFormat: ModuleFormatHook;
export const getSource: SourceHook;
export const transformSource: TransformSourceHook;
