import {EsmLoaderHook} from "./typings";
import {createEsmLoader} from "./loader/EsmChainingLoaderBuilder.js";

process.emitWarning("esm-loader-chaining: --experimental-top-level-await or --harmony-top-level-await must be specified to properly support the getGlobalPreloadCode hook");
export const {
    getGlobalPreloadCode,
    resolve,
    getFormat,
    getSource,
    transformSource,
}: EsmLoaderHook = createEsmLoader({async: false});
