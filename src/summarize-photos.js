import path from "path";
import fs from "fs-extra";
import { globSync } from "glob";
import { yearMonthFormatter } from "./catalog-photos.js";

/**
 * 2024-01-01 to 2024-01, etc...
 */
const sourceFiles = globSync("D:/Pictures/Photos/2024-**-**/*.{jpg,png,jpeg,dng,cr2,tif,mp4}");

for (const sourceFile of sourceFiles) {
    const stats = fs.statSync(sourceFile);
    const folderPath = yearMonthFormatter.format(stats.mtime);

    const targetFolderPath = path.join("D:/Pictures/Photos", folderPath);

    fs.ensureDirSync(targetFolderPath);
    const to = path.join(targetFolderPath, path.basename(sourceFile));

    if (await fs.exists(to)) {
        console.log(`Skipping ${sourceFile} because ${to} already exists`);
    } else {
        console.log(`Moving ${sourceFile} to ${to}`);
        await fs.move(sourceFile, to);
    }
}
