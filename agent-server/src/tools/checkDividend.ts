import { formatUnits } from 'viem';
import { getPendingDividend, getTokenBalance } from '../services/chain';

export async function checkDividend(walletAddress: `0x${string}`) {
  const [pendingRaw, tokenInfo] = await Promise.all([
    getPendingDividend(walletAddress),
    getTokenBalance(walletAddress)
  ]);

  return {
    symbol: tokenInfo.symbol,
    raw: pendingRaw.toString(),
    formatted: formatUnits(pendingRaw, tokenInfo.decimals)
  };
}
