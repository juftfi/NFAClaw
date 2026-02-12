import { formatUnits } from 'viem';
import { getTokenBalance } from '../chain';

export async function checkBalance(walletAddress: `0x${string}`) {
  const { rawBalance, symbol, decimals } = await getTokenBalance(walletAddress);
  return {
    symbol,
    raw: rawBalance.toString(),
    formatted: formatUnits(rawBalance, decimals)
  };
}

