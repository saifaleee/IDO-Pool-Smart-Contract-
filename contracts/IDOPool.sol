// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IDOPool
 * @dev An Initial DEX Offering (IDO) pool contract that allows users to buy tokens using a custom ERC-20 token.
 * The contract supports refund mechanisms for both users and the admin.
 */
contract IDOPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Token addresses
    IERC20 public paymentToken;
    IERC20 public idoToken;

    // IDO parameters
    uint256 public startTime;
    uint256 public endTime;
    uint256 public tokenPrice; // Price of one IDO token in paymentToken units
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public totalRaised;

    // IDO status
    bool public idoActive;
    bool public idoEnded;
    bool public refundGloballyEnabled;

    // User contributions
    mapping(address => uint256) public userContributedPaymentAmount;
    mapping(address => uint256) public userOwedIDOTokens;
    mapping(address => bool) public userHasRefunded;
    mapping(address => bool) public userHasClaimedIDOTokens;

    // Events
    event IDOParametersSet(uint256 startTime, uint256 endTime, uint256 tokenPrice, uint256 softCap, uint256 hardCap);
    event IDOStarted(uint256 startTime, uint256 endTime);
    event IDOEnded(uint256 endTime, uint256 totalRaised, bool softCapMet);
    event TokensPurchased(address indexed user, uint256 paymentAmount, uint256 idoTokenAmount);
    event RefundClaimed(address indexed user, uint256 amount);
    event GlobalRefundTriggered();
    event GlobalRefundDisabled();
    event IDOTokensClaimed(address indexed user, uint256 amount);
    event TokenPriceUpdated(uint256 newPrice);
    event CapsUpdated(uint256 newSoftCap, uint256 newHardCap);
    event ScheduleUpdated(uint256 newStartTime, uint256 newEndTime);

    /**
     * @dev Constructor - initializes the IDO pool with payment and IDO token addresses
     * @param _paymentTokenAddress Address of the ERC-20 token used for payment
     * @param _idoTokenAddress Address of the ERC-20 token being sold in the IDO
     */
    constructor(address _paymentTokenAddress, address _idoTokenAddress) Ownable(msg.sender) {
        require(_paymentTokenAddress != address(0), "Payment token cannot be zero address");
        require(_idoTokenAddress != address(0), "IDO token cannot be zero address");
        
        paymentToken = IERC20(_paymentTokenAddress);
        idoToken = IERC20(_idoTokenAddress);
    }

    /**
     * @dev Sets the parameters for the IDO. Can only be called by the owner.
     * @param _startTime The timestamp when the IDO starts
     * @param _endTime The timestamp when the IDO ends
     * @param _tokenPrice The price of one IDO token in payment tokens
     * @param _softCap The minimum amount to raise for the IDO to be successful
     * @param _hardCap The maximum amount that can be raised
     */
    function setIDOParameters(
        uint256 _startTime,
        uint256 _endTime,
        uint256 _tokenPrice,
        uint256 _softCap,
        uint256 _hardCap
    ) external onlyOwner {
        require(!idoActive, "IDO already active");
        require(_startTime >= block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_tokenPrice > 0, "Token price must be greater than 0");
        require(_hardCap > 0, "Hard cap must be greater than 0");
        require(_softCap <= _hardCap && _softCap > 0, "Soft cap must be > 0 and <= hard cap");

        startTime = _startTime;
        endTime = _endTime;
        tokenPrice = _tokenPrice;
        softCap = _softCap;
        hardCap = _hardCap;

        emit IDOParametersSet(_startTime, _endTime, _tokenPrice, _softCap, _hardCap);
    }

    /**
     * @dev Starts the IDO. Can only be called by the owner.
     */
    function startIDO() external onlyOwner {
        require(!idoActive && !idoEnded, "IDO cannot be started");
        require(block.timestamp >= startTime, "IDO has not reached start time");
        require(block.timestamp < endTime, "IDO has already passed end time");
        
        idoActive = true;
        emit IDOStarted(startTime, endTime);
    }

    /**
     * @dev Ends the IDO. Can be callable by anyone after endTime, or only by the owner.
     */
    function endIDO() external {
        require(idoActive, "IDO not active");
        require(block.timestamp >= endTime || totalRaised >= hardCap || msg.sender == owner(), 
            "IDO not yet ended or hard cap not reached");
        
        idoActive = false;
        idoEnded = true;
        
        // Determine if soft cap was met
        if (totalRaised >= softCap) {
            // IDO successful
            emit IDOEnded(endTime, totalRaised, true);
        } else {
            // IDO failed (soft cap not met), enable refunds
            refundGloballyEnabled = true;
            emit IDOEnded(endTime, totalRaised, false);
            emit GlobalRefundTriggered();
        }
    }

    /**
     * @dev Updates the token price. Can only be called by the owner.
     * @param _newTokenPrice The new price of one IDO token in payment tokens
     */
    function updateTokenPrice(uint256 _newTokenPrice) external onlyOwner {
        require(!idoActive, "Cannot change price during active IDO");
        require(_newTokenPrice > 0, "Token price must be positive");
        tokenPrice = _newTokenPrice;
        emit TokenPriceUpdated(_newTokenPrice);
    }

    /**
     * @dev Updates the soft cap and hard cap. Can only be called by the owner.
     * @param _newSoftCap The new soft cap
     * @param _newHardCap The new hard cap
     */
    function updateCaps(uint256 _newSoftCap, uint256 _newHardCap) external onlyOwner {
        require(!idoActive, "Cannot change caps during active IDO");
        require(_newHardCap > 0, "Hard cap must be greater than 0");
        require(_newSoftCap <= _newHardCap && _newSoftCap > 0, "Soft cap must be > 0 and <= hard cap");
        
        softCap = _newSoftCap;
        hardCap = _newHardCap;
        emit CapsUpdated(_newSoftCap, _newHardCap);
    }

    /**
     * @dev Updates the IDO schedule. Can only be called by the owner.
     * @param _newStartTime The new start time
     * @param _newEndTime The new end time
     */
    function updateSchedule(uint256 _newStartTime, uint256 _newEndTime) external onlyOwner {
        require(!idoActive, "Cannot change schedule during active IDO");
        require(_newStartTime >= block.timestamp, "Start time must be in the future");
        require(_newEndTime > _newStartTime, "End time must be after start time");
        
        startTime = _newStartTime;
        endTime = _newEndTime;
        emit ScheduleUpdated(_newStartTime, _newEndTime);
    }

    /**
     * @dev Triggers a global refund. Can only be called by the owner.
     */
    function triggerGlobalRefund() external onlyOwner {
        require(!refundGloballyEnabled, "Global refund already active");
        
        refundGloballyEnabled = true;
        
        // If IDO is active, end it
        if (idoActive) {
            idoActive = false;
            idoEnded = true;
            emit IDOEnded(block.timestamp, totalRaised, false);
        }
        
        emit GlobalRefundTriggered();
    }

    /**
     * @dev Disables the global refund. Can only be called by the owner.
     */
    function disableGlobalRefund() external onlyOwner {
        require(refundGloballyEnabled, "Global refund is not active");
        // This function should be used with caution
        refundGloballyEnabled = false;
        emit GlobalRefundDisabled();
    }

    /**
     * @dev Allows users to buy IDO tokens using payment tokens
     * @param _paymentAmount The amount of payment tokens to spend
     */
    function buyTokens(uint256 _paymentAmount) external nonReentrant {
        require(idoActive, "IDO is not active");
        require(block.timestamp >= startTime && block.timestamp < endTime, "IDO is not in progress");
        require(_paymentAmount > 0, "Payment amount must be greater than 0");
        require(totalRaised + _paymentAmount <= hardCap, "Purchase exceeds hard cap");
        
        // Calculate the number of IDO tokens to be received
        uint256 idoTokensToBuy = _paymentAmount / tokenPrice;
        require(idoTokensToBuy > 0, "Payment amount too small");
        
        // Update user's contribution
        userContributedPaymentAmount[msg.sender] += _paymentAmount;
        userOwedIDOTokens[msg.sender] += idoTokensToBuy;
        
        // Update total raised
        totalRaised += _paymentAmount;
        
        // Transfer payment tokens from user to contract
        paymentToken.safeTransferFrom(msg.sender, address(this), _paymentAmount);
        
        emit TokensPurchased(msg.sender, _paymentAmount, idoTokensToBuy);
    }

    /**
     * @dev Allows users to claim a refund if conditions are met
     */
    function claimRefundUser() external nonReentrant {
        require(!userHasRefunded[msg.sender], "Already refunded");
        require(!userHasClaimedIDOTokens[msg.sender], "Tokens already claimed");
        
        uint256 paymentToRefund = userContributedPaymentAmount[msg.sender];
        require(paymentToRefund > 0, "No contribution to refund");
        
        // Refunds are only enabled if:
        // 1. IDO ended and soft cap not met (global refund enabled by endIDO)
        // 2. Admin explicitly triggered global refund
        require(refundGloballyEnabled, "Refunds not enabled");
        
        // Update user's refund status first
        userHasRefunded[msg.sender] = true;
        
        // Store the refund amount before clearing
        uint256 refundAmount = paymentToRefund;
        
        // Clear contribution records
        userContributedPaymentAmount[msg.sender] = 0;
        userOwedIDOTokens[msg.sender] = 0;
        
        // Transfer payment tokens back to user
        paymentToken.safeTransfer(msg.sender, refundAmount);
        
        emit RefundClaimed(msg.sender, refundAmount);
    }

    /**
     * @dev Allows users to claim their IDO tokens after a successful IDO
     */
    function claimIDOTokens() external nonReentrant {
        require(!userHasClaimedIDOTokens[msg.sender], "Tokens already claimed");
        require(!userHasRefunded[msg.sender], "Contribution was refunded");
        
        uint256 tokensToClaim = userOwedIDOTokens[msg.sender];
        require(tokensToClaim > 0, "No IDO tokens to claim");
        
        require(idoEnded, "IDO not ended");
        require(totalRaised >= softCap, "Soft cap not met");
        require(!refundGloballyEnabled, "Refunds are active, cannot claim tokens");
        
        // Update user's claim status first
        userHasClaimedIDOTokens[msg.sender] = true;
        
        // Store the claim amount before clearing
        uint256 claimAmount = tokensToClaim;
        
        // Clear owed tokens record
        userOwedIDOTokens[msg.sender] = 0;
        
        // Transfer IDO tokens to user
        idoToken.safeTransfer(msg.sender, claimAmount);
        
        emit IDOTokensClaimed(msg.sender, claimAmount);
    }
} 