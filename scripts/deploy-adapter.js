/* eslint-disable no-console */
require('dotenv').config();
const { ethers } = require('hardhat');

function requireEnvAny(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error(`One of [${keys.join(', ')}] is required`);
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const nfaAddress = requireEnvAny(['ADAPTER_NFA_ADDRESS', 'MINER_ADDRESS']);

  const code = await ethers.provider.getCode(nfaAddress);
  if (code === '0x') {
    throw new Error(`NFA target is not a deployed contract: ${nfaAddress}`);
  }

  console.log(`Deploying BAP578Adapter with deployer: ${deployer.address}`);
  console.log(`Target NFA contract: ${nfaAddress}`);

  const BAP578Adapter = await ethers.getContractFactory('BAP578Adapter');
  const adapter = await BAP578Adapter.deploy(nfaAddress);
  await adapter.waitForDeployment();

  const adapterAddress = await adapter.getAddress();
  console.log(`BAP578Adapter deployed: ${adapterAddress}`);

  const boundNFA = await adapter.nfaContract();
  console.log(`Adapter nfaContract(): ${boundNFA}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
