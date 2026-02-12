const { expect } = require('chai');
const { ethers } = require('hardhat');

async function increaseTime(seconds) {
  await ethers.provider.send('evm_increaseTime', [seconds]);
  await ethers.provider.send('evm_mine');
}

describe('FlapNFAMiner', function () {
  async function deployFixture() {
    const [owner, alice, bob, feeRecipient] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory('MockERC20');
    const token = await MockERC20.deploy('Reward Token', 'RWT');

    const FlapNFAMiner = await ethers.getContractFactory('FlapNFAMiner');
    const miner = await FlapNFAMiner.deploy(
      await token.getAddress(),
      'Flap NFA',
      'FNFA',
      feeRecipient.address,
      ethers.parseEther('1')
    );

    await token.mint(await miner.getAddress(), ethers.parseEther('200000000'));
    await miner.setMiningActive(true);

    return { owner, alice, bob, feeRecipient, token, miner };
  }

  it('allows user to mine and mint NFA with full reward', async function () {
    const { alice, feeRecipient, token, miner } = await deployFixture();

    await miner.connect(alice).mine();
    const pending = await miner.getPendingMine(alice.address);

    expect(pending.exists).to.equal(true);
    expect(pending.rewardAmount).to.be.gt(0n);

    const aliceTokenBefore = await token.balanceOf(alice.address);
    const feeBefore = await ethers.provider.getBalance(feeRecipient.address);

    await miner.connect(alice).mintNFA('', { value: ethers.parseEther('0.01') });

    const aliceTokenAfter = await token.balanceOf(alice.address);
    const feeAfter = await ethers.provider.getBalance(feeRecipient.address);
    const pendingAfter = await miner.getPendingMine(alice.address);
    const identity = await miner.getAgentIdentity(1n);

    expect(aliceTokenAfter - aliceTokenBefore).to.equal(pending.rewardAmount);
    expect(feeAfter - feeBefore).to.equal(ethers.parseEther('0.01'));
    expect(await miner.ownerOf(1n)).to.equal(alice.address);
    expect(identity.traitSeed).to.equal(pending.traitSeed);
    expect(identity.roleId).to.equal(pending.roleId);
    expect(pendingAfter.exists).to.equal(false);
  });

  it('enforces cooldown and clears pending mine on mint', async function () {
    const { alice, token, miner } = await deployFixture();

    await miner.connect(alice).mine();

    await expect(miner.connect(alice).mine()).to.be.revertedWith('pending mine exists');

    const pending = await miner.getPendingMine(alice.address);
    const before = await token.balanceOf(alice.address);

    await miner.connect(alice).mintNFA('', { value: ethers.parseEther('0.01') });

    const after = await token.balanceOf(alice.address);
    expect(after - before).to.equal(pending.rewardAmount);

    await expect(miner.connect(alice).mine()).to.be.revertedWith('cooldown not passed');

    await increaseTime(121);
    await miner.connect(alice).mine();

    const nextPending = await miner.getPendingMine(alice.address);
    expect(nextPending.exists).to.equal(true);
  });

  it('allows mineWithNonce when pow target is loose', async function () {
    const { alice, miner } = await deployFixture();

    await miner.setPowTarget(ethers.MaxUint256);
    await ethers.provider.send('evm_mine');
    const current = await ethers.provider.getBlockNumber();
    const blockNumber = current - 1;

    await miner.connect(alice).mineWithNonce(blockNumber, 0);
    const pending = await miner.getPendingMine(alice.address);
    expect(pending.exists).to.equal(true);
  });
});
