/**
 * This is a tool designed for personal use.
 * It's meant to de-duplicate taken pictures that were taken in RAW+JPEG format from a Google Pixel 4 phone.
 *
 * @example
 * npm run keep-raw
 */

const fs = require("fs-extra");
const path = require("path");

const IMAGES_DIR = path.relative("./", "./images");
const DUPLICATES_DIR = path.relative("./", "./duplicates");

const jpegFiles = readJpegFiles();

console.log(`Found ${jpegFiles.length} JPEG files in "${IMAGES_DIR}" folder...`);

const jpegFilesWithDng = filterDuplicates(jpegFiles);

if (jpegFilesWithDng.length) {
    console.log(`Moving ${jpegFilesWithDng.length} JPEG files to "${DUPLICATES_DIR}" folder...`);

    moveFilesToDuplicatesFolder(jpegFilesWithDng);
} else {
    console.log(`No JPEG files found that have RAW images.`);
}

console.log(`Done`);

/**
 * Moves given image files from `images` folder to files to `duplicates` folder
 * @param {string[]} movedFileNames
 */
function moveFilesToDuplicatesFolder(movedFileNames) {
    movedFileNames.forEach((movedFileName) => {
        const src = path.resolve(IMAGES_DIR, movedFileName);
        const dest = path.resolve(DUPLICATES_DIR, movedFileName);

        console.log(src, "👉", dest);

        fs.moveSync(src, dest);
    });
}

/**
 * Filters only those JPEG files that have duplicate RAW files
 * @param {string[]} jpegFileNames
 * @returns {string[]}
 */
function filterDuplicates(jpegFileNames) {
    return jpegFileNames.filter((jpegFileName) => {
        const nameOnly = jpegFileName.replace(/\.jpg$/i, "");
        const existsLower = fs.existsSync(path.resolve(IMAGES_DIR, `${nameOnly}.dng`));
        const existsUpper = fs.existsSync(path.resolve(IMAGES_DIR, `${nameOnly}.DNG`));

        return existsLower || existsUpper;
    });
}

/**
 * Gets all JPEG files from `images` folder
 * @returns {string[]}
 */
function readJpegFiles() {
    const files = fs.readdirSync(IMAGES_DIR);
    const jpegFiles = files.filter((fileName) => fileName.toLowerCase().endsWith(".jpg"));
    return jpegFiles;
}
