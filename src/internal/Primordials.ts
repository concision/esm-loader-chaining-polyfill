import {URL} from "url";

// primordials: https://github.com/nodejs/node/blob/master/lib/internal/per_context/primordials.js

const ReflectApply = Reflect.apply;

/**
 * Uncurries the 'this' context to a parameter
 * @param func {Function} function to uncurry
 */
const uncurryThis = <T, A extends unknown[], R>(func: (this: T, ...args: A) => R): ((this: void, thisArg: T, ...args: A) => R) => {
    return (thisArg: T, ...args: A) => ReflectApply(func, thisArg, args);
};

export const ArrayPrototypeJoin = uncurryThis(Array.prototype.join);
export const ArrayPrototypePush = uncurryThis(Array.prototype.push);
export const ArrayPrototypeSplice = uncurryThis(Array.prototype.splice);
export const FunctionPrototypeBind = uncurryThis(Function.prototype.bind);
export const JSONStringify = JSON.stringify;
export const Map = global.Map;
export const MapPrototypeGet = uncurryThis(Map.prototype.get);
export const MapPrototypeHas = uncurryThis(Map.prototype.has);
export const MapPrototypeSet = uncurryThis(Map.prototype.set);
export const ObjectValues = Object.values;
export const PromiseResolve = Promise.resolve;
export const StringPrototypeStartsWith = uncurryThis(String.prototype.startsWith);
export const URLPrototypeToString = uncurryThis(URL.prototype.toString);
