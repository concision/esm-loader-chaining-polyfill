export interface EsmLoaderHook {
    getGlobalPreloadCode?: GlobalPreloadCodeHook;
    resolve?: ResolveHook;
    getFormat?: ModuleFormatHook;
    getSource?: SourceHook;
    transformSource?: TransformSourceHook;
}


export interface GlobalPreloadCodeHook {
    (): string;
}


export interface ResolveContext {
    conditions: string[];
    parentURL: string;
}

export interface ResolveResult {
    url: string;
}

export interface ResolveHook {
    (specifier: string, context: ResolveContext, nextResolve: ResolveHook): Promise<ResolveResult>;
}


export type ModuleFormat = "builtin" | "commonjs" | "json" | "module" | "wasm";

export interface ModuleFormatContext {
}

export interface ModuleFormatResult {
    format: ModuleFormat;
}

export interface ModuleFormatHook {
    (url: string, context: ModuleFormatContext, nextFormat: ModuleFormatHook): Promise<ModuleFormatResult>
}


export type Source = string | SharedArrayBuffer | Uint8Array;

export interface SourceContext {
    format: ModuleFormat;
}

export interface SourceResult {
    source: Source;
}

export interface SourceHook {
    (url: string, context: SourceContext, nextSource: SourceHook): Promise<SourceResult>;
}


export interface TransformSourceContext {
    format: ModuleFormat;
    url: string;
}

export interface TransformSourceResult {
    source: Source;
}

export interface TransformSourceHook {
    (source: Source, context: TransformSourceContext, nextTransformSource: TransformSourceHook): Promise<TransformSourceResult>
}
