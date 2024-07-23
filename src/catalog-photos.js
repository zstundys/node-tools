import fs from "fs-extra";
import path from "path";
import { groupBy } from "lodash-es";
import inquirer from "inquirer";
import exifr from "exifr";
import { exiftool } from "exiftool-vendored";

const SOURCE_DIR = path.join(import.meta.dirname, "./output/keep-raw/images");
const TARGET_DIR = "D:\\Pictures\\Photos";

/**
 *  Groups files by date and moves them to the Photos catalog
 */
export async function catalogPhotos() {
    const mediaByFolder = Object.entries(await groupFilesByDateMonth(SOURCE_DIR));
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
        console.log(`No files found in "${SOURCE_DIR}" folder.`);
        return;
    }

    console.log(`About to catalog ${totalFilesCount} files...`);
    console.log(JSON.stringify(debugMediaByFolder, null, 2));

    const { catalogConfirm } = await inquirer.prompt([
        {
            type: "confirm",
            name: "catalogConfirm",
            message: `Catalog ${totalFilesCount} files to "${TARGET_DIR}"?`,
            default: true,
        },
    ]);

    if (!catalogConfirm) {
        console.log("Catalog canceled.");
        return;
    }

    //  Transfer files to target folders
    let skipCount = 0;
    for (const [targetFolderPath, files] of mediaByFolder) {
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

/**  Format date as YYYY-MM ("2024-01") using Intl */
export const yearMonthFormatter = new Intl.DateTimeFormat("lt-LT", {
    year: "numeric",
    month: "2-digit",
});

/**
 * Takes in a folder containing a set of images/videos, and generates a tree structure of files
 * @param {string} folderPath
 */
async function groupFilesByDateMonth(folderPath) {
    const filesWithStats = await fs.readdir(folderPath).then((fileNames) => {
        const mediaFileNames = fileNames.filter((fileName) => /\.(dng|jpg|mp4)$/i.test(fileName));

        return Promise.all(
            mediaFileNames.map(async (fileName) => {
                const filePath = path.join(folderPath, fileName);
                return {
                    path: filePath,
                    createdAt: await getDateTaken(filePath),
                };
            })
        );
    });

    const grouped = groupBy(filesWithStats, (file) => path.join(TARGET_DIR, yearMonthFormatter.format(file.createdAt)));

    return grouped;
}

/**
 * @param {string} filePath
 */
export async function getDateTaken(filePath) {
    const exifStats = await exiftool.read(filePath);
    const exifDate = exifStats.DateTimeOriginal || exifStats.CreateDate || exifStats.ModifyDate;

    if (exifDate === undefined) {
        return fs.stat(filePath).then((fsStats) => fsStats.ctime);
    }

    if (typeof exifDate === "string") {
        return new Date(exifDate);
    }

    return exifDate.toDate();
}
