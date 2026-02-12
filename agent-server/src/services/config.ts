import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env: ${key}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 8787),
  allowedOrigin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  chainId: Number(process.env.CHAIN_ID || 97),
  rpcUrl: required('BSC_RPC_URL'),
  minerAddress: required('MINER_ADDRESS') as `0x${string}`,
  dividendAddress: required('DIVIDEND_ADDRESS') as `0x${string}`,
  tokenAddress: required('TOKEN_ADDRESS') as `0x${string}`,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
};
