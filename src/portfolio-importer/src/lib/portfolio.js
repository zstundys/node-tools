import xlsx from "node-xlsx";
import _ from "lodash-es";

const display = {
    /**
     * @param {number | Date | undefined} date
     */
    date: (date) => {
        const formatter = new Intl.DateTimeFormat();

        return formatter.format(date);
    },
};

export class Portfolio {
    /** @type {ActivityEntry[]} */
    #positions = [];
    logger = new PortfolioLogger(this);

    constructor(
        /** @type {ActivityEntry[]} */
        positions
    ) {
        this.#positions = positions;
        this.logger.report();
    }

    get soldPositions() {
        /** @type {ActivityEntry[]} */
        const soldPositions = [];

        for (const position of this.#positions) {
            if (position.type === "Open Position") {
                const closedPosition = this.#positions.find(
                    (p) => p.type === "Position closed" && p.positionId === position.positionId
                );

                if (closedPosition) {
                    soldPositions.push(closedPosition);
                }
            }
        }

        return soldPositions;
    }

    get positionsByAssetTypeMap() {
        return Object.fromEntries(
            Object.entries(_.groupBy(this.#positions, "assetType")).map(([k, v]) => [k, v.length])
        );
    }

    get closedPositions() {
        return this.#positions.filter((p) => p.type === "Position closed");
    }

    get openPositions() {
        return this.#positions.filter((p) => p.type === "Open Position");
    }

    get activePositions() {
        const soldPositionIds = new Set(this.soldPositions.map((p) => p.positionId));

        return this.#positions.filter((p) => p.type === "Open Position" && !soldPositionIds.has(p.positionId));
    }

    get dateRange() {
        return {
            from: this.#positions.at(0)?.date,
            to: this.#positions.at(-1)?.date,
        };
    }

    /**
     * @param {AssetType} assetType
     */
    getPositionsForAssetType(assetType) {
        return this.#positions.filter((p) => p.assetType === assetType);
    }

    /**
     * @param {string} xlsxFilePath
     * @param {string} sheetName
     */
    static fromFile(xlsxFilePath, sheetName) {
        const sheets = xlsx.parse(xlsxFilePath);
        const activitySheet = sheets.find((sheet) => sheet.name === sheetName) ?? raise("Sheet not found");

        const [, ...dataRows] = activitySheet.data;

        const positions = dataRows.map(
            ([
                date,
                type,
                details,
                amount,
                units,
                realizedEquityChange,
                realizedEquity,
                balance,
                positionId,
                assetType,
                nwa,
            ]) =>
                /** @type {ActivityEntry} */
                ({
                    date: new Date(date.replace(/(\d{2})\/(\d{2})\/(\d{4})\s(.*)/, "$3-$2-$1T$4")),
                    type,
                    details,
                    amount,
                    units: parseFloat(units),
                    realizedEquityChange,
                    realizedEquity,
                    balance,
                    positionId,
                    assetType,
                    nwa,
                })
        );

        return new Portfolio(positions);
    }
}

class PortfolioLogger {
    /** @type {Portfolio} */
    #portfolio;

    /**
     * @param {Portfolio} portfolio
     */
    constructor(portfolio) {
        this.#portfolio = portfolio;
    }

    report() {
        console.log("-".repeat(80));
        console.log(`Portfolio intialized`);
        console.log(display.date(this.#portfolio.dateRange.from), "-", display.date(this.#portfolio.dateRange.to));
        console.log();
        // console.log("Positions open:", this.#portfolio.openPositions.length);
        // console.log("Positions closed:", this.#portfolio.closedPositions.length);
        console.log("Positions sold:", this.#portfolio.soldPositions.length);
        console.log("Positions active:", this.#portfolio.activePositions.length);
        console.log("Positions by asset type:", JSON.stringify(this.#portfolio.positionsByAssetTypeMap, null, 4));
        console.log("-".repeat(80));
    }
}

/**
 * @param {string | undefined} message
 * @returns {never}
 */
function raise(message) {
    throw new Error(message);
}
