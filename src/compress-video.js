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

const MANIFEST_FILE_NAME = "compress-video-manifest.json";
const COMPRESSED_FOLDER_NAME = "Compressed";
const ENCODING_PARAMS = {
    size: "1280x?",
    fps: 24,
    codec: "hevc_nvenc",
    audioBitrate: 128,
    audioFrequency: 44100,
};

const VIDEO_FOLDERS = DirectoryUtils.readFolders("C:\\Users\\zstun\\Videos\\Game Recordings");

(async () => {
    await processVideoFolders(VIDEO_FOLDERS);
    await cleanupVideoFolders(VIDEO_FOLDERS);
})();

/**
 *
 * @param {string[]} folderPaths
 */
async function processVideoFolders(folderPaths) {
    for (const folderPath of folderPaths) {
        await processVideoFolder(folderPath);
    }
}

/**
 * @param {string[]} folderPaths
 */
async function cleanupVideoFolders(folderPaths) {
    for (const folderPath of folderPaths) {
        await cleanupProcessedVideos(folderPath);
    }
}

/**
 *
 * @param {string} videosDir
 */
async function processVideoFolder(videosDir) {
    const videoFiles = DirectoryUtils.readFilesWithExt(videosDir, "mp4");

    if (videoFiles.length === 0) {
        return;
    }

    let inputFilesize = 0;
    let outputFilesize = 0;

    for (let i = 0; i < videoFiles.length; i++) {
        console.log("-".repeat(60));
        console.log(`File ${i + 1} of ${videoFiles.length} (${Math.round(((i + 1) / videoFiles.length) * 100)}%)...`);

        const input = videoFiles[i];
        console.log(input);
        const output = path.join(path.dirname(input), COMPRESSED_FOLDER_NAME, path.basename(input));

        const manifest = makeManifest(output);

        if (manifest.exists(input)) {
            console.log(`File already processed. Skipping: "${path.basename(input)}"`);
            const compressedStats = FileSizeUtils.makeOutputResult(input, output);

            inputFilesize += compressedStats.size.sizeA || 0;
            outputFilesize += compressedStats.size.sizeB || 0;
        } else {
            await compressVideo(input, output);
            const compressedStats = FileSizeUtils.makeOutputResult(input, output);

            inputFilesize += compressedStats.size.sizeA || 0;
            outputFilesize += compressedStats.size.sizeB || 0;

            manifest.update(compressedStats);
            FileSizeUtils.logSizes(compressedStats.size);
        }
    }

    console.log("-".repeat(60));
    console.log(`Total stats for ${videosDir}`);
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
 * @param {string} inputFilePath absolute path to mp4 file input
 * @param {string} outputFilePath absolute path to mp4 file output
 * @returns {Promise<void>}
 */
async function compressVideo(inputFilePath, outputFilePath) {
    return new Promise((resolve, reject) => {
        const instance = ffmpeg(inputFilePath);

        console.log(`Compressing: ${path.basename(inputFilePath)}"`);
        console.log(`Output:      ${outputFilePath}"`);
        console.log(`Parameters:  ${Object.values(ENCODING_PARAMS).join(" | ")}`);

        fs.ensureDirSync(path.dirname(outputFilePath));

        const progressLogger = new ThresholdLogger();

        instance
            .size(ENCODING_PARAMS.size)
            .fps(ENCODING_PARAMS.fps)
            .videoCodec(ENCODING_PARAMS.codec)
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
 * @param {string} videosDir
 */
async function cleanupProcessedVideos(videosDir) {
    console.log(`Checking processed videos in ${videosDir}...`);

    const videoFiles = DirectoryUtils.readFilesWithExt(videosDir, "mp4");

    if (videoFiles.length === 0) {
        return;
    }

    const manifestDir = path.join(path.dirname(videoFiles[0]), COMPRESSED_FOLDER_NAME, path.basename(videoFiles[0]));
    const manifest = makeManifest(manifestDir);

    const filesToDelete = videoFiles.filter((v) => {
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
        message: `Found ${filesToDelete.length} processed videos (${filesize(
            size
        )}). Are you sure you want to delete them?`,
    });

    if (canDelete) {
        console.log(`Deleting processed videos in ${videosDir}...`);
        for (const file of filesToDelete) {
            await trash(file);
        }

        console.log("Done");
    } else {
        console.log(`Deletion cancelled for ${videosDir}`);
    }
}
