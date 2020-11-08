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
export const ArrayPrototypePop = uncurryThis(Array.prototype.pop);
export const ArrayPrototypePush = uncurryThis(Array.prototype.push);
export const ArrayPrototypeSplice = uncurryThis(Array.prototype.splice);
export const FunctionPrototypeBind = uncurryThis(Function.prototype.bind);
export const JSONStringify = JSON.stringify;
export const ObjectValues = Object.values;
export const PromiseResolve = Promise.resolve.bind(Promise);
export const StringPrototypeIndexOf = uncurryThis(String.prototype.indexOf);
export const StringPrototypeStartsWith = uncurryThis(String.prototype.startsWith);
export const StringPrototypeSubstring = uncurryThis(String.prototype.substring);
export const URLPrototypeToString = uncurryThis(URL.prototype.toString);
