import inquirer from "inquirer";
import filesize from "filesize";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs-extra";
import path from "path";
import trash from "trash";
import { DirectoryUtils } from "./utils/directory.js";
import { FileSizeUtils } from "./utils/file-size.js";
import { ThresholdLogger } from "./utils/log.js";
import { Manifest } from "./utils/manifest.js";

const MANIFEST_FILE_NAME = "compress-audio-manifest.json";
const COMPRESSED_FOLDER_NAME = "Compressed";
const UNCOMPRESSED_AUDIO_FILES_PATH = "G:\\My Drive\\Personal Guitar";
const SOURCE_FILE_EXT = ".wav";
const OUTPUT_FILE_EXT = ".mp3";
const ENCODING_PARAMS = {
    codec: "libmp3lame",
    audioBitrate: 128,
    audioFrequency: 44100,
};

const FOLDERS_WITH_FILES_TO_PROCESS = [UNCOMPRESSED_AUDIO_FILES_PATH];

if (FOLDERS_WITH_FILES_TO_PROCESS.length === 0) {
    console.log(`No folders found in ${UNCOMPRESSED_AUDIO_FILES_PATH}`);
    process.exit(0);
}

(async () => {
    await processFolders(FOLDERS_WITH_FILES_TO_PROCESS);
    await cleanupFolders(FOLDERS_WITH_FILES_TO_PROCESS);
})();

/**
 *
 * @param {string[]} folderPaths
 */
async function processFolders(folderPaths) {
    for (const folderPath of folderPaths) {
        await processAudioFolder(folderPath);
    }
}

/**
 * @param {string[]} folderPaths
 */
async function cleanupFolders(folderPaths) {
    for (const folderPath of folderPaths) {
        await cleanupProcessedFiles(folderPath);
    }
}

/**
 *
 * @param {string} filesDir
 */
async function processAudioFolder(filesDir) {
    const audioFiles = DirectoryUtils.readFilesWithExt(filesDir, SOURCE_FILE_EXT);

    if (audioFiles.length === 0) {
        console.log(`No ${SOURCE_FILE_EXT} files found in ${filesDir}`);
        return;
    }

    let inputFilesize = 0;
    let outputFilesize = 0;

    for (let i = 0; i < audioFiles.length; i++) {
        console.log("-".repeat(60));
        console.log(`File ${i + 1} of ${audioFiles.length} (${Math.round(((i + 1) / audioFiles.length) * 100)}%)...`);

        const input = audioFiles[i];
        console.log(input);
        const outputFileName = path.basename(input, SOURCE_FILE_EXT) + OUTPUT_FILE_EXT;
        const outputFolder = path.join(path.dirname(input), COMPRESSED_FOLDER_NAME);
        const output = path.join(outputFolder, outputFileName);

        const manifest = makeManifest(output);

        if (manifest.exists(input)) {
            console.log(`File already processed. Skipping: "${path.basename(input)}"`);
            const compressedStats = FileSizeUtils.makeOutputResult(input, output);

            inputFilesize += compressedStats.size.sizeA || 0;
            outputFilesize += compressedStats.size.sizeB || 0;
        } else {
            await compressAudio(input, output);
            const compressedStats = FileSizeUtils.makeOutputResult(input, output);

            inputFilesize += compressedStats.size.sizeA || 0;
            outputFilesize += compressedStats.size.sizeB || 0;

            manifest.update(compressedStats);
            FileSizeUtils.logSizes(compressedStats.size);
        }
    }

    console.log("-".repeat(60));
    console.log(`Total stats for ${filesDir}`);
    const finalStats = FileSizeUtils.compareSizes(inputFilesize, outputFilesize);
    FileSizeUtils.logSizes(finalStats);
    console.log(`Done`);
}

/**
 * @param {string} outputFilePath
 */
function makeManifest(outputFilePath) {
    const manifestOutput = path.join(path.dirname(outputFilePath), MANIFEST_FILE_NAME);
    const manifest = new Manifest(manifestOutput);
    return manifest;
}

/**
 *
 * @param {string} inputFilePath absolute path to wav file input
 * @param {string} outputFilePath absolute path to wav file output
 * @returns {Promise<void>}
 */
async function compressAudio(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
        const instance = ffmpeg(inputFilePath);

        console.log(`Compressing: ${path.basename(inputFilePath)}"`);
        console.log(`Output:      ${outputFilePath}"`);
        console.log(`Parameters:  ${Object.values(ENCODING_PARAMS).join(" | ")}`);

        fs.ensureDirSync(path.dirname(outputFilePath));

        const progressLogger = new ThresholdLogger();

        instance
            .noVideo()
            .audioCodec(ENCODING_PARAMS.codec)
            .audioBitrate(ENCODING_PARAMS.audioBitrate)
            .audioFrequency(ENCODING_PARAMS.audioFrequency)
            .output(outputFilePath)
            .on("progress", (progress) => {
                progressLogger.check(progress.percent, () => {
                    console.log(
                        `Processing:  ${Math.round(progress.percent)}% (${filesize(progress.targetSize * 1024)})`
                    );
                });
            })
            .on("error", (error) => {
                console.error(error);
                reject(error);
            })
            .on("end", () => {
                console.log("Finished processing");

                resolve();
            })
            .run();
    });
}

/**
 * @param {string} filesDir
 */
async function cleanupProcessedFiles(filesDir) {
    console.log(`Checking processed files in ${filesDir}...`);

    const processedFiles = DirectoryUtils.readFilesWithExt(filesDir, "wav");

    if (processedFiles.length === 0) {
        return;
    }

    const manifestDir = path.join(
        path.dirname(processedFiles[0]),
        COMPRESSED_FOLDER_NAME,
        path.basename(processedFiles[0])
    );
    const manifest = makeManifest(manifestDir);

    const filesToDelete = processedFiles.filter((v) => {
        const entry = manifest.find(v);
        return !!entry && fs.existsSync(entry.file.output);
    });

    const size = filesToDelete.reduce((acc, f) => acc + fs.statSync(f).size, 0);

    /**
     * @type { {canDelete: boolean} }
     */
    const { canDelete } = await inquirer.prompt({
        type: "confirm",
        name: "canDelete",
        message: `Found ${filesToDelete.length} already processed files (${filesize(
            size
        )}). Are you sure you want to delete them?`,
    });

    if (canDelete) {
        console.log(`Deleting processed videos in ${filesDir}...`);
        for (const file of filesToDelete) {
            await trash(file);
        }

        console.log("Done");
    } else {
        console.log(`Deletion cancelled for ${filesDir}`);
    }
}
