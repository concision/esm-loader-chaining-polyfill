export function getGlobalPreloadCode(): string;


export interface ResolveContext {
    conditions: string[];
    parentURL: string;
}

export interface ResolveResult {
    url: string;
}

export function resolve(specifier: string, context: ResolveContext, nextResolve: typeof resolve): Promise<ResolveResult>;


export type Format = "builtin" | "commonjs" | "json" | "module" | "wasm";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FormatContext {
}

export interface FormatResult {
    format: Format;
}

export function getFormat(url: string, context: FormatContext, nextFormat: typeof getFormat): Promise<FormatResult>;


export type Source = string | SharedArrayBuffer | Uint8Array;

export interface SourceContext {
    format: Format;
}

export interface SourceResult {
    source: Source;
}

export function getSource(url: string, context: SourceContext, nextSource: typeof getSource): Promise<SourceResult>;


export interface TransformSourceContext {
    format: Format;
    url: string;
}

export interface TransformSourceResult {
    source: Source;
}

export function transformSource(source: Source, context: TransformSourceContext, nextTransformSource: typeof transformSource): Promise<TransformSourceResult>;
