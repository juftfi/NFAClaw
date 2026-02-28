function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

function required(keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing env: one of ${keys.join(', ')}`);
}

export function getServerConfig() {
  return {
    chainId: Number(firstDefined(process.env.CHAIN_ID, process.env.NEXT_PUBLIC_CHAIN_ID, '97')),
    rpcUrl: required(['BSC_RPC_URL']),
    minerAddress: required(['MINER_ADDRESS', 'NEXT_PUBLIC_MINER_ADDRESS']) as `0x${string}`,
    dividendAddress: required(['DIVIDEND_ADDRESS', 'NEXT_PUBLIC_DIVIDEND_ADDRESS']) as `0x${string}`,
    tokenAddress: required(['TOKEN_ADDRESS', 'NEXT_PUBLIC_TOKEN_ADDRESS']) as `0x${string}`,
    openRouterApiKey: firstDefined(
      process.env.OPENROUTER_API_KEY,
      process.env.OPEN_ROUTER_API_KEY,
      process.env.OPENROUTER_KEY,
      process.env.OPEN_ROUTER_KEY,
      process.env.openrouter_api_key,
      process.env.open_router_api_key,
      process.env.openrouter_key,
      process.env.open_router_key
    ) || '',
    openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    openRouterModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    openRouterSiteUrl: process.env.OPENROUTER_SITE_URL || '',
    openRouterAppName: process.env.OPENROUTER_APP_NAME || 'flapflaw-agent'
  };
}
