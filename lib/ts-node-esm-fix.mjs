import url from "url";

// initialize ts-node ESM loader; promise to early initialize
// eslint-disable-next-line no-async-promise-executor
const esmLoader = new Promise(async (resolve, reject) => {
    try {
        resolve(await import("ts-node/esm.mjs"));
    } catch (error) {
        reject(error);
    }
});

// delegate to ts-node ESM loader
export async function resolve(specifier, context, defaultResolve) {
    // resolves change from 'nodejs:' to 'node:'
    if (url.parse(specifier).protocol === null) return defaultResolve(...arguments);
    return (await esmLoader).resolve(...arguments);
}

export async function getFormat() {
    return (await esmLoader).getFormat(...arguments);
}

export async function transformSource() {
    return (await esmLoader).transformSource(...arguments);
}
