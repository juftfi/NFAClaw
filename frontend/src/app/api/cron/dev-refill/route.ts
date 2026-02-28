import { NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
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
  'function pendingDividend(address account) view returns (uint256)',
  'function claimDividend() returns (uint256)'
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

function parseBool(raw: string | undefined, defaultValue: boolean) {
  if (!raw) return defaultValue;
  const value = raw.trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid boolean value: ${raw}`);
}

function parseWei(raw: string | undefined, fallback: string, envName: string) {
  const value = raw && raw.length > 0 ? raw : fallback;
  try {
    return BigInt(value);
  } catch {
    throw new Error(`Invalid ${envName}`);
  }
}

function normalizePrivateKey(raw: string): Hex {
  const value = raw.trim();
  const matched = value.match(/(?:0x)?([a-fA-F0-9]{64})/);
  if (matched?.[1]) {
    return `0x${matched[1]}` as Hex;
  }
  throw new Error('Invalid DEV_REFILL_PRIVATE_KEY format');
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

function errMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(request: Request) {
  try {
    assertCronSecret(request);

    const enabled = parseBool(process.env.DEV_REFILL_ENABLED, false);
    if (!enabled) {
      return NextResponse.json(
        { ok: false, skipped: true, reason: 'DEV_REFILL_ENABLED=false' },
        { status: 200 }
      );
    }

    const rpcUrl = required(['BSC_RPC_URL']);
    const dividendAddress = required(['DIVIDEND_ADDRESS', 'NEXT_PUBLIC_DIVIDEND_ADDRESS']) as Address;
    const privateKey = normalizePrivateKey(required(['DEV_REFILL_PRIVATE_KEY', 'DEV_PRIVATE_KEY']));

    const keepGasReserveWei = parseWei(
      process.env.DEV_REFILL_KEEP_GAS_WEI,
      '20000000000000000',
      'DEV_REFILL_KEEP_GAS_WEI'
    );
    const minTransferWei = parseWei(
      process.env.DEV_REFILL_MIN_TRANSFER_WEI,
      '1000000000000000',
      'DEV_REFILL_MIN_TRANSFER_WEI'
    );
    const claimEnabled = parseBool(process.env.DEV_REFILL_AUTO_CLAIM, true);
    const claimMinPendingWei = parseWei(
      process.env.DEV_REFILL_CLAIM_MIN_PENDING_WEI,
      '1',
      'DEV_REFILL_CLAIM_MIN_PENDING_WEI'
    );

    const account = privateKeyToAccount(privateKey);
    const chain = getChain();
    const transport = http(rpcUrl);
    const publicClient = createPublicClient({ chain, transport });
    const walletClient = createWalletClient({ chain, transport, account });

    const zeroAddress = '0x0000000000000000000000000000000000000000';

    const [rewardToken, pendingBeforeClaim, balanceBeforeClaim, gasPrice] = await Promise.all([
      publicClient.readContract({
        address: dividendAddress,
        abi: dividendAbi,
        functionName: 'rewardToken'
      }),
      publicClient.readContract({
        address: dividendAddress,
        abi: dividendAbi,
        functionName: 'pendingDividend',
        args: [account.address]
      }),
      publicClient.getBalance({ address: account.address }),
      publicClient.getGasPrice()
    ]);

    if (rewardToken.toLowerCase() !== zeroAddress) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Dividend reward token is ERC20, not native BNB',
        rewardToken
      });
    }

    let claimTxHash: Hex | undefined;
    let claimed = false;
    let pendingAfterClaim = pendingBeforeClaim;
    let balanceAfterClaim = balanceBeforeClaim;
    let claimSkippedReason: string | undefined;

    if (!claimEnabled) {
      claimSkippedReason = 'DEV_REFILL_AUTO_CLAIM=false';
    } else if (pendingBeforeClaim < claimMinPendingWei) {
      claimSkippedReason = 'pendingDividend below claim threshold';
    } else {
      try {
        const claimGasLimit = await publicClient.estimateContractGas({
          address: dividendAddress,
          abi: dividendAbi,
          functionName: 'claimDividend',
          account: account.address
        });
        const claimFee = claimGasLimit * gasPrice;
        if (balanceBeforeClaim < claimFee) {
          claimSkippedReason = 'insufficient BNB balance to pay claim gas';
        } else {
          claimTxHash = await walletClient.writeContract({
            address: dividendAddress,
            abi: dividendAbi,
            functionName: 'claimDividend',
            account
          });
          await publicClient.waitForTransactionReceipt({ hash: claimTxHash });
          claimed = true;
          [pendingAfterClaim, balanceAfterClaim] = await Promise.all([
            publicClient.readContract({
              address: dividendAddress,
              abi: dividendAbi,
              functionName: 'pendingDividend',
              args: [account.address]
            }),
            publicClient.getBalance({ address: account.address })
          ]);
        }
      } catch (error) {
        claimSkippedReason = `claim failed: ${errMessage(error)}`;
      }
    }

    const transferGasLimit = await publicClient
      .estimateGas({
        account: account.address,
        to: dividendAddress,
        value: 1n
      })
      .catch(() => 21000n);
    const transferFee = transferGasLimit * gasPrice;
    const availableAfterReserve =
      balanceAfterClaim > keepGasReserveWei ? balanceAfterClaim - keepGasReserveWei : 0n;
    const transferable =
      availableAfterReserve > transferFee ? availableAfterReserve - transferFee : 0n;

    if (transferable < minTransferWei) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'transferable below threshold after gas reserve',
        devWallet: account.address,
        rewardToken,
        claim: {
          attempted: claimEnabled,
          claimed,
          claimTxHash: claimTxHash || null,
          skippedReason: claimSkippedReason || null,
          pendingBeforeClaim: pendingBeforeClaim.toString(),
          pendingAfterClaim: pendingAfterClaim.toString()
        },
        balances: {
          beforeClaimWei: balanceBeforeClaim.toString(),
          afterClaimWei: balanceAfterClaim.toString(),
          keepGasReserveWei: keepGasReserveWei.toString()
        },
        gas: {
          gasPriceWei: gasPrice.toString(),
          transferGasLimit: transferGasLimit.toString(),
          estimatedTransferFeeWei: transferFee.toString()
        },
        transferableWei: transferable.toString(),
        minTransferWei: minTransferWei.toString()
      });
    }

    const transferTxHash = await walletClient.sendTransaction({
      account,
      to: dividendAddress,
      value: transferable,
      gas: transferGasLimit,
      gasPrice
    });
    const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: transferTxHash });
    const balanceAfterTransfer = await publicClient.getBalance({ address: account.address });

    return NextResponse.json({
      ok: true,
      skipped: false,
      devWallet: account.address,
      rewardToken,
      claim: {
        attempted: claimEnabled,
        claimed,
        claimTxHash: claimTxHash || null,
        skippedReason: claimSkippedReason || null,
        pendingBeforeClaim: pendingBeforeClaim.toString(),
        pendingAfterClaim: pendingAfterClaim.toString()
      },
      transfer: {
        txHash: transferTxHash,
        blockNumber: transferReceipt.blockNumber.toString(),
        gasUsed: transferReceipt.gasUsed.toString(),
        amountWei: transferable.toString(),
        to: dividendAddress
      },
      balances: {
        beforeClaimWei: balanceBeforeClaim.toString(),
        afterClaimWei: balanceAfterClaim.toString(),
        afterTransferWei: balanceAfterTransfer.toString(),
        keepGasReserveWei: keepGasReserveWei.toString()
      },
      gas: {
        gasPriceWei: gasPrice.toString(),
        transferGasLimit: transferGasLimit.toString(),
        estimatedTransferFeeWei: transferFee.toString()
      }
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
