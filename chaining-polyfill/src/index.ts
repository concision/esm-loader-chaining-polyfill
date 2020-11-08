import {EsmLoaderHook} from "@esm-loaders/types";
import {createEsmLoader} from "./loader/EsmChainingLoaderBuilder.js";

export const {
    getGlobalPreloadCode,
    resolve,
    getFormat,
    getSource,
    transformSource,
}: EsmLoaderHook = await createEsmLoader({async: true});
