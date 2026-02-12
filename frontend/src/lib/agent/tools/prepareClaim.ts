import { encodeFunctionData, parseAbi } from 'viem';
import { getServerConfig } from '../config';

const dividendAbi = parseAbi(['function claimDividend()']);

export function prepareClaim() {
  const config = getServerConfig();
  return {
    to: config.dividendAddress,
    data: encodeFunctionData({
      abi: dividendAbi,
      functionName: 'claimDividend'
    }),
    value: '0'
  };
}
