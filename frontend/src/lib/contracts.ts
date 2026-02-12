import { parseAbi } from 'viem';

export const MINER_ABI = parseAbi([
  'function mine() returns ((bool exists,uint256 rewardAmount,uint8 roleId,bytes32 traitSeed,uint256 startedAt))',
  'function mineWithNonce(uint256 blockNumber,uint256 nonce) returns ((bool exists,uint256 rewardAmount,uint8 roleId,bytes32 traitSeed,uint256 startedAt))',
  'function mintNFA(string metadataURI) payable returns (uint256)',
  'function getPendingMine(address user) view returns ((bool exists,uint256 rewardAmount,uint8 roleId,bytes32 traitSeed,uint256 startedAt))',
  'function calculateReward(uint256 minedCount) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner,uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function getAgentIdentity(uint256 tokenId) view returns ((uint8 roleId, bytes32 traitSeed, uint256 mintedAt))',
  'function powTarget() view returns (uint256)'
]);

export const DIVIDEND_ABI = parseAbi([
  'function pendingDividend(address account) view returns (uint256)',
  'function rewardToken() view returns (address)',
  'function claimDividend() returns (uint256)'
]);

export const ERC20_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)'
]);
