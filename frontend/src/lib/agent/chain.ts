import { createPublicClient, getAddress, http, parseAbi } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { getServerConfig } from './config';

const minerAbi = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function getAgentIdentity(uint256 tokenId) view returns ((uint8 roleId, bytes32 traitSeed, uint256 mintedAt))',
  'function tokenURI(uint256 tokenId) view returns (string)'
]);

const tokenAbi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
]);

const dividendAbi = parseAbi([
  'function pendingDividend(address account) view returns (uint256)',
  'function rewardToken() view returns (address)'
]);

function getPublicClient() {
  const config = getServerConfig();
  const chain = config.chainId === 56 ? bsc : bscTestnet;
  return createPublicClient({
    chain,
    transport: http(config.rpcUrl)
  });
}

export async function getAgentIdentity(tokenId: number) {
  const config = getServerConfig();
  const publicClient = getPublicClient();
  const identity = await publicClient.readContract({
    address: config.minerAddress,
    abi: minerAbi,
    functionName: 'getAgentIdentity',
    args: [BigInt(tokenId)]
  });

  return {
    roleId: Number(identity.roleId),
    traitSeed: identity.traitSeed,
    mintedAt: Number(identity.mintedAt)
  };
}

export async function getTokenOwner(tokenId: number) {
  const config = getServerConfig();
  const publicClient = getPublicClient();
  return publicClient.readContract({
    address: config.minerAddress,
    abi: minerAbi,
    functionName: 'ownerOf',
    args: [BigInt(tokenId)]
  });
}

export async function assertTokenOwnership(tokenId: number, walletAddress: `0x${string}`) {
  const owner = await getTokenOwner(tokenId);
  return getAddress(owner) === getAddress(walletAddress);
}

export async function getTokenBalance(walletAddress: `0x${string}`) {
  const config = getServerConfig();
  const publicClient = getPublicClient();
  const [rawBalance, symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address: config.tokenAddress,
      abi: tokenAbi,
      functionName: 'balanceOf',
      args: [walletAddress]
    }),
    publicClient.readContract({
      address: config.tokenAddress,
      abi: tokenAbi,
      functionName: 'symbol'
    }),
    publicClient.readContract({
      address: config.tokenAddress,
      abi: tokenAbi,
      functionName: 'decimals'
    })
  ]);

  return { rawBalance, symbol, decimals };
}

export async function getPendingDividend(walletAddress: `0x${string}`) {
  const config = getServerConfig();
  const publicClient = getPublicClient();
  return publicClient.readContract({
    address: config.dividendAddress,
    abi: dividendAbi,
    functionName: 'pendingDividend',
    args: [walletAddress]
  });
}

export async function getDividendTokenInfo() {
  const config = getServerConfig();
  const publicClient = getPublicClient();
  const rewardToken = await publicClient.readContract({
    address: config.dividendAddress,
    abi: dividendAbi,
    functionName: 'rewardToken'
  });

  if (rewardToken.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    return {
      symbol: 'BNB',
      decimals: 18,
      address: rewardToken
    };
  }

  const [symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address: rewardToken,
      abi: tokenAbi,
      functionName: 'symbol'
    }),
    publicClient.readContract({
      address: rewardToken,
      abi: tokenAbi,
      functionName: 'decimals'
    })
  ]);

  return { symbol, decimals: Number(decimals), address: rewardToken };
}

export async function getNfaBalance(walletAddress: `0x${string}`) {
  const config = getServerConfig();
  const publicClient = getPublicClient();
  return publicClient.readContract({
    address: config.minerAddress,
    abi: minerAbi,
    functionName: 'balanceOf',
    args: [walletAddress]
  });
}
