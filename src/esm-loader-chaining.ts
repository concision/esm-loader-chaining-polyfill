import {
    FormatContext,
    FormatResult,
    ResolveContext,
    ResolveResult,
    Source,
    SourceContext,
    SourceResult,
    TransformSourceContext,
    TransformSourceResult,
} from "./index";


// test top level await
let topLevelAwait = false;
try {
    eval("await Promise.resolve();");
    topLevelAwait = true;
} catch (ignored) {
    process.emitWarning("--experimental-top-level-await or --harmony-top-level-await needs to be specified");
}


export function getGlobalPreloadCode(): string {
    return ``;
}

export async function resolve(specifier: string, context: ResolveContext, nextResolve: typeof resolve): Promise<ResolveResult> {
    return nextResolve(specifier, context, nextResolve);
}

export async function getFormat(url: string, context: FormatContext, nextFormat: typeof getFormat): Promise<FormatResult> {
    return await nextFormat(url, context, nextFormat);
}

export async function getSource(url: string, context: SourceContext, nextSource: typeof getSource): Promise<SourceResult> {
    return await nextSource(url, context, nextSource);
}

export async function transformSource(source: Source, context: TransformSourceContext, nextTransformSource: typeof transformSource): Promise<TransformSourceResult> {
    return await nextTransformSource(source, context, nextTransformSource);
}
