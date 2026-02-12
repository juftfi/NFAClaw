// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFlapNFAMiner {
    struct AgentIdentity {
        uint8 roleId;
        bytes32 traitSeed;
        uint256 mintedAt;
    }

    function balanceOf(address owner) external view returns (uint256);

    function ownerOf(uint256 tokenId) external view returns (address);

    function totalSupply() external view returns (uint256);

    function getAgentIdentity(uint256 tokenId) external view returns (AgentIdentity memory);
}
