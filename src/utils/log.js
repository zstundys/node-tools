export class ThresholdLogger {
    #value = 0;
    #threshold = 0;

    /**
     * @param {number} step
     */
    constructor(step = 10) {
        this.#threshold = step;
    }

    /**
     * @param {number} newValue
     * @param {() => void} callback
     */
    check(newValue, callback) {
        if (this.#isOver(newValue)) {
            this.#value = newValue;
            callback();
        }
    }

    /**
     * @param {number} newValue
     */
    #isOver(newValue) {
        return newValue - this.#value > this.#threshold;
    }
}
