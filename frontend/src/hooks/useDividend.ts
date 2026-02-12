'use client';

import { useAccount, useReadContract, useWriteContract } from 'wagmi';

import { DIVIDEND_ABI } from '@/lib/contracts';
import { appConfig, isConfigured } from '@/lib/config';

export function useDividend() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const dividendReady = isConfigured.dividend;

  const pendingQuery = useReadContract({
    abi: DIVIDEND_ABI,
    address: appConfig.dividendAddress,
    functionName: 'pendingDividend',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address) && dividendReady,
      refetchInterval: 10_000
    }
  });

  return {
    pendingDividend: pendingQuery.data,
    pendingQuery,
    isPending,
    claimDividend: async () =>
      dividendReady
        ? writeContractAsync({
            abi: DIVIDEND_ABI,
            address: appConfig.dividendAddress,
            functionName: 'claimDividend'
          })
        : Promise.reject(new Error('dividend address not configured'))
  };
}
