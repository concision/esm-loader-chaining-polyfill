import {EsmLoaderHook} from "@esm-loaders/types";
import {createEsmLoader} from "./loader/EsmChainingLoaderBuilder.js";

process.emitWarning(
    "esm-loader-chaining/no-tla: --experimental-top-level-await or --harmony-top-level-await must be specified" +
    " with the default 'esm-loader-chaining' ESM chaining loader to fully support the getGlobalPreloadCode hook." +
    " Otherwise, only CommonJS ESM loaders will have their getGlobalPreloadCode hook supported.",
);

export const {
    getGlobalPreloadCode,
    resolve,
    getFormat,
    getSource,
    transformSource,
}: EsmLoaderHook = createEsmLoader({async: false});
