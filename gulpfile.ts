import gulp from "gulp";
import gulpclass from "gulpclass";
import typescript, {Project} from "gulp-typescript";
import del from "del";
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


const __dirname = join(dirname(decodeURI(new URL(import.meta.url).pathname))).replace(/^\\([A-Z]:\\)/, "$1");

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


    // grouped tasks

    /**
     * Build project
     */
    @gulpclass.SequenceTask("build")
    public buildTask(): string[] {
        return ["clean", "transpile", "includes:typings"];
    }

    /**
     * Build project and prepare for npm publish
     */
    @gulpclass.SequenceTask("prepack:npm")
    public prepackTask(): string[] {
        return ["build", "includes:docs", "includes:yarn", "package:npm"];
    }

    /**
     * Build project and prepare for npm publish on the GitHub registry
     */
    @gulpclass.SequenceTask("prepack:github")
    public prepackGithubTask(): string[] {
        return ["build", "includes:docs", "includes:yarn", "package:github", "yarn:install"];
    }


    // individual tasks

    @gulpclass.Task("verify:version")
    public verifyVersionTask(): Promise<unknown> {
        // read --tag argument
        const lastArg: string | undefined = process.argv.filter((arg: string) => arg.startsWith("--tag="))?.[0];
        if (typeof lastArg === "undefined") {
            throw new Error(`no passed tag to verify`);
        }

        // validate tag is in the form of '--tag=refs/tags/v...'
        const versionTag: string | undefined = lastArg.match(/^--tag=refs\/tags\/v(.+)$/)?.[1];
        if (typeof versionTag === "undefined") {
            throw new Error(`passed tag is not in the form of '--tag=refs/tags/v...': ${lastArg}`);
        }


        // source: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
        const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

        // verify semver compliance of passed tag
        if (versionTag.match(semverRegex) === null) {
            throw new Error(`passed tag is not semver compliant: ${versionTag}`);
        }

        // read package.json
        const packageVersion: string = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"))["version"];
        // verify semver compliance of version
        if (packageVersion.match(semverRegex) === null) {
            throw new Error(`package.json version is not semver compliant: ${packageVersion}`);
        }

        // verify tags match
        if (versionTag !== packageVersion) {
            throw new Error(`passed tag (${versionTag}) and package.json version (${packageVersion}) do not match`);
        }

        return Promise.resolve();
    }

    /**
     * Delete {@link target} directory
     */
    @gulpclass.Task("clean")
    public cleanTask(): Promise<unknown> {
        return del(this.target);
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
     * Copy module typings to distributed files
     */
    @gulpclass.Task("includes:typings")
    public includeTypingsTask(): unknown {
        return gulp.src(["index.d.ts"], {cwd: this.root})
            // write to target build directory
            .pipe(gulp.dest(this.target));
    }

    /**
     * Copy README.md and LICENSE files to distributed files
     */
    @gulpclass.Task("includes:docs")
    public includeDocsTask(): unknown {
        return gulp.src(["README.md", "LICENSE"], {cwd: __dirname})
            // write to target build directory
            .pipe(gulp.dest(this.target));
    }

    /**
     * Copy .npmignore to {@link #target} directory
     */
    @gulpclass.Task("includes:yarn")
    public includeNpmIgnoreTask(): unknown {
        return gulp.src(["yarn.lock", ".npmignore"], {cwd: __dirname})
            // write to target build directory
            .pipe(gulp.dest(this.target));
    }

    /**
     * Copy stripped package.json to distributed files
     */
    public async packageTask(github: boolean = false): Promise<void> {
        // read package.json
        const packageJson = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8"));

        // preprocess 'name' to have scope
        if (github) {
            const match = /^(?:https:\/\/github\.com\/|git@github\.com:)(?<scope>[^/]+)\/(?<name>[^/]+)\.git$/.exec(packageJson["repository"]);
            if (match == null) throw new TypeError("package.json repository URL does not match github.com");
            packageJson["name"] = `@${match.groups!.scope}/${match.groups!.name}`;
        }

        // delete unnecessary tags
        delete packageJson["scripts"];
        delete packageJson["files"];
        // delete ts-node dependency due to local .tgz install
        delete packageJson["devDependencies"]["ts-node"];

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

    /**
     * Copy stripped package.json to distributed files
     */
    @gulpclass.Task("package:npm")
    public async packageNpmTask(): Promise<void> {
        return this.packageTask(false);
    }

    /**
     * Copy stripped GitHub-scoped package.json to distributed files
     */
    @gulpclass.Task("package:github")
    public packageGithubTask(): Promise<void> {
        return this.packageTask(true);
    }
}
