import gulp from "gulp";
import gulpclass from "gulpclass";
import typescript, {Project} from "gulp-typescript";
import del from "del";
import run from "gulp-run";
import {dirname, join, resolve} from "path";
import {readFileSync, writeFileSync} from "fs";
import File from "vinyl";
import sourcemaps from "gulp-sourcemaps";
import {URL} from "url";

declare module "gulp-sourcemaps" {
    export interface WriteOptions {
        sourceMappingURL?(file: File): string;
    }
}

const __root_dirname = join(dirname(decodeURI(new URL(import.meta.url).pathname))).replace(/^\\([A-Z]:\\)/, "$1");
const __project_dirname = process.cwd();

@gulpclass.Gulpclass()
export class Gulpfile {
    // TypeScript project definitions

    /**
     * TypeScript runtime project configuration
     * @private
     */
    private readonly project: Project = typescript.createProject(resolve(__project_dirname, "tsconfig.json"));

    /**
     * Root source directory
     * @private
     */
    private readonly root: string = resolve(__project_dirname, this.project.config.compilerOptions.rootDir);
    /**
     * Targeted output directory
     * @private
     */
    private readonly target: string = resolve(__project_dirname, this.project.config.compilerOptions.outDir);


    // grouped tasks

    /**
     * Build project without linting
     */
    @gulpclass.SequenceTask("build:dev")
    public buildDevTask(): string[] {
        return ["clean", "transpile", "includes:typings"];
    }

    /**
     * Build project
     */
    @gulpclass.SequenceTask("build")
    public buildTask(): string[] {
        return ["clean", "lint", "transpile", "includes:typings"];
    }

    /**
     * Build project and prepare for npm publish
     */
    @gulpclass.SequenceTask("prepack")
    public prepackTask(): string[] {
        return ["build", "includes:docs", "package"];
    }


    // individual tasks

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
        return run("yarn run lint", {cwd: __project_dirname, verbosity: 3}).exec();
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
        ]
            // exclude gulpfile.ts
            .filter(source => !source.includes("gulpfile.ts"));

        return gulp.src(sources, {allowEmpty: true, base: this.root})
            .pipe(sourcemaps.init({loadMaps: true}))
            // transpile TypeScript sources
            .pipe(this.project())
            .pipe(sourcemaps.write(this.target, {
                addComment: true,
                includeContent: false,
                sourceMappingURL: (file: File) => `${file.basename}.map`,
            }))
            // write to target build directory
            .pipe(gulp.dest(this.target));
    }

    /**
     * Copy README.md and LICENSE files to distributed files
     */
    @gulpclass.Task("includes:docs")
    public includeTask(): unknown {
        return Promise.all([
            gulp.src(["README.md"], {cwd: __project_dirname, allowEmpty: true})
                // write to target build directory
                .pipe(gulp.dest(this.target)),
            gulp.src(["LICENSE"], {cwd: resolve(__project_dirname, "..")})
                // write to target build directory
                .pipe(gulp.dest(this.target)),
        ]);
    }

    /**
     * Copy module typings to distributed files
     */
    @gulpclass.Task("includes:typings")
    public includeTypingsTask(): unknown {
        return gulp.src(["**/index.d.ts"], {cwd: this.root})
            // write to target build directory
            .pipe(gulp.dest(this.target));
    }

    /**
     * Copy stripped package.json to distributed files
     */
    @gulpclass.Task("package")
    public async packageTask(): Promise<void> {
        // read package.json
        const packageJson = JSON.parse(readFileSync(resolve(__project_dirname, "package.json"), "utf8"));

        // delete unnecessary tags
        delete packageJson["scripts"];

        // set peer dependency on '@esm-loaders/types'
        const typesPackageJson = JSON.parse(readFileSync(resolve(__root_dirname, "package.json"), "utf8"));
        (packageJson["peerDependencies"] ??= {})["@esm-loaders/types"] = `^${typesPackageJson["version"]}`;

        // update @esm-loaders/types' version in dev dependencies
        packageJson["devDependencies"]["@esm-loaders/types"] = `^${typesPackageJson["version"]}`;

        // relink 'dist' references
        packageJson["main"] = packageJson["main"]?.replace("dist/", "");
        packageJson["typings"] = packageJson["typings"]?.replace("dist/", "");
        const exports = packageJson["exports"];
        if (exports) {
            for (const exportKey of Object.keys(exports)) {
                exports[exportKey] = exports[exportKey].replace("dist/", "");
            }
        }

        // write package.json
        writeFileSync(
            resolve(this.target, "package.json"),
            JSON.stringify(packageJson, null, "  "),
        );
    }
}
