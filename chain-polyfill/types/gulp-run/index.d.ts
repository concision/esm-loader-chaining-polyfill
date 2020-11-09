declare module "gulp-run" {
    import {GulpCommand, Options} from "gulp-run";

    declare namespace run {
        export interface Options {
            readonly env?: Record<string, unknown>;
            readonly cwd?: string;
            readonly silent?: boolean;
            readonly verbosity?: number;
            readonly usePowerShell?: boolean;
        }

        export interface GulpCommand {
            exec(stdin?: string | Buffer, callback?: () => unknown);
        }
    }

    declare function run(template: string, options?: Options): GulpCommand;

    export = run;
}
