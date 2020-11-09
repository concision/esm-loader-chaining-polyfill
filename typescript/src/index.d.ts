import {ModuleFormatHook, ResolveHook, TransformSourceHook} from "@esm-loaders/types";

export const resolve: ResolveHook;
export const getFormat: ModuleFormatHook;
export const transformSource: TransformSourceHook;
