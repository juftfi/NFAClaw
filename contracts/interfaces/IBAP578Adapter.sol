// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBAP578Adapter {
    struct AdapterAgentView {
        uint256 tokenId;
        address owner;
        uint8 roleId;
        bytes32 traitSeed;
        uint256 mintedAt;
        bool exists;
        bool active;
    }

    struct AdapterStatus {
        string profile;
        bool isBap578Aligned;
        bool hasFormalAdapterInterface;
        bool hasConformanceSuite;
    }

    event NFAContractUpdated(address indexed previousContract, address indexed newContract);

    function nfaContract() external view returns (address);

    function getAgentView(uint256 tokenId) external view returns (AdapterAgentView memory);

    function getAdapterStatus() external pure returns (AdapterStatus memory);

    function supportsAdapterInterface(bytes4 interfaceId) external pure returns (bool);
}
