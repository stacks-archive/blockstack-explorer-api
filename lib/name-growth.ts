import { getNameCountRanges } from "./core-db-pg/queries";
import { getTimeForBlockHeight } from "./bitcore-db/queries";

const blocksPerDay = (24 * 60) / 10;

export type NameGrowthPoint = {
  /** Estimated unix timestamp */
  x: number;
  /** Total name count at this time */
  y: number;
}

export async function getRecentNameGrowth(
  lastBlockHeight: number, 
  totalNameCount: number, 
  days = 30
): Promise<NameGrowthPoint[]> {
  const blockHeightMonthAgo = lastBlockHeight - ((days + 1) * blocksPerDay);
  const ranges = await getNameCountRanges(blockHeightMonthAgo, lastBlockHeight, blocksPerDay);
  const blockTime = await getTimeForBlockHeight(lastBlockHeight);
  const totalRecentNames = ranges.reduce((count, range) => count + range.count, 0);
  let currentCount = totalNameCount - totalRecentNames;
  const nameOperationsOverTime = ranges.map(range => {
    currentCount = currentCount + range.count;
    const estimatedRangeDate = blockTime - ((lastBlockHeight - range.to) * 10 * 60);
    return {
      x: estimatedRangeDate,
      y: currentCount,
    };
  });
  return nameOperationsOverTime;
}
