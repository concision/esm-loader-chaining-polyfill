// primordials: https://github.com/nodejs/node/blob/master/lib/internal/per_context/primordials.js

const ReflectApply = Reflect.apply;

/**
 * Uncurries the 'this' context to a parameter
 * @param func {Function} function to uncurry
 */
const uncurryThis = <T, A extends any[], R>(func: (this: T, ...args: A) => R): ((this: void, thisArg: T, ...args: A) => R) => {
    return (thisArg: T, ...args: A) => ReflectApply(func, thisArg, args);
};

export const ArrayPrototypeJoin = uncurryThis(Array.prototype.join);
export const ArrayPrototypePush = uncurryThis(Array.prototype.push);
export const JSONStringify = JSON.stringify;
export const FunctionPrototypeBind = uncurryThis(Function.prototype.bind);
