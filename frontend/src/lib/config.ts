import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 97);
const targetChain = chainId === 56 ? bsc : bscTestnet;
const defaultMainnetRpc = 'https://bsc-dataseed.binance.org/';
const defaultTestnetRpc = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const publicRpcUrl = chainId === 56
  ? process.env.NEXT_PUBLIC_BSC_RPC_URL || defaultMainnetRpc
  : process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || defaultTestnetRpc;
const zeroAddress = '0x0000000000000000000000000000000000000000' as const;

export const appConfig = {
  chainId,
  minerAddress: (process.env.NEXT_PUBLIC_MINER_ADDRESS || zeroAddress) as `0x${string}`,
  dividendAddress: (process.env.NEXT_PUBLIC_DIVIDEND_ADDRESS || zeroAddress) as `0x${string}`,
  tokenAddress: (process.env.NEXT_PUBLIC_TOKEN_ADDRESS || zeroAddress) as `0x${string}`
};

export const isConfigured = {
  miner: appConfig.minerAddress !== zeroAddress,
  dividend: appConfig.dividendAddress !== zeroAddress,
  token: appConfig.tokenAddress !== zeroAddress,
};

export const wagmiConfig = getDefaultConfig({
  appName: 'Flap NFA Mining',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [targetChain],
  transports: {
    [targetChain.id]: http(publicRpcUrl)
  },
  ssr: true
});
