export interface NodeError<E extends string> {
    code: E;
}

/**
 * Source: https://github.com/nodejs/node/blob/9c1c17a84168c5742084c34ac3395ca38bc182eb/lib/internal/errors.js#L1166-L1175
 */
export class ERR_INVALID_RETURN_VALUE extends TypeError implements NodeError<"ERR_INVALID_RETURN_VALUE"> {
    public readonly code: "ERR_INVALID_RETURN_VALUE";

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
    constructor(input: string, name: string, value: any) {
        let type;
        if (value?.constructor?.name) {
            type = `instance of ${value.constructor.name}`;
        } else {
            type = `type ${typeof value}`;
        }
        super(`Expected ${input} to be returned from the "${name}" function but got ${type}.`);

        this.code = "ERR_INVALID_RETURN_VALUE";
    }
}
