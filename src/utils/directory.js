import fs from "fs-extra";
import path from "path";

export function isMainModule() {
    return import.meta.url === `file:///${process.argv[1].replaceAll("\\", "/")}`
}

export class DirectoryUtils {
    /**
     * Returns absolute paths to files matching a specific extension
     * @param {string} dir directory containing video files
     * @param {string} ext extension to match against
     * @returns {string[]}
     */
    static readFilesWithExt(dir, ext) {
        return fs
            .readdirSync(dir)
            .map((entry) => path.join(dir, entry))
            .filter((filePath) => {
                const stat = fs.statSync(filePath);
                return stat.isFile() && filePath.endsWith(ext);
            });
    }

    /**
     * Returns absolute paths of folders in a given `dir`
     * @param {string} dir
     */
    static readFolders(dir) {
        return fs
            .readdirSync(dir)
            .map((entry) => path.join(dir, entry))
            .filter((folderPath) => fs.statSync(folderPath).isDirectory());
    }
}
