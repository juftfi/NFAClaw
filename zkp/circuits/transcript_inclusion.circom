// Circom sketch (PoC-level) for proving transcript inclusion under a committed Merkle root.
//
// Public inputs:
// - root: committed transcript Merkle root for an agent/NFA
// - msgHash: hash of a transcript message (e.g. keccak256(message) mapped to field)
//
// Private inputs:
// - salt: per-leaf salt to avoid dictionary attacks on msgHash
// - pathElements / pathIndices: Merkle authentication path
//
// Note: This file is intentionally a sketch. To compile, wire in circomlib Poseidon and a Merkle path gadget.

pragma circom 2.1.6;

// include "circomlib/poseidon.circom";

template MerkleProof(levels) {
  signal input leaf;
  signal input pathElements[levels];
  signal input pathIndices[levels]; // 0 = left, 1 = right
  signal output root;

  signal cur;
  cur <== leaf;

  for (var i = 0; i < levels; i++) {
    // component h = Poseidon(2);
    // if pathIndices[i] == 0: h.inputs[0]=cur, h.inputs[1]=pathElements[i]
    // else:                h.inputs[0]=pathElements[i], h.inputs[1]=cur
    // cur <== h.out;
  }

  root <== cur;
}

template TranscriptInclusion(levels) {
  signal input root;      // public
  signal input msgHash;   // public

  signal input salt;      // private
  signal input pathElements[levels];
  signal input pathIndices[levels];

  // component leafH = Poseidon(2);
  // leafH.inputs[0] <== msgHash;
  // leafH.inputs[1] <== salt;

  component mp = MerkleProof(levels);
  // mp.leaf <== leafH.out;
  for (var i = 0; i < levels; i++) {
    mp.pathElements[i] <== pathElements[i];
    mp.pathIndices[i] <== pathIndices[i];
  }

  root === mp.root;
}

component main { public [root, msgHash] } = TranscriptInclusion(20);

