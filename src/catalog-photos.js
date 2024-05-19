import fs from "fs-extra";
import path from "path";
import { groupBy } from "lodash-es";
import inquirer from "inquirer";

const SOURCE_DIR = path.join(import.meta.dirname, "./output/keep-raw/images");
const TARGET_DIR = "D:\\Pictures\\Photos";

/**
 *  Groups files by date and moves them to the Photos catalog
 */
export async function catalogPhotos() {
    const mediaByFolder = Object.entries(await groupFilesByDateMonth(SOURCE_DIR));
    const debugMediaByFolder = Object.fromEntries(
        mediaByFolder.map(([folderPath, files]) => [folderPath, files.map((f) => path.basename(f.path))])
    );
    const totalFiles = mediaByFolder.reduce((acc, [, files]) => acc + files.length, 0);

    if (totalFiles === 0) {
        console.log(`No files found in "${SOURCE_DIR}" folder.`);
        return;
    }

    console.log(`About to catalog ${totalFiles} files...`);
    console.log(JSON.stringify(debugMediaByFolder, null, 2));

    const { catalogConfirm } = await inquirer.prompt([
        {
            type: "confirm",
            name: "catalogConfirm",
            message: `Catalog ${totalFiles} files to "${TARGET_DIR}"?`,
            default: true,
        },
    ]);

    if (!catalogConfirm) {
        console.log("Catalog canceled.");
        return;
    }

    //  Transfer files to target folders
    for (const [targetFolderPath, files] of mediaByFolder) {
        await fs.ensureDir(targetFolderPath);

        for (const file of files) {
            const from = file.path;
            const to = path.join(targetFolderPath, path.basename(file.path));

            await fs.move(from, to);
        }
    }

    console.log(`Files cataloged successfully. Total: ${totalFiles}`);
}

//  Format date as YYYY-MM using Intl
const yearMonthFormatter = new Intl.DateTimeFormat("lt-LT", {
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
                return { path: filePath, stats: await fs.stat(filePath) };
            })
        );
    });

    const grouped = groupBy(filesWithStats, (file) =>
        path.join(TARGET_DIR, yearMonthFormatter.format(file.stats.mtime))
    );

    return grouped;
}
