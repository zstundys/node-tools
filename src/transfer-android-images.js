import path from "path";
import fs from "fs-extra";
import { exec } from "child_process";

/** Device id for Pixel 7 Pro */
const DEVICE_ID = "28231FDH3009U9";

/**
 * Requires ADB to be installed and in the Path
 * https://developer.android.com/tools/adb
 * @param {string[]} sourceDirs
 * @param {string} targetDir
 */
export async function transferAndroidImages(sourceDirs, targetDir) {
    console.log("📱 Transferring Android images...");
    await ensureAdbConnection();

    for (const sourceDir of sourceDirs) {
        await pullFiles(sourceDir, targetDir);
    }
}

/**
 * @param {string[]} sourceDirs
 */
export async function removeAndroidImages(sourceDirs) {
    console.log("📱 Removing Android images...");

    for (const sourceDir of sourceDirs) {
        await removeDir(sourceDir);
    }
}

/** @return {Promise<void>} */
function ensureAdbConnection() {
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
function pullFiles(sourceDir, targetDir) {
    console.log(`📱 Pulling files from ${sourceDir} to ${targetDir}...`);

    return new Promise((resolve, reject) => {
        exec(`adb -s ${DEVICE_ID} pull ${sourceDir} ${targetDir}`, (err, stdout, stderr) => {
            if (err) {
                console.error(`📱 Error pulling files: ${err}`);
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

            console.log(`📱 ${files.length} files from ${sourceDir} to ${targetDir} successfully transferred.`);

            resolve();
        });
    });
}

/**
 * @param {string} targetDir
 * @return {Promise<void>}
 */
function removeDir(targetDir) {
    console.log(`📱 Removing files from ${targetDir}...`);

    return new Promise((resolve, reject) => {
        exec(`adb -s ${DEVICE_ID} shell rm -rf ${targetDir}`, (err, stdout, stderr) => {
            if (err) {
                console.error(`📱 Error removing files: ${err}`);
                reject();
                return;
            }

            console.log(stdout);
            resolve();
        });
    });
}
