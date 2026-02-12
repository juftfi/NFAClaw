// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {EIP712} from '@openzeppelin/contracts/utils/cryptography/EIP712.sol';
import {ECDSA} from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import {IERC721} from '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import {IGroth16Verifier} from './interfaces/IGroth16Verifier.sol';

/// @notice PoC registry for "verifiable AI content" commitments per agent/NFA.
/// @dev This is intentionally minimal:
/// - On-chain stores only a commitment root (bytes32).
/// - Verification relies on an external Groth16 verifier contract for a specific circuit.
/// - This does NOT prove "training happened", only that some transcript item is included in a committed set.
contract ZKTranscriptRegistry is Ownable, EIP712 {
    struct Commitment {
        bytes32 merkleRoot;
        uint64 committedAt;
    }

    IERC721 public immutable nfa;

    /// @dev tokenId => commitment root for that agent/NFA.
    mapping(uint256 => Commitment) public commitmentOf;

    /// @dev Circuit-specific verifier (Groth16).
    IGroth16Verifier public verifier;

    /// @dev Nonce by token owner for signature-based commits.
    mapping(address => uint256) public nonces;

    bytes32 public constant COMMIT_TYPEHASH =
        keccak256('Commit(uint256 tokenId,bytes32 merkleRoot,uint256 nonce,uint256 deadline)');

    event VerifierUpdated(address indexed verifier);
    event TranscriptCommitted(uint256 indexed tokenId, bytes32 indexed merkleRoot, address indexed committer);

    constructor(address verifier_, address nfa_) EIP712('ZKTranscriptRegistry', '1') {
        verifier = IGroth16Verifier(verifier_);
        nfa = IERC721(nfa_);
        emit VerifierUpdated(verifier_);
    }

    function setVerifier(address verifier_) external onlyOwner {
        verifier = IGroth16Verifier(verifier_);
        emit VerifierUpdated(verifier_);
    }

    /// @notice Commit/rotate the transcript Merkle root for a given tokenId.
    /// @dev Commit is gated by ERC721 owner/approval (agent uniqueness anchored to token ownership).
    function commitTranscript(uint256 tokenId, bytes32 merkleRoot) external {
        require(_isApprovedOrOwner(msg.sender, tokenId), 'not token owner/approved');
        commitmentOf[tokenId] = Commitment({merkleRoot: merkleRoot, committedAt: uint64(block.timestamp)});
        emit TranscriptCommitted(tokenId, merkleRoot, msg.sender);
    }

    /// @notice Commit by EIP-712 signature from the token owner (agent-server can submit on their behalf).
    function commitTranscriptBySig(
        uint256 tokenId,
        bytes32 merkleRoot,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, 'expired');

        address owner = nfa.ownerOf(tokenId);
        uint256 nonce = nonces[owner]++;

        bytes32 structHash = keccak256(abi.encode(COMMIT_TYPEHASH, tokenId, merkleRoot, nonce, deadline));
        bytes32 digest = _hashTypedDataV4(structHash);

        address recovered = ECDSA.recover(digest, signature);
        require(recovered == owner, 'bad sig');

        commitmentOf[tokenId] = Commitment({merkleRoot: merkleRoot, committedAt: uint64(block.timestamp)});
        emit TranscriptCommitted(tokenId, merkleRoot, msg.sender);
    }

    /// @notice Verify a ZK inclusion proof that a private transcript item is part of the committed set.
    /// @dev Expected public inputs (snarkjs `input`):
    /// - input[0] = merkleRoot (field element form)
    /// - input[1] = msgHash   (field element form), e.g. keccak256(msg) reduced to the SNARK field
    function verifyInclusion(
        uint256 tokenId,
        bytes32 merkleRoot,
        bytes32 msgHash,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[2] calldata input
    ) external view returns (bool) {
        Commitment memory cmt = commitmentOf[tokenId];
        if (cmt.merkleRoot == bytes32(0)) return false;

        // Bind proof to the committed root and the claimed message hash.
        // NOTE: In a real system you'd define a canonical "bytes32 -> field" mapping.
        if (merkleRoot != cmt.merkleRoot) return false;
        if (bytes32(input[0]) != merkleRoot) return false;
        if (bytes32(input[1]) != msgHash) return false;

        return verifier.verifyProof(a, b, c, input);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = nfa.ownerOf(tokenId);
        return spender == owner || nfa.getApproved(tokenId) == spender || nfa.isApprovedForAll(owner, spender);
    }
}
