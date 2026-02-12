const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ZKTranscriptRegistry (PoC)', function () {
  it('verifies only when root+msgHash are bound and verifier returns true', async function () {
    const [deployer] = await ethers.getSigners();

    const MockERC721 = await ethers.getContractFactory('MockERC721');
    const nfa = await MockERC721.deploy('MockNFA', 'MNFA');
    await nfa.waitForDeployment();

    const tokenId = 1n;
    await nfa.mint(deployer.address, tokenId);

    const MockVerifier = await ethers.getContractFactory('MockGroth16Verifier');
    const mockVerifier = await MockVerifier.deploy();

    const Registry = await ethers.getContractFactory('ZKTranscriptRegistry');
    const registry = await Registry.deploy(await mockVerifier.getAddress(), await nfa.getAddress());

    const root = ethers.keccak256(ethers.toUtf8Bytes('root-1'));
    const msgHash = ethers.keccak256(ethers.toUtf8Bytes('hello transcript'));

    await registry.connect(deployer).commitTranscript(tokenId, root);

    const a = [0, 0];
    const b = [
      [0, 0],
      [0, 0],
    ];
    const c = [0, 0];

    // Public signals: [root, msgHash]
    const input = [BigInt(root), BigInt(msgHash)];

    expect(
      await registry.verifyInclusion(tokenId, root, msgHash, a, b, c, input)
    ).to.equal(true);

    // Wrong root binding => false even if verifier stub returns true.
    const otherRoot = ethers.keccak256(ethers.toUtf8Bytes('root-2'));
    expect(
      await registry.verifyInclusion(tokenId, otherRoot, msgHash, a, b, c, input)
    ).to.equal(false);

    // Verifier returning false => false.
    await mockVerifier.setResult(false);
    expect(
      await registry.verifyInclusion(tokenId, root, msgHash, a, b, c, input)
    ).to.equal(false);
  });

  it('allows commit by owner signature (EIP-712)', async function () {
    const [owner, relayer] = await ethers.getSigners();

    const MockERC721 = await ethers.getContractFactory('MockERC721');
    const nfa = await MockERC721.deploy('MockNFA', 'MNFA');
    await nfa.waitForDeployment();

    const tokenId = 7n;
    await nfa.mint(owner.address, tokenId);

    const MockVerifier = await ethers.getContractFactory('MockGroth16Verifier');
    const mockVerifier = await MockVerifier.deploy();

    const Registry = await ethers.getContractFactory('ZKTranscriptRegistry');
    const registry = await Registry.deploy(await mockVerifier.getAddress(), await nfa.getAddress());

    const root = ethers.keccak256(ethers.toUtf8Bytes('root-by-sig'));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const nonce = await registry.nonces(owner.address);

    const domain = {
      name: 'ZKTranscriptRegistry',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await registry.getAddress(),
    };

    const types = {
      Commit: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'merkleRoot', type: 'bytes32' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const value = { tokenId, merkleRoot: root, nonce, deadline };
    const sig = await owner.signTypedData(domain, types, value);

    await registry.connect(relayer).commitTranscriptBySig(tokenId, root, deadline, sig);

    const cmt = await registry.commitmentOf(tokenId);
    expect(cmt.merkleRoot).to.equal(root);
  });
});
