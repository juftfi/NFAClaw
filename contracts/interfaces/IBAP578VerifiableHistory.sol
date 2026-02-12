// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Optional adapter extension for "verifiable history" style commitments.
/// @dev Non-breaking: adapters can implement this in addition to `IBAP578Adapter`.
interface IBAP578VerifiableHistory {
    /// @notice Registry/contract that stores transcript commitments.
    function transcriptRegistry() external view returns (address);

    /// @notice Latest transcript commitment for a given agent/NFA tokenId.
    function getTranscriptCommitment(uint256 tokenId) external view returns (bytes32 merkleRoot, uint64 committedAt);
}

