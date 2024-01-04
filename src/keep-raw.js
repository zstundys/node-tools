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

const PHONE_PHOTOS_SOURCE_DIRS = ["/sdcard/DCIM/Camera", "/sdcard/DCIM/OpenCamera", "/sdcard/Pictures/Raw"];
const IMAGES_DIR = path.join(__dirname, "./output/keep-raw/images");
const DUPLICATES_DIR = path.join(__dirname, "./output/keep-raw/duplicates");

await transferAndroidImages(PHONE_PHOTOS_SOURCE_DIRS, IMAGES_DIR);

const jpegFiles = readJpegFiles();
const allFiles = readAllFiles();

console.log(`Found ${jpegFiles.length} JPEG files in "${IMAGES_DIR}" folder...`);

const duplicateJpegFiles = filterDuplicates(jpegFiles);
const trashedFiles = filterTrashed(allFiles);

if (duplicateJpegFiles.length) {
    console.log(`Moving ${duplicateJpegFiles.length} JPEG files to "${DUPLICATES_DIR}" folder...`);

    moveFilesToDuplicatesFolder(duplicateJpegFiles);

    /** @type {{ deleteDuplicates: boolean; }} */
    const answers = await inquirer.prompt([
        {
            type: "confirm",
            name: "deleteDuplicates",
            message: 'Delete all JPEG files from "duplicates" folder?',
        },
    ]);

    if (answers.deleteDuplicates) {
        console.log(`Deleting all JPEG files from "duplicates" folder...`);

        // Delete all JPEG files from "duplicates" folder except .gitignore file
        const duplicatesFiles = fs.readdirSync(DUPLICATES_DIR).filter((fileName) => fileName !== ".gitignore");

        for (const fileName of duplicatesFiles) {
            const filePath = path.resolve(DUPLICATES_DIR, fileName);
            fs.removeSync(filePath);
        }
    }
} else {
    console.log(`No JPEG files found that have RAW images.`);
}

if (trashedFiles.length) {
    console.log(`Moving ${trashedFiles.length} JPEG files to "trashed" folder...`);

    for (const trashedFile of trashedFiles) {
        const src = path.resolve(IMAGES_DIR, trashedFile);
        const dest = path.resolve(__dirname, "./output/keep-raw/trashed", trashedFile);

        fs.moveSync(src, dest, {
            overwrite: true,
        });
    }

    const { deleteTrashed } = await inquirer.prompt([
        {
            type: "confirm",
            name: "deleteTrashed",
            message: 'Delete all JPEG files from "trashed" folder?',
            default: true,
        },
    ]);

    if (deleteTrashed) {
        console.log(`Deleting all JPEG files from "trashed" folder...`);

        // Delete all JPEG files from "trashed" folder except .gitignore file
        const trashedFiles = fs
            .readdirSync(path.join(__dirname, "./output/keep-raw/trashed"))
            .filter((fileName) => fileName !== ".gitignore");

        for (const fileName of trashedFiles) {
            const filePath = path.resolve(__dirname, "./output/keep-raw/trashed", fileName);
            fs.removeSync(filePath);
        }
    }
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
    for (const movedFileName of movedFileNames) {
        const src = path.resolve(IMAGES_DIR, movedFileName);
        const dest = path.resolve(DUPLICATES_DIR, movedFileName);

        console.log(src, "👉", dest);

        fs.moveSync(src, dest, {
            overwrite: true,
        });
    }
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
 * Filters only those files that start with `".trashed"`
 * @param {string[]} jpegFileNames
 * @returns {string[]}
 */
function filterTrashed(jpegFileNames) {
    return jpegFileNames.filter((fileName) => fileName.startsWith(".trashed"));
}

/**
 * Gets all JPEG files from `images` folder
 * @returns {string[]}
 */
function readJpegFiles() {
    return readAllFiles().filter((fileName) => fileName.toLowerCase().endsWith(".jpg"));
}

/**
 * Gets all files from `images` folder
 * @returns {string[]}
 */
function readAllFiles() {
    return fs.readdirSync(IMAGES_DIR).filter((fileName) => fileName !== ".gitignore");
}
