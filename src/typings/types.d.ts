declare interface IVideoOutputResult {
    file: {
        input: string;
        output: string;
    };
    size: IComparedSizes;
}

declare interface IComparedSizes {
    /**
     * Filesize in bytes of file A
     */
    sizeA: number;
    /**
     * Filesize in bytes of file B
     */
    sizeB: number;
    /**
     * Human-readable filesize of file A
     * @example "8.2 MB"
     */
    humanFileSizeA: string;
    /**
     * Human-readable filesize of file B
     * @example "8.2 MB"
     */
    humanFileSizeB: string;
    /**
     * Human-readable difference between file A and file B
     * @example "2.2 MB"
     */
    difference: string;
    /**
     * percentage against sizeA
     * @example "8%"
     */
    ratio: string;
}
