import gulp from "gulp";
import gulpclass from "gulpclass";
import typescript, {Project} from "gulp-typescript";
import del from "del";
import run from "gulp-run";
import path, {resolve, parse} from "path";
import {readFileSync, writeFileSync} from "fs";
import {URL} from "url";
import map, {StreamMapperCallback} from "map-stream";
import File from "vinyl";

// source: https://stackoverflow.com/a/53582084
const __dirname = path.join(path.dirname(decodeURI(new URL(import.meta.url).pathname))).replace(/^\\([A-Z]:\\)/, "$1");

@gulpclass.Gulpclass()
export class Gulpfile {
    // TypeScript project definitions

    /**
     * TypeScript runtime project configuration
     * @private
     */
    private readonly project: Project = typescript.createProject(resolve(__dirname, "tsconfig.json"));

    /**
     * Root source directory
     * @private
     */
    private readonly root: string = resolve(__dirname, this.project.config.compilerOptions.rootDir);
    /**
     * Targeted output directory
     * @private
     */
    private readonly target: string = resolve(__dirname, this.project.config.compilerOptions.outDir);


    // tasks

    /**
     * Build project without linting
     */
    @gulpclass.SequenceTask("build:dev")
    public buildDevTask(): string[] {
        return ["clean", "transpile", "includes", "package"];
    }

    /**
     * Build project
     */
    @gulpclass.SequenceTask("build")
    public buildTask(): string[] {
        return ["clean", "lint", "transpile", "includes", "package"];
    }

    /**
     * Delete {@link target} directory
     */
    @gulpclass.Task("clean")
    public cleanTask(): Promise<unknown> {
        return del(this.target);
    }

    /**
     * Lint source files
     */
    @gulpclass.Task("lint")
    public lintTask(): void {
        return run("yarn run lint", {cwd: __dirname, verbosity: 3}).exec();
    }

    /**
     * Transpile TypeScript project sources
     */
    @gulpclass.Task("transpile")
    public transpileTask(): unknown {
        const sources: string[] = [
            // included files, if specified
            ...(this.project.config.files ?? []),
            // included file globs, if specified
            ...(this.project.config.include ?? []),
            // blacklist excluded globs, if specified; map to negated glob filter
            ...(this.project.config.exclude?.map((pattern: string) => `!${pattern}`) ?? []),
        ].filter(source => source != "gulpfile.ts");

        return gulp.src(sources, {allowEmpty: true, base: this.root})
            // transpile TypeScript sources
            .pipe(this.project())
            // rewrite extensions to .mjs on ESM loaders
            .pipe(map((file: File, callback: StreamMapperCallback<File>) => {
                // if the file is in the base directory, it must be an ESM loader
                if (file.base === file.dirname) {
                    // change file extension to .mjs
                    file.basename = `${parse(file.basename).name}.mjs`;
                }
                callback(null, file)
            }))
            // write to target build directory
            .pipe(gulp.dest(this.target));
    }

    /**
     * Copy other files to distributed files
     */
    @gulpclass.Task("includes")
    public includeTask(): unknown {
        return Promise.all([
            // add README.md and LICENSE
            gulp.src(["README.md", "LICENSE"], {base: __dirname})
                // write to target build directory
                .pipe(gulp.dest(this.target)),
            // add module typings
            gulp.src(["**/typings/index.d.ts"], {base: resolve(this.root, "typings")})
                // write to target build directory
                .pipe(gulp.dest(this.target)),
        ]);
    }

    /**
     * Copy stripped package.json to distributed files
     */
    @gulpclass.Task("package")
    public async packageTask(): Promise<void> {
        // read package.json
        const packageJson = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));

        // delete unnecessary tags
        delete packageJson["scripts"];
        delete packageJson["devDependencies"];

        // write package.json
        writeFileSync(
            resolve(this.target, "package.json"),
            JSON.stringify(packageJson, null, "  "),
        );
    }
}
