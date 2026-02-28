import { getAddress, recoverMessageAddress } from 'viem';

export async function verifyWalletSignature(params: {
  walletAddress: `0x${string}`;
  message: string;
  signature: `0x${string}`;
}): Promise<boolean> {
  const recovered = await recoverMessageAddress({
    message: params.message,
    signature: params.signature
  });

  return getAddress(recovered) === getAddress(params.walletAddress);
}

