import fs from "fs-extra";
import { exec, execSync } from "node:child_process";
import path from "node:path";

// You may need to set the IP and Port for your device
const DEVICE_IP_PORT = "192.168.0.125:39945";


export class AndroidImagesMover {
    static IDS_BY_DEVICE = {
        ASUS_ZENFONE_10: "R7AIB7005204XXX",
    };

    /**
     * @param {keyof typeof AndroidImagesMover['IDS_BY_DEVICE']} targetDevice
     */
    constructor(targetDevice) {
        this.device = targetDevice;
        /** @type {'usb' | 'wifi' | null} */
        this.connectionType = null;
    }

    get deviceId() {
        return AndroidImagesMover.IDS_BY_DEVICE[this.device];
    }

    /**
     * Get the appropriate device selector for ADB commands
     * @return {string}
     */
    get deviceSelector() {
        if (this.connectionType === 'usb') {
            return `-s ${this.deviceId}`;
        } else if (this.connectionType === 'wifi') {
            return `-s ${DEVICE_IP_PORT}`;
        }
        return ''; // fallback for when connection type is not determined
    }

    /**
     * Requires ADB to be installed and in the Path
     * https://developer.android.com/tools/adb
     * @param {string[]} sourceDirs
     * @param {string} targetDir
     */
    async transferImages(sourceDirs, targetDir) {
        console.log(`📱 [${this.device}] Transferring Android images...`);
        await this.#ensureAdbConnection();

        for (const sourceDir of sourceDirs) {
            await this.#pullFiles(sourceDir, targetDir);
        }

        await this.#disconnect();
    }

    /**
     * @param {string[]} sourceDirs
     */
    async removeImages(sourceDirs) {
        console.log(`📱 [${this.device}] Removing Android images...`);

        for (const sourceDir of sourceDirs) {
            await this.#removeDir(sourceDir);
        }

        // Disconnect after operations are complete
        await this.#disconnect();
    }

    /**
     * Disconnect from the device if connected via WiFi
     * @return {Promise<void>}
     */
    async #disconnect() {
        if (this.connectionType === 'wifi') {
            console.log(`📱 [${this.device}] Disconnecting from WiFi connection...`);
            return new Promise((resolve) => {
                exec(`adb disconnect ${DEVICE_IP_PORT}`, (err, stdout, stderr) => {
                    if (err) {
                        console.warn(`📱 [${this.device}] Warning: Error disconnecting: ${err}`);
                    } else {
                        console.log(stdout);
                    }
                    resolve(); // Always resolve, even if disconnect fails
                });
            });
        }
        // No need to disconnect USB connections
        return Promise.resolve();
    }

    /** @return {Promise<void>} */
    #ensureAdbConnection() {
        return new Promise((resolve, reject) => {
            exec("adb devices -l", (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error listing devices: ${err}`);
                    reject(err);
                    return;
                }

                console.log(stdout);

                // If device is not listed, try to connect via IP:Port
                if (!stdout.includes(this.deviceId)) {
                    console.log(`📱 [${this.device}] Device ${this.deviceId} not found. Attempting to connect via WiFi...`, DEVICE_IP_PORT);
                    exec(`adb connect ${DEVICE_IP_PORT}`, (connectErr, connectStdout) => {
                        if (connectErr) {
                            console.error(`Error connecting to device: ${connectErr}`);
                            reject(connectErr);
                            return;
                        }
                        console.log(connectStdout);
                        this.connectionType = 'wifi';
                        resolve();
                    });
                } else {
                    this.connectionType = 'usb';
                    resolve();
                }
            });
        });
    }

    /**
     * @param {string} sourceDir
     * @param {string} targetDir
     * @return {Promise<void>}
     */
    #pullFiles(sourceDir, targetDir) {
        console.log(`📱 [${this.device}] Pulling files from ${sourceDir} to ${targetDir}...`);

        // Check if the sourceDir exists
        try {
            execSync(`adb ${this.deviceSelector} shell ls ${sourceDir}`);
        } catch {
            console.error(`📱 [${this.device}] Skipping ${sourceDir}`);
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            exec(`adb ${this.deviceSelector} pull ${sourceDir} ${targetDir}`, (err, stdout, stderr) => {
                if (err) {
                    console.error(`📱 [${this.device}] Error pulling files from device`);
                    console.error(err);
                    reject();
                    return;
                }

                console.log(stdout);

                // Flattening the folder structure to the targetDir

                const sourceFolderName = path.basename(sourceDir);
                const folderWithFiles = path.resolve(targetDir, sourceFolderName);

                const files = fs.readdirSync(folderWithFiles);
                files.forEach((file) => {
                    const from = path.resolve(folderWithFiles, file);
                    const to = path.resolve(targetDir, file);

                    fs.moveSync(from, to, { overwrite: true });
                });

                fs.rmdirSync(folderWithFiles);

                console.log(
                    `📱 [${this.device}] ${files.length} files from ${sourceDir} to ${targetDir} successfully transferred.`
                );

                resolve();
            });
        });
    }

    /**
     * @param {string} targetDir
     * @return {Promise<void>}
     */
    #removeDir(targetDir) {
        console.log(`📱 [${this.device}] Removing files from ${targetDir}...`);

        return new Promise((resolve, reject) => {
            exec(`adb ${this.deviceSelector} shell rm -rf ${targetDir}`, (err, stdout, stderr) => {
                if (err) {
                    console.error(`📱 [${this.device}] Error removing files: ${err}`);
                    reject();
                    return;
                }

                console.log(stdout);
                resolve();
            });
        });
    }
}



/**
 * @param {'SIGINT' | 'SIGTERM'} signal
 */
function handleExit(signal) {
    console.log(`\n🛑 Received ${signal}. Disconnecting all ADB connections...`);
    try {
        execSync('adb disconnect', { stdio: 'inherit' });
        console.log('✅ ADB disconnect completed.');
    } catch (error) {
        if (error instanceof Error) {
            // Log the error message if it's an instance of Error
            console.error('❌ Error during ADB disconnect:', error.message);
        }
    }
    process.exit(0);
}

// Handle Ctrl+C (SIGINT)
process.on('SIGINT', () => handleExit('SIGINT'));

// Handle terminate signal (SIGTERM)
process.on('SIGTERM', () => handleExit('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    try {
        execSync('adb disconnect', { stdio: 'inherit' });
        console.log('✅ Emergency ADB disconnect completed.');
    } catch (disconnectError) {
        if (disconnectError instanceof Error) {
            console.error('❌ Error during emergency ADB disconnect:', disconnectError.message);
        }
    }
    process.exit(1);
});