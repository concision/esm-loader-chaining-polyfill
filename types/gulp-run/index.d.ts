declare module "gulp-run" {
    declare namespace GulpRun {
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

    declare const run: {
        (
            template: string,
            options?: GulpRun.Options,
        ): GulpRun.GulpCommand;
    };

    export = run;
}
