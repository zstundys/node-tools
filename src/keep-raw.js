/**
 * This is a tool designed for personal use.
 * It's meant to de-duplicate taken pictures that were taken in RAW+JPEG format from a Google Pixel 4 phone.
 *
 * @example
 * npm run keep-raw
 */

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { transferAndroidImages, removeAndroidImages } from "./transfer-android-images.js";
import inquirer from "inquirer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PHONE_PHOTOS_SOURCE_DIRS = ["/sdcard/DCIM/Camera", "/sdcard/Pictures/Raw"];
const IMAGES_DIR = path.join(__dirname, "./output/keep-raw/images");
const DUPLICATES_DIR = path.join(__dirname, "./output/keep-raw/duplicates");

await transferAndroidImages(PHONE_PHOTOS_SOURCE_DIRS, IMAGES_DIR);

const jpegFiles = readJpegFiles();

console.log(`Found ${jpegFiles.length} JPEG files in "${IMAGES_DIR}" folder...`);

const duplicateJpegFiles = filterDuplicates(jpegFiles);

if (duplicateJpegFiles.length) {
    console.log(`Moving ${duplicateJpegFiles.length} JPEG files to "${DUPLICATES_DIR}" folder...`);

    moveFilesToDuplicatesFolder(duplicateJpegFiles);

    /** @type {{ delete: boolean }} */
    const answers = await inquirer.prompt([
        {
            type: "confirm",
            name: "delete",
            message: 'Delete all JPEG files from "duplicates" folder?',
        },
    ]);

    if (answers.delete) {
        console.log(`Deleting all JPEG files from "duplicates" folder...`);

        // Delete all JPEG files from "duplicates" folder except .gitignore file
        const duplicatesFiles = fs.readdirSync(DUPLICATES_DIR).filter((fileName) => fileName !== ".gitignore");
        duplicatesFiles.forEach((fileName) => {
            const filePath = path.resolve(DUPLICATES_DIR, fileName);
            fs.removeSync(filePath);
        });
    }
} else {
    console.log(`No JPEG files found that have RAW images.`);
}

console.log(`Done`);

const { dangerouslyDeleteFromAndroid, dangerouslyDeleteFromAndroidConfirm } = await inquirer.prompt([
    {
        type: "confirm",
        name: "dangerouslyDeleteFromAndroid",
        message: "Delete all transferred files from Android phone?",
        default: false,
    },
    {
        type: "confirm",
        name: "dangerouslyDeleteFromAndroidConfirm",
        message: "Are you really sure? Changes cannot be undone.",
        default: false,
        when: (answers) => answers.dangerouslyDeleteFromAndroid,
    },
]);

if (dangerouslyDeleteFromAndroid && dangerouslyDeleteFromAndroidConfirm) {
    console.log(`Deleting all transferred files from Android phone...`);

    await removeAndroidImages(PHONE_PHOTOS_SOURCE_DIRS);

    console.log(`Done`);
}

/**
 * Moves given image files from `images` folder to files to `duplicates` folder
 * @param {string[]} movedFileNames
 */
function moveFilesToDuplicatesFolder(movedFileNames) {
    movedFileNames.forEach((movedFileName) => {
        const src = path.resolve(IMAGES_DIR, movedFileName);
        const dest = path.resolve(DUPLICATES_DIR, movedFileName);

        console.log(src, "👉", dest);

        fs.moveSync(src, dest, {
            overwrite: true,
        });
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
