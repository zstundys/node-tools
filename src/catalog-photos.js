import { ExifTool } from "exiftool-vendored";
import fs from "fs-extra";
import inquirer from "inquirer";
import { groupBy } from "lodash-es";
import path from "node:path";
import { glob } from 'node:fs/promises'
import { yearMonthFormatter } from "./utils/format.js";
import os from "node:os";
import { isMainModule } from "./utils/directory.js";

const SOURCE_DIR = 'E:\\Pictures\\Photos\\Imported';
const TARGET_DIR = "E:\\Pictures\\Photos";

if (isMainModule()) {
    console.log(`Cataloging photos from "${SOURCE_DIR}" to "${TARGET_DIR}"...`);
    await catalogPhotos(SOURCE_DIR, TARGET_DIR);
}

/**
 *  Groups files by date and moves them to the Photos catalog
 */
/**
 * Groups files by date and moves them to the Photos catalog
 * @param {string} sourceDir
 * @param {string} targetDir
 */
export async function catalogPhotos(sourceDir, targetDir) {
    const mediaByFolder = Object.entries(await groupFilesByDateMonth(sourceDir, targetDir));
    const debugMediaByFolder = Object.fromEntries(
        mediaByFolder.map(([folderPath, files]) => {
            /** @example ['#.jpg', '#.mp4', '#.dng'] */
            const fileNames = files.map((f) => path.basename(f.path));
            /** @example { jpg: ['#.jpg'], mp4: ['#.mp4'], dng: ['#.dng'] }  */
            const filesByExtension = groupBy(fileNames, (fileName) => path.extname(fileName).toLowerCase().slice(1));
            /** @example { jpg: '5 files', mp4: '2 files', dng: '3 files'}  */
            const fileGroups = Object.fromEntries(
                Object.entries(filesByExtension).map(([ext, files]) => [ext, `${files.length} files`])
            );

            return [folderPath, fileGroups];
        })
    );
    const totalFilesCount = mediaByFolder.reduce((acc, [, files]) => acc + files.length, 0);

    if (totalFilesCount === 0) {
        console.log(`No files found in "${sourceDir}" folder.`);
        return;
    }

    console.log(`About to catalog ${totalFilesCount} files...`);
    console.log(JSON.stringify(debugMediaByFolder, null, 2));

    const { catalogConfirm } = await inquirer.prompt([
        {
            type: "confirm",
            name: "catalogConfirm",
            message: `Catalog ${totalFilesCount} files to "${targetDir}"?`,
            default: true,
        },
    ]);

    if (!catalogConfirm) {
        console.log("Catalog canceled.");
        return;
    }

    //  Transfer files to target folders
    let skipCount = 0;
    for (const [folderPath, files] of mediaByFolder) {
        const targetFolderPath = folderPath;
        await fs.ensureDir(targetFolderPath);

        for (const file of files) {
            const from = file.path;
            const to = path.join(targetFolderPath, path.basename(file.path));

            if (await fs.exists(to)) {
                skipCount++;
                console.log(`Skipping ${from} because ${to} already exists`);
            } else {
                await fs.move(from, to);
            }
        }
    }

    console.log(`Files cataloged successfully. Total: ${totalFilesCount - skipCount}. Skipped: ${skipCount}`);
}

/**
 * Takes in a folder containing a set of images/videos, and generates a tree structure of files
 * @param {string} folderPath
 * @param {string} targetDir
 */
async function groupFilesByDateMonth(folderPath, targetDir) {
    // Use glob to find all media files recursively, case-insensitively.
    const mediaFilePaths = glob(`${folderPath}/**/*.{dng,jpg,mp4,jpeg,mov,avi,mpg,heic}`, {});
    const filePaths = [];
    for await (const filePath of mediaFilePaths) {
        filePaths.push(filePath);
    }

    // Limit concurrency for exiftool to avoid overwhelming the system
    const CONCURRENCY = 500;
    const filesWithStats = [];
    let idx = 0;

    /**
     * @param {string[]} batch
     */
    async function processBatch(batch) {
        const exiftool = new ExifTool({
            maxProcs: os.cpus().length,
            minDelayBetweenSpawnMillis: 0,
            streamFlushMillis: 10
        });

        return Promise.all(
            batch.map(async (filePath) => {
                // Remove or comment out the log for speed
                console.log(`Processing file: ${filePath}`);
                return {
                    path: filePath,
                    createdAt: await getDateTaken(exiftool, filePath),
                };
            })
        ).finally(() => {
            exiftool.end();
        });
    }

    while (idx < filePaths.length) {
        const batch = filePaths.slice(idx, idx + CONCURRENCY);
        const batchResults = await processBatch(batch);
        filesWithStats.push(...batchResults);
        idx += CONCURRENCY;

    }

    const grouped = groupBy(filesWithStats, (file) => path.join(targetDir, yearMonthFormatter.format(file.createdAt)));

    return grouped;
}

/**
 * @param {ExifTool} exiftool
 * @param {string} filePath
 */
export async function getDateTaken(exiftool, filePath) {
    const exifStats = await exiftool.read(filePath);
    const exifDate = exifStats.DateTimeOriginal || exifStats.CreateDate || exifStats.ModifyDate;

    if (exifDate === undefined) {
        return fs.stat(filePath).then((fsStats) => fsStats.ctime);
    }

    let dateTaken;
    if (typeof exifDate === "string") {
        dateTaken = new Date(exifDate);
    } else if (exifDate && typeof exifDate.toDate === "function") {
        dateTaken = exifDate.toDate();
    } else {
        dateTaken = exifDate;
    }

    // Debugger for invalid date
    if (!(dateTaken instanceof Date) || isNaN(dateTaken.getTime())) {
        dateTaken = await fs.stat(filePath).then((fsStats) => fsStats.ctime);
    }

    if (!(dateTaken instanceof Date) || isNaN(dateTaken.getTime())) {
        debugger;
        throw new Error(`Invalid date taken for file: ${filePath}`);
    }



    return dateTaken;
}
