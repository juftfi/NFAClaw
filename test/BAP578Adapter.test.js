const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('BAP578Adapter', function () {
  async function deployFixture() {
    const [owner, alice, feeRecipient] = await ethers.getSigners();

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

    const BAP578Adapter = await ethers.getContractFactory('BAP578Adapter');
    const adapter = await BAP578Adapter.deploy(await miner.getAddress());

    return { owner, alice, token, miner, adapter };
  }

  it('returns empty view for non-existing token', async function () {
    const { adapter } = await deployFixture();

    const viewData = await adapter.getAgentView(1n);
    expect(viewData.tokenId).to.equal(1n);
    expect(viewData.exists).to.equal(false);
    expect(viewData.owner).to.equal(ethers.ZeroAddress);
    expect(viewData.active).to.equal(false);
  });

  it('maps owner and identity fields for minted token', async function () {
    const { alice, miner, adapter } = await deployFixture();

    await miner.connect(alice).mine();
    const pending = await miner.getPendingMine(alice.address);
    await miner.connect(alice).mintNFA('', { value: ethers.parseEther('0.01') });

    const viewData = await adapter.getAgentView(1n);
    expect(viewData.exists).to.equal(true);
    expect(viewData.active).to.equal(true);
    expect(viewData.owner).to.equal(alice.address);
    expect(viewData.roleId).to.equal(pending.roleId);
    expect(viewData.traitSeed).to.equal(pending.traitSeed);
    expect(viewData.mintedAt).to.be.gt(0n);
  });

  it('allows owner to update target nfa contract', async function () {
    const { adapter, owner, token } = await deployFixture();

    const signers = await ethers.getSigners();
    const feeRecipient = signers[2];
    const FlapNFAMiner = await ethers.getContractFactory('FlapNFAMiner');
    const anotherMiner = await FlapNFAMiner.deploy(
      await token.getAddress(),
      'Flap NFA V2',
      'FNF2',
      feeRecipient.address,
      ethers.parseEther('1')
    );

    await expect(adapter.connect(owner).setNFAContract(await anotherMiner.getAddress()))
      .to.emit(adapter, 'NFAContractUpdated');

    expect(await adapter.nfaContract()).to.equal(await anotherMiner.getAddress());
  });

  it('rejects non-owner contract updates', async function () {
    const { adapter, alice } = await deployFixture();
    await expect(adapter.connect(alice).setNFAContract(ethers.ZeroAddress)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    );
  });

  it('exposes adapter status and interface support', async function () {
    const { adapter } = await deployFixture();

    const status = await adapter.getAdapterStatus();
    expect(status.isBap578Aligned).to.equal(true);
    expect(status.hasFormalAdapterInterface).to.equal(true);
    expect(status.hasConformanceSuite).to.equal(false);

    const selector = (signature) => BigInt(ethers.id(signature).slice(0, 10));
    expect(await adapter.supportsAdapterInterface(ethers.id('nfaContract()').slice(0, 10))).to.equal(false);
    const ibap578InterfaceId =
      selector('nfaContract()') ^
      selector('getAgentView(uint256)') ^
      selector('getAdapterStatus()') ^
      selector('supportsAdapterInterface(bytes4)');

    const interfaceId = `0x${ibap578InterfaceId.toString(16).padStart(8, '0')}`;
    expect(await adapter.supportsAdapterInterface(interfaceId)).to.equal(true);
  });
});
