export type HexAddress = `0x${string}`;

export interface WalletAuthPayload {
  walletAddress: HexAddress;
  message: string;
  signature: `0x${string}`;
}

export interface ChatRequest {
  tokenId: number;
  walletAddress: HexAddress;
  message: string;
  signature: `0x${string}`;
  authMessage: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface PersonaTraitSet {
  tone: string;
  verbosity: string;
  catchphrase: string;
  emojiLevel: string;
}
