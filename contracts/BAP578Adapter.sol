// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/access/Ownable.sol';

import './interfaces/IFlapNFAMiner.sol';
import './interfaces/IBAP578Adapter.sol';

contract BAP578Adapter is Ownable, IBAP578Adapter {
    IFlapNFAMiner private _nfaContract;

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

    function getAdapterStatus() external pure returns (AdapterStatus memory status) {
        status.profile = 'BAP-578-ALIGNED-ADAPTER-SKELETON';
        status.isBap578Aligned = true;
        status.hasFormalAdapterInterface = true;
        status.hasConformanceSuite = false;
    }

    function supportsAdapterInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IBAP578Adapter).interfaceId;
    }
}
