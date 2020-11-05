import {EsmLoaderHook} from "./typings";
import {createEsmLoader} from "./loader/EsmChainingLoader.js";

export const {
    getGlobalPreloadCode,
    resolve,
    getFormat,
    getSource,
    transformSource,
}: EsmLoaderHook = await createEsmLoader({async: true});
