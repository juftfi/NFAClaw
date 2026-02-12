/* eslint-disable no-console */
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();

  const rewardToken = process.env.TOKEN_ADDRESS || ethers.ZeroAddress;
  const feeRecipient = process.env.FEE_RECIPIENT || deployer.address;
  const rewardUnit = process.env.REWARD_UNIT || ethers.parseEther('1').toString();

  console.log(`Deploying with address: ${deployer.address}`);
  console.log(`Reward token: ${rewardToken}`);
  console.log(`Fee recipient: ${feeRecipient}`);

  const FlapNFAMiner = await ethers.getContractFactory('FlapNFAMiner');
  const NFADividend = await ethers.getContractFactory('NFADividend');

  const dividend = await NFADividend.deploy(rewardToken, ethers.ZeroAddress);
  await dividend.waitForDeployment();

  const miner = await FlapNFAMiner.deploy(
    rewardToken,
    process.env.NFA_NAME || 'Flap NFA Placeholder',
    process.env.NFA_SYMBOL || 'FNFA',
    feeRecipient,
    rewardUnit
  );
  await miner.waitForDeployment();

  await (await dividend.setNFAContract(await miner.getAddress())).wait();
  await (await miner.setDividendContract(await dividend.getAddress())).wait();

  console.log(`FlapNFAMiner deployed: ${await miner.getAddress()}`);
  console.log(`NFADividend deployed: ${await dividend.getAddress()}`);
  console.log('Remember to set beneficiary=NFADividend in Flap newTokenV5 call.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
