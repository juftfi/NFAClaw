require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const {
  DEPLOYER_PRIVATE_KEY,
  BSC_TESTNET_RPC_URL,
  BSC_MAINNET_RPC_URL,
  BSCSCAN_API_KEY,
} = process.env;

const normalizedPk = (DEPLOYER_PRIVATE_KEY || '').replace(/^0x/, '');
const privateKey = normalizedPk.length === 64
  ? `0x${normalizedPk}`
  : '0x0000000000000000000000000000000000000000000000000000000000000000';

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    bsctestnet: {
      url: BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      accounts: privateKey === '0x0000000000000000000000000000000000000000000000000000000000000000' ? [] : [privateKey]
    },
    bscmainnet: {
      url: BSC_MAINNET_RPC_URL || 'https://bsc-dataseed.binance.org/',
      chainId: 56,
      accounts: privateKey === '0x0000000000000000000000000000000000000000000000000000000000000000' ? [] : [privateKey]
    }
  },
  etherscan: {
    apiKey: {
      bsc: BSCSCAN_API_KEY || '',
      bscTestnet: BSCSCAN_API_KEY || ''
    }
  }
};
