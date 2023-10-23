declare type AssetType = "Stocks" | "Crypto" | 'CFD' | 'ETF';
declare type ActivityType =
  | "Deposit"
  | "Open Position"
  | "Dividend"
  | "Position closed"
  | "Adjustment"
  | "Staking"
  | "Rollover Fee"
  | "corp action: Split"
  | "Interest Payment"
declare type ActivityEntry = {
    date: Date,
    type: ActivityType,
    details: string,
    amount: number,
    units: number,
    realizedEquityChange: number,
    realizedEquity: number,
    balance: number,
    positionId: string,
    assetType: AssetType,
    nwa: number,
}