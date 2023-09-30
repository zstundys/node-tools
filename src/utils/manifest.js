import fs from "fs-extra";

export class Manifest {
    #manifestFilePath;

    /**
     * @param {string} manifestFilePath
     */
    constructor(manifestFilePath) {
        this.#manifestFilePath = manifestFilePath;
    }

    /**
     *
     * @param {IOutputResult} result
     */
    update(result) {
        fs.ensureFileSync(this.#manifestFilePath);

        const manifest = this.contents();

        const existingIndex = manifest.findIndex((m) => m.file.input === result.file.input);

        if (existingIndex === -1) {
            manifest.push(result);
        } else {
            manifest[existingIndex] = result;
        }

        fs.writeFileSync(this.#manifestFilePath, JSON.stringify(manifest, null, 4));
    }

    /**
     *
     * @returns {IOutputResult[]}
     */
    contents() {
        if (!fs.existsSync(this.#manifestFilePath)) {
            return [];
        }

        const contents = fs.readFileSync(this.#manifestFilePath).toString();

        /** @type {IOutputResult[]} */
        const manifest = JSON.parse(contents || "[]");

        return manifest;
    }

    /**
     *
     * @param {string} inputFilePath
     * @returns {boolean}
     */
    exists(inputFilePath) {
        return this.contents().some((m) => m.file.input === inputFilePath);
    }

    /**
     *
     * @param {string} inputFilePath
     * @returns {IOutputResult | undefined}
     */
    find(inputFilePath) {
        return this.contents().find((m) => m.file.input === inputFilePath);
    }
}
