// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice View-only interface for reading transcript commitments.
interface IZKTranscriptRegistryView {
    function commitmentOf(uint256 tokenId) external view returns (bytes32 merkleRoot, uint64 committedAt);
}

