// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import './interfaces/IERC20.sol';
import './interfaces/IFlapNFAMiner.sol';

contract NFADividend is Ownable, ReentrancyGuard {
    uint256 public constant MAGNITUDE = 2 ** 128;

    IERC20 public rewardToken;
    IFlapNFAMiner public nfaContract;

    uint256 public magnifiedDividendPerShare;
    uint256 public totalDistributed;
    uint256 public pendingIncoming;
    uint256 public lastRecordedBalance;

    mapping(address => int256) public magnifiedDividendCorrections;
    mapping(address => uint256) public withdrawnDividends;

    event RewardTokenUpdated(address indexed rewardToken);
    event NFAContractUpdated(address indexed nfaContract);
    event IncomingSynced(uint256 amount);
    event DividendsDistributed(uint256 amount, uint256 supply, uint256 magnifiedPerShare);
    event DividendClaimed(address indexed account, uint256 amount);
    event HolderSynced(address indexed from, address indexed to, uint256 amount);

    modifier onlyNFAContract() {
        require(msg.sender == address(nfaContract), 'only nfa contract');
        _;
    }

    constructor(address rewardToken_, address nfaContract_) {
        rewardToken = IERC20(rewardToken_);
        nfaContract = IFlapNFAMiner(nfaContract_);
        lastRecordedBalance = _currentBalance();
    }

    function setRewardToken(address rewardToken_) external onlyOwner {
        if (rewardToken_ != address(0)) {
            require(rewardToken_.code.length > 0, 'reward token is not contract');
        }
        rewardToken = IERC20(rewardToken_);
        lastRecordedBalance = _currentBalance();
        emit RewardTokenUpdated(rewardToken_);
    }

    function setNFAContract(address nfaContract_) external onlyOwner {
        require(nfaContract_ != address(0), 'nfa contract is zero');
        nfaContract = IFlapNFAMiner(nfaContract_);
        emit NFAContractUpdated(nfaContract_);
    }

    function syncIncoming() external returns (uint256 amount) {
        amount = _refreshIncoming();
    }

    function distribute() external {
        require(address(nfaContract) != address(0), 'nfa contract not set');
        _refreshIncoming();

        uint256 amount = pendingIncoming;
        require(amount > 0, 'no pending incoming');

        uint256 supply = nfaContract.totalSupply();
        require(supply > 0, 'no nfa minted');

        magnifiedDividendPerShare += (amount * MAGNITUDE) / supply;
        totalDistributed += amount;
        pendingIncoming = 0;

        emit DividendsDistributed(amount, supply, magnifiedDividendPerShare);
    }

    function onNFATransfer(address from, address to, uint256 amount) external onlyNFAContract {
        if (amount == 0 || from == to) {
            return;
        }

        int256 correction = int256(magnifiedDividendPerShare * amount);

        if (from != address(0)) {
            magnifiedDividendCorrections[from] += correction;
        }

        if (to != address(0)) {
            magnifiedDividendCorrections[to] -= correction;
        }

        emit HolderSynced(from, to, amount);
    }

    function claimDividend() external nonReentrant returns (uint256 amount) {
        _refreshIncoming();

        amount = withdrawableDividendOf(msg.sender);
        require(amount > 0, 'nothing to claim');

        withdrawnDividends[msg.sender] += amount;
        lastRecordedBalance -= amount;

        if (address(rewardToken) == address(0)) {
            (bool success, ) = payable(msg.sender).call{value: amount}('');
            require(success, 'claim native transfer failed');
        } else {
            require(rewardToken.transfer(msg.sender, amount), 'claim transfer failed');
        }
        emit DividendClaimed(msg.sender, amount);
    }

    function pendingDividend(address account) external view returns (uint256) {
        return withdrawableDividendOf(account);
    }

    function withdrawableDividendOf(address account) public view returns (uint256) {
        uint256 accumulative = accumulativeDividendOf(account);
        uint256 withdrawn = withdrawnDividends[account];
        if (accumulative <= withdrawn) {
            return 0;
        }
        return accumulative - withdrawn;
    }

    function accumulativeDividendOf(address account) public view returns (uint256) {
        if (address(nfaContract) == address(0)) {
            return 0;
        }

        uint256 holderBalance = nfaContract.balanceOf(account);

        int256 magnified = int256(magnifiedDividendPerShare * holderBalance) +
            magnifiedDividendCorrections[account];

        if (magnified <= 0) {
            return 0;
        }

        return uint256(magnified) / MAGNITUDE;
    }

    function _refreshIncoming() internal returns (uint256 amount) {
        uint256 currentBalance = _currentBalance();
        if (currentBalance > lastRecordedBalance) {
            uint256 incoming = currentBalance - lastRecordedBalance;
            pendingIncoming += incoming;
            emit IncomingSynced(incoming);
        }

        lastRecordedBalance = currentBalance;
        amount = pendingIncoming;
    }

    function _currentBalance() internal view returns (uint256) {
        if (address(rewardToken) == address(0)) {
            return address(this).balance;
        }
        return rewardToken.balanceOf(address(this));
    }

    receive() external payable {}
}
