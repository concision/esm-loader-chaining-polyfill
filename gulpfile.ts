import {Gulpclass} from "gulpclass";
import path from "path";
import typescript, {Project} from "gulp-typescript";

@Gulpclass()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Gulpfile {
    // TypeScript project definitions

    /**
     * TypeScript runtime project configuration
     */
    private readonly project: Project = typescript.createProject(path.resolve(__dirname, "tsconfig.json"));

    /**
     * Root source directory
     * @private
     */
    private readonly root: string = path.resolve(__dirname, this.project.config.compilerOptions.rootDir);
    /**
     * Targeted output directory
     */
    private readonly target: string = path.resolve(__dirname, this.project.config.compilerOptions.outDir);
}
