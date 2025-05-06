# IDO Pool with Refund and ERC-20 Payment Integration

## Objective

Design and implement a Solidity smart contract for an Initial DEX Offering (IDO) pool that allows users to buy tokens using a custom ERC-20 token. The contract should support refund mechanisms for both users and the admin, ensuring secure and transparent participation in the IDO process.

## Table of Contents

1.  [Project Overview](#project-overview)
2.  [Smart Contract Development Phases](#smart-contract-development-phases)
    * [Phase 1: Project Setup and Core ERC-20 Integration](#phase-1-project-setup-and-core-erc-20-integration)
    * [Phase 2: Admin Functionality - IDO Lifecycle Management](#phase-2-admin-functionality---ido-lifecycle-management)
    * [Phase 3: User Token Purchase Functionality](#phase-3-user-token-purchase-functionality)
    * [Phase 4: User Refund Mechanism](#phase-4-user-refund-mechanism)
    * [Phase 5: Admin Refund Mechanism](#phase-5-admin-refund-mechanism)
    * [Phase 6: IDO Token Distribution (Post-IDO)](#phase-6-ido-token-distribution-post-ido)
    * [Phase 7: Security Enhancements and Best Practices](#phase-7-security-enhancements-and-best-practices)
3.  [Smart Contract Deployment](#smart-contract-deployment)
4.  [Smart Contract Testing](#smart-contract-testing)
5.  [Front-end Interface (Conceptual Outline)](#front-end-interface-conceptual-outline)

## Project Overview

This project implements an IDO (Initial DEX Offering) smart contract. Key features include:

* **ERC-20 Payments:** Users purchase IDO tokens using a specified ERC-20 token.
* **Contribution Tracking:** The contract records individual user contributions.
* **Refund Mechanisms:**
    * **User Refunds:** Users can claim refunds under specific conditions (e.g., soft cap not met).
    * **Admin-Triggered Global Refunds:** The admin can initiate a global refund, allowing all participants to withdraw their funds.
* **Admin Controls:** Secure admin functions to manage the IDO lifecycle (start, end, parameter updates, refund triggers) using an `Ownable` pattern.
* **Security:** Incorporates best practices using OpenZeppelin libraries, protection against common vulnerabilities like reentrancy, and proper use of `safeTransferFrom`.

## Smart Contract Development Phases

The development of the smart contract is broken down into the following phases and tickets. Each ticket represents a unit of work that can be implemented and tested individually.

---

### Phase 1: Project Setup and Core ERC-20 Integration

* **Objective:** Establish the development environment and integrate the basic ERC-20 payment token functionality.

* **Ticket 1.1: Project Initialization & OpenZeppelin Setup**
    * **Implementation:**
        * Choose a development framework (e.g., Hardhat, Truffle).
        * Initialize the project: `npx hardhat` (for Hardhat).
        * Install OpenZeppelin Contracts: `npm install @openzeppelin/contracts` or `yarn add @openzeppelin/contracts`.
    * **Testing:**
        * Verify that the project structure is created correctly.
        * Confirm OpenZeppelin contracts are available in `node_modules`.

* **Ticket 1.2: Define Contract Structure and State Variables**
    * **Implementation:**
        * Create the main IDO contract file (e.g., `IDOPool.sol`).
        * Set Solidity version: `pragma solidity ^0.8.0;`
        * Import necessary OpenZeppelin contracts (e.g., `IERC20.sol`, `Ownable.sol`).
        * Declare essential state variables:
            ```solidity
            address public admin; // To be replaced by Ownable
            IERC20 public paymentToken;
            IERC20 public idoToken; // The token being sold
            uint256 public tokenPrice; // Price of one IDO token in paymentToken units
            uint256 public softCap; // Minimum amount to raise for IDO to be successful
            uint256 public hardCap; // Maximum amount that can be raised
            uint256 public totalRaised;
            // ... other variables like start/end times, contribution records etc.
            ```
    * **Testing:**
        * Compile the contract to ensure no syntax errors.

* **Ticket 1.3: ERC-20 Payment Token Validation**
    * **Implementation:**
        * In the constructor, accept the address of the payment ERC-20 token.
        * Store the `paymentToken` address.
        * **Validation (Basic):** Check if the address is not `address(0)`.
        * **Validation (Interface Check - Advanced, requires calling the token):**
            * Implement a function or modifier that attempts to call a standard ERC-20 function (e.g., `totalSupply()` or `balanceOf(address(0))`) on the provided token address within a `try/catch` block (Solidity 0.6+) or by checking return data (Solidity 0.8+ using low-level calls). This is more complex and might be better suited for off-chain validation or a separate admin function. For on-chain, a simpler check is often used initially.
            * A common approach is to trust the admin to provide a correct ERC-20 address. A more robust on-chain check involves using `IERC165` if the token implements it, or attempting a `balanceOf` call.
            ```solidity
            constructor(address _paymentTokenAddress, address _idoTokenAddress, /* ... other params */) {
                require(_paymentTokenAddress != address(0), "Payment token cannot be zero address");
                require(_idoTokenAddress != address(0), "IDO token cannot be zero address");
                paymentToken = IERC20(_paymentTokenAddress);
                idoToken = IERC20(_idoTokenAddress);
                // Further validation can be added here or in a separate function
            }
            ```
    * **Testing:**
        * Deploy the contract with a valid ERC-20 token address and `address(0)`.
        * Verify the `paymentToken` variable is set correctly.
        * Test that deployment fails or reverts if `address(0)` is provided for critical token addresses.

---

### Phase 2: Admin Functionality - IDO Lifecycle Management

* **Objective:** Implement admin controls for managing the IDO process.

* **Ticket 2.1: Implement `Ownable` Pattern**
    * **Implementation:**
        * Import `Ownable.sol` from OpenZeppelin: `import "@openzeppelin/contracts/access/Ownable.sol";`
        * Inherit `Ownable` in your contract: `contract IDOPool is Ownable { ... }`
        * The constructor of `Ownable` will set `msg.sender` as the initial owner.
        * Remove the `admin` state variable if it was manually added.
    * **Testing:**
        * Verify that `owner()` returns the deployer's address.
        * Test `transferOwnership()` and `renounceOwnership()`.

* **Ticket 2.2: IDO Configuration and Start/End Functions**
    * **Implementation:**
        * Define state variables:
            ```solidity
            uint256 public startTime;
            uint256 public endTime;
            bool public idoActive;
            bool public idoEnded;
            // uint256 public tokenPrice; // Price of one IDO token in paymentToken units
            // uint256 public softCap;
            // uint256 public hardCap;
            ```
        * Create an admin-only function to set IDO parameters:
            ```solidity
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
            ```
        * Create `startIDO()` and `endIDO()` functions:
            ```solidity
            function startIDO() external onlyOwner {
                require(!idoActive && !idoEnded, "IDO cannot be started");
                require(block.timestamp >= startTime, "IDO has not reached start time");
                require(block.timestamp < endTime, "IDO has already passed end time");
                // Ensure IDO tokens are deposited by admin before starting (or minted by this contract if it has minting rights)
                // For this assignment, we assume admin deposits IDO tokens to this contract.
                // Check: idoToken.balanceOf(address(this)) >= (hardCap / tokenPrice) * (10**idoTokenDecimals) - this calculation needs refinement based on how many IDO tokens are offered in total.
                // A simpler approach: define `totalIDOTokensForSale` and ensure contract has them.
                // uint256 totalIDOTokensForSale = hardCap / tokenPrice; // Assuming 1 IDO token costs 'tokenPrice' of paymentToken
                // require(idoToken.balanceOf(address(this)) >= totalIDOTokensForSale, "Insufficient IDO tokens in contract");

                idoActive = true;
                emit IDOStarted(startTime, endTime);
            }

            function endIDO() external { // Can be callable by anyone after endTime, or admin only
                require(idoActive, "IDO not active");
                require(block.timestamp >= endTime || totalRaised >= hardCap, "IDO not yet ended or hard cap not reached");
                idoActive = false;
                idoEnded = true;
                // Determine if soft cap was met
                if (totalRaised >= softCap) {
                    // IDO successful
                    emit IDOEnded(endTime, totalRaised, true);
                } else {
                    // IDO failed (soft cap not met), enable refunds
                    refundGloballyEnabled = true; // New state variable for global refund
                    emit IDOEnded(endTime, totalRaised, false);
                    emit GlobalRefundTriggered();
                }
            }
            ```
        * Add events: `IDOParametersSet`, `IDOStarted`, `IDOEnded(uint256 endTime, uint256 totalRaised, bool softCapMet)`.
    * **Testing:**
        * Test `setIDOParameters` with valid and invalid inputs (e.g., start time in past, end time before start time).
        * Test `startIDO` can only be called by owner, after `startTime` and before `endTime`.
        * Test `endIDO` can be called after `endTime` or when `hardCap` is reached.
        * Verify `idoActive` and `idoEnded` states are updated correctly.
        * Verify event emissions.

* **Ticket 2.3: Update Key Parameters (Admin Function)**
    * **Implementation:**
        * Create admin-only functions to update parameters like `tokenPrice`, `softCap`, `hardCap`, `startTime`, `endTime`.
        * **Crucial:** Add checks to prevent updates while the IDO is active or after it has ended, unless specifically designed for such scenarios (e.g., extending `endTime` if IDO is active and not yet hit hard cap).
            ```solidity
            function updateTokenPrice(uint256 _newTokenPrice) external onlyOwner {
                require(!idoActive, "Cannot change price during active IDO");
                require(_newTokenPrice > 0, "Token price must be positive");
                tokenPrice = _newTokenPrice;
                emit TokenPriceUpdated(_newTokenPrice);
            }
            // Similar functions for other updatable parameters with appropriate checks.
            ```
        * Add events: `TokenPriceUpdated`, `CapsUpdated`, `ScheduleUpdated`.
    * **Testing:**
        * Test that only the admin can call these functions.
        * Test that updates are blocked/allowed based on IDO state (e.g., cannot update price if `idoActive`).
        * Verify parameter changes and event emissions.

---

### Phase 3: User Token Purchase Functionality

* **Objective:** Enable users to buy IDO tokens using the specified ERC-20 token.

* **Ticket 3.1: `buyTokens` Function**
    * **Implementation:**
        * Create a public `buyTokens(uint256 _paymentAmount)` function.
        * `_paymentAmount` is the amount of `paymentToken` the user wants to spend.
        * Require `idoActive` to be true.
        * Require `block.timestamp >= startTime && block.timestamp < endTime`.
        * Calculate the number of IDO tokens to be received: `uint256 idoTokensToBuy = _paymentAmount / tokenPrice;` (Ensure no precision loss, or that `tokenPrice` is set considering decimals).
        * Require `idoTokensToBuy > 0`.
    * **Testing:**
        * Call `buyTokens` before IDO start, during IDO, and after IDO end.
        * Test with zero `_paymentAmount`.

* **Ticket 3.2: Record Contributions**
    * **Implementation:**
        * Define a struct to store contribution details:
            ```solidity
            struct Contribution {
                uint256 paymentAmount;
                uint256 idoTokenAmount;
                bool refunded;
                bool tokensClaimed;
            }
            mapping(address => Contribution) public contributions;
            // Or, if users can contribute multiple times:
            // mapping(address => uint256) public contributedAmount; // total payment token sent by user
            // mapping(address => uint256) public idoTokensOwed; // total IDO tokens owed to user
            ```
            Using `idoTokensOwed` and `contributedAmount` simplifies multiple contributions.
            ```solidity
            mapping(address => uint256) public userContributedPaymentAmount;
            mapping(address => uint256) public userOwedIDOTokens;
            ```
        * Inside `buyTokens`, update user's contribution:
            ```solidity
            userContributedPaymentAmount[msg.sender] += _paymentAmount;
            userOwedIDOTokens[msg.sender] += idoTokensToBuy;
            totalRaised += _paymentAmount;
            ```
    * **Testing:**
        * After a successful `buyTokens` call, verify that `userContributedPaymentAmount`, `userOwedIDOTokens`, and `totalRaised` are updated correctly.
        * Test multiple contributions from the same user.

* **Ticket 3.3: Cap Management**
    * **Implementation:**
        * Inside `buyTokens`, before processing the purchase:
            ```solidity
            require(totalRaised + _paymentAmount <= hardCap, "Purchase exceeds hard cap");
            ```
        * If `totalRaised + _paymentAmount` exceeds `hardCap`, adjust `_paymentAmount` to only purchase up to the `hardCap` or revert. Reverting is simpler and often preferred.
            ```solidity
            // If allowing partial buy up to hardcap:
            // uint256 remainingCapacity = hardCap - totalRaised;
            // uint256 actualPaymentAmount = _paymentAmount;
            // if (_paymentAmount > remainingCapacity) {
            //     actualPaymentAmount = remainingCapacity;
            // }
            // uint256 idoTokensToBuy = actualPaymentAmount / tokenPrice;
            // require(idoTokensToBuy > 0, "Amount too small or hard cap reached");
            // ... then use actualPaymentAmount for transfer and updates
            ```
            For simplicity, this example will revert if the exact amount exceeds.
    * **Testing:**
        * Test purchases that would exactly meet the hard cap.
        * Test purchases that would exceed the hard cap (should revert or purchase partially if implemented).
        * The soft cap is checked at `endIDO`.

* **Ticket 3.4: `safeTransferFrom` Usage**
    * **Implementation:**
        * Import `SafeERC20.sol`: `import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";`
        * Use the library for `IERC20`: `using SafeERC20 for IERC20;`
        * In `buyTokens`, transfer `paymentToken` from `msg.sender` to the contract:
            ```solidity
            paymentToken.safeTransferFrom(msg.sender, address(this), _paymentAmount);
            ```
        * Ensure user has approved the contract to spend their `paymentToken` before calling `buyTokens`.
    * **Testing:**
        * Test `buyTokens` when the user has not approved enough tokens (should fail).
        * Test `buyTokens` when the user has approved the correct amount.
        * Emit an event: `TokensPurchased(address indexed user, uint256 paymentAmount, uint256 idoTokenAmount)`.

---

### Phase 4: User Refund Mechanism

* **Objective:** Allow users to claim refunds under specific conditions.

* **Ticket 4.1: `claimRefundUser` Function**
    * **Implementation:**
        * Create a public `claimRefundUser()` function.
        * Retrieve the user's contribution amount: `uint256 paymentToRefund = userContributedPaymentAmount[msg.sender];`
        * Require `paymentToRefund > 0`.
        * Require `!userHasClaimedIDOTokens[msg.sender]` (a new mapping).
        * Require `!userHasRefunded[msg.sender]` (a new mapping to prevent double refunds).
    * **Testing:**
        * Call `claimRefundUser` for a user with no contribution (should fail).
        * Call `claimRefundUser` for a user who has already claimed tokens or refunded (should fail).

* **Ticket 4.2: Refund Conditions**
    * **Implementation:**
        * Define a state variable for a predefined refund window (optional, if refunds are allowed even if soft cap is met but user changes mind within a window). For this assignment, focus on soft cap not met or global refund.
            ```solidity
            // bool public refundGloballyEnabled; // Already defined in endIDO for soft cap failure
            // uint256 public refundWindowEnd; // Optional for time-based refunds
            ```
        * In `claimRefundUser`, add conditions:
            ```solidity
            function claimRefundUser() external nonReentrant { // Add nonReentrant modifier later
                uint256 paymentToRefund = userContributedPaymentAmount[msg.sender];
                require(paymentToRefund > 0, "No contribution to refund");
                require(!userHasClaimedIDOTokens[msg.sender], "Tokens already claimed");
                require(!userHasRefunded[msg.sender], "Already refunded");

                // Condition 1: IDO ended and soft cap not met (global refund is effectively enabled)
                // Condition 2: Admin explicitly triggered global refund
                require(refundGloballyEnabled, "Refunds not enabled");
                // Optional: require(idoEnded, "IDO must be ended for this type of refund"); - This depends on whether global refund can be triggered mid-IDO

                userHasRefunded[msg.sender] = true;
                userContributedPaymentAmount[msg.sender] = 0; // Clear their contribution
                userOwedIDOTokens[msg.sender] = 0; // Clear owed tokens

                // It's important to reduce totalRaised if refunding
                // However, totalRaised reflects historical contributions.
                // We might need a separate variable for 'currentActiveContributions' if totalRaised should not decrease.
                // For simplicity here, we assume totalRaised reflects money contract is currently holding from active non-refunded contributions.
                // This needs careful consideration based on accounting needs.
                // If totalRaised is for historical tracking, then don't decrease it.
                // Let's assume totalRaised should reflect funds contract is responsible for (either give tokens or refund)
                totalRaised -= paymentToRefund; // This is debatable. Typically totalRaised is immutable after contribution.
                                               // A better approach might be to track claimable funds separately.
                                               // For now, let's simplify and not reduce totalRaised, but ensure the contract has the funds.

                paymentToken.safeTransfer(msg.sender, paymentToRefund);
                emit RefundClaimed(msg.sender, paymentToRefund);
            }
            ```
        * Add new mappings: `mapping(address => bool) public userHasRefunded;` and `mapping(address => bool) public userHasClaimedIDOTokens;`
        * Emit event: `RefundClaimed(address indexed user, uint256 amount)`.
    * **Testing:**
        * Test refund attempts when conditions are not met (e.g., IDO successful and no global refund active).
        * Test successful refund when soft cap is not met (after `endIDO` automatically enables `refundGloballyEnabled`).

* **Ticket 4.3: Prevent Refunds After Tokens Are Claimed**
    * **Implementation:**
        * This is handled by the `require(!userHasClaimedIDOTokens[msg.sender])` check in `claimRefundUser`.
        * When tokens are claimed (Phase 6), `userHasClaimedIDOTokens[msg.sender]` will be set to `true`.
    * **Testing:**
        * Simulate a user claiming tokens, then attempting a refund (should fail).

---

### Phase 5: Admin Refund Mechanism

* **Objective:** Allow the admin to trigger a global refund.

* **Ticket 5.1: `triggerGlobalRefund` Function**
    * **Implementation:**
        * Create an admin-only function `triggerGlobalRefund()`:
            ```solidity
            // bool public refundGloballyEnabled; // Already declared
            function triggerGlobalRefund() external onlyOwner {
                // Add conditions: e.g., IDO must have started, or ended.
                // Or allow it anytime if admin deems necessary.
                // For example, if something went wrong mid-IDO.
                require(!refundGloballyEnabled, "Global refund already active");
                // require(idoEnded || idoActive, "IDO must be active or ended"); // Example condition

                refundGloballyEnabled = true;
                // Optionally, if triggered mid-IDO, you might want to end the IDO:
                // if (idoActive) {
                //    idoActive = false;
                //    idoEnded = true; // Mark as ended due to refund
                //    emit IDOForcefullyEndedByAdmin();
                // }
                emit GlobalRefundTriggered();
            }
            ```
        * Emit event: `GlobalRefundTriggered()`.
    * **Testing:**
        * Test that only admin can call `triggerGlobalRefund`.
        * Verify `refundGloballyEnabled` is set to `true`.
        * Test calling it when already active.

* **Ticket 5.2: Process Global Refunds**
    * **Implementation:**
        * The existing `claimRefundUser()` function already checks for `refundGloballyEnabled`. So, once the admin triggers it, users can use `claimRefundUser()`.
    * **Testing:**
        * Admin triggers global refund.
        * Multiple users successfully claim their refunds using `claimRefundUser()`.

* **Ticket 5.3: Re-enabling/Disabling Refunds (Admin)**
    * **Implementation:**
        * Create an admin-only function `disableGlobalRefund()`:
            ```solidity
            function disableGlobalRefund() external onlyOwner {
                require(refundGloballyEnabled, "Global refund is not active");
                // Add appropriate conditions for when this is allowable.
                // E.g., maybe only if no refunds have been processed yet, or for a specific reason.
                // This function might be risky if users expect refunds to be available.
                refundGloballyEnabled = false;
                emit GlobalRefundDisabled();
            }
            ```
        * This is a sensitive function and should be used with caution. Typically, once global refunds are enabled (especially due to soft cap failure), they stay enabled.
        * Emit event: `GlobalRefundDisabled()`.
    * **Testing:**
        * Test that only admin can call `disableGlobalRefund`.
        * Test the effect on `claimRefundUser` after calling this.

---

### Phase 6: IDO Token Distribution (Post-IDO)

* **Objective:** Allow users to claim their purchased IDO tokens after a successful IDO.

* **Ticket 6.1: `claimIDOTokens` Function**
    * **Implementation:**
        * Create a public `claimIDOTokens()` function.
        * Retrieve the number of IDO tokens owed to the user: `uint256 tokensToClaim = userOwedIDOTokens[msg.sender];`
        * Require `tokensToClaim > 0`.
        * Require `!userHasClaimedIDOTokens[msg.sender]`.
        * Require `!userHasRefunded[msg.sender]`.
        * Require `idoEnded` to be true.
        * Require `totalRaised >= softCap` (i.e., IDO was successful).
        * Require `!refundGloballyEnabled` (or if it was enabled due to soft cap failure, this claim shouldn't happen). This implies IDO was successful.
    * **Testing:**
        * Test claiming before IDO end, when soft cap not met, after refunding, or with zero tokens owed.

* **Ticket 6.2: IDO Token Transfer**
    * **Implementation:**
        * Admin must ensure the `IDOPool` contract holds enough `idoToken`s to cover all successful contributions before users can claim. This is typically done by the admin transferring `idoToken`s to the contract after the `idoToken` is created but before or during the IDO setup.
        * A common pattern: `uint256 public totalIDOTokensForSale;` set by admin. Contract needs `idoToken.balanceOf(address(this)) >= totalIDOTokensForSale - totalIDOTokensClaimedSoFar`.
        * Inside `claimIDOTokens`:
            ```solidity
            function claimIDOTokens() external nonReentrant { // Add nonReentrant modifier later
                uint256 tokensToClaim = userOwedIDOTokens[msg.sender];
                require(tokensToClaim > 0, "No IDO tokens to claim");
                require(!userHasClaimedIDOTokens[msg.sender], "Tokens already claimed");
                require(!userHasRefunded[msg.sender], "Contribution was refunded");
                require(idoEnded, "IDO not ended");
                require(totalRaised >= softCap, "Soft cap not met");
                // If refundGloballyEnabled was set due to soft cap failure, this path should not be reachable.
                // If admin triggered global refund for other reasons even after soft cap met,
                // then claiming might be disabled. This logic needs to be tight.
                // Safest: if refundGloballyEnabled is true, no claims.
                require(!refundGloballyEnabled, "Refunds are active, cannot claim tokens");

                userHasClaimedIDOTokens[msg.sender] = true;
                // userOwedIDOTokens[msg.sender] = 0; // Optional: clear if you don't need it for future reference after claim

                idoToken.safeTransfer(msg.sender, tokensToClaim);
                emit IDOTokensClaimed(msg.sender, tokensToClaim);
            }
            ```
        * Emit event: `IDOTokensClaimed(address indexed user, uint256 amount)`.
    * **Testing:**
        * Ensure admin has sent `idoToken`s to the contract.
        * Test successful token claims.
        * Test claim if contract has insufficient `idoToken` balance (should fail due to `safeTransfer`).

* **Ticket 6.3: Prevent Double Claims**
    * **Implementation:**
        * This is handled by the `userHasClaimedIDOTokens` mapping and the check `require(!userHasClaimedIDOTokens[msg.sender])`.
    * **Testing:**
        * A user successfully claims tokens.
        * The same user attempts to claim tokens again (should fail).

---

### Phase 7: Security Enhancements and Best Practices

* **Objective:** Integrate security measures and follow best practices.

* **Ticket 7.1: Reentrancy Guard**
    * **Implementation:**
        * Import `ReentrancyGuard.sol`: `import "@openzeppelin/contracts/security/ReentrancyGuard.sol";`
        * Inherit `ReentrancyGuard`: `contract IDOPool is Ownable, ReentrancyGuard { ... }`
        * Apply the `nonReentrant` modifier to functions that involve external calls and state changes, especially:
            * `buyTokens()`
            * `claimRefundUser()`
            * `claimIDOTokens()`
    * **Testing:**
        * Difficult to directly unit test reentrancy without a malicious contract. Review code to ensure modifier is applied correctly to critical functions.
        * Static analysis tools can help identify potential reentrancy vulnerabilities.

* **Ticket 7.2: Overflow/Underflow Protection**
    * **Implementation:**
        * Using Solidity `^0.8.0` provides built-in overflow/underflow protection, so explicit libraries like `SafeMath` are generally not needed for basic arithmetic.
        * Review all arithmetic operations (especially calculations involving `tokenPrice`, amounts, and caps) to ensure they behave as expected and don't inadvertently lead to precision loss or unexpected truncations that could be exploited.
    * **Testing:**
        * Test calculations with edge case values (e.g., very large numbers near `uint256` max, very small numbers for prices/amounts).
        * Ensure division operations (like `_paymentAmount / tokenPrice`) are handled correctly, especially regarding potential precision loss if `tokenPrice` doesn't divide `_paymentAmount` evenly. The current implementation truncates, which is standard.

* **Ticket 7.3: Event Emission**
    * **Implementation:**
        * Ensure events are emitted for all significant state changes and actions:
            * `IDOParametersSet(uint256 startTime, uint256 endTime, uint256 tokenPrice, uint256 softCap, uint256 hardCap)`
            * `IDOStarted(uint256 startTime, uint256 endTime)`
            * `IDOEnded(uint256 endTime, uint256 totalRaised, bool softCapMet)`
            * `TokensPurchased(address indexed user, uint256 paymentAmount, uint256 idoTokenAmount)`
            * `RefundClaimed(address indexed user, uint256 paymentAmount)`
            * `GlobalRefundTriggered()`
            * `GlobalRefundDisabled()` (if implemented)
            * `IDOTokensClaimed(address indexed user, uint256 idoTokenAmount)`
            * Admin actions: `TokenPriceUpdated`, `CapsUpdated`, etc.
    * **Testing:**
        * In unit tests, check for correct event emission with expected parameters after each corresponding action. Most testing frameworks (Hardhat/Truffle) provide utilities for this.

---

## Smart Contract Deployment

### Prerequisites

* Node.js and npm/yarn installed.
* A development framework like Hardhat or Truffle.
* An Ethereum wallet (e.g., MetaMask) with test ETH for deployment on a testnet.
* The address of the ERC-20 token to be used for payment (`paymentTokenAddress`).
* The address of the ERC-20 token being sold in the IDO (`idoTokenAddress`). The IDO contract must have a sufficient balance of these tokens to distribute.

### Deployment Steps (using Hardhat example)

1.  **Compile the Contract:**
    ```bash
    npx hardhat compile
    ```

2.  **Create a Deployment Script:**
    Create a script in your `scripts` directory (e.g., `deploy.js`):

    ```javascript
    async function main() {
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with the account:", deployer.address);

        const paymentTokenAddress = "0xYourPaymentTokenAddress"; // Replace with actual address
        const idoTokenAddress = "0xYourIDOTokenAddress";       // Replace with actual address

        // IDO Parameters (example values, set according to your needs)
        // These might be set via setIDOParameters after deployment for more flexibility
        // For constructor arguments, ensure they match your contract's constructor
        // For this example, let's assume constructor takes payment and IDO token addresses,
        // and other parameters are set via a separate function.

        const IDOPool = await ethers.getContractFactory("IDOPool");
        const idoPool = await IDOPool.deploy(paymentTokenAddress, idoTokenAddress);
        await idoPool.deployed();

        console.log("IDOPool deployed to:", idoPool.address);

        // Example: After deployment, owner sets IDO parameters
        // These timings need to be set relative to the deployment block.timestamp
        // const startTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        // const endTime = startTime + (7 * 24 * 3600); // 7 days after start
        // const tokenPrice = ethers.utils.parseUnits("10", "ether"); // e.g., 10 payment tokens per IDO token (assuming 18 decimals for payment token)
        // const softCap = ethers.utils.parseUnits("50000", "ether"); // e.g., 50,000 payment tokens
        // const hardCap = ethers.utils.parseUnits("200000", "ether"); // e.g., 200,000 payment tokens

        // console.log("Setting IDO parameters...");
        // await idoPool.setIDOParameters(startTime, endTime, tokenPrice, softCap, hardCap);
        // console.log("IDO parameters set.");

        // IMPORTANT: The admin (deployer) MUST transfer the total supply of IDO tokens
        // that are meant to be sold to the IDOPool contract address.
        // For example, if hardCap is 200,000 paymentTokens and price is 10 paymentTokens per IDOToken,
        // then 20,000 IDOTokens are needed.
        // const idoToken = await ethers.getContractAt("IERC20", idoTokenAddress);
        // const totalIDOTokensForSale = hardCap.div(tokenPrice); // Make sure decimals are handled
        // await idoToken.transfer(idoPool.address, totalIDOTokensForSale);
        // console.log(`Transferred ${ethers.utils.formatUnits(totalIDOTokensForSale, IDO_TOKEN_DECIMALS)} IDO tokens to the contract.`);
    }

    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
    ```

3.  **Configure Hardhat Network:**
    Update `hardhat.config.js` with your desired network (e.g., Sepolia, a local network) and your private key or mnemonic (use environment variables for security).

    ```javascript
    require("@nomiclabs/hardhat-waffle");
    require("dotenv").config();

    module.exports = {
        solidity: "0.8.19", // Match your contract's version
        networks: {
            sepolia: {
                url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
                accounts: [`0x${process.env.PRIVATE_KEY}`],
            },
            // ... other networks
        },
    };
    ```

4.  **Run Deployment Script:**
    ```bash
    npx hardhat run scripts/deploy.js --network <your_network_name>
    # Example: npx hardhat run scripts/deploy.js --network sepolia
    ```

5.  **Post-Deployment Setup (Admin Actions):**
    * The owner (deployer) must call `setIDOParameters(...)` to configure the IDO details (start/end times, price, caps) if not done in constructor.
    * The owner must transfer the total amount of `idoToken`s to be sold into the `IDOPool` contract address. The amount should be sufficient to cover the `hardCap` if it's reached. For example, if `hardCap` is `X` payment tokens and `tokenPrice` is `Y` payment tokens per IDO token, then `X/Y` IDO tokens must be in the contract.
    * The owner calls `startIDO()` when the `startTime` is reached (or automate this if desired).

## Smart Contract Testing

Thorough testing is crucial. Use a testing framework like Hardhat or Truffle with Chai and Mocha.

### Test Case Categories:

1.  **Deployment & Setup:**
    * Verify correct owner.
    * Verify correct `paymentToken` and `idoToken` addresses.
    * Test `setIDOParameters` with valid and invalid inputs ( onlyOwner, timing constraints, logical cap values).

2.  **Admin Functions:**
    * Test `startIDO` (onlyOwner, timing, before/after `setIDOParameters`).
    * Test `endIDO` (timing, conditions for soft cap met/not met).
    * Test parameter update functions (e.g., `updateTokenPrice`) - onlyOwner, conditions (not during active IDO).
    * Test `triggerGlobalRefund` (onlyOwner, idempotency).
    * Test `disableGlobalRefund` (onlyOwner, idempotency, effects).

3.  **Token Purchase (`buyTokens`):**
    * Test before IDO is active.
    * Test after IDO has ended.
    * Test with insufficient `paymentToken` allowance.
    * Test with insufficient `paymentToken` balance.
    * Test successful purchase:
        * Correct `paymentToken` transfer from user to contract.
        * Correct updates to `userContributedPaymentAmount`, `userOwedIDOTokens`, `totalRaised`.
        * Event `TokensPurchased` emitted with correct arguments.
    * Test purchasing exactly up to `hardCap`.
    * Test attempting to purchase beyond `hardCap` (should revert or buy partially).
    * Test multiple purchases by the same and different users.
    * Test reentrancy (requires a mock attacker contract).

4.  **User Refund (`claimRefundUser`):**
    * Test when refunds are not enabled.
    * Test when IDO is successful (soft cap met) and no global refund is active.
    * Test when IDO fails (soft cap not met, `endIDO` should enable `refundGloballyEnabled`):
        * Successful refund: correct `paymentToken` transfer back to user, state updates (`userHasRefunded`, contributions zeroed out).
        * Event `RefundClaimed` emitted.
    * Test when admin has triggered `triggerGlobalRefund`:
        * Successful refund.
    * Test attempting to refund after claiming IDO tokens.
    * Test attempting to refund twice.
    * Test reentrancy.

5.  **IDO Token Claim (`claimIDOTokens`):**
    * Test before IDO has ended.
    * Test if IDO failed (soft cap not met).
    * Test if user has no contribution.
    * Test if user has already refunded.
    * Test if user has already claimed tokens.
    * Test if `refundGloballyEnabled` is true.
    * Test successful claim (IDO ended, soft cap met):
        * Correct `idoToken` transfer from contract to user.
        * State updates (`userHasClaimedIDOTokens`).
        * Event `IDOTokensClaimed` emitted.
    * Test if contract has insufficient `idoToken` balance (admin did not deposit enough).
    * Test reentrancy.

6.  **Full Lifecycle Scenarios:**
    * **Scenario 1 (Successful IDO):** Deploy -> Set Params -> Admin Deposits IDO Tokens -> Start IDO -> Users Buy Tokens (reach soft cap, then hard cap) -> End IDO -> Users Claim IDO Tokens.
    * **Scenario 2 (Failed IDO - Soft Cap Not Met):** Deploy -> Set Params -> Admin Deposits IDO Tokens -> Start IDO -> Users Buy Tokens (do not reach soft cap) -> End IDO (refunds automatically enabled) -> Users Claim Refunds.
    * **Scenario 3 (Admin Triggered Refund):** Deploy -> Set Params -> Admin Deposits IDO Tokens -> Start IDO -> Users Buy Tokens -> Admin Triggers Global Refund -> Users Claim Refunds.

### Example (Hardhat - partial test structure):

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IDOPool", function () {
    let IDOPool, idoPool;
    let owner, addr1, addr2;
    let paymentToken, idoToken; // Mock ERC20 tokens

    beforeEach(async function () {
        [owner, addr1, addr2, _] = await ethers.getSigners();

        // Deploy Mock ERC20 tokens
        const MockERC20 = await ethers.getContractFactory("MockERC20"); // You'll need to create this
        paymentToken = await MockERC20.deploy("PaymentToken", "PAY", ethers.utils.parseUnits("1000000", 18));
        idoToken = await MockERC20.deploy("IDOToken", "IDO", ethers.utils.parseUnits("1000000", 18));
        await paymentToken.deployed();
        await idoToken.deployed();

        // Deploy IDOPool
        IDOPool = await ethers.getContractFactory("IDOPool");
        idoPool = await IDOPool.deploy(paymentToken.address, idoToken.address);
        await idoPool.deployed();

        // Distribute some payment tokens to users for testing
        await paymentToken.transfer(addr1.address, ethers.utils.parseUnits("10000", 18));
        await paymentToken.transfer(addr2.address, ethers.utils.parseUnits("10000", 18));

        // Admin (owner) deposits IDO tokens into the IDOPool contract
        // Calculate based on a hypothetical hardCap and price for realistic testing
        // For now, let's assume total tokens for sale = 1000
        await idoToken.transfer(idoPool.address, ethers.utils.parseUnits("100000", 18)); // Large amount for tests
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await idoPool.owner()).to.equal(owner.address);
        });
        // ... more deployment tests
    });

    describe("Setting IDO Parameters", function () {
        it("Should allow owner to set IDO parameters", async function () {
            const startTime = Math.floor(Date.now() / 1000) + 3600;
            const endTime = startTime + 86400; // 1 day
            const price = ethers.utils.parseUnits("1", 18); // 1 payment token for 1 IDO token
            const softCap = ethers.utils.parseUnits("100", 18);
            const hardCap = ethers.utils.parseUnits("1000", 18);

            await expect(idoPool.connect(owner).setIDOParameters(startTime, endTime, price, softCap, hardCap))
                .to.emit(idoPool, "IDOParametersSet")
                .withArgs(startTime, endTime, price, softCap, hardCap);

            expect(await idoPool.startTime()).to.equal(startTime);
            // ... check other params
        });
        // ... tests for invalid inputs, non-owner calls
    });

    // ... more describe blocks for buyTokens, claimRefundUser, claimIDOTokens etc.
});

Front-end Interface (Conceptual Outline)

A user-friendly front-end is essential for interaction.
Key Components:

    Wallet Connection:
        Button to connect MetaMask (or other wallets via WalletConnect).
        Display connected account and network.
        Handle network changes.

    IDO Information Display:
        IDO Status (Not Started, Active, Ended, Successful, Failed, Refund Active).
        Countdown to Start/End.
        Token Price (paymentToken per idoToken).
        Soft Cap / Hard Cap progress bar.
        Total Raised (paymentToken).
        User's current contribution (if any).
        User's owed IDO tokens (if any).
        User's paymentToken balance.
        User's idoToken balance.

    Purchase Section (Visible when IDO is Active):
        Input field for amount of paymentToken to spend or amount of idoToken to buy.
        Display calculated IDO tokens to receive or payment amount required.
        "Approve" button (if allowance is less than purchase amount).
        "Buy Tokens" button.
        Visual feedback for transaction status (pending, success, error) with animations.

    User Actions Section (Contextual):
        Claim IDO Tokens Button: Visible if IDO was successful, ended, and user has tokens to claim.
        Claim Refund Button: Visible if refund conditions are met (soft cap not met, or global refund active) and user has a contribution to refund.
        Visual feedback for transaction status.

    Admin Panel (Separate View/Route, protected):
        Connect Wallet (admin only).
        Set IDO Parameters: Form to input start/end times, price, caps.
        Start IDO Button.
        End IDO Button (Manual Trigger if needed).
        Trigger Global Refund Button.
        Disable Global Refund Button (if applicable).
        Update Parameters Functions (e.g., update price - with caution).
        Display contract status and current parameters.
        Function to deposit IDO tokens to the contract (if not handled by deploy script).

Visuals and Animations:

    Clean, Modern UI: Use a framework like React, Vue, or Angular with a component library (e.g., Material UI, Ant Design, Tailwind CSS).
    Progress Bars: Animate progress towards soft/hard caps.
    Countdown Timers: Visually appealing countdowns.
    Transaction Modals/Notifications: Use toasts or modals with loading spinners and success/error icons for blockchain interactions.
    Button States: Clear visual distinction for disabled/enabled buttons, loading states.
    Responsive Design: Ensure usability on desktop and mobile.
    Subtle Animations: On hover effects, transitions for appearing/disappearing elements to enhance UX.

Technical Aspects for Front-end:

    Web3 Library: Ethers.js or Web3.js for interacting with the smart contract.
    State Management: Redux, Zustand, Vuex, or Context API for managing application state (wallet info, contract data, UI state).
    Event Listening: Listen to smart contract events to update the UI in real-time (e.g., when totalRaised changes, when IDO ends).
    Error Handling: Gracefully handle RPC errors, transaction rejections, contract reverts.

This detailed breakdown should guide the implementation and testing of the IDO pool smart contract and the associated front-end.