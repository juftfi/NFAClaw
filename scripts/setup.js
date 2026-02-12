/* eslint-disable no-console */
require('dotenv').config();
const { ethers } = require('hardhat');

const IERC20_ABI = [
  'function transfer(address to,uint256 amount) external returns(bool)',
  'function balanceOf(address owner) external view returns(uint256)'
];

const MINER_ABI = [
  'function setRewardToken(address token) external',
  'function setDividendContract(address dividend) external',
  'function setDecayPeriod(uint256 decayPeriod) external',
  'function setMiningStartTime(uint256 miningStartTime) external',
  'function setMiningActive(bool active) external'
];

const DIVIDEND_ABI = [
  'function setRewardToken(address token) external',
  'function setNFAContract(address nfa) external'
];

function requireEnvAny(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error(`One of [${keys.join(', ')}] is required`);
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const minerAddress = requireEnvAny(['MINER_ADDRESS']);
  const dividendAddress = requireEnvAny(['DIVIDEND_ADDRESS']);
  const dividendNative = (process.env.DIVIDEND_NATIVE || '').toLowerCase() === 'true';
  const miningRewardTokenAddress = requireEnvAny([
    'MINING_REWARD_TOKEN_ADDRESS',
    'TOKEN_ADDRESS',
  ]);
  const dividendTokenAddress = dividendNative
    ? ethers.ZeroAddress
    : requireEnvAny([
        'DIVIDEND_TOKEN_ADDRESS',
        'TOKEN_ADDRESS',
      ]);
  const initialMiningRewardFund = BigInt(
    process.env.INITIAL_MINING_REWARD_FUND || process.env.INITIAL_REWARD_FUND || '0'
  );
  const initialDividendFund = BigInt(process.env.INITIAL_DIVIDEND_FUND || '0');
  const decayPeriodSeconds = process.env.DECAY_PERIOD_SECONDS
    ? BigInt(process.env.DECAY_PERIOD_SECONDS)
    : 0n;
  const miningStartTime = process.env.MINING_START_TIME
    ? BigInt(process.env.MINING_START_TIME)
    : 0n;

  const miner = new ethers.Contract(minerAddress, MINER_ABI, deployer);
  const dividend = new ethers.Contract(dividendAddress, DIVIDEND_ABI, deployer);
  const miningToken = new ethers.Contract(miningRewardTokenAddress, IERC20_ABI, deployer);
  const dividendToken = dividendNative
    ? null
    : new ethers.Contract(dividendTokenAddress, IERC20_ABI, deployer);

  await (await miner.setRewardToken(miningRewardTokenAddress)).wait();
  await (await miner.setDividendContract(dividendAddress)).wait();
  await (await dividend.setRewardToken(dividendTokenAddress)).wait();
  await (await dividend.setNFAContract(minerAddress)).wait();

  if (decayPeriodSeconds > 0n) {
    await (await miner.setDecayPeriod(decayPeriodSeconds)).wait();
    console.log(`Set decay period: ${decayPeriodSeconds} seconds`);
  }

  if (miningStartTime > 0n) {
    await (await miner.setMiningStartTime(miningStartTime)).wait();
    console.log(`Set mining start time: ${miningStartTime}`);
  }

  if (initialMiningRewardFund > 0n) {
    await (await miningToken.transfer(minerAddress, initialMiningRewardFund)).wait();
    console.log(`Transferred mining reward fund: ${initialMiningRewardFund}`);
  }

  if (initialDividendFund > 0n) {
    if (dividendNative) {
      await (
        await deployer.sendTransaction({
          to: dividendAddress,
          value: initialDividendFund
        })
      ).wait();
      console.log(`Transferred initial native dividend fund: ${initialDividendFund}`);
    } else {
      await (await dividendToken.transfer(dividendAddress, initialDividendFund)).wait();
      console.log(`Transferred initial dividend fund: ${initialDividendFund}`);
    }
  }

  await (await miner.setMiningActive(true)).wait();

  const minerBalance = await miningToken.balanceOf(minerAddress);
  const dividendBalance = dividendNative
    ? await ethers.provider.getBalance(dividendAddress)
    : await dividendToken.balanceOf(dividendAddress);
  console.log(`Setup done by ${deployer.address}`);
  console.log(`Mining token: ${miningRewardTokenAddress}`);
  console.log(`Dividend mode: ${dividendNative ? 'NATIVE_BNB' : 'ERC20'}`);
  console.log(`Dividend token: ${dividendTokenAddress}`);
  console.log(`Miner mining-token balance: ${minerBalance}`);
  console.log(`Dividend dividend-token balance: ${dividendBalance}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
