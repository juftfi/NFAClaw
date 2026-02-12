// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IGroth16Verifier} from '../interfaces/IGroth16Verifier.sol';

/// @notice Testing-only verifier stub.
/// @dev DO NOT deploy this to production.
contract MockGroth16Verifier is IGroth16Verifier {
    bool public result = true;

    function setResult(bool v) external {
        result = v;
    }

    function verifyProof(
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        uint256[2] calldata
    ) external view override returns (bool) {
        return result;
    }
}

