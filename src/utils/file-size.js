import filesize from "filesize";
import fs from "fs-extra";

export class FileSizeUtils {
    /**
     * @param {IComparedSizes} stats
     */
    static logSizes(stats) {
        console.log(`Input:   ${stats.humanFileSizeA}`);
        console.log(`Output:  ${stats.humanFileSizeB}`);
        console.log(`Savings: ${stats.difference} (${stats.ratio} of original)`);
    }

    /**
     * @param {string} targetFile
     * @param {string} outputTarget
     * @returns {IOutputResult}
     */
    static makeOutputResult(targetFile, outputTarget) {
        const stats = this.compareFiles(targetFile, outputTarget);

        return {
            file: {
                input: targetFile,
                output: outputTarget,
            },
            size: stats,
        };
    }

    /**
     *
     * @param {string} filePathA
     * @param {string} filePathB
     * @returns {IComparedSizes}
     */
    static compareFiles(filePathA, filePathB) {
        const sizeA = fs.existsSync(filePathA) ? fs.statSync(filePathA).size : 0;
        const sizeB = fs.existsSync(filePathB) ? fs.statSync(filePathB).size : 0;

        return this.compareSizes(sizeA, sizeB);
    }

    /**
     * @param {number} sizeA
     * @param {number} sizeB
     * @returns {IComparedSizes}
     */
    static compareSizes(sizeA, sizeB) {
        return {
            sizeA,
            sizeB,
            humanFileSizeA: filesize(sizeA, { round: 0 }),
            humanFileSizeB: filesize(sizeB, { round: 0 }),
            difference: filesize(sizeA - sizeB, { round: 0 }),
            ratio: `${Math.round((sizeB / sizeA) * 100)}%`,
        };
    }
}
