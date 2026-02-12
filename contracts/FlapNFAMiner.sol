// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

import './interfaces/IERC20.sol';
import './interfaces/IDividendSync.sol';

contract FlapNFAMiner is ERC721Enumerable, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 7777;
    uint256 public constant MINT_FEE = 0.01 ether;
    uint256 public constant MAX_PER_WALLET = 15;
    uint256 public constant COOLDOWN = 120;
    uint256 public constant ALPHA_WAD = 3030000000000000000; // 3.03 * 1e18
    uint256 public constant TIME_WEIGHT_WAD = 1000000000000000000; // 1.0 * 1e18
    uint256 public powTarget;

    struct AgentIdentity {
        uint8 roleId;
        bytes32 traitSeed;
        uint256 mintedAt;
    }

    struct PendingMine {
        bool exists;
        uint256 rewardAmount;
        uint8 roleId;
        bytes32 traitSeed;
        uint256 startedAt;
    }

    IERC20 public rewardToken;
    address public feeRecipient;
    address public dividendContract;
    string public baseTokenURI;

    bool public miningActive;
    uint8 public roleCount;
    uint256 public rewardUnit;
    uint256 public miningStartTime;
    uint256 public decayPeriod;

    uint256 public nextTokenId;
    uint256 public totalMinedAttempts;

    mapping(address => uint256) public lastMineTime;
    mapping(address => uint256) public walletMintCount;
    mapping(address => PendingMine) private _pendingMines;
    mapping(uint256 => AgentIdentity) public agentIdentities;

    event MiningStatusChanged(bool active);
    event RewardTokenUpdated(address indexed token);
    event DividendContractUpdated(address indexed dividendContract);
    event FeeRecipientUpdated(address indexed feeRecipient);
    event RoleCountUpdated(uint8 roleCount);
    event RewardUnitUpdated(uint256 rewardUnit);
    event BaseTokenURIUpdated(string baseTokenURI);
    event MiningStartTimeSet(uint256 miningStartTime);
    event DecayPeriodUpdated(uint256 decayPeriod);
    event PowTargetUpdated(uint256 powTarget);

    event MiningStarted(
        address indexed user,
        uint256 rewardAmount,
        uint8 roleId,
        bytes32 traitSeed,
        uint256 startedAt
    );

    event NFAMinted(
        address indexed user,
        uint256 indexed tokenId,
        uint256 rewardAmount,
        uint8 roleId,
        bytes32 traitSeed,
        string tokenURIValue
    );

    event PendingMineCanceled(address indexed user);

    constructor(
        address rewardToken_,
        string memory name_,
        string memory symbol_,
        address feeRecipient_,
        uint256 rewardUnit_
    ) ERC721(name_, symbol_) {
        require(feeRecipient_ != address(0), 'fee recipient is zero');
        require(rewardUnit_ > 0, 'reward unit is zero');

        rewardToken = IERC20(rewardToken_);
        feeRecipient = feeRecipient_;
        rewardUnit = rewardUnit_;

        roleCount = 16;
        nextTokenId = 1;
        decayPeriod = 90 days;
        powTarget = type(uint256).max / (2 ** 24);
    }

    function setMiningActive(bool active) external onlyOwner {
        if (active && miningStartTime == 0) {
            miningStartTime = block.timestamp;
            emit MiningStartTimeSet(miningStartTime);
        }
        miningActive = active;
        emit MiningStatusChanged(active);
    }

    function setRewardToken(address rewardToken_) external onlyOwner {
        require(rewardToken_ != address(0), 'reward token is zero');
        require(rewardToken_.code.length > 0, 'reward token is not contract');
        rewardToken = IERC20(rewardToken_);
        emit RewardTokenUpdated(rewardToken_);
    }

    function setDividendContract(address dividendContract_) external onlyOwner {
        if (dividendContract_ != address(0)) {
            require(dividendContract_.code.length > 0, 'dividend contract is not contract');
        }
        dividendContract = dividendContract_;
        emit DividendContractUpdated(dividendContract_);
    }

    function setFeeRecipient(address feeRecipient_) external onlyOwner {
        require(feeRecipient_ != address(0), 'fee recipient is zero');
        feeRecipient = feeRecipient_;
        emit FeeRecipientUpdated(feeRecipient_);
    }

    function setRoleCount(uint8 roleCount_) external onlyOwner {
        require(roleCount_ > 0, 'role count is zero');
        roleCount = roleCount_;
        emit RoleCountUpdated(roleCount_);
    }

    function setRewardUnit(uint256 rewardUnit_) external onlyOwner {
        require(rewardUnit_ > 0, 'reward unit is zero');
        rewardUnit = rewardUnit_;
        emit RewardUnitUpdated(rewardUnit_);
    }

    function setMiningStartTime(uint256 miningStartTime_) external onlyOwner {
        require(miningStartTime_ > 0, 'start time is zero');
        miningStartTime = miningStartTime_;
        emit MiningStartTimeSet(miningStartTime_);
    }

    function setDecayPeriod(uint256 decayPeriod_) external onlyOwner {
        require(decayPeriod_ >= 1 days, 'decay too short');
        decayPeriod = decayPeriod_;
        emit DecayPeriodUpdated(decayPeriod_);
    }

    function setBaseTokenURI(string calldata baseTokenURI_) external onlyOwner {
        baseTokenURI = baseTokenURI_;
        emit BaseTokenURIUpdated(baseTokenURI_);
    }

    function setPowTarget(uint256 powTarget_) external onlyOwner {
        require(powTarget_ > 0, 'pow target is zero');
        powTarget = powTarget_;
        emit PowTargetUpdated(powTarget_);
    }

    function getPendingMine(address user) external view returns (PendingMine memory) {
        return _pendingMines[user];
    }

    function getAgentIdentity(uint256 tokenId) external view returns (AgentIdentity memory) {
        require(_exists(tokenId), 'token does not exist');
        return agentIdentities[tokenId];
    }

    function mine() external returns (PendingMine memory pendingMine) {
        require(miningActive, 'mining inactive');
        require(totalSupply() < MAX_SUPPLY, 'sold out');
        require(address(rewardToken) != address(0), 'reward token not set');

        _requireMineReady();

        bytes32 traitSeed = keccak256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                blockhash(block.number - 1),
                block.prevrandao,
                totalMinedAttempts
            )
        );

        pendingMine = _startMine(traitSeed);
    }

    function mineWithNonce(
        uint256 blockNumber,
        uint256 nonce
    ) external returns (PendingMine memory pendingMine) {
        require(miningActive, 'mining inactive');
        require(totalSupply() < MAX_SUPPLY, 'sold out');
        require(address(rewardToken) != address(0), 'reward token not set');

        _requireMineReady();
        require(blockNumber < block.number, 'invalid block number');
        bytes32 bh = blockhash(blockNumber);
        require(bh != bytes32(0), 'blockhash unavailable');

        bytes32 powHash = keccak256(abi.encodePacked(msg.sender, blockNumber, bh, nonce));
        require(uint256(powHash) <= powTarget, 'invalid nonce');

        bytes32 traitSeed = keccak256(
            abi.encodePacked(powHash, msg.sender, totalMinedAttempts, block.prevrandao)
        );
        pendingMine = _startMine(traitSeed);
    }

    function mintNFA(string calldata metadataURI) external payable nonReentrant returns (uint256 tokenId) {
        PendingMine memory pendingMine = _requirePendingMine(msg.sender);

        require(msg.value == MINT_FEE, 'incorrect mint fee');
        require(totalSupply() < MAX_SUPPLY, 'sold out');
        require(walletMintCount[msg.sender] < MAX_PER_WALLET, 'wallet mint limit reached');

        tokenId = nextTokenId;
        nextTokenId += 1;

        walletMintCount[msg.sender] += 1;

        _clearPendingMine(msg.sender);

        _safeMint(msg.sender, tokenId);
        agentIdentities[tokenId] = AgentIdentity({
            roleId: pendingMine.roleId,
            traitSeed: pendingMine.traitSeed,
            mintedAt: block.timestamp
        });

        string memory finalURI = metadataURI;
        if (bytes(finalURI).length == 0 && bytes(baseTokenURI).length != 0) {
            finalURI = string.concat(baseTokenURI, tokenId.toString(), '.json');
        }

        if (bytes(finalURI).length != 0) {
            _setTokenURI(tokenId, finalURI);
        }

        _transferReward(msg.sender, pendingMine.rewardAmount);
        _forwardMintFee(msg.value);

        emit NFAMinted(
            msg.sender,
            tokenId,
            pendingMine.rewardAmount,
            pendingMine.roleId,
            pendingMine.traitSeed,
            finalURI
        );
    }

    function cancelPendingMine() external {
        PendingMine storage pendingMine = _pendingMines[msg.sender];
        require(pendingMine.exists, 'no pending mine');

        _clearPendingMine(msg.sender);
        emit PendingMineCanceled(msg.sender);
    }

    function calculateReward(uint256 minedCount) public view returns (uint256) {
        uint256 floorReward = 5000 * rewardUnit;
        uint256 earlyBonus = 25000 * rewardUnit;

        if (miningStartTime == 0) {
            return floorReward + earlyBonus;
        }

        uint256 elapsed = block.timestamp - miningStartTime;
        if (decayPeriod == 0 || minedCount >= MAX_SUPPLY) {
            return floorReward;
        }

        uint256 countComponentWad = (ALPHA_WAD * minedCount) / MAX_SUPPLY;
        uint256 timeComponentWad = (TIME_WEIGHT_WAD * elapsed) / decayPeriod;
        uint256 xWad = countComponentWad + timeComponentWad;
        uint256 expComponent = _expNegWad(xWad);

        return floorReward + ((earlyBonus * expComponent) / 1e18);
    }

    function withdrawERC20(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), 'to is zero');
        require(IERC20(token).transfer(to, amount), 'erc20 transfer failed');
    }

    function withdrawNative(uint256 amount, address payable to) external onlyOwner {
        require(to != address(0), 'to is zero');
        (bool success, ) = to.call{value: amount}('');
        require(success, 'native transfer failed');
    }

    function _requirePendingMine(address user) internal view returns (PendingMine memory pendingMine) {
        pendingMine = _pendingMines[user];
        require(pendingMine.exists, 'no pending mine');
    }

    function _requireMineReady() internal view {
        PendingMine storage userPendingMine = _pendingMines[msg.sender];
        require(!userPendingMine.exists, 'pending mine exists');
        require(
            block.timestamp >= lastMineTime[msg.sender] + COOLDOWN,
            'cooldown not passed'
        );
    }

    function _clearPendingMine(address user) internal {
        delete _pendingMines[user];
    }

    function _startMine(bytes32 traitSeed) internal returns (PendingMine memory pendingMine) {
        uint256 rewardAmount = calculateReward(totalMinedAttempts);
        require(rewardToken.balanceOf(address(this)) >= rewardAmount, 'insufficient rewards');

        pendingMine = PendingMine({
            exists: true,
            rewardAmount: rewardAmount,
            roleId: uint8(uint256(traitSeed) % roleCount),
            traitSeed: traitSeed,
            startedAt: block.timestamp
        });

        _pendingMines[msg.sender] = pendingMine;
        lastMineTime[msg.sender] = block.timestamp;
        totalMinedAttempts += 1;

        emit MiningStarted(
            msg.sender,
            pendingMine.rewardAmount,
            pendingMine.roleId,
            pendingMine.traitSeed,
            pendingMine.startedAt
        );
    }

    function _transferReward(address to, uint256 amount) internal {
        require(address(rewardToken) != address(0), 'reward token not set');
        require(rewardToken.balanceOf(address(this)) >= amount, 'reward pool depleted');
        require(rewardToken.transfer(to, amount), 'reward transfer failed');
    }

    function _forwardMintFee(uint256 amount) internal {
        (bool success, ) = payable(feeRecipient).call{value: amount}('');
        require(success, 'fee transfer failed');
    }

    function _expNegWad(uint256 xWad) internal pure returns (uint256) {
        int256 result = 1e18;
        int256 term = 1e18;

        for (uint256 i = 1; i <= 12; i++) {
            term = (-term * int256(xWad)) / (int256(i) * 1e18);
            result += term;
            if (term == 0) {
                break;
            }
        }

        if (result < 0) {
            return 0;
        }

        return uint256(result);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);

        if (dividendContract != address(0) && from != to) {
            IDividendSync(dividendContract).onNFATransfer(from, to, batchSize);
        }
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    receive() external payable {}
}
