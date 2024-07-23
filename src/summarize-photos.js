import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import { getDateTaken, yearMonthFormatter } from "./catalog-photos.js";

/**
 * 2024-01-01 to 2024-01, etc...
 */
const sourceFiles = await glob("D:/Pictures/Photos/2024-**/*.{jpg,png,jpeg,dng,cr2,tif,mp4}");

await Promise.all([
    sourceFiles.map(async (sourceFile, index) => {
        const dateTaken = await getDateTaken(sourceFile);
        const folderPath = yearMonthFormatter.format(dateTaken);

        const targetFolderPath = path.join("D:/Pictures/Photos", folderPath);

        await fs.ensureDir(targetFolderPath);
        const to = path.join(targetFolderPath, path.basename(sourceFile));

        const logPercentPrefix = `${Math.round((index / sourceFiles.length) * 100)}%`;

        if (await fs.exists(to)) {
            console.log(`${logPercentPrefix} Skipping ${sourceFile} because ${to} already exists`);
        } else {
            console.log(`${logPercentPrefix} Moving ${sourceFile} to ${to}`);
            await fs.move(sourceFile, to);
        }
    }),
]);
