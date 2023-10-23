import xlsx from "node-xlsx";
import path from "node:path";
import _ from "lodash-es";
import { Portfolio } from "./lib/portfolio.js";

const FILE_TO_PROCESS = path.resolve(
  "./tmp/eToro Account Statement Jan 1 2020 to Oct 14 2023.xlsx"
);

const portfolio = Portfolio.fromFile(FILE_TO_PROCESS, "Account Activity");

console.log(portfolio.activePositions.filter((r) => r.assetType === "CFD"));

// console.log(portfolio.getPositionsForAssetType("Stocks"));
