# ZK-Verifiable AI Content (PoC)

This PoC demonstrates a minimal pattern to make an Agent/NFA's transcript **verifiable** without publishing the full content:

1. Hash each transcript item off-chain (e.g. `keccak256(message)`).
2. Build a Merkle tree of SNARK-friendly leaf hashes (e.g. Poseidon of `(msgHash, salt)`).
3. Commit the Merkle `root` on-chain per `tokenId` (agent identity).
4. Generate a ZK proof of inclusion: prove *a private transcript item is in the committed set*.

Honest boundary:
- This proves inclusion under a committed root, not that "training happened" or that a model was trained from that corpus.

Files:
- Circuit sketch: `zkp/circuits/transcript_inclusion.circom`
- On-chain registry PoC: `contracts/ZKTranscriptRegistry.sol`
- Verifier interface: `contracts/interfaces/IGroth16Verifier.sol`
- Hardhat test with mock verifier: `test/ZKTranscriptRegistry.test.js`

