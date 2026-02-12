/* eslint-disable no-console */
const { getCreate2Address, zeroPadValue } = require('ethers');

function normalizeHex(hex) {
  if (!hex.startsWith('0x')) return `0x${hex}`;
  return hex;
}

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((part) => {
      const [k, v] = part.split('=');
      return [k.replace(/^--/, ''), v];
    })
  );

  return {
    deployer: normalizeHex(args.deployer || process.env.DEPLOYER_ADDRESS || ''),
    initCodeHash: normalizeHex(args.initCodeHash || process.env.INIT_CODE_HASH || ''),
    suffix: args.suffix || process.env.VANITY_SUFFIX || '7777',
    start: BigInt(args.start || '0'),
    max: BigInt(args.max || '5000000'),
  };
}

function isValidHexAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isValidHex32(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

async function main() {
  const { deployer, initCodeHash, suffix, start, max } = parseArgs();

  if (!isValidHexAddress(deployer)) {
    throw new Error('Invalid deployer address. Use --deployer=0x...');
  }
  if (!isValidHex32(initCodeHash)) {
    throw new Error('Invalid initCodeHash. Use --initCodeHash=0x...32bytes');
  }

  console.log(`Searching vanity salt for suffix: ${suffix}`);
  console.log(`deployer=${deployer}`);
  console.log(`initCodeHash=${initCodeHash}`);

  for (let i = start; i < start + max; i++) {
    const salt = zeroPadValue(`0x${i.toString(16)}`, 32);
    const address = getCreate2Address(deployer, salt, initCodeHash);

    if (address.toLowerCase().endsWith(suffix.toLowerCase())) {
      console.log('Found!');
      console.log(`salt=${salt}`);
      console.log(`address=${address}`);
      return;
    }

    if (i % 100000n === 0n) {
      console.log(`Checked ${i - start} candidates...`);
    }
  }

  console.log('No result in current range, increase --max or change deployer/initCodeHash');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
