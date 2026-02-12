const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('NFADividend', function () {
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

    const NFADividend = await ethers.getContractFactory('NFADividend');
    const dividend = await NFADividend.deploy(await token.getAddress(), await miner.getAddress());

    await miner.setDividendContract(await dividend.getAddress());
    await miner.setMiningActive(true);

    await token.mint(await miner.getAddress(), ethers.parseEther('200000000'));
    await token.mint(owner.address, ethers.parseEther('200000000'));

    return { owner, alice, bob, token, miner, dividend };
  }

  it('distributes tax pool proportionally to NFA holdings and handles transfer sync', async function () {
    const { owner, alice, bob, token, miner, dividend } = await deployFixture();

    await miner.connect(alice).mine();
    await miner.connect(alice).mintNFA('', { value: ethers.parseEther('0.01') });

    await miner.connect(bob).mine();
    await miner.connect(bob).mintNFA('', { value: ethers.parseEther('0.01') });

    await token.connect(owner).transfer(await dividend.getAddress(), ethers.parseEther('1000'));
    await dividend.distribute();

    expect(await dividend.withdrawableDividendOf(alice.address)).to.equal(ethers.parseEther('500'));
    expect(await dividend.withdrawableDividendOf(bob.address)).to.equal(ethers.parseEther('500'));

    await miner.connect(alice).transferFrom(alice.address, bob.address, 1n);

    await token.connect(owner).transfer(await dividend.getAddress(), ethers.parseEther('1000'));
    await dividend.distribute();

    expect(await dividend.withdrawableDividendOf(alice.address)).to.equal(ethers.parseEther('500'));
    expect(await dividend.withdrawableDividendOf(bob.address)).to.equal(ethers.parseEther('1500'));

    const aliceBefore = await token.balanceOf(alice.address);
    const bobBefore = await token.balanceOf(bob.address);

    await dividend.connect(alice).claimDividend();
    await dividend.connect(bob).claimDividend();

    const aliceAfter = await token.balanceOf(alice.address);
    const bobAfter = await token.balanceOf(bob.address);

    expect(aliceAfter - aliceBefore).to.equal(ethers.parseEther('500'));
    expect(bobAfter - bobBefore).to.equal(ethers.parseEther('1500'));
  });

  it('supports native BNB dividends while mining rewards stay in token', async function () {
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

    const NFADividend = await ethers.getContractFactory('NFADividend');
    const dividend = await NFADividend.deploy(ethers.ZeroAddress, await miner.getAddress());

    await miner.setDividendContract(await dividend.getAddress());
    await miner.setMiningActive(true);

    await token.mint(await miner.getAddress(), ethers.parseEther('200000000'));

    await miner.connect(alice).mine();
    await miner.connect(alice).mintNFA('', { value: ethers.parseEther('0.01') });

    await miner.connect(bob).mine();
    await miner.connect(bob).mintNFA('', { value: ethers.parseEther('0.01') });

    await owner.sendTransaction({
      to: await dividend.getAddress(),
      value: ethers.parseEther('1')
    });
    await dividend.distribute();

    expect(await dividend.withdrawableDividendOf(alice.address)).to.equal(ethers.parseEther('0.5'));
    expect(await dividend.withdrawableDividendOf(bob.address)).to.equal(ethers.parseEther('0.5'));

    await miner.connect(alice).transferFrom(alice.address, bob.address, 1n);

    await owner.sendTransaction({
      to: await dividend.getAddress(),
      value: ethers.parseEther('1')
    });
    await dividend.distribute();

    expect(await dividend.withdrawableDividendOf(alice.address)).to.equal(ethers.parseEther('0.5'));
    expect(await dividend.withdrawableDividendOf(bob.address)).to.equal(ethers.parseEther('1.5'));

    await dividend.connect(alice).claimDividend();
    await dividend.connect(bob).claimDividend();

    expect(await dividend.withdrawnDividends(alice.address)).to.equal(ethers.parseEther('0.5'));
    expect(await dividend.withdrawnDividends(bob.address)).to.equal(ethers.parseEther('1.5'));
    expect(await ethers.provider.getBalance(await dividend.getAddress())).to.equal(0n);
  });
});
