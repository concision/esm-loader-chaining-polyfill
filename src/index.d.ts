// source: https://stackoverflow.com/a/63790089
export type RemoveLastElement<T extends any[]> = T extends [ ...infer H, any ] ? H : any[];
export type RemovedTailParameter<T extends (...args: any) => any> = (...args: RemoveLastElement<Parameters<T>>) => ReturnType<T>;


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
    (specifier: string, context: ResolveContext, nextResolve: RemovedTailParameter<ResolveHook>): Promise<ResolveResult>;
}


export type ModuleFormat = "builtin" | "commonjs" | "json" | "module" | "wasm";

export interface ModuleFormatContext {
}

export interface ModuleFormatResult {
    format: ModuleFormat;
}

export interface ModuleFormatHook {
    (url: string, context: ModuleFormatContext, nextFormat: RemovedTailParameter<ModuleFormatHook>): Promise<ModuleFormatResult>
}


export type Source = string | SharedArrayBuffer | Uint8Array;

export interface SourceContext {
    format: ModuleFormat;
}

export interface SourceResult {
    source: Source;
}

export interface SourceHook {
    (url: string, context: SourceContext, nextSource: RemovedTailParameter<SourceHook>): Promise<SourceResult>;
}


export interface TransformSourceContext {
    format: ModuleFormat;
    url: string;
}

export interface TransformSourceResult {
    source: Source;
}

export interface TransformSourceHook {
    (source: Source, context: TransformSourceContext, nextTransformSource: RemovedTailParameter<TransformSourceHook>): Promise<TransformSourceResult>
}
