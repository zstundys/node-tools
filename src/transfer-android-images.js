import path from "path";
import fs from "fs-extra";
import { exec, execSync } from "child_process";

const IDS_BY_DEVICE = {
    PIXEL_7_PRO: "28231FDH3009U9",
    PIXEL_4: "9B011FFAZ007CV",
    ASUS_ZENFONE_10: "R7AIB7005204XXX",
};

const DEVICE_ID_TO_TRANSFER_FROM = IDS_BY_DEVICE.ASUS_ZENFONE_10;
const DEVICE = Object.entries(IDS_BY_DEVICE).find(([, id]) => id === DEVICE_ID_TO_TRANSFER_FROM)?.[0];

/**
 * Requires ADB to be installed and in the Path
 * https://developer.android.com/tools/adb
 * @param {string[]} sourceDirs
 * @param {string} targetDir
 */
export async function transferAndroidImages(sourceDirs, targetDir) {
    console.log(`📱 [${DEVICE}] Transferring Android images...`);
    await ensureAdbConnection();

    for (const sourceDir of sourceDirs) {
        await pullFiles(sourceDir, targetDir);
    }
}

/**
 * @param {string[]} sourceDirs
 */
export async function removeAndroidImages(sourceDirs) {
    console.log(`📱 [${DEVICE}] Removing Android images...`);

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
    console.log(`📱 [${DEVICE}] Pulling files from ${sourceDir} to ${targetDir}...`);

    // Check if the sourceDir exists
    try {
        execSync(`adb -s ${DEVICE_ID_TO_TRANSFER_FROM} shell ls ${sourceDir}`);
    } catch {
        console.error(`📱 [${DEVICE}] Skipping ${sourceDir}`);
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        exec(`adb -s ${DEVICE_ID_TO_TRANSFER_FROM} pull ${sourceDir} ${targetDir}`, (err, stdout, stderr) => {
            if (err) {
                console.error(`📱 [${DEVICE}] Error pulling files from device`);
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
                `📱 [${DEVICE}] ${files.length} files from ${sourceDir} to ${targetDir} successfully transferred.`
            );

            resolve();
        });
    });
}

/**
 * @param {string} targetDir
 * @return {Promise<void>}
 */
function removeDir(targetDir) {
    console.log(`📱 [${DEVICE}] Removing files from ${targetDir}...`);

    return new Promise((resolve, reject) => {
        exec(`adb -s ${DEVICE_ID_TO_TRANSFER_FROM} shell rm -rf ${targetDir}`, (err, stdout, stderr) => {
            if (err) {
                console.error(`📱 [${DEVICE}] Error removing files: ${err}`);
                reject();
                return;
            }

            console.log(stdout);
            resolve();
        });
    });
}
