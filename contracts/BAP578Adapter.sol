// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/access/Ownable.sol';

import './interfaces/IFlapNFAMiner.sol';
import './interfaces/IBAP578Adapter.sol';
import './interfaces/IBAP578VerifiableHistory.sol';
import './interfaces/IZKTranscriptRegistryView.sol';

contract BAP578Adapter is Ownable, IBAP578Adapter, IBAP578VerifiableHistory {
    IFlapNFAMiner private _nfaContract;
    address public transcriptRegistry;

    event TranscriptRegistryUpdated(address indexed previousRegistry, address indexed newRegistry);

    constructor(address nfaContract_) {
        require(nfaContract_ != address(0), 'nfa contract is zero');
        _nfaContract = IFlapNFAMiner(nfaContract_);
    }

    function setNFAContract(address nfaContract_) external onlyOwner {
        require(nfaContract_ != address(0), 'nfa contract is zero');

        address previous = address(_nfaContract);
        _nfaContract = IFlapNFAMiner(nfaContract_);

        emit NFAContractUpdated(previous, nfaContract_);
    }

    function setTranscriptRegistry(address registry_) external onlyOwner {
        address previous = transcriptRegistry;
        transcriptRegistry = registry_;
        emit TranscriptRegistryUpdated(previous, registry_);
    }

    function nfaContract() external view returns (address) {
        return address(_nfaContract);
    }

    function getAgentView(uint256 tokenId) external view returns (AdapterAgentView memory viewData) {
        viewData.tokenId = tokenId;

        address owner;
        try _nfaContract.ownerOf(tokenId) returns (address tokenOwner) {
            owner = tokenOwner;
        } catch {
            return viewData;
        }

        viewData.owner = owner;
        viewData.exists = true;
        viewData.active = true;

        try _nfaContract.getAgentIdentity(tokenId) returns (IFlapNFAMiner.AgentIdentity memory idData) {
            viewData.roleId = idData.roleId;
            viewData.traitSeed = idData.traitSeed;
            viewData.mintedAt = idData.mintedAt;
        } catch {
            // Keep default metadata fields when identity extension is not available.
        }
    }

    function getTranscriptCommitment(uint256 tokenId) external view returns (bytes32 merkleRoot, uint64 committedAt) {
        address reg = transcriptRegistry;
        if (reg == address(0)) return (bytes32(0), 0);

        try IZKTranscriptRegistryView(reg).commitmentOf(tokenId) returns (bytes32 root, uint64 ts) {
            return (root, ts);
        } catch {
            return (bytes32(0), 0);
        }
    }

    function getAdapterStatus() external pure returns (AdapterStatus memory status) {
        status.profile = 'BAP-578-ALIGNED-ADAPTER-SKELETON';
        status.isBap578Aligned = true;
        status.hasFormalAdapterInterface = true;
        status.hasConformanceSuite = false;
    }

    function supportsAdapterInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == type(IBAP578Adapter).interfaceId ||
            interfaceId == type(IBAP578VerifiableHistory).interfaceId;
    }
}
