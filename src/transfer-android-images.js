import path from "path";
import fs from "fs-extra";
import { exec, execSync } from "child_process";

export class AndroidImagesMover {
    static IDS_BY_DEVICE = {
        PIXEL_7_PRO: "28231FDH3009U9",
        PIXEL_4: "9B011FFAZ007CV",
        ASUS_ZENFONE_10: "R7AIB7005204XXX",
    };

    /**
     * @param {keyof typeof AndroidImagesMover['IDS_BY_DEVICE']} targetDevice
     */
    constructor(targetDevice) {
        this.device = targetDevice;
    }

    get deviceId() {
        return AndroidImagesMover.IDS_BY_DEVICE[this.device];
    }

    /**
     * Requires ADB to be installed and in the Path
     * https://developer.android.com/tools/adb
     * @param {string[]} sourceDirs
     * @param {string} targetDir
     */
    async transferImages(sourceDirs, targetDir) {
        console.log(`📱 [${this.device}] Transferring Android images...`);
        await this.#ensureAdbConnection();

        for (const sourceDir of sourceDirs) {
            await this.#pullFiles(sourceDir, targetDir);
        }
    }

    /**
     * @param {string[]} sourceDirs
     */
    async removeImages(sourceDirs) {
        console.log(`📱 [${this.device}] Removing Android images...`);

        for (const sourceDir of sourceDirs) {
            await this.#removeDir(sourceDir);
        }
    }

    /** @return {Promise<void>} */
    #ensureAdbConnection() {
        return new Promise((resolve, reject) => {
            exec("adb devices -l", (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error listing devices: ${err}`);
                    reject(err);
                    return;
                }

                console.log(stdout);
                resolve();
            });
        });
    }

    /**
     * @param {string} sourceDir
     * @param {string} targetDir
     * @return {Promise<void>}
     */
    #pullFiles(sourceDir, targetDir) {
        console.log(`📱 [${this.device}] Pulling files from ${sourceDir} to ${targetDir}...`);

        // Check if the sourceDir exists
        try {
            execSync(`adb -s ${this.deviceId} shell ls ${sourceDir}`);
        } catch {
            console.error(`📱 [${this.device}] Skipping ${sourceDir}`);
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            exec(`adb -s ${this.deviceId} pull ${sourceDir} ${targetDir}`, (err, stdout, stderr) => {
                if (err) {
                    console.error(`📱 [${this.device}] Error pulling files from device`);
                    console.error(err);
                    reject();
                    return;
                }

                console.log(stdout);

                // Flattening the folder structure to the targetDir

                const sourceFolderName = path.basename(sourceDir);
                const folderWithFiles = path.resolve(targetDir, sourceFolderName);

                const files = fs.readdirSync(folderWithFiles);
                files.forEach((file) => {
                    const from = path.resolve(folderWithFiles, file);
                    const to = path.resolve(targetDir, file);

                    fs.moveSync(from, to, { overwrite: true });
                });

                fs.rmdirSync(folderWithFiles);

                console.log(
                    `📱 [${this.device}] ${files.length} files from ${sourceDir} to ${targetDir} successfully transferred.`
                );

                resolve();
            });
        });
    }

    /**
     * @param {string} targetDir
     * @return {Promise<void>}
     */
    #removeDir(targetDir) {
        console.log(`📱 [${this.device}] Removing files from ${targetDir}...`);

        return new Promise((resolve, reject) => {
            exec(`adb -s ${this.deviceId} shell rm -rf ${targetDir}`, (err, stdout, stderr) => {
                if (err) {
                    console.error(`📱 [${this.device}] Error removing files: ${err}`);
                    reject();
                    return;
                }

                console.log(stdout);
                resolve();
            });
        });
    }
}
