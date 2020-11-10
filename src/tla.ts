import {EsmLoaderHook} from "./";
import {createEsmLoader} from "./loader/EsmChainingLoaderBuilder.js";

export const {
    getGlobalPreloadCode,
    resolve,
    getFormat,
    getSource,
    transformSource,
}: EsmLoaderHook = await createEsmLoader({async: true});
