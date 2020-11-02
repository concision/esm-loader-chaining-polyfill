import path from "path";
import {Gulpclass, Task} from "gulpclass";
import typescript, {Project} from "gulp-typescript";
import del from "del";

@Gulpclass()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Gulpfile {
    // TypeScript project definitions

    /**
     * TypeScript runtime project configuration
     * @private
     */
    private readonly project: Project = typescript.createProject(path.resolve(__dirname, "tsconfig.json"));

    /**
     * Root source directory
     * @private
     */
    private readonly root: string = path.resolve(__dirname, this.project.config.compilerOptions.rootDir);
    /**
     * Targeted output directory
     * @private
     */
    private readonly target: string = path.resolve(__dirname, this.project.config.compilerOptions.outDir);


    /**
     * Delete {@link target} directory
     */
    @Task("clean")
    public cleanTask(): Promise<unknown> {
        return del(this.target);
    }
}
