import { formatUnits } from 'viem';
import { getDividendTokenInfo, getPendingDividend } from '../chain';

export async function checkDividend(walletAddress: `0x${string}`) {
  const [pendingRaw, tokenInfo] = await Promise.all([
    getPendingDividend(walletAddress),
    getDividendTokenInfo()
  ]);

  return {
    symbol: tokenInfo.symbol,
    raw: pendingRaw.toString(),
    formatted: formatUnits(pendingRaw, tokenInfo.decimals)
  };
}
