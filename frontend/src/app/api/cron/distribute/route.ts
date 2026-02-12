import { NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  parseAbi,
  type Address,
  type Hex
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc, bscTestnet } from 'viem/chains';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const dividendAbi = parseAbi([
  'function rewardToken() view returns (address)',
  'function nfaContract() view returns (address)',
  'function pendingIncoming() view returns (uint256)',
  'function lastRecordedBalance() view returns (uint256)',
  'function distribute() external'
]);

const minerAbi = parseAbi([
  'function totalSupply() view returns (uint256)'
]);

const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)'
]);

function firstDefined(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

function required(keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error(`Missing env: one of ${keys.join(', ')}`);
}

function normalizePrivateKey(raw: string): Hex {
  const value = raw.trim();
  if (/^0x[a-fA-F0-9]{64}$/.test(value)) return value as Hex;
  if (/^[a-fA-F0-9]{64}$/.test(value)) return `0x${value}` as Hex;
  throw new Error('Invalid distributor private key format');
}

function assertCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new Error('Missing env: CRON_SECRET');
  }

  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${secret}`) {
    throw new Error('Unauthorized cron call');
  }
}

function getChain() {
  const chainId = Number(firstDefined(process.env.CHAIN_ID, process.env.NEXT_PUBLIC_CHAIN_ID, '97'));
  return chainId === 56 ? bsc : bscTestnet;
}

function getMinPendingWei() {
  const value = process.env.DISTRIBUTE_MIN_PENDING_WEI || '10000000000000000';
  try {
    return BigInt(value);
  } catch {
    throw new Error('Invalid DISTRIBUTE_MIN_PENDING_WEI');
  }
}

async function getCurrentBalance(params: {
  publicClient: ReturnType<typeof createPublicClient>;
  dividendAddress: Address;
  rewardTokenAddress: Address;
}) {
  if (params.rewardTokenAddress === '0x0000000000000000000000000000000000000000') {
    return params.publicClient.getBalance({ address: params.dividendAddress });
  }
  return params.publicClient.readContract({
    address: params.rewardTokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [params.dividendAddress]
  });
}

export async function GET(request: Request) {
  try {
    assertCronSecret(request);

    const enabled = (process.env.DISTRIBUTE_ENABLED || 'false').toLowerCase() === 'true';
    if (!enabled) {
      return NextResponse.json({ ok: false, skipped: true, reason: 'DISTRIBUTE_ENABLED=false' }, { status: 200 });
    }

    const rpcUrl = required(['BSC_RPC_URL']);
    const dividendAddress = required(['DIVIDEND_ADDRESS', 'NEXT_PUBLIC_DIVIDEND_ADDRESS']) as Address;
    const privateKey = normalizePrivateKey(
      required(['DISTRIBUTOR_PRIVATE_KEY', 'DEPLOYER_PRIVATE_KEY'])
    );
    const minPendingWei = getMinPendingWei();

    const chain = getChain();
    const account = privateKeyToAccount(privateKey);
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({ chain, transport });
    const walletClient = createWalletClient({ chain, transport, account });

    const dividend = getContract({
      address: dividendAddress,
      abi: dividendAbi,
      client: { public: publicClient, wallet: walletClient }
    });

    const [rewardTokenAddress, nfaAddress, pendingIncoming, lastRecordedBalance] = await Promise.all([
      dividend.read.rewardToken(),
      dividend.read.nfaContract(),
      dividend.read.pendingIncoming(),
      dividend.read.lastRecordedBalance()
    ]);

    const totalSupply = await publicClient.readContract({
      address: nfaAddress,
      abi: minerAbi,
      functionName: 'totalSupply'
    });

    if (totalSupply === 0n) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'totalSupply=0',
        totalSupply: totalSupply.toString()
      });
    }

    const currentBalance = await getCurrentBalance({
      publicClient,
      dividendAddress,
      rewardTokenAddress
    });
    const delta = currentBalance > lastRecordedBalance ? currentBalance - lastRecordedBalance : 0n;
    const estimatedPending = pendingIncoming + delta;

    if (estimatedPending < minPendingWei) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'pending below threshold',
        estimatedPending: estimatedPending.toString(),
        minPendingWei: minPendingWei.toString()
      });
    }

    const hash = await dividend.write.distribute();
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      ok: true,
      skipped: false,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      estimatedPending: estimatedPending.toString(),
      rewardToken: rewardTokenAddress
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const unauthorized = message.toLowerCase().includes('unauthorized');
    return NextResponse.json(
      { ok: false, error: message },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
