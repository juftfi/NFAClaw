'use client';

import { useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';

import { MINER_ABI } from '@/lib/contracts';
import { appConfig, isConfigured } from '@/lib/config';

export function useNFAMiner() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const minerReady = isConfigured.miner;

  const totalSupplyQuery = useReadContract({
    abi: MINER_ABI,
    address: appConfig.minerAddress,
    functionName: 'totalSupply',
    query: {
      enabled: minerReady,
      refetchInterval: 10_000
    }
  });

  const pendingMineQuery = useReadContract({
    abi: MINER_ABI,
    address: appConfig.minerAddress,
    functionName: 'getPendingMine',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address) && minerReady,
      refetchInterval: 6_000
    }
  });

  const rewardPreviewQuery = useReadContract({
    abi: MINER_ABI,
    address: appConfig.minerAddress,
    functionName: 'calculateReward',
    args: [totalSupplyQuery.data || 0n],
    query: {
      enabled: totalSupplyQuery.data !== undefined && minerReady,
      refetchInterval: 10_000
    }
  });

  const actions = useMemo(
    () => ({
      mine: async () =>
        minerReady
          ? writeContractAsync({
              abi: MINER_ABI,
              address: appConfig.minerAddress,
              functionName: 'mine'
            })
          : Promise.reject(new Error('miner address not configured')),
      mineWithNonce: async (blockNumber: bigint, nonce: bigint) =>
        minerReady
          ? writeContractAsync({
              abi: MINER_ABI,
              address: appConfig.minerAddress,
              functionName: 'mineWithNonce',
              args: [blockNumber, nonce]
            })
          : Promise.reject(new Error('miner address not configured')),
      mintNfa: async (metadataURI: string) =>
        minerReady
          ? writeContractAsync({
              abi: MINER_ABI,
              address: appConfig.minerAddress,
              functionName: 'mintNFA',
              args: [metadataURI],
              value: 10_000_000_000_000_000n
            })
          : Promise.reject(new Error('miner address not configured')),
    }),
    [minerReady, writeContractAsync]
  );

  return {
    address,
    isPending,
    totalSupply: totalSupplyQuery.data,
    totalSupplyQuery,
    pendingMine: pendingMineQuery.data,
    pendingMineQuery,
    rewardPreview: rewardPreviewQuery.data,
    rewardPreviewQuery,
    ...actions
  };
}
