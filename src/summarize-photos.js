import path from "path";
import fs from "fs-extra";
import { glob } from "glob";
import { getDateTaken } from "./catalog-photos.js";
import { ExifTool } from "exiftool-vendored";
import os from "node:os";
import { yearMonthFormatter } from "./utils/format.js";

/**
 * 2024-01-01 to 2024-01, etc...
 */
const sourceFiles = await glob("D:/Pictures/Photos/2024-**/*.{jpg,png,jpeg,dng,cr2,tif,mp4}");
const exiftool = new ExifTool({
    maxProcs: os.cpus().length,
    minDelayBetweenSpawnMillis: 0,
    streamFlushMillis: 10
});


await Promise.all([
    sourceFiles.map(async (sourceFile, index) => {
        const dateTaken = await getDateTaken(exiftool, sourceFile);
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
]).finally(() => {
    exiftool.end();
});
