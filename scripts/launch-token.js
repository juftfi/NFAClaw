/* eslint-disable no-console */
require('dotenv').config();
const { ethers } = require('hardhat');

const PORTAL_ABI = [
  'function newTokenV5((string name,string symbol,string imageURI,string desc,string website,string twitter,string telegram,string discord,string custom),uint256 taxRate,uint256 mktBps,address beneficiary,uint8 migratorType,uint8 dexThresh,address quoteToken,uint256 quoteAmt,bytes32 salt) payable returns (address)'
];

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const portalAddress = requireEnv('FLAP_PORTAL_ADDRESS');
  const dividendAddress = requireEnv('DIVIDEND_ADDRESS');
  const salt = requireEnv('TOKEN_SALT');

  const portal = new ethers.Contract(portalAddress, PORTAL_ABI, deployer);

  const tokenInfo = {
    name: process.env.TOKEN_NAME || 'nfaclaw',
    symbol: process.env.TOKEN_SYMBOL || 'FCLAW',
    imageURI: process.env.TOKEN_IMG || '',
    desc: process.env.TOKEN_DESC || '',
    website: process.env.TOKEN_WEBSITE || '',
    twitter: process.env.TOKEN_TWITTER || '',
    telegram: process.env.TOKEN_TELEGRAM || '',
    discord: process.env.TOKEN_DISCORD || '',
    custom: process.env.TOKEN_CUSTOM || ''
  };

  const taxRate = Number(process.env.TAX_RATE || '100');
  const mktBps = Number(process.env.MKT_BPS || '10000');
  const migratorType = Number(process.env.MIGRATOR_TYPE || '2');
  const dexThresh = Number(process.env.DEX_THRESH || '4');
  const quoteToken = process.env.QUOTE_TOKEN || ethers.ZeroAddress;
  const quoteAmt = BigInt(process.env.QUOTE_AMT_WEI || ethers.parseEther('1').toString());

  console.log('Launching token via Flap newTokenV5 ...');

  const tx = await portal.newTokenV5(
    tokenInfo,
    taxRate,
    mktBps,
    dividendAddress,
    migratorType,
    dexThresh,
    quoteToken,
    quoteAmt,
    salt,
    { value: quoteToken === ethers.ZeroAddress ? quoteAmt : 0n }
  );

  const receipt = await tx.wait();
  console.log(`Launch tx hash: ${receipt.hash}`);

  const createdLog = receipt.logs.find((log) => log.address.toLowerCase() === portalAddress.toLowerCase());
  if (!createdLog) {
    console.log('No parsed event found. Read transaction logs manually for token address.');
  } else {
    console.log('Token launched. Parse portal event to extract token address.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
