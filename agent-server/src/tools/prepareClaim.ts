import { encodeFunctionData, parseAbi } from 'viem';
import { config } from '../services/config';

const dividendAbi = parseAbi(['function claimDividend()']);

export function prepareClaim() {
  return {
    to: config.dividendAddress,
    data: encodeFunctionData({
      abi: dividendAbi,
      functionName: 'claimDividend'
    }),
    value: '0'
  };
}
